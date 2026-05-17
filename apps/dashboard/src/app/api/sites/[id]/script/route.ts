import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';
  const token = process.env.ADMIN_TOKEN;
  if (!token) return NextResponse.json({ error: 'not configured' }, { status: 500 });

  const res = await fetch(`${apiBase}/api/sites/${id}/script`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) return NextResponse.json({ error: 'not found' }, { status: res.status });
  const script = await res.text();
  return new NextResponse(script, { headers: { 'Content-Type': 'application/javascript' } });
}
