import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySessionCookie } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!verifySessionCookie(req)) {
    res.status(401).json({ authenticated: false });
    return;
  }

  res.status(200).json({ authenticated: true });
}
