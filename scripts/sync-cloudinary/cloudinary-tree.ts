import { v2 as cloudinary } from 'cloudinary';
import type { CloudinaryResourceInfo, FolderNode } from './types';

export function configureCloudinary(): void {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      'Faltan credenciales de Cloudinary. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en .env.local.',
    );
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
}

interface CloudinaryFolder {
  path: string;
  name: string;
}

interface CloudinaryFolderListResponse {
  folders: CloudinaryFolder[];
  next_cursor?: string;
}

interface CloudinaryRawResource {
  public_id: string;
  secure_url: string;
  format: string;
  resource_type: 'image' | 'video' | 'raw';
  folder?: string;
  asset_folder?: string;
  bytes: number;
  created_at: string;
  context?: { custom?: Record<string, string> };
  tags?: string[];
}

interface CloudinaryResourcesResponse {
  resources: CloudinaryRawResource[];
  next_cursor?: string;
}

// El paquete `cloudinary` (v2) reordena los argumentos de la Admin API v1 vía
// un adaptador interno (v1_adapters con num_pass_args: root_folders=0,
// sub_folders=1, resources=0 → firma real "(...args, options, callback)"),
// pero sus *.d.ts publicados declaran root_folders/sub_folders con el
// callback primero. Llamar según el .d.ts revienta en tiempo de ejecución
// ("callback is not a function"): por eso aquí se tipa explícitamente la
// firma real ya verificada contra node_modules/cloudinary/lib/v2/api.js.
type RootFoldersFn = (options: Record<string, unknown>) => Promise<CloudinaryFolderListResponse>;
type SubFoldersFn = (path: string, options: Record<string, unknown>) => Promise<CloudinaryFolderListResponse>;
type ResourcesByAssetFolderFn = (
  assetFolder: string,
  options: Record<string, unknown>,
) => Promise<CloudinaryResourcesResponse>;

const rootFolders = cloudinary.api.root_folders as unknown as RootFoldersFn;
const subFolders = cloudinary.api.sub_folders as unknown as SubFoldersFn;
// Esta cuenta usa Dynamic Folders (confirmado: `sub_folders` navega
// carpetas que existen independientemente del `public_id` de los assets).
// En ese modo, `resources({ prefix })` NO encuentra nada — el public_id ya
// no está obligado a empezar con la ruta de carpeta. El endpoint correcto
// es `resources_by_asset_folder`, que lista por la carpeta real asignada al
// asset (campo `asset_folder`), sin importar el public_id.
const resourcesByAssetFolder = cloudinary.api.resources_by_asset_folder as unknown as ResourcesByAssetFolderFn;

async function listSubFolders(path: string): Promise<CloudinaryFolder[]> {
  const out: CloudinaryFolder[] = [];
  let next_cursor: string | undefined;
  do {
    const res = path
      ? await subFolders(path, { max_results: 500, next_cursor })
      : await rootFolders({ max_results: 500, next_cursor });
    out.push(...res.folders.map((f) => ({ path: f.path, name: f.name })));
    next_cursor = res.next_cursor;
  } while (next_cursor);
  return out;
}

async function listResourcesInFolder(folderPath: string): Promise<CloudinaryResourceInfo[]> {
  const out: CloudinaryResourceInfo[] = [];
  let next_cursor: string | undefined;
  do {
    let res: CloudinaryResourcesResponse;
    try {
      res = await resourcesByAssetFolder(folderPath, {
        max_results: 500,
        next_cursor,
        context: true,
        tags: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.toLowerCase().includes('rate limit')) throw err;
      // Carpeta sin assets: la Admin API puede responder con error en vez de lista vacía.
      break;
    }
    for (const r of res.resources) {
      out.push({
        publicId: r.public_id,
        secureUrl: r.secure_url,
        format: r.format,
        resourceType: r.resource_type,
        folder: r.asset_folder ?? r.folder ?? folderPath,
        bytes: r.bytes,
        createdAt: r.created_at,
        context: r.context?.custom,
        tags: r.tags,
      });
    }
    next_cursor = res.next_cursor;
  } while (next_cursor);
  return out;
}

export async function buildFolderTree(rootPath = '', maxDepth = 12): Promise<FolderNode[]> {
  const subFolderList = await listSubFolders(rootPath);
  const nodes: FolderNode[] = [];
  for (const folder of subFolderList) {
    const children = maxDepth > 0 ? await buildFolderTree(folder.path, maxDepth - 1) : [];
    // Sólo se listan recursos en carpetas hoja (sin subcarpetas): en esta
    // cuenta todo archivo vive en el nivel más profundo y las carpetas
    // intermedias siempre están vacías (confirmado por auditoría manual).
    // Preguntar por recursos en cada carpeta intermedia quema en vano la
    // cuota de la Admin API (500 llamadas/hora en el plan actual) — cada
    // llamada a `resources` cuenta 3x (image/video/raw) por carpeta.
    const resources = children.length === 0 ? await listResourcesInFolder(folder.path) : [];
    nodes.push({ path: folder.path, name: folder.name, children, resources });
  }
  return nodes;
}

export function flattenTree(nodes: FolderNode[]): FolderNode[] {
  const out: FolderNode[] = [];
  const walk = (list: FolderNode[]) => {
    for (const n of list) {
      out.push(n);
      walk(n.children);
    }
  };
  walk(nodes);
  return out;
}
