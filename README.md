# Exploro

**Your business. Your knowledge. Your AI.**

Exploro is a private, AI-powered business platform built for SMEs. Train an AI on your own documents and knowledge base, then deploy it across your team via WhatsApp, Email, Web Chat, Telegram, Slack, and more — all under your own brand.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com/) + `tailwindcss-animate` |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| Icons | [Lucide React](https://lucide.dev/) + [React Icons](https://react-icons.github.io/react-icons/) |
| Backend / Auth | [Supabase](https://supabase.com/) (Auth, Postgres, Storage, RLS, Realtime) |
| AI | DeepSeek API (configurable model + URL) |
| Web Search | [Serper API](https://serper.dev/) |
| Email Sending | [Resend](https://resend.com/) |
| Payments (US) | [Stripe](https://stripe.com/) |
| Payments (non-US) | [Polar.sh](https://polar.sh/) (Merchant of Record) |
| Document Parsing | `pdf-parse`, `pdfjs-dist`, `mammoth`, `xlsx`, `pptx-parser` |
| Markdown | `react-markdown` + `remark-gfm` |
| State | React Context API (`AuthContext`, `WorkspaceContext`) |
| Fonts | Inter (Google Fonts) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- A [Supabase](https://supabase.com/) project

### Installation

```bash
git clone https://github.com/your-org/exploro.git
cd exploro
npm install
```

### Environment Variables

Create a `.env` file based on `.env.example`. Key variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_URL=your-deepseek-base-url
DEEPSEEK_MODEL=deepseek-chat

# Web Search
SERPER_API_KEY=your-serper-api-key
SERPER_URL=https://google.serper.dev/search

# Email sending (Resend)
RESEND_API_KEY=re_xxx

# Cron job secret
CRON_SECRET=your-random-secret

# Stripe (US users)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_APIKEY_TOKEN=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_SOLO=price_xxx
STRIPE_PRICE_TEAM=price_xxx

# Polar.sh (non-US users — Merchant of Record)
POLAR_ACCESS_TOKEN=polar_oat_xxx
POLAR_WEBHOOK_SECRET=polar_whs_xxx
POLAR_PRODUCT_SOLO=product_id_solo_xxx
POLAR_PRODUCT_TEAM=product_id_team_xxx

# Google OAuth (Gmail, Calendar, Drive, Meet)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
# Register these redirect URIs in Google Cloud Console:
#   /api/email/oauth/callback
#   /api/calendar/oauth/callback
#   /api/drive/oauth/callback
#   /api/meet/oauth/callback

# Microsoft OAuth (Outlook, Teams)
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Meta (WhatsApp, Instagram, Facebook)
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_WHATSAPP_CONFIG_ID=         # optional: Embedded Signup
WHATSAPP_WEBHOOK_VERIFY_TOKEN=exploro-webhook-verify

# Slack
NEXT_PUBLIC_SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Telegram
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=your-telegram-api-hash

# Calendly
CALENDLY_CLIENT_ID=your-calendly-client-id
CALENDLY_CLIENT_SECRET=your-calendly-client-secret
CALENDLY_WEBHOOK_SIGNING_KEY=your-calendly-webhook-signing-key
```

### Database Setup

Apply migrations in order from `/supabase/migrations/`:

```bash
# Using Supabase CLI
supabase db push

# Or apply manually in the Supabase SQL editor
```

Migrations (apply in order from `/supabase/migrations/`):

| File | Description |
|---|---|
| `schema.sql` | Base tables: `profiles`, `documents`, `knowledge_categories`, `translations` |
| `002` | Brand theme columns on `profiles` |
| `003` | Avatar storage bucket + RLS |
| `004` | Logo storage bucket + knowledge base tables |
| `005` | Token cap + document expiration |
| `006–007` | Avatar/logo RLS policy fixes |
| `008` | Input style column |
| `009` | Support screenshots storage bucket |
| `010` | Email connections table |
| `011` | Chat history + email messages tables |
| `012` | Document content + OAuth tokens |
| `013` | Contacts table |
| `014` | Message ID header for email threading |
| `015` | Google Calendar connections + events |
| `016` | WhatsApp connections + messages |
| `017` | Enable Supabase Realtime on key tables |
| `018` | CRM Kanban columns |
| `019` | Subscriptions table with RLS |
| `020` | Payment columns on subscriptions |
| `021` | CC address on email connections |
| `022` | Backfill trial for existing users |
| `023` | `role` column on `profiles`; `app_settings` table |
| `024` | Lemon Squeezy columns (legacy, replaced by Polar) |
| `025` | Workspaces + workspace members; replace Lemon Squeezy with Polar.sh |
| `026` | Telegram pending code; workspace RLS fixes; invitations + notifications |
| `027` | Contacts phone unique; document extended_at; workspace roles rename |
| `028` | API request logs table; backfill default workspace |
| `029–031` | API stats hourly aggregation + user_id + durations |
| `032` | Per-user trial days override |
| `033` | Admin audit log |
| `034` | Token usage tracking per conversation |
| `035` | Chat messages update RLS policy |
| `036–038` | Telegram media columns; dedup; from_phone |
| `039–041` | Email last_fetched_at; unique constraint; pending status; attachments |
| `042` | Kanban card extra columns |

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

---

## Project Structure

```
├── app/
│   ├── auth-provider.tsx         # Global AuthContext (user, session, role, subscription)
│   ├── workspace-provider.tsx    # WorkspaceContext (current workspace, members, switch)
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   ├── home-client.tsx           # Landing page client component
│   ├── login/                    # Login page
│   ├── signup/                   # Signup / registration (with password strength indicator)
│   ├── forgot-password/          # Request password reset email
│   ├── reset-password/           # Set new password (with password strength indicator)
│   ├── chat/                     # AI chat workspace
│   │                             #   • Pinned + collapsible Recent conversations sidebar
│   │                             #   • Search drawer (⌘K)
│   │                             #   • Share modal → /share/[id] public page
│   │                             #   • Stream survives page navigation
│   ├── share/[id]/               # Public read-only shared conversation page
│   ├── knowledge/                # Knowledge base (documents + categories)
│   ├── channels/                 # Platform integrations (connect OAuth providers)
│   ├── crm/                      # CRM (Kanban pipeline)
│   ├── contacts/                 # Contacts list
│   ├── inbox/                    # Unified inbox (emails, messages)
│   ├── analytics/                # Usage + conversation analytics
│   ├── agents/                   # Configurable AI agents
│   ├── automations/              # Trigger-based automation workflows
│   ├── workspace/                # Workspace settings + member management
│   ├── pricing/                  # Pricing page (Solo / Team / Enterprise)
│   ├── admin/                    # Super admin panel
│   ├── support/                  # Tech support (Calendly booking)
│   ├── profile/                  # User + company profile + billing
│   ├── invite/                   # Workspace invitation acceptance
│   ├── about/                    # About page
│   ├── privacy/                  # Privacy policy
│   ├── terms/                    # Terms of service
│   ├── disclaimer/               # Disclaimer page
│   └── api/
│       ├── ai/
│       │   ├── chat/             # Streaming AI chat endpoint (DeepSeek)
│       │   ├── context/          # RAG context builder (KB docs + emails + calendar)
│       │   └── title/            # Auto-generate conversation title
│       ├── chat/                 # Conversation + message CRUD
│       ├── messages/             # Message update endpoint
│       ├── email/                # Gmail/Outlook OAuth + fetch/send/reply/search
│       ├── calendar/             # Google Calendar OAuth + fetch/create/delete events
│       ├── drive/                # Google Drive OAuth + file list/download/upload
│       ├── meet/                 # Google Meet OAuth + create meeting
│       ├── calendly/             # Calendly OAuth + events fetch
│       ├── slack/                # Slack OAuth + events webhook + send message
│       ├── telegram/             # Telegram bot + user account (media, messages, contacts)
│       ├── whatsapp/             # WhatsApp Business webhook + send
│       ├── meta/                 # Meta OAuth callback
│       ├── web-search/           # Serper web search proxy
│       ├── parse-document/       # Document text extraction (PDF, DOCX, XLSX, PPTX…)
│       ├── count-pages/          # PDF page counter
│       ├── context/              # AI context assembly endpoint
│       ├── workspace/            # Workspace CRUD + invitations
│       ├── usage/                # Token usage stats
│       ├── subscriptions/        # Subscription status endpoint
│       ├── stripe/               # Checkout + webhook + billing portal (US)
│       ├── polar/                # Checkout + webhook (non-US, Merchant of Record)
│       ├── app-settings/         # app_settings read/write
│       ├── support/              # Support ticket / screenshot upload
│       ├── cron/                 # Scheduled jobs (trial expiry reminders)
│       └── admin/                # Stats, role management, trial config, audit log
├── components/
│   ├── nav-rail.tsx              # Vertical side nav
│   ├── navbar.tsx                # Top navigation bar
│   ├── workspace-selector.tsx    # Workspace switcher dropdown
│   ├── create-workspace-modal.tsx# New workspace creation modal
│   ├── notification-bell.tsx     # In-app notifications bell + dropdown
│   ├── password-strength.tsx     # Animated password strength bar + checklist
│   ├── trial-pill.tsx            # "Free trial ends in X days" / "Subscribe" pill
│   ├── trial-paywall.tsx         # Full-screen paywall overlay on trial expiry
│   ├── announcement-banner.tsx   # Dismissible admin-controlled global banner
│   ├── checkout-button.tsx       # Stripe/Polar routing + BillingPortalButton
│   ├── stripe-checkout-button.tsx# Standalone Stripe checkout button
│   ├── cinematic-background.tsx  # Animated gradient background
│   ├── animated-placeholder.tsx  # Rotating chat input placeholder suggestions
│   ├── google-picker.tsx         # Google Drive file picker component
│   ├── email-edit-form.tsx       # Inline email compose/edit form
│   ├── optimized-image.tsx       # Image with fallback + loading state
│   ├── footer.tsx                # Landing page footer
│   ├── faq-section.tsx           # FAQ accordion section
│   └── ui/                       # shadcn/ui primitives (button, input, label, toast…)
├── lib/
│   ├── supabase.ts               # Supabase client + all DB/Storage helpers
│   ├── subscription.ts           # getSubscription, startTrial, isTrialExpired
│   ├── workspace.ts              # Workspace helpers (create, invite, getMembers)
│   ├── polar.ts                  # Polar.sh API client (checkout, webhook, portal)
│   ├── stripe.ts                 # Stripe client init
│   ├── stripe-seats.ts           # Stripe seat-based billing helpers
│   ├── system-email.ts           # Transactional email helpers (Resend)
│   ├── telegram.ts               # Telegram bot helpers
│   ├── telegram-user.ts          # Telegram user account helpers (MTProto)
│   ├── token-limits.ts           # Per-plan token caps + quota checking
│   ├── app-settings.ts           # getAppSettings, getTrialDays
│   ├── theme-engine.ts           # Brand color compilation + dark mode derivation
│   ├── i18n.tsx                  # Internationalization context + hook
│   ├── translations.ts           # Full EN/ES translation strings
│   ├── file-types.ts             # Accepted file type definitions
│   ├── email-provider.ts         # Email provider detection helpers
│   ├── api-logger.ts             # API request logger
│   ├── with-api-logging.ts       # HOF wrapper to log API route calls
│   ├── workspace-icons.ts        # Workspace icon helpers
│   └── utils.ts                  # cn() and utility helpers
├── supabase/
│   ├── schema.sql                # Base database schema
│   └── migrations/               # Incremental SQL migrations (002–042)
├── types/                        # Shared TypeScript type definitions
├── docs/                         # Internal documentation
├── scripts/                      # Utility scripts
├── tests/                        # Test files (web-search integration test)
└── public/
    └── assets/images/            # Logos, icons, static assets
```

---

## Features & Functionality

### Authentication
- **Email/password auth** via Supabase Auth with session persistence via cookies
- **Protected routes** enforced by `middleware.ts` — unauthenticated users redirected to `/login`
- **Email confirmation** with redirect back to login after verification
- **Password reset** via emailed magic link → `/reset-password` page
- **Password strength indicator** — animated 4-segment bar + 5-point checklist (length, uppercase, lowercase, number, special character) shown on signup and reset password forms
- **Centralized auth state** — `AuthContext` exposes `user`, `session`, `loading`, `avatarUrl`, `profile`, `role`, `subscription`, `refreshProfile`, and `refreshSubscription` globally

### Workspaces
- **Multi-workspace** — each user belongs to one or more workspaces; knowledge base, connections, and conversations are scoped per workspace
- **Workspace switcher** — `WorkspaceSelector` dropdown in nav; switches context instantly
- **Create workspace** — `CreateWorkspaceModal` with name + icon selection
- **Member management** — invite by email; role-based access (`owner`, `admin`, `member`)
- **Invitation flow** — email invite → `/invite?token=...` acceptance page
- **Notifications** — `NotificationBell` shows workspace invitations and system alerts

### Subscription & Trial System

#### Trial Flow
1. User signs up → `startTrial()` auto-creates a `subscriptions` row (`status: "trialing"`, `current_period_end = now + trial_days`)
2. **Trial active** — `TrialPill` shows `"Free trial ends in X days"` in the header (gold `#FFBF00`)
3. **Trial expired** — `TrialPill` changes to `"Subscribe"` button; `TrialPaywall` shows a full-screen overlay on Chat, Knowledge, Channels, and CRM pages; `super_admin` users can dismiss the overlay for testing
4. **Subscribed** — webhook updates `status: "active"`; overlay and pill disappear

#### Payments
- **US users** → [Stripe](https://stripe.com/) (`/api/stripe/checkout`, `/api/stripe/webhook`, `/api/stripe/portal`)
- **Non-US users** → [Polar.sh](https://polar.sh/) (`/api/polar/checkout`, `/api/polar/webhook`) — handles global tax/VAT as Merchant of Record
- `CheckoutButton` routes to Stripe or Polar based on `profile.location`
- `BillingPortalButton` — routes to Stripe portal or Polar customer portal

#### Pricing Plans
| Plan | Price | Processor |
|---|---|---|
| Solo | $30/month | Stripe (US) / Polar.sh (non-US) |
| Team | $50/month | Stripe (US) / Polar.sh (non-US) |
| Enterprise | Custom | Calendly booking (`/support`) |

### Super Admin Panel (`/admin`)
Accessible only to users with `role = "super_admin"`.

- **Platform Overview** — total users, active trials, expired trials, paid subscribers
- **Business Metrics** — MRR, ARR, ARPU, trial→paid conversion, churn rate, plan breakdown
- **User Role Management** — assign `user` / `manager` / `admin` / `super_admin` by email
- **Trial Configuration** — quick presets (7/14/30/60 days) + custom input; retroactively recalculates all active trialing users
- **Announcement Banner** — toggle + message stored in `app_settings`; dismissible gold bar at top of all pages
- **Admin Audit Log** — all admin actions logged to `admin_audit_log` table
- **API Logs** — request logs with route, duration, status; aggregated into hourly stats

### AI Chat (`/chat`)
- **Streaming responses** — Server-Sent Events from DeepSeek; streams survive page navigation via module-level `_globalStream` singleton + 80ms polling interval to sync content back on remount
- **RAG context** — `/api/ai/context` assembles relevant knowledge base chunks + recent emails + calendar events into the system prompt
- **Web search** — AI can trigger a Serper web search and inject results into the response
- **AI actions** — AI can trigger multi-step actions: `create_event`, `send_email`, `create_meet`, `send_whatsapp`, `search_contacts`, etc. via `ACTION_B64` blocks; sequential actions chain automatically (e.g. create calendar event → inject Meet link → send email)
- **Conversation sidebar:**
  - **Pinned conversations** — pin/unpin with toggle; persisted to `localStorage`; shown in dedicated "Pinned" section above recents
  - **Collapsible "Recent"** heading — smooth `grid-template-rows` animation; only shown when there are conversations
  - **Context menu** — Share, Rename, Pin/Unpin, Delete; fixed-position portal (escapes `overflow` containers)
  - **Inline rename** — click Rename → inline input with confirm/cancel
  - **Search drawer** — ⌘K / Ctrl+K or click search bar; fuzzy filter over all conversations
- **Share conversation** — share modal with `/share/[id]` URL; Copy link, X, LinkedIn, Reddit buttons; public read-only page at `app/share/[id]/page.tsx`
- **Brand logo display** — company logo in empty-state
- **Animated placeholders** — rotating suggestion prompts
- **Token quota** — per-plan token caps (`lib/token-limits.ts`); quota exceeded modal with upgrade CTA
- **Google Drive attachment** — attach files from Google Drive directly in chat input
- **Light/dark mode** — toggle persisted to `localStorage`; dark mode uses brand-derived gradient background
- **Mobile responsive** — sidebar collapses, breakpoint-adjusted layout

### AI Context / RAG Pipeline
- **Document text extraction** — `/api/parse-document` extracts text from PDF (via `pdf-parse`/`pdfjs-dist`), DOCX (`mammoth`), XLSX, PPTX, TXT, MD, HTML, JSON, CSV
- **Context assembly** — `/api/ai/context` retrieves knowledge base document content, recent emails, and calendar events for the current workspace user
- **Auto title generation** — `/api/ai/title` generates a conversation title from the first exchange
- **Long-term memory** — AI extracts and stores key facts from conversations every 6 messages

### Knowledge Base
- **Document upload** — drag-and-drop or click; accepts PDF, DOC/DOCX, TXT, MD, HTML, JSON, CSV, XML, PPTX, XLSX, EPUB
- **Upload modal** — filename preview + category selection before confirming
- **Page counting** — PDF page count via `/api/count-pages`
- **Category sidebar** — 6 built-in default categories + unlimited custom categories per workspace
- **Category count badges** — live counts per category
- **Document list** — filename, category, page count, file size, status (Indexed / Processing / Error), relative time
- **Supabase Storage** — files in `knowledge-base` bucket with per-user path prefix and RLS

### Channels (Integrations)
Connect the AI to the platforms your team uses:

| Platform | Type | Backend |
|---|---|---|
| Gmail | Google OAuth | `/api/email/` — fetch, send, reply, search, OAuth |
| Outlook | Microsoft OAuth | `/api/email/` — Microsoft Graph API |
| Google Calendar | Google OAuth | `/api/calendar/` — fetch, create, delete events |
| Google Drive | Google OAuth | `/api/drive/` — list, download, upload, OAuth |
| Google Meet | Google OAuth | `/api/meet/` — create meeting links |
| Calendly | Calendly OAuth | `/api/calendly/` — fetch events |
| Slack | Slack OAuth | `/api/slack/` — OAuth, events webhook, send message |
| Telegram | Bot + MTProto | `/api/telegram/` — bot webhook + user account messages/media/contacts |
| WhatsApp Business | Meta Business API | `/api/whatsapp/` — webhook + send |
| Instagram / Facebook | Meta OAuth | `/api/meta/` — OAuth callback |
| Website Chat | Embed widget | UI ready |
| Microsoft Teams | Microsoft OAuth | UI ready |
| iCloud Email | App-specific password | UI ready |
| SMS / Twilio | Twilio API | UI ready |
| Hostinger | API key | UI ready |

### Email System
- **Fetch** — pulls inbox messages from Gmail (OAuth) and Outlook (Microsoft Graph)
- **Send / Reply** — compose and send emails with CC support; reply preserves thread headers
- **Attachments** — email attachment support (`041_email_attachments.sql`)
- **Auto-fetch** — `last_fetched_at` tracking prevents re-fetching; unique constraints prevent duplicates
- **Transactional emails** — Resend (`lib/system-email.ts`) for workspace invitations, trial reminders (via cron)

### CRM
- **Kanban board** — drag-and-drop pipeline with configurable columns (`018_add_crm_kanban_cols.sql`, `042_kanban_card_cols.sql`)
- **Contacts** — contact list with phone, email, company; phone unique constraint
- **Inbox** — unified message inbox across channels

### Profile & Company Settings
- **Auto-save** — field changes debounce-save (1.5 s) to Supabase
- **Avatar upload** — stored in `avatars` bucket; flash-free via `AuthContext`
- **Logo upload** — stored in `logos` bucket; shown in chat empty-state
- **Brand colors** — primary + secondary color pickers drive the theme engine
- **Theme controls** — style (cinematic, minimal, gradient, aurora) + mood (futuristic, calm, corporate, vibrant)
- **AI configuration** — AI name, role, brand voice, communication style, tone examples, words to avoid, response length, languages
- **Token cap** — per-user override for AI token limits

### Dynamic Brand Theme Engine (`lib/theme-engine.ts`)
- `compileTheme(primary, secondary, style, mood)` — generates full `CompiledTheme`
- `getBrandInputColors(primary, secondary?)` — derives `bgGradient`, `border`, `shadow`, `text`, `iconAccent` for dark mode chat input
- WCAG luminance math (`getLuminance`, `isDark`) + color helpers (`lighten`, `darken`, `toRgba`, `generateAccent`)
- Theme persisted to `localStorage` and synced from Supabase profile on load

### Avatar & Profile — Flash-Free Architecture
- `AuthContext` fetches avatar and profile **once** at root level
- All pages consume `avatarUrl` from context — no per-page fetches, no flash

### Internationalization (i18n)
- **EN / ES** — full translations across all pages
- **Language toggle** — EN/ES switcher in every authenticated page header
- **`useI18n()` hook** — provides `t(key)`, `lang`, `setLang`
- Optional DB-driven overrides via `translations` table

### Token Usage & Limits
- `lib/token-limits.ts` — per-plan token caps; quota checking before each request
- `/api/usage/` — token usage endpoint
- `034_add_token_usage.sql` — usage tracking per conversation
- Quota exceeded modal with upgrade CTA shown in chat

### API Logging & Observability
- `lib/with-api-logging.ts` — HOF wrapper logs route, method, duration, status to `api_logs` table
- `028_api_logs.sql` — `api_logs` table
- `029–031_api_stats*.sql` — hourly aggregated stats with user_id and duration breakdowns
- Admin panel exposes API stats

### Cron Jobs
- `/api/cron/` — scheduled jobs protected by `CRON_SECRET`
- Trial expiry reminder emails via Resend

### UI/UX System
- **Dark design** — deep navy base (`#2a3444`), emerald accent (`#10b981`), `white/5` borders
- **Nav Rail** — persistent icon-based sidebar; settings pinned to bottom
- **Notification bell** — top-right bell icon with unread badge + dropdown
- **Backdrop blur headers** — sticky headers with `backdrop-blur-md`
- **Animated gradients** — `CinematicBackground` uses CSS keyframe drift driven by brand colors
- **Responsive** — mobile-first; sidebars collapse to overlay with backdrop
- **Password strength** — shared `PasswordStrength` component on signup + reset password

---

## Database Schema (Supabase)

### `profiles`
Stores all user + company + AI configuration. One row per user (`user_id` FK to `auth.users`).

### `documents`
Stores uploaded knowledge base files.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK to `auth.users` |
| `category` | text | Category name |
| `filename` | text | Storage path filename |
| `original_filename` | text | Display name |
| `mime_type` | text | File MIME type |
| `file_size_bytes` | int8 | File size |
| `page_count` | int4 | Pages (PDFs) |
| `status` | text | `INDEXED` / `PROCESSING` / `ERROR` |
| `created_at` | timestamptz | Upload timestamp |

### `knowledge_categories`
Per-user custom document categories.

### `translations`
Optional DB-driven i18n overrides keyed by `(key, lang)`.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Roadmap

### Completed
- [x] Free trial system with configurable days (`app_settings`)
- [x] Trial pill + paywall overlay — active/expired states; dismissible for `super_admin`
- [x] Stripe checkout + webhook + billing portal (US)
- [x] Polar.sh checkout + webhook (non-US, replaced Lemon Squeezy)
- [x] Super admin panel — stats, MRR/ARR/ARPU/churn/conversion, role management, trial config, announcement banner, audit log
- [x] Multi-workspace — create, invite members, switch, RLS scoping
- [x] Workspace invitations + notification bell
- [x] EN/ES translations across all pages
- [x] Real AI responses — DeepSeek streaming via SSE
- [x] RAG pipeline — document text extraction + `/api/ai/context` knowledge injection
- [x] Long-term memory — AI extracts facts every 6 messages
- [x] Web search — Serper API integration triggered by AI
- [x] AI actions — `create_event`, `send_email`, `create_meet`, `send_whatsapp`, `search_contacts`, and chained multi-step actions
- [x] Google Calendar — OAuth, fetch, create, delete events + Meet link generation
- [x] Google Drive — OAuth, file browser, upload, attach files in chat
- [x] Google Meet — OAuth, create meeting links
- [x] Gmail + Outlook — OAuth, fetch inbox, send, reply, search, attachments
- [x] Slack — OAuth, events webhook, send message
- [x] Telegram — bot webhook + user account (MTProto): messages, media, contacts
- [x] WhatsApp Business — webhook + send
- [x] Calendly — OAuth, fetch events
- [x] Conversation sidebar — pinned chats, collapsible Recent, search drawer (⌘K), context menu (Share/Rename/Pin/Delete)
- [x] Share conversation — modal + public `/share/[id]` page
- [x] Stream persistence — streaming continues across navigation; full history restored on remount
- [x] Token usage tracking + per-plan quota enforcement
- [x] API request logging + hourly stats aggregation
- [x] Cron jobs — trial expiry reminders via Resend
- [x] Password strength indicator — signup + reset password forms
- [x] Admin audit log
- [x] CRM Kanban + Contacts + Inbox

### Pending
- [ ] Vector embeddings — chunk documents, embed with AI model, store in Supabase `pgvector` for semantic search
- [ ] Agents page — fully configurable AI agents with tool access and memory
- [ ] Automations — trigger-based workflows (e.g. email received → AI draft reply)
- [ ] Analytics dashboard — conversation volume, response quality, token usage charts
- [ ] CAC tracking — marketing spend input → LTV/CAC reporting in admin
- [ ] WhatsApp Embedded Signup — guided WABA creation via Meta OAuth dialog
- [ ] Transify — translation workflow tool (page scaffolded)

---

## License

Private — All rights reserved © Exploro AI
