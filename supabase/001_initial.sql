create extension if not exists pgcrypto;

create table if not exists public.event_settings (
  id text primary key,
  couple_names text not null default 'Alex & Sam',
  event_title text not null default 'request the pleasure of your company',
  event_date text not null default '',
  venue_name text not null default '',
  venue_address text not null default '',
  hero_message text not null default 'Please RSVP below.',
  whatsapp_template text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.event_settings (
  id,
  couple_names,
  event_title,
  event_date,
  venue_name,
  venue_address,
  hero_message,
  whatsapp_template
)
values (
  'default',
  'Talha & Wania',
  'request the pleasure of your company',
  '',
  '',
  '',
  'Please RSVP below.',
  'Hi {{guest_name}}!\n\nWe''d love to celebrate our wedding with you.\n\nYour personal invite + RSVP link:\n{{invite_url}}\n\nThis invite covers you + {{allowed_plus_ones}} guest(s).\n\nWith love,\n{{couple_names}}'
)
on conflict (id) do nothing;

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  invite_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  allowed_plus_ones integer not null default 0 check (allowed_plus_ones >= 0 and allowed_plus_ones <= 10),
  phone text,
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending', 'attending', 'declined')),
  attending_count integer,
  note text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_guests_full_name on public.guests(full_name);
create index if not exists idx_guests_invite_token on public.guests(invite_token);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_event_settings_updated_at
before update on public.event_settings
for each row
execute function public.set_updated_at();

create trigger set_guests_updated_at
before update on public.guests
for each row
execute function public.set_updated_at();

alter table public.event_settings enable row level security;
alter table public.guests enable row level security;

create policy "public read event settings"
on public.event_settings for select
to anon, authenticated
using (true);

create policy "public read guests"
on public.guests for select
to anon, authenticated
using (true);

create or replace function public.submit_rsvp(
  p_invite_token text,
  p_attending boolean,
  p_attending_count integer,
  p_note text default ''
)
returns public.guests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests;
begin
  update public.guests
  set
    rsvp_status = case when p_attending then 'attending' else 'declined' end,
    attending_count = case when p_attending then p_attending_count else 0 end,
    note = coalesce(p_note, ''),
    responded_at = now(),
    updated_at = now()
  where invite_token = p_invite_token
    and (
      (not p_attending)
      or (p_attending_count between 1 and allowed_plus_ones + 1)
    )
  returning * into v_guest;

  if v_guest.id is null then
    raise exception 'Invite not found or attending count invalid';
  end if;

  return v_guest;
end;
$$;

grant execute on function public.submit_rsvp(text, boolean, integer, text) to anon, authenticated;
