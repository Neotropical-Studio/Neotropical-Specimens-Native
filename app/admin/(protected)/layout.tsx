// Grupo de rutas (protected): todo lo que cuelga de aquí exige un admin_users
// activo. app/admin/login queda FUERA de este grupo a propósito — si
// requireAdmin() envolviera también el login, un visitante sin sesión jamás
// podría llegar a la página para autenticarse (bucle de redirección).
import { requireAdmin } from '@/lib/auth/admin';
import AdminNav from '@/components/admin/AdminNav';

export const metadata = { title: 'Admin · Neotropical Specimens Native' };

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <AdminNav admin={admin} />
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
