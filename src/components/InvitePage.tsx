import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from './AppShell';
import { LoadingCard } from './LoadingCard';
import { supabase } from '../lib/supabase';
import type { EventSettings, Guest } from '../lib/types';
import { formatEventDate, pluralize } from '../lib/format';

const defaultSettings: EventSettings = {
  id: 'default',
  couple_names: 'Alex & Sam',
  event_title: 'request the pleasure of your company',
  event_date: '',
  venue_name: 'Venue name',
  venue_address: 'Venue address',
  hero_message: 'Please RSVP below.',
  whatsapp_template: '',
};

export function InvitePage() {
  const { token = '' } = useParams();
  const [settings, setSettings] = useState<EventSettings>(defaultSettings);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attending, setAttending] = useState(true);
  const [attendingCount, setAttendingCount] = useState(1);
  const [note, setNote] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: settingsData }, guestResponse] = await Promise.all([
        supabase.from('event_settings').select('*').eq('id', 'default').maybeSingle(),
        supabase.from('guests').select('*').eq('invite_token', token).maybeSingle(),
      ]);

      if (settingsData) setSettings(settingsData as EventSettings);

      if (guestResponse.error || !guestResponse.data) {
        setError('Invite not found. Double-check the link you were sent.');
      } else {
        const loadedGuest = guestResponse.data as Guest;
        setGuest(loadedGuest);
        setAttending(loadedGuest.rsvp_status !== 'declined');
        setAttendingCount(loadedGuest.attending_count || 1);
        setNote(loadedGuest.note || '');
      }

      setLoading(false);
    }

    void load();
  }, [token]);

  const maxAttendees = useMemo(() => (guest ? guest.allowed_plus_ones + 1 : 1), [guest]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);

    const { data, error: submitError } = await supabase.rpc('submit_rsvp', {
      p_invite_token: token,
      p_attending: attending,
      p_attending_count: attending ? attendingCount : 0,
      p_note: note,
    });

    if (submitError) {
      setError(submitError.message);
    } else {
      const updatedGuest = data as Guest;
      setGuest(updatedGuest);
      setSuccess('Your RSVP has been saved. Thank you.');
    }

    setSaving(false);
  }

  return (
    <AppShell>
      <Link className="back-link" to="/">← Find another invite</Link>
      {loading && <LoadingCard label="Loading your invitation…" />}
      {!loading && error && <div className="card notice error">{error}</div>}
      {!loading && guest && (
        <>
          <section className="hero-card card">
            <div className="hero-eyebrow">You’re invited</div>
            <h1>{settings.couple_names}</h1>
            <p className="hero-title">{settings.event_title}</p>
            <p className="lead invitee-name">Dear {guest.full_name},</p>
            <p className="lead">{settings.hero_message}</p>
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
          </section>

          <section className="card">
            <h2>RSVP</h2>
            <p className="muted-text">
              Your invite covers you plus {guest.allowed_plus_ones} {pluralize(guest.allowed_plus_ones, 'additional guest')}.
            </p>
            <form className="stack" onSubmit={onSubmit}>
              <div className="radio-row">
                <label className={`choice-card ${attending ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    checked={attending}
                    onChange={() => setAttending(true)}
                    name="attendance"
                  />
                  Joyfully attending
                </label>
                <label className={`choice-card ${!attending ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    checked={!attending}
                    onChange={() => setAttending(false)}
                    name="attendance"
                  />
                  Regretfully declining
                </label>
              </div>

              {attending && (
                <label className="field-block">
                  <span>Total attending from your invite</span>
                  <select value={attendingCount} onChange={(event) => setAttendingCount(Number(event.target.value))}>
                    {Array.from({ length: maxAttendees }, (_, index) => index + 1).map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="field-block">
                <span>Optional note</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Dietary notes, a sweet message, or anything else"
                  rows={5}
                />
              </label>

              {success && <div className="notice success">{success}</div>}
              {error && <div className="notice error">{error}</div>}

              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? 'Saving RSVP…' : 'Save RSVP'}
              </button>
            </form>
          </section>
        </>
      )}
    </AppShell>
  );
}
