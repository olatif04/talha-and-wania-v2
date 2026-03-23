import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Search } from 'lucide-react';
import { AppShell } from './AppShell';
import { LoadingCard } from './LoadingCard';
import { supabase } from '../lib/supabase';
import type { EventSettings, GuestLookup } from '../lib/types';
import { formatEventDate, pluralize } from '../lib/format';

const defaultSettings: EventSettings = {
  id: 'default',
  couple_names: 'Talha & Wania',
  event_title: 'Together with their families, invite you to celebrate',
  event_date: '',
  venue_name: 'Venue name',
  venue_address: 'Venue address',
  hero_message: 'Please search for your invitation using your name below.',
  whatsapp_template: '',
};

export function HomePage() {
  const [settings, setSettings] = useState<EventSettings>(defaultSettings);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GuestLookup[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('event_settings').select('*').eq('id', 'default').maybeSingle();
      if (data) setSettings(data as EventSettings);
      setLoading(false);
    }

    void loadSettings();
  }, []);

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    setSearching(true);
    setError(null);
    setResults([]);

    const trimmed = name.trim();
    if (!trimmed) {
      setSearching(false);
      setError('Enter your name first.');
      return;
    }

    const { data, error: lookupError } = await supabase
      .from('guests')
      .select('full_name, invite_token, allowed_plus_ones, rsvp_status')
      .ilike('full_name', `%${trimmed}%`)
      .order('full_name', { ascending: true })
      .limit(10);

    if (lookupError) {
      setError(lookupError.message);
    } else if (!data?.length) {
      setError('No invite matched that search. Try the full name used by the couple.');
    } else {
      setResults(data as GuestLookup[]);
    }

    setSearching(false);
  }

  return (
    <AppShell>
      <section className="hero-card card">
        <div className="hero-eyebrow"><Heart size={18} /> Wedding invitation</div>
        <h1>{settings.couple_names}</h1>
        <p className="hero-title">{settings.event_title}</p>
        <div className="event-meta">
          <div>
            <span className="label">When</span>
            <strong>{formatEventDate(settings.event_date)}</strong>
          </div>
          <div>
            <span className="label">Where</span>
            <strong>{settings.venue_name}</strong>
            <span>{settings.venue_address}</span>
          </div>
        </div>
        <p className="lead">{settings.hero_message}</p>
      </section>

      <section className="card">
        <h2>Find your invite</h2>
        <form className="search-row" onSubmit={onSearch}>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your full name"
          />
          <button type="submit" className="primary-button" disabled={searching}>
            <Search size={18} /> {searching ? 'Searching…' : 'Find invite'}
          </button>
        </form>
        <p className="muted-text">If your invite is in the system, you’ll be taken to your personal RSVP page.</p>

        {loading && <LoadingCard label="Loading wedding details…" />}
        {!loading && error && <div className="notice error">{error}</div>}

        {!!results.length && (
          <div className="result-list">
            {results.map((guest) => (
              <Link key={guest.invite_token} className="result-card" to={`/invite/${guest.invite_token}`}>
                <div>
                  <strong>{guest.full_name}</strong>
                  <span>
                    Invite covers 1 + {guest.allowed_plus_ones} {pluralize(guest.allowed_plus_ones, 'guest')}
                  </span>
                </div>
                <span className={`status-pill ${guest.rsvp_status}`}>{guest.rsvp_status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
