import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../_lib/auth.js';
import { supabaseAdmin } from '../_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const payload = req.body ?? {};

  const { error } = await supabaseAdmin.from('event_settings').upsert({
    id: 'default',
    couple_names: payload.couple_names ?? 'Talha & Wania',
    event_title: payload.event_title ?? 'request the pleasure of your company',
    event_date: payload.event_date ?? '',
    venue_name: payload.venue_name ?? '',
    venue_address: payload.venue_address ?? '',
    hero_message: payload.hero_message ?? '',
    whatsapp_template: payload.whatsapp_template ?? '',
  });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(200).json({ ok: true });
}
