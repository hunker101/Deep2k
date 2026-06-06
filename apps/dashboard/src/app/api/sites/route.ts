import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json() as { domain?: string; categoryId?: string | null };
  if (!body.domain) {
    return NextResponse.json({ error: 'domain required' }, { status: 400 });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';
  const token = process.env.ADMIN_TOKEN;
  if (!token) return NextResponse.json({ error: 'not configured' }, { status: 500 });

  // Create the site
  const createRes = await fetch(`${apiBase}/api/sites`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ domain: body.domain, categoryId: body.categoryId ?? null }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    return NextResponse.json(err, { status: createRes.status });
  }

  const site = await createRes.json() as { id: string };

  // Fetch the generated tracker script
  const scriptRes = await fetch(`${apiBase}/api/sites/${site.id}/script`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const script = scriptRes.ok ? await scriptRes.text() : '';

  return NextResponse.json({ ...site, script });
}
