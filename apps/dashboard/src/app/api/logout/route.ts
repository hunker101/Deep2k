import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = `${url.protocol}//${url.host}`;
  const response = NextResponse.redirect(new URL('/login', base));
  response.cookies.set('deep2k_token', '', { maxAge: 0, path: '/' });
  return response;
}
