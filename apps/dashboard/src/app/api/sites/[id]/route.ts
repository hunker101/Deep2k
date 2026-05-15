import { NextResponse } from 'next/server';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';
  const token = process.env.ADMIN_TOKEN;
  if (!token) return NextResponse.json({ error: 'not configured' }, { status: 500 });

  const res = await fetch(`${apiBase}/api/sites/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
