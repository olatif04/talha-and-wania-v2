# Wedding Invite Manager

A polished wedding invite + RSVP app built for Vercel and Supabase.

## What it does

- Public landing page with name lookup
- Personal invite pages using tokenized URLs like `/invite/<token>`
- RSVP form with attendance count and optional note
- Password-protected admin page at `/admin`
- Admin can add guests and specify how many guests they may bring
- Admin can edit the default WhatsApp message template
- After creating a guest, the app generates a ready-to-send message with their personal invite link
- Built to keep working on a Vercel custom domain because invite links use `window.location.origin`

## Stack

- React + Vite + TypeScript
- Supabase
- Vercel serverless functions for admin auth and admin-only writes
- Plain CSS with system fonts only

## Setup

1. Create a Supabase project.
2. Run the SQL in `supabase/001_initial.sql`.
3. In Vercel, add these environment variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

4. Deploy to Vercel.
5. Open `/admin`, log in with `ADMIN_PASSWORD`, then fill out event settings and start adding guests.

## Local development

```bash
pnpm install
pnpm dev
```

## Notes on security

This setup keeps the admin password server-side through Vercel API routes and sets an httpOnly session cookie. That is much better than exposing the admin password in the frontend.

Public invite lookup and invite page reads use the Supabase anon key. For a wedding-sized guest list, that is usually fine. If you later want stricter privacy, move public lookups into serverless routes too.

## Files worth knowing

- `src/components/HomePage.tsx` — public search page
- `src/components/InvitePage.tsx` — personal invite + RSVP page
- `src/components/AdminPage.tsx` — admin dashboard
- `api/admin/*` — password login and admin-only server routes
- `supabase/001_initial.sql` — tables, policies, and RSVP function

## Deployment guardrails carried over from the last project

- Node is set to `20.x`, not a fragile patch pin
- `pnpm` is used
- `vercel.json` uses a normal build command
- No Google Fonts dependency
- No weird install hacks in the build command
- Relative `/api/...` usage and origin-based invite URLs make custom domains safe
