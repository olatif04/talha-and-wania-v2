export type EventSettings = {
  id: 'default';
  couple_names: string;
  event_title: string;
  event_date: string;
  venue_name: string;
  venue_address: string;
  hero_message: string;
  whatsapp_template: string;
  created_at?: string;
  updated_at?: string;
};

export type Guest = {
  id: string;
  full_name: string;
  invite_token: string;
  allowed_plus_ones: number;
  phone: string | null;
  rsvp_status: 'pending' | 'attending' | 'declined';
  attending_count: number | null;
  note: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type GuestLookup = Pick<Guest, 'full_name' | 'invite_token' | 'allowed_plus_ones' | 'rsvp_status'>;
