# PizzaBot — Architecture & Conventions

> This file is the canonical reference for Claude sessions working on this codebase.
> Update it whenever a significant architectural decision is made.

---

## 1. Product Overview

**PizzaBot** is a SaaS platform that gives pizzeria owners an AI chatbot for their customers.
It is the first vertical of a holding company; the same architecture will be reused for other
restaurant/hospitality niches (Asian restaurants, Airbnb hosts, etc.) by cloning and
re-branding the repo.

### User types
| Actor | Interaction surface |
|-------|---------------------|
| **Pizzeria owner** (B2B subscriber) | Next.js dashboard (web) |
| **End customer** (B2C) | WhatsApp / SMS / Telegram — never sees the dashboard |

---

## 2. Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend / Backend | Next.js 14 (App Router) on Vercel |
| Database / Auth / Storage | Supabase (PostgreSQL + GoTrue + S3-compatible) |
| AI | Anthropic Claude API (`claude-sonnet-4-6`) |
| Messaging | Twilio (WhatsApp + SMS), Telegram Bot API (via Grammy) |
| Payments | Stripe (subscription billing) |
| Telegram library | `grammy` |

---

## 3. Multi-Tenancy Model

**Shared tables + Row Level Security (RLS).**

- Every tenant-scoped table has a `tenant_id UUID NOT NULL` column.
- A PostgreSQL function `auth_tenant_id()` resolves the authenticated user's tenant
  via the `profiles` table: `SELECT tenant_id FROM profiles WHERE id = auth.uid()`.
- All dashboard API calls use the **anon key** — RLS enforces tenant isolation automatically.
- Webhook API routes (Twilio, Telegram, Stripe) use the **service role key**, which bypasses
  RLS. These routes are server-only and the key is never exposed to the browser.

```
[Browser / Dashboard]
    │  anon key + JWT
    ▼
[Supabase RLS] ← profiles.tenant_id ← auth.uid()
    │
    ▼
[Shared tables: orders, menu_items, conversations, ...]

[Webhook routes]
    │  service role key (bypasses RLS)
    ▼
[Supabase DB] (write on behalf of any tenant, identified by slug in URL)
```

---

## 4. Folder Structure

```
PizzaBot/
├── app/
│   ├── (auth)/               # Public auth pages
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/          # Protected — requires authenticated session
│   │   ├── layout.tsx        # Sidebar, session check
│   │   ├── page.tsx          # Dashboard home / overview
│   │   ├── menu/             # Menu category/item/option management
│   │   ├── orders/           # Order inbox + status updates
│   │   ├── reservations/     # Reservation calendar/list
│   │   ├── conversations/    # Chat history viewer
│   │   ├── faqs/             # FAQ editor
│   │   └── settings/         # Tenant settings, channels, billing
│   ├── api/
│   │   ├── webhooks/
│   │   │   ├── twilio/       # POST — receives WhatsApp/SMS from Twilio
│   │   │   ├── telegram/     # POST — receives Telegram updates
│   │   │   └── stripe/       # POST — Stripe billing events
│   │   └── chat/             # Internal: AI response generation (used by webhooks)
│   ├── layout.tsx
│   └── page.tsx              # Marketing landing page
├── components/
│   ├── ui/                   # Base design system (will use shadcn/ui)
│   └── dashboard/            # Composed dashboard widgets
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Browser client (Client Components)
│   │   ├── server.ts         # Server client (Server Components, Route Handlers)
│   │   └── middleware.ts     # Session refresh helper for Next.js middleware
│   ├── anthropic/
│   │   └── client.ts         # Anthropic SDK instance + model constants
│   ├── twilio/
│   │   └── client.ts         # Twilio SDK factory
│   ├── telegram/
│   │   └── client.ts         # Grammy Bot factory (per-tenant bot token)
│   └── stripe/
│       └── client.ts         # Stripe SDK instance
├── types/
│   └── database.ts           # TypeScript types matching the Supabase schema
│                             # Regenerate with: npx supabase gen types typescript
├── supabase/
│   └── migrations/
│       └── 0001_initial_schema.sql   # Full schema + RLS policies
├── middleware.ts              # Next.js edge middleware — session refresh + auth guard
├── .env.example              # All required environment variables (documented)
└── CLAUDE.md                 # This file
```

---

## 5. Database Schema

### Entity Relationship Summary

```
tenants (1) ──< profiles       (dashboard users)
tenants (1) ──< subscriptions  (1:1, Stripe state)
tenants (1) ──< channels       (whatsapp | sms | telegram config)
tenants (1) ──< menu_categories
  menu_categories (1) ──< menu_items
    menu_items (1) ──< menu_option_groups
      menu_option_groups (1) ──< menu_options
tenants (1) ──< faqs
tenants (1) ──< conversations  (one per end-customer per channel)
  conversations (1) ──< messages
  conversations (1) ──< orders (optional link)
  conversations (1) ──< reservations (optional link)
tenants (1) ──< orders
  orders (1) ──< order_items
    order_items (1) ──< order_item_options
tenants (1) ──< reservations
```

### Key design decisions

| Decision | Rationale |
|----------|-----------|
| `order_items.name` / `order_item_options.name` are TEXT snapshots | Menu can change; historical orders must remain accurate |
| `channels.config` is JSONB | Each channel type has different credential fields; avoids sparse columns |
| `messages` has no `updated_at` | Messages are immutable — never edited after insertion |
| `conversations` has `UNIQUE(tenant_id, channel_type, external_id)` | Prevents duplicate conversation rows for the same customer |
| `orders.order_number` is human-readable (e.g. `#042`) | Printed receipts / verbal communication with kitchen |
| `menu_option_groups.max_selections = NULL` | Means unlimited (e.g. toppings); `1` means radio-button (e.g. size) |

---

## 6. Messaging Flow

```
End customer sends message
        │
        ▼
[Twilio/Telegram webhook] → POST /api/webhooks/{twilio|telegram}
        │
        │  1. Identify tenant from URL slug or phone number
        │  2. Upsert conversation row
        │  3. Save inbound message
        │  4. Fetch conversation history + tenant knowledge base
        ▼
[POST /api/chat]  →  Anthropic Claude API
        │
        │  5. Stream or await AI response
        │  6. Save assistant message
        ▼
[Send reply via Twilio / Telegram API]
```

The **knowledge base** fed to Claude per request:
- Tenant name, timezone, currency
- Active menu (categories → items → options, prices, allergens)
- Active FAQs
- Last N messages in the conversation (context window management TBD)

---

## 7. Authentication

- Supabase GoTrue handles auth (email + password; magic link can be added).
- Auth session is stored in cookies managed by `@supabase/ssr`.
- The `profiles.tenant_id` is the single source of truth for RLS.

### Sign-up flow (trigger-based, atomic)

The Server Action (`app/(auth)/signup/actions.ts`) calls `supabase.auth.signUp()`
with `options.data` (user_metadata) containing:

| Field | Source |
|-------|--------|
| `tenant_name` | Pizzeria name from the sign-up form |
| `tenant_slug` | URL-safe slug derived server-side from `tenant_name` |
| `full_name` | Owner's full name from the sign-up form |

A PostgreSQL trigger (`supabase/migrations/0002_signup_trigger.sql`) fires
`AFTER INSERT ON auth.users` and atomically creates:
1. A `tenants` row (using `tenant_name` + `tenant_slug` from `raw_user_meta_data`).
2. A `profiles` row linking the new `auth.users.id` → the new tenant.
3. A `subscriptions` row with `status = 'trialing'` and `trial_ends_at = NOW() + 14 days`.

**Why a trigger instead of a Server Action sequence?**
The trigger runs in the same DB transaction as the `auth.users` INSERT, so it
is impossible for a user to exist without a tenant/profile/subscription. A
multi-step Server Action would risk partial state if a step failed mid-way.

The trigger is declared `SECURITY DEFINER` (runs as the DB owner, bypassing RLS)
because the newly-created user has no profile yet, so `auth_tenant_id()` returns
NULL and normal RLS writes would be rejected.

### Slug uniqueness
`tenants.slug` has a `UNIQUE` constraint. If a duplicate slug is inserted the
trigger raises a constraint violation, which Supabase surfaces as an auth error.
The Server Action catches this and returns a friendly message to the user.

### Login / logout
- Login: `app/(auth)/login/actions.ts` → `supabase.auth.signInWithPassword()`
- Logout: `logout()` in the same file → `supabase.auth.signOut()` + redirect to `/login`

---

## 8. Stripe Billing

- **Single flat-rate plan** (`starter`). No tiers in v1.
- One Stripe Customer per tenant, created at sign-up or first checkout.
- Stripe webhooks (`/api/webhooks/stripe`) update `subscriptions.status`.
- If `subscriptions.status` is `canceled` or `unpaid`, the dashboard should
  display an upgrade/reactivation prompt and block bot responses.

---

## 9. Supabase Setup Commands

```bash
# 1. Install Supabase CLI
npm install supabase --save-dev

# 2. Login & link project
npx supabase login
npx supabase link --project-ref <project-ref>

# 3. Apply migrations
npx supabase db push

# 4. Regenerate TypeScript types after schema changes
npx supabase gen types typescript --project-id <project-ref> > types/database.ts
```

---

## 10. Environment Variables

All required env vars are documented in `.env.example`. Never commit `.env.local`.

Key distinction:
- `NEXT_PUBLIC_*` — safe to expose to the browser (anon key, public URL).
- All others — server-only. The service role key and all API secrets must
  never appear in client-side code or `NEXT_PUBLIC_*` vars.

---

## 11. Conventions

- **Imports**: Use `@/` alias for project root (configured in `tsconfig.json`).
- **Supabase client**: Use `lib/supabase/client.ts` in Client Components,
  `lib/supabase/server.ts` in Server Components and Route Handlers.
- **Webhook routes**: Always use service role client (`createClient(true)`).
- **Numeric money values**: Stored as `NUMERIC(10,2)` in DB, handled as `number`
  in TypeScript. Format for display using `Intl.NumberFormat` with tenant currency.
- **Timestamps**: Always stored as `TIMESTAMPTZ` (UTC). Convert to tenant timezone
  for display only.
- **Migrations**: Sequential numbered files (`0001_`, `0002_`, …). Never edit
  an applied migration — add a new one.
- **AI prompts**: System prompt assembly logic lives in `lib/anthropic/`.
  Never hardcode tenant data into prompts; always fetch fresh from DB.

---

## 12. Future Verticals

When cloning for a new vertical (e.g., "AsianBot", "AirbnbBot"):
1. Fork/clone this repo.
2. Rename `PizzaBot` references in `package.json`, `CLAUDE.md`, and the landing page.
3. Adjust the menu schema if needed (e.g., add `cuisine_type` to `tenants`).
4. The multi-tenant architecture, auth, billing, and messaging plumbing are
   identical — only the AI system prompt and dashboard UI vocabulary change.
