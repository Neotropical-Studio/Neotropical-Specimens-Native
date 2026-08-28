import { sql } from '@/lib/db';
import Link from 'next/link';

async function loadCounts() {
  try {
    const rawData = await sql`SELECT COUNT(*) as total FROM especies;`;
    const count = rawData[0]?.total || 0;
    return { specimens: Number(count) };
  } catch (err) {
    console.error('Error cargando conteos:', err);
    return { specimens: 0 };
  }
}

export default async function AdminDashboardPage() {
  const counts = await loadCounts();

  return (
    <div className="space-y-8 p-6 text-white">
      <div>
        <h1 className="text-3xl font-bold">Panel de Control</h1>
        <p className="text-neutral-400">Gestión de la colección Neotropical Specimens (Neon DB)</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur">
          <h3 className="text-sm font-medium text-neutral-400">Especímenes Registrados</h3>
          <p className="mt-2 text-4xl font-extrabold text-emerald-400">{counts.specimens}</p>
          <div className="mt-4">
            <Link
              href="/admin/especimenes"
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              Gestionar especímenes →
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur">
          <h3 className="text-sm font-medium text-neutral-400">Estado de Base de Datos</h3>
          <p className="mt-2 text-lg font-bold text-emerald-400">Neon Postgres (Conectado)</p>
          <p className="mt-1 text-xs text-neutral-500">Sincronización en tiempo real activa</p>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur">
          <h3 className="text-sm font-medium text-neutral-400">Almacenamiento Multimedia</h3>
          <p className="mt-2 text-lg font-bold text-blue-400">Cloudinary API</p>
          <p className="mt-1 text-xs text-neutral-500">Imágenes WebP e iteraciones 3D</p>
        </div>
      </div>
    </div>
  );
}
