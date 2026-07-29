import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type UploadTarget = 'image' | 'video' | 'raw';

interface UploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  context?: Record<string, string>;
  /** Activar eliminación de fondo con Cloudinary AI (solo imágenes). */
  removeBg?: boolean;
}

const IMAGE_TRANSFORM = [{ fetch_format: 'auto', quality: 'auto', flags: 'strip_profile' }];
// Cloudinary AI background removal — produce PNG/WebP con fondo transparente.
// Se activa pasando removeBg: true en UploadOptions.
const BG_REMOVAL_TRANSFORM = [
  { effect: 'background_removal' },
  { fetch_format: 'auto', quality: 'auto:best' },
];
const VIDEO_EAGER = [{ streaming_profile: 'hd_hls', format: 'm3u8' }];

export async function uploadImage(
  file: string | Buffer,
  opts: UploadOptions = {},
): Promise<UploadApiResponse> {
  const { removeBg, ...rest } = opts;
  return upload(file, 'image', {
    ...rest,
    transformation: removeBg ? BG_REMOVAL_TRANSFORM : IMAGE_TRANSFORM,
    ...(removeBg ? { background_removal: 'cloudinary_ai' } : {}),
  });
}

export async function uploadVideo(
  file: string | Buffer,
  opts: UploadOptions = {},
): Promise<UploadApiResponse> {
  return upload(file, 'video', {
    ...opts,
    eager: VIDEO_EAGER, // e_streaming_profile:hd_hls
    eager_async: true,
    streaming_profile: 'hd_hls',
  });
}

export async function uploadModel3d(
  file: string | Buffer,
  opts: UploadOptions = {},
): Promise<UploadApiResponse> {
  return upload(file, 'raw', { ...opts });
}

async function upload(
  file: string | Buffer,
  resource_type: UploadTarget,
  extra: Record<string, unknown>,
): Promise<UploadApiResponse> {
  const { folder, publicId, tags, context, ...rest } = extra as UploadOptions & Record<string, unknown>;
  const options = {
    resource_type,
    folder,
    public_id: publicId,
    tags,
    context,
    overwrite: true,
    invalidate: true,
    unique_filename: false,
    use_filename: true,
    ...rest,
  };

  if (Buffer.isBuffer(file)) {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (err, res) => {
        if (err || !res) return reject(err ?? new Error('Upload failed'));
        resolve(res);
      });
      stream.end(file);
    });
  }

  return cloudinary.uploader.upload(file, options);
}

export { cloudinary };
