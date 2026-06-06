import { NextResponse } from 'next/server';

const apiBase = () => process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';
const token = () => process.env.ADMIN_TOKEN ?? '';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json() as { name?: string };
  const res = await fetch(`${apiBase()}/api/categories/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${apiBase()}/api/categories/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token()}` },
  });
  return new NextResponse(null, { status: res.status });
}
