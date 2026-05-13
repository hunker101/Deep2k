import { NextResponse } from 'next/server';

export async function GET() {
  const response = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:3001'));
  response.cookies.set('deep2k_token', '', { maxAge: 0, path: '/' });
  return response;
}
