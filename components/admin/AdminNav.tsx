import Link from 'next/link';
import { LogOut, LayoutDashboard, Bug, ImagePlay, Megaphone, Truck, FolderInput } from 'lucide-react';
import type { AdminUser } from '@/lib/auth/admin';
import { signOutAction } from '@/app/admin/actions';

const NAV = [
  { href: '/admin',             label: 'Panel',                 icon: LayoutDashboard },
  { href: '/admin/especimenes', label: 'Taxonomía y Datos',     icon: Bug },
  { href: '/admin/multimedia',  label: 'Multimedia y 3D',       icon: ImagePlay },
  { href: '/admin/ingesta',     label: 'Ingesta de Activos',    icon: FolderInput },
  { href: '/admin/campanas',    label: 'Campañas',              icon: Megaphone },
  { href: '/admin/embarques',   label: 'Documentos y Logística', icon: Truck },
];

export default function AdminNav({ admin }: { admin: AdminUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/admin" className="text-sm font-semibold tracking-wide text-emerald-400">
            NEOTROPICAL · Admin
          </Link>
          <nav className="flex flex-wrap gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-400">
          <span className="hidden sm:inline">
            {admin.email} · <span className="text-neutral-500">{admin.role}</span>
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 transition hover:border-red-700 hover:text-red-300"
            >
              <LogOut size={14} /> Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
