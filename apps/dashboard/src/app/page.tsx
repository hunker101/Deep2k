import Link from 'next/link';
import { fetchSites } from '@/lib/api';

export default async function HomePage() {
  const sites = await fetchSites().catch(() => []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Sites</h2>
        <span className="text-sm text-neutral-500">{sites.length} total</span>
      </div>

      {sites.length === 0 ? (
        <div className="rounded border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No sites yet. Run <code className="font-mono">pnpm seed:pilot</code> or POST to{' '}
          <code className="font-mono">/api/sites</code>.
        </div>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded border border-neutral-200 bg-white">
          {sites.map((s) => (
            <li key={s.id} className="px-4 py-3">
              <Link
                href={`/sites/${s.id}`}
                className="flex items-center justify-between hover:bg-neutral-50"
              >
                <div>
                  <div className="font-medium">{s.domain}</div>
                  <div className="text-xs text-neutral-500">
                    {s.scriptPath} · {s.endpointPath} · {s.beaconMethod}
                  </div>
                </div>
                <span className="text-xs text-neutral-400">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
