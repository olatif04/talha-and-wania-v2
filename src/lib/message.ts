import type { EventSettings, Guest } from './types';

const defaultTemplate = `Hi {{guest_name}}!\n\nWe'd love to celebrate our wedding with you.\n\nYour personal invite + RSVP link:\n{{invite_url}}\n\nThis invite covers you + {{allowed_plus_ones}} guest(s).\n\nWith love,\n{{couple_names}}`;

function normalizeTemplate(rawTemplate: string) {
  return rawTemplate
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function renderWhatsappMessage(settings: Partial<EventSettings> | null, guest: Pick<Guest, 'full_name' | 'allowed_plus_ones' | 'invite_token'>, origin: string) {
  const template = normalizeTemplate(settings?.whatsapp_template?.trim() || defaultTemplate);
  const inviteUrl = `${origin.replace(/\/$/, '')}/invite/${guest.invite_token}`;

  return template
    .split('{{guest_name}}').join(guest.full_name)
    .split('{{invite_url}}').join(inviteUrl)
    .split('{{allowed_plus_ones}}').join(String(guest.allowed_plus_ones))
    .split('{{couple_names}}').join(settings?.couple_names || 'The happy couple');
}

export const MESSAGE_TEMPLATE_HELP = 'Available placeholders: {{guest_name}}, {{invite_url}}, {{allowed_plus_ones}}, {{couple_names}}';
