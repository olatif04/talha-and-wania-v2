import crypto from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ guests: data ?? [] });
    return;
  }

  if (req.method === 'POST') {
    const { full_name, allowed_plus_ones, phone } = req.body ?? {};

    if (typeof full_name !== 'string' || !full_name.trim()) {
      res.status(400).json({ error: 'Guest name is required.' });
      return;
    }

    const plusOnes = Number(allowed_plus_ones ?? 0);
    if (!Number.isInteger(plusOnes) || plusOnes < 0 || plusOnes > 10) {
      res.status(400).json({ error: 'allowed_plus_ones must be an integer between 0 and 10.' });
      return;
    }

    const invite_token = crypto.randomBytes(16).toString('hex');

    const { data, error } = await supabaseAdmin
      .from('guests')
      .insert({
        full_name: full_name.trim(),
        allowed_plus_ones: plusOnes,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
        invite_token,
      })
      .select('*')
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ guest: data });
    return;
  }

  if (req.method === 'PUT') {
    const { id, full_name, allowed_plus_ones, phone } = req.body ?? {};

    if (typeof id !== 'string' || !id) {
      res.status(400).json({ error: 'Guest id is required.' });
      return;
    }

    if (typeof full_name !== 'string' || !full_name.trim()) {
      res.status(400).json({ error: 'Guest name is required.' });
      return;
    }

    const plusOnes = Number(allowed_plus_ones ?? 0);
    if (!Number.isInteger(plusOnes) || plusOnes < 0 || plusOnes > 10) {
      res.status(400).json({ error: 'allowed_plus_ones must be an integer between 0 and 10.' });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from('guests')
      .update({
        full_name: full_name.trim(),
        allowed_plus_ones: plusOnes,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ guest: data });
    return;
  }

  if (req.method === 'DELETE') {
    const id = typeof req.query.id === 'string' ? req.query.id : req.body?.id;

    if (typeof id !== 'string' || !id) {
      res.status(400).json({ error: 'Guest id is required.' });
      return;
    }

    const { error } = await supabaseAdmin.from('guests').delete().eq('id', id);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
