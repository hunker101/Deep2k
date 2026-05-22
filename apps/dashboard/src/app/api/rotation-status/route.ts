import { NextResponse } from 'next/server';

export async function GET() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';
  const token = process.env.ADMIN_TOKEN;
  if (!token) return NextResponse.json({ error: 'not configured' }, { status: 500 });

  const res = await fetch(`${apiBase}/api/admin/rotation-status`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const data = await res.json();
  return NextResponse.json(data);
}
