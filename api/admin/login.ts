import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setSessionCookie } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({ error: 'Missing ADMIN_PASSWORD env var' });
    return;
  }

  const { password } = req.body ?? {};
  if (typeof password !== 'string' || password !== adminPassword) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }

  setSessionCookie(res);
  res.status(200).json({ ok: true });
}
