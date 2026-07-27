export default function AdminTable({
  columns,
  children,
  empty,
}: {
  columns: string[];
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-neutral-800">
      <table className="w-full min-w-full divide-y divide-neutral-800 text-sm">
        <thead className="bg-neutral-900">
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-neutral-400"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800 bg-neutral-950">{children}</tbody>
      </table>
      {empty && (
        <div className="border-t border-neutral-800 bg-neutral-950 px-4 py-10 text-center text-sm text-neutral-500">
          {empty}
        </div>
      )}
    </div>
  );
}
