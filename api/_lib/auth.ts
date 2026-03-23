import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const COOKIE_NAME = 'wedding_admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('Missing ADMIN_SESSION_SECRET');
  return secret;
}

function sign(value: string) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('base64url');
}

export function createSessionValue() {
  const payload = JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE });
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionCookie(req: VercelRequest) {
  const raw = req.cookies[COOKIE_NAME];
  if (!raw) return false;

  const [encoded, signature] = raw.split('.');
  if (!encoded || !signature) return false;
  if (sign(encoded) !== signature) return false;

  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as { exp?: number };
  return !!payload.exp && payload.exp > Math.floor(Date.now() / 1000);
}

export function setSessionCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${createSessionValue()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}; Secure`);
}

export function clearSessionCookie(res: VercelResponse) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`);
}

export function requireAdmin(req: VercelRequest, res: VercelResponse) {
  if (!verifySessionCookie(req)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
