const COLORS: Record<string, string> = {
  draft: 'bg-neutral-700 text-neutral-200',
  pending: 'bg-amber-900/60 text-amber-300',
  permits_pending: 'bg-amber-900/60 text-amber-300',
  submitted: 'bg-sky-900/60 text-sky-300',
  ready: 'bg-emerald-900/60 text-emerald-300',
  approved: 'bg-emerald-900/60 text-emerald-300',
  in_transit: 'bg-indigo-900/60 text-indigo-300',
  delivered: 'bg-emerald-900/60 text-emerald-300',
  rejected: 'bg-red-900/60 text-red-300',
  cancelled: 'bg-red-900/60 text-red-300',
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = COLORS[status] ?? 'bg-neutral-700 text-neutral-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
