import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, LogOut, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { AppShell } from './AppShell';
import { LoadingCard } from './LoadingCard';
import { renderWhatsappMessage, MESSAGE_TEMPLATE_HELP } from '../lib/message';
import { supabase } from '../lib/supabase';
import type { EventSettings, Guest } from '../lib/types';

type EditableGuestFields = Pick<Guest, 'id' | 'full_name' | 'allowed_plus_ones' | 'phone' | 'invite_token'>;

const defaultSettings: EventSettings = {
  id: 'default',
  couple_names: 'Talha & Wania',
  event_title: 'request the pleasure of your company',
  event_date: '',
  venue_name: 'Venue name',
  venue_address: 'Venue address',
  hero_message: 'Please RSVP below.',
  whatsapp_template: '',
};

const emptyGuestForm = {
  id: '',
  full_name: '',
  phone: '',
  allowed_plus_ones: 0,
};

type AdminGuestResponse = {
  guest: Guest;
};

export function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [settings, setSettings] = useState<EventSettings>(defaultSettings);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestForm, setGuestForm] = useState(emptyGuestForm);
  const [messageDraft, setMessageDraft] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editingGuest = guestForm.id ? guests.find((guest) => guest.id === guestForm.id) ?? null : null;

  useEffect(() => {
    async function bootstrap() {
      const authResponse = await fetch('/api/admin/me', { credentials: 'include' });
      setAuthenticated(authResponse.ok);
      setChecking(false);
      const { data } = await supabase.from('event_settings').select('*').eq('id', 'default').maybeSingle();
      if (data) setSettings(data as EventSettings);
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    async function loadGuests() {
      const response = await fetch('/api/admin/guests', { credentials: 'include' });
      if (!response.ok) return;
      const payload = (await response.json()) as { guests: Guest[] };
      setGuests(payload.guests);
    }

    void loadGuests();
  }, [authenticated]);

  const renderedMessage = useMemo(() => {
    if (!selectedGuest) return '';
    return renderWhatsappMessage(settings, selectedGuest, window.location.origin);
  }, [selectedGuest, settings]);

  useEffect(() => {
    if (renderedMessage) setMessageDraft(renderedMessage);
  }, [renderedMessage]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError(null);

    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password: loginPassword }),
    });

    if (!response.ok) {
      setLoginError('Wrong password.');
      return;
    }

    setAuthenticated(true);
    setLoginPassword('');
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    setAuthenticated(false);
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);

    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      setError('Could not save event settings.');
    } else {
      setNotice('Event settings saved.');
    }

    setBusy(false);
  }

  function resetGuestForm() {
    setGuestForm(emptyGuestForm);
  }

  async function submitGuest(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);

    const method = guestForm.id ? 'PUT' : 'POST';
    const response = await fetch('/api/admin/guests', {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: guestForm.id || undefined,
        full_name: guestForm.full_name,
        allowed_plus_ones: guestForm.allowed_plus_ones,
        phone: guestForm.phone,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error || `Could not ${guestForm.id ? 'update' : 'create'} guest.`);
      setBusy(false);
      return;
    }

    const payload = (await response.json()) as AdminGuestResponse;
    const savedGuest = payload.guest;

    if (guestForm.id) {
      setGuests((current) => current.map((guest) => (guest.id === savedGuest.id ? savedGuest : guest)));
      setNotice('Guest updated.');
    } else {
      setGuests((current) => [savedGuest, ...current]);
      setNotice('Guest created. Share the message below.');
    }

    setSelectedGuest(savedGuest);
    setGuestForm(emptyGuestForm);
    setBusy(false);
  }

  function startEditingGuest(guest: Guest) {
    setGuestForm({
      id: guest.id,
      full_name: guest.full_name,
      allowed_plus_ones: guest.allowed_plus_ones,
      phone: guest.phone || '',
    });
    setSelectedGuest(guest);
    setNotice(null);
    setError(null);
  }

  async function deleteGuest(guest: Guest) {
    const confirmed = window.confirm(`Delete invite for ${guest.full_name}? This cannot be undone.`);
    if (!confirmed) return;

    setBusy(true);
    setNotice(null);
    setError(null);

    const response = await fetch(`/api/admin/guests?id=${encodeURIComponent(guest.id)}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error || 'Could not delete guest.');
      setBusy(false);
      return;
    }

    setGuests((current) => current.filter((item) => item.id !== guest.id));
    if (selectedGuest?.id === guest.id) {
      setSelectedGuest(null);
      setMessageDraft('');
    }
    if (guestForm.id === guest.id) resetGuestForm();
    setNotice('Guest deleted.');
    setBusy(false);
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice('Copied to clipboard.');
  }

  async function copyGuestMessage(guest: Guest) {
    const text = renderWhatsappMessage(settings, guest, window.location.origin);
    setSelectedGuest(guest);
    setMessageDraft(text);
    await copyText(text);
  }

  if (checking) {
    return (
      <AppShell>
        <LoadingCard label="Checking admin session…" />
      </AppShell>
    );
  }

  if (!authenticated) {
    return (
      <AppShell>
        <section className="card auth-card centered-card">
          <div className="hero-eyebrow">Private</div>
          <h1>Admin access</h1>
          <p className="muted-text">This page is password-protected through a server-side Vercel function.</p>
          <form className="stack" onSubmit={login}>
            <label className="field-block">
              <span>Password</span>
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="Enter admin password"
              />
            </label>
            {loginError && <div className="notice error">{loginError}</div>}
            <button className="primary-button" type="submit">Unlock admin</button>
          </form>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="admin-header">
        <div className="centered-copy">
          <div className="hero-eyebrow">Wedding dashboard</div>
          <h1>Wedding invite admin</h1>
          <p className="muted-text">Create invites, tune the public wording, and manage RSVPs.</p>
        </div>
        <button className="secondary-button" onClick={logout}><LogOut size={16} /> Log out</button>
      </div>

      <div className="admin-grid">
        <section className="card centered-card">
          <h2>Event settings</h2>
          <form className="stack" onSubmit={saveSettings}>
            <label className="field-block"><span>Couple names</span><input value={settings.couple_names} onChange={(e) => setSettings({ ...settings, couple_names: e.target.value })} /></label>
            <label className="field-block"><span>Invite headline</span><input value={settings.event_title} onChange={(e) => setSettings({ ...settings, event_title: e.target.value })} /></label>
            <label className="field-block"><span>Date and time</span><input type="datetime-local" value={settings.event_date} onChange={(e) => setSettings({ ...settings, event_date: e.target.value })} /></label>
            <label className="field-block"><span>Venue name</span><input value={settings.venue_name} onChange={(e) => setSettings({ ...settings, venue_name: e.target.value })} /></label>
            <label className="field-block"><span>Venue address</span><input value={settings.venue_address} onChange={(e) => setSettings({ ...settings, venue_address: e.target.value })} /></label>
            <label className="field-block"><span>Public intro message</span><textarea rows={4} value={settings.hero_message} onChange={(e) => setSettings({ ...settings, hero_message: e.target.value })} /></label>
            <label className="field-block">
              <span>Default WhatsApp message</span>
              <textarea rows={8} value={settings.whatsapp_template} onChange={(e) => setSettings({ ...settings, whatsapp_template: e.target.value })} />
              <small className="muted-text">{MESSAGE_TEMPLATE_HELP}</small>
            </label>
            <button className="primary-button" type="submit" disabled={busy}>Save event settings</button>
          </form>
        </section>

        <section className="card centered-card">
          <h2>{editingGuest ? 'Edit guest' : 'Add guest'}</h2>
          <form className="stack" onSubmit={submitGuest}>
            <label className="field-block"><span>Guest name</span><input value={guestForm.full_name} onChange={(e) => setGuestForm({ ...guestForm, full_name: e.target.value })} placeholder="Jordan Lee" required /></label>
            <label className="field-block"><span>Phone (optional)</span><input value={guestForm.phone} onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })} placeholder="WhatsApp number for your own reference" /></label>
            <label className="field-block"><span>How many guests they can bring</span><input type="number" min={0} max={10} value={guestForm.allowed_plus_ones} onChange={(e) => setGuestForm({ ...guestForm, allowed_plus_ones: Number(e.target.value) })} /></label>
            <div className="button-row wrap-row">
              <button className="primary-button" type="submit" disabled={busy}>
                {editingGuest ? <><Save size={16} /> Save guest</> : <><Plus size={16} /> Add guest</>}
              </button>
              {editingGuest && <button className="secondary-button" type="button" onClick={resetGuestForm}><X size={16} /> Cancel edit</button>}
            </div>
          </form>

          {notice && <div className="notice success">{notice}</div>}
          {error && <div className="notice error">{error}</div>}

          {selectedGuest && (
            <div className="message-box">
              <div className="message-box-header">
                <div>
                  <h3>Shareable WhatsApp message</h3>
                  <p className="muted-text compact-text">For {selectedGuest.full_name}</p>
                </div>
                <button className="secondary-button" onClick={() => copyText(messageDraft)}><Copy size={16} /> Copy</button>
              </div>
              <p className="muted-text">The text below starts with the saved default template, then you can tweak it before sending.</p>
              <textarea rows={10} value={messageDraft} onChange={(e) => setMessageDraft(e.target.value)} />
            </div>
          )}
        </section>
      </div>

      <section className="card centered-card">
        <div className="section-header">
          <h2>Guest list</h2>
          <span className="muted-text">{guests.length} total</span>
        </div>
        <div className="guest-table-wrapper">
          <table className="guest-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Allowed plus-ones</th>
                <th>Status</th>
                <th>Attending count</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <tr key={guest.id}>
                  <td>{guest.full_name}</td>
                  <td>{guest.allowed_plus_ones}</td>
                  <td><span className={`status-pill ${guest.rsvp_status}`}>{guest.rsvp_status}</span></td>
                  <td>{guest.attending_count ?? '—'}</td>
                  <td className="note-cell">{guest.note || '—'}</td>
                  <td>
                    <div className="table-actions">
                      <button className="secondary-button small-button" type="button" onClick={() => copyGuestMessage(guest)}><Copy size={15} /> Copy msg</button>
                      <button className="secondary-button small-button" type="button" onClick={() => startEditingGuest(guest)}><Pencil size={15} /> Edit</button>
                      <button className="danger-button small-button" type="button" onClick={() => deleteGuest(guest)}><Trash2 size={15} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
