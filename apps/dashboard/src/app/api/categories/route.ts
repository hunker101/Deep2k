import { NextResponse } from 'next/server';

const apiBase = () => process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';
const token = () => process.env.ADMIN_TOKEN ?? '';

export async function GET() {
  const res = await fetch(`${apiBase()}/api/categories`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: 'no-store',
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: Request) {
  const body = await request.json() as { name?: string };
  const res = await fetch(`${apiBase()}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
