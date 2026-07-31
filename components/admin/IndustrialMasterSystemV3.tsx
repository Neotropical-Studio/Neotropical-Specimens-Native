'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import MirrorVisionPanel from '@/components/admin/MirrorVisionPanel';

type Tab = 'DASHBOARD' | 'TAXONOMÍA' | 'ADUANAS' | 'LOGÍSTICA';

type ConsolaItem = {
  id: string;
  fullId?: string;
  name: string;
  stock: number | string;
  status: 'APROBADO' | 'PENDIENTE' | 'OUT';
};

const TABS: { id: Tab; href?: string }[] = [
  { id: 'DASHBOARD' },
  { id: 'TAXONOMÍA', href: '/admin/especimenes' },
  { id: 'ADUANAS', href: '/admin/embarques' },
  { id: 'LOGÍSTICA', href: '/admin/embarques' },
];

export default function IndustrialMasterSystemV3() {
  const [activeTab, setActiveTab] = useState<Tab>('DASHBOARD');
  const [data, setData] = useState<ConsolaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sincronizarSistema = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/consola-sync', { cache: 'no-store' });
      const text = await res.text();
      let json: {
        error?: string;
        rows?: Array<{
          id: string;
          fullId?: string;
          name: string;
          stock: number | string;
          status: ConsolaItem['status'];
        }>;
      } = {};
      try {
        json = text ? (JSON.parse(text) as typeof json) : {};
      } catch {
        throw new Error(
          text?.slice(0, 180) ||
            'Respuesta vacía del servidor (revisa SUPABASE_SERVICE_ROLE_KEY en Vercel)',
        );
      }
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setData(
        (json.rows ?? []).map((r) => ({
          id: r.id,
          fullId: r.fullId,
          name: r.name,
          stock: r.stock,
          status: r.status,
        })),
      );
    } catch (e) {
      setError((e as Error).message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void sincronizarSistema();
  }, [sincronizarSistema]);

  return (
    <div className="min-h-[70vh] bg-zinc-950 p-6 font-mono text-emerald-400">
      <header className="mb-6 flex flex-col gap-4 border-b border-emerald-900 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-4 text-3xl font-black uppercase tracking-tighter text-white">
            <Cpu size={32} className="text-emerald-500" />
            {'>'} CONSOLA MAESTRA V-3
          </h1>
          <p className="text-xs italic text-emerald-700">
            Arquitectura: Espejo Cloudinary ↔ Supabase · orden 1 SQL → 2 ESPEJO → 3 panel
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/espejo"
            className="border border-sky-700 bg-sky-950/40 px-4 py-3 text-xs font-bold uppercase text-sky-300 transition hover:bg-sky-900"
          >
            Panel espejo →
          </Link>
          <button
            type="button"
            onClick={() => void sincronizarSistema()}
            disabled={loading}
            className="flex items-center gap-2 border border-emerald-500 bg-emerald-950 px-6 py-3 font-bold transition-all hover:bg-emerald-900 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {loading ? 'PROCESANDO...' : 'RECARGAR BASE'}
          </button>
        </div>
      </header>

      <MirrorVisionPanel className="mb-6" autoDiscover />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <nav className="space-y-2">
          {TABS.map((tab) =>
            tab.href ? (
              <Link
                key={tab.id}
                href={tab.href}
                className="block w-full border border-zinc-800 bg-zinc-900 p-4 text-left transition-all hover:border-emerald-700"
              >
                {tab.id} →
              </Link>
            ) : (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full border p-4 text-left transition-all ${
                  activeTab === tab.id
                    ? 'border-white bg-emerald-900 text-white'
                    : 'border-zinc-800 bg-zinc-900'
                }`}
              >
                {tab.id}
              </button>
            ),
          )}
        </nav>

        <main className="border border-emerald-900 bg-zinc-900 p-6 lg:col-span-3">
          <h2 className="mb-6 flex items-center gap-2 font-bold text-white">
            <Database size={18} /> MÓDULO: {activeTab}
          </h2>

          {error && (
            <div className="mb-4 border border-red-800 bg-red-950/40 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          {loading && data.length === 0 ? (
            <div className="py-12 text-center text-sm text-emerald-700">PROCESANDO…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-emerald-900 uppercase text-emerald-600">
                  <tr>
                    <th className="p-3">ID LOTE</th>
                    <th className="p-3">ESPECIE</th>
                    <th className="p-3">STOCK</th>
                    <th className="p-3">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr
                      key={item.fullId ?? item.id}
                      className="border-b border-emerald-950 transition-colors hover:bg-zinc-800"
                    >
                      <td className="p-3 font-bold">{item.id}</td>
                      <td className="p-3 text-white">{item.name}</td>
                      <td className="p-3">{item.stock}</td>
                      <td className="p-3">
                        {item.status === 'APROBADO' ? (
                          <CheckCircle2 className="text-emerald-500" size={16} />
                        ) : (
                          <AlertTriangle className="text-yellow-600" size={16} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
