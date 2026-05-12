export async function hashVisitor(
  ip: string,
  ua: string,
  salt: string,
  siteId: string,
): Promise<string> {
  const input = `${ip}|${ua}|${salt}|${siteId}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  let out = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < 8; i++) {
    const b = bytes[i] ?? 0;
    out += b.toString(16).padStart(2, '0');
  }
  return out;
}
