import Link from 'next/link';
import { fetchSiteStats } from '@/lib/api';

export default async function SitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stats = await fetchSiteStats(id).catch(() => []);

  const totalPageviews = stats.reduce((acc, r) => acc + r.pageviews, 0);
  const totalVisitors = stats.reduce((acc, r) => acc + r.uniqueVisitors, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-700">
          ← back
        </Link>
        <h2 className="text-xl font-semibold">Site {id.slice(0, 8)}</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Stat label="Pageviews" value={totalPageviews} />
        <Stat label="Unique visitors" value={totalVisitors} />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-medium text-neutral-600">Daily</h3>
        {stats.length === 0 ? (
          <div className="rounded border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
            No data yet. Aggregation runs hourly; ingestion + aggregation are Phase 2.
          </div>
        ) : (
          <table className="w-full overflow-hidden rounded border border-neutral-200 bg-white text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Pageviews</th>
                <th className="px-3 py-2 text-right">Visitors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {stats.map((r) => (
                <tr key={r.date}>
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2 text-right">{r.pageviews.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{r.uniqueVisitors.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
