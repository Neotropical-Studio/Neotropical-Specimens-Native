// Ingesta masiva de activos multimedia.
// Motor de carga + enlace rápido a la galería.
import IngestionEngine from './IngestionEngine';
import PublishProductionButton from '@/components/admin/PublishProductionButton';

export const metadata = { title: 'Ingesta de Activos · Admin' };

export default function IngestaPage() {
  return (
    <div className="flex flex-col gap-8">
      <PublishProductionButton variant="panel" />
      <div>
        <h1 className="text-xl font-semibold text-white">Ingesta de Activos</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Arrastra fotos, modelos 3D y videos. El sistema detecta el código del espécimen por el nombre del
          archivo, elimina el fondo (Cloudinary AI) y registra todo en Supabase automáticamente.
        </p>
        <div className="mt-2 rounded-lg border border-neutral-800 bg-neutral-900/40 p-3 text-xs text-neutral-500">
          <span className="font-semibold text-neutral-300">Convención de nombre:</span>
          &nbsp;
          <code className="rounded bg-neutral-800 px-1 text-emerald-400">BR-001_dorsal.webp</code>
          &nbsp;·&nbsp;
          <code className="rounded bg-neutral-800 px-1 text-emerald-400">BR-001_ventral.png</code>
          &nbsp;·&nbsp;
          <code className="rounded bg-neutral-800 px-1 text-emerald-400">BR-001.glb</code>
          &nbsp;·&nbsp;
          <code className="rounded bg-neutral-800 px-1 text-emerald-400">HE-032.mp4</code>
          <br />
          <span className="mt-1 block text-neutral-600">
            Vistas: dorsal (d) · ventral (v) · lateral (l) · macro (m)
          </span>
        </div>
      </div>

      <IngestionEngine />
    </div>
  );
}
