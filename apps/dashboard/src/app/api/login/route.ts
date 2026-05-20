import { NextResponse } from 'next/server';

const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60_000;

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const attempt = attempts.get(ip) ?? { count: 0, lockedUntil: 0 };

  if (now < attempt.lockedUntil) {
    const remaining = Math.ceil((attempt.lockedUntil - now) / 60_000);
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${remaining} minute${remaining === 1 ? '' : 's'}.` },
      { status: 429 },
    );
  }

  const { username, password } = (await request.json()) as { username?: string; password?: string };
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminUsername || !adminPassword || !adminToken) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (username !== adminUsername || password !== adminPassword) {
    attempt.count += 1;
    if (attempt.count >= MAX_ATTEMPTS) {
      attempt.lockedUntil = now + LOCKOUT_MS;
      attempt.count = 0;
    }
    attempts.set(ip, attempt);
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  attempts.delete(ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set('deep2k_token', adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return response;
}
