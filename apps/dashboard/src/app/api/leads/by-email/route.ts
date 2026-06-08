import { NextResponse } from 'next/server';

const apiBase = () => process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3000';
const token = () => process.env.ADMIN_TOKEN ?? '';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') ?? '';
  const res = await fetch(
    `${apiBase()}/api/leads/by-email?email=${encodeURIComponent(email)}`,
    { headers: { Authorization: `Bearer ${token()}` }, cache: 'no-store' }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
