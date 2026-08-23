const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface AdminSessionPayload {
  id: string;
  email: string;
  role: 'super_admin' | 'editor' | 'viewer';
  iat: number;
  exp: number;
}

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET?.trim() || process.env.ADMIN_PASSWORD?.trim() || '';
}

function toBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

async function sign(value: string): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error('ADMIN_SESSION_SECRET or ADMIN_PASSWORD is not configured');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  let binary = '';
  new Uint8Array(signature).forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

export async function createAdminSession(email: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    id: process.env.ADMIN_ID?.trim() || 'env-admin',
    email,
    role: 'super_admin',
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifyAdminSession(value: string | undefined | null): Promise<AdminSessionPayload | null> {
  if (!value) return null;
  try {
    const separator = value.lastIndexOf('.');
    if (separator <= 0) return null;
    const encoded = value.slice(0, separator);
    const providedSignature = value.slice(separator + 1);
    const expectedSignature = await sign(encoded);
    if (!equal(providedSignature, expectedSignature)) return null;
    const payload = JSON.parse(fromBase64Url(encoded)) as AdminSessionPayload;
    if (!payload.email || !payload.id || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const ADMIN_SESSION_TTL_SECONDS = SESSION_TTL_SECONDS;
