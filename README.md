# Exploro

**Your business. Your knowledge. Your AI.**

Exploro is a private, AI-powered business platform built for SMEs. Train an AI on your own documents and knowledge base, then deploy it across your team via WhatsApp, Email, Web Chat, Telegram, Slack, and more — all under your own brand.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router, `"use client"`) |
| Language | TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| Icons | [Lucide React](https://lucide.dev/) + [React Icons](https://react-icons.github.io/react-icons/) |
| Backend / Auth | [Supabase](https://supabase.com/) (Auth, Postgres, Storage, RLS) |
| Payments (US) | [Stripe](https://stripe.com/) |
| Payments (non-US) | [Lemon Squeezy](https://lemonsqueezy.com/) (Merchant of Record) |
| State | React Context API (`AuthContext`) |
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

Create a `.env` file (see `.env.example`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI
DEEPSEEK_API_KEY=
DEEPSEEK_URL=
DEEPSEEK_MODEL=

# Stripe (US users)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_APIKEY_TOKEN=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SOLO=price_...
STRIPE_PRICE_TEAM=price_...

# Lemon Squeezy (non-US users — Merchant of Record)
LEMONSQUEEZY_API_KEY=your-api-key
LEMONSQUEEZY_WEBHOOK_SECRET=your-signing-secret
LEMONSQUEEZY_STORE_ID=your-store-id
LEMONSQUEEZY_VARIANT_SOLO=your-solo-variant-id
LEMONSQUEEZY_VARIANT_TEAM=your-team-variant-id

# OAuth integrations
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
META_APP_ID=
META_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
```

### Database Setup

Apply migrations in order from `/supabase/migrations/`:

```bash
# Using Supabase CLI
supabase db push

# Or apply manually in the Supabase SQL editor
```

Migrations:
| File | Description |
|---|---|
| `schema.sql` | Base tables: `profiles`, `documents`, `knowledge_categories`, `translations` |
| `002_add_brand_theme.sql` | Brand theme columns on `profiles` |
| `003_add_avatar_storage.sql` | Avatar storage bucket + RLS policies |
| `004_add_logo_storage.sql` | Logo storage bucket + RLS policies |
| `004_knowledge_base.sql` | Knowledge base document tables + storage bucket |
| `005_add_token_cap.sql` | `token_cap` column on `profiles` |
| `006_fix_avatar_storage_rls.sql` | Avatar RLS policy fixes |
| `007_fix_logo_storage_rls.sql` | Logo RLS policy fixes |
| `008–018_*.sql` | Email, calendar, WhatsApp, CRM, chat history additions |
| `019_add_subscriptions.sql` | `subscriptions` table with RLS (service_role update only) |
| `020_add_fastspring_columns.sql` | FastSpring payment columns on `subscriptions` |
| `021_add_cc_address.sql` | CC address column on email connections |
| `022_grant_trial_to_existing_users.sql` | Backfill trial for existing users without subscription |
| `023_add_roles_and_settings.sql` | `role` column on `profiles`; `app_settings` table (`trial_days`) |
| `024_add_lemonsqueezy_columns.sql` | `lemonsqueezy_subscription_id`, `lemonsqueezy_customer_id` on `subscriptions` |

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
│   ├── auth-provider.tsx         # Global AuthContext (user, session, role, subscription, refreshSubscription)
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   ├── login/                    # Login page
│   ├── signup/                   # Signup / registration
│   ├── chat/                     # AI chat workspace
│   ├── knowledge/                # Knowledge base (documents + categories)
│   ├── channels/                 # Platform integrations
│   ├── crm/                      # CRM (contacts, pipeline, inbox)
│   ├── pricing/                  # Pricing page (Solo / Team / Enterprise)
│   ├── admin/                    # Super admin panel
│   ├── support/                  # Tech support page (Calendly booking)
│   ├── profile/                  # User + company profile + billing
│   ├── about/                    # About page
│   └── api/
│       ├── count-pages/          # PDF page counting
│       ├── stripe/
│       │   ├── checkout/         # Stripe checkout session (US users)
│       │   ├── webhook/          # Stripe webhook handler
│       │   └── portal/           # Stripe billing portal
│       ├── lemonsqueezy/
│       │   ├── checkout/         # Lemon Squeezy checkout session (non-US)
│       │   ├── webhook/          # Lemon Squeezy webhook handler
│       │   └── portal/           # Lemon Squeezy customer portal URL
│       └── admin/
│           ├── update-trial/     # Update trial_days + recalculate active trials (service role)
│           ├── settings/         # Generic app_settings upsert (announcement banner etc.)
│           ├── stats/            # Platform stats + business metrics (MRR, ARR, churn, conversion)
│           └── set-role/         # Update a user's role by email (service role)
├── components/
│   ├── nav-rail.tsx              # Vertical side nav (includes Tech Support section)
│   ├── trial-pill.tsx            # Header pill: "Free trial ends in X days" / "Subscribe"
│   ├── trial-paywall.tsx         # Full-screen overlay modal when trial expires
│   ├── announcement-banner.tsx   # Dismissible global announcement bar (admin-controlled)
│   ├── checkout-button.tsx       # CheckoutButton (Stripe/LS routing) + BillingPortalButton
│   ├── cinematic-background.tsx  # Animated gradient background
│   └── ui/                       # shadcn/ui primitives
├── lib/
│   ├── supabase.ts               # Supabase client + DB/Storage helpers
│   ├── subscription.ts           # Subscription type, getSubscription, startTrial, isTrialExpired
│   ├── lemonsqueezy.ts           # Lemon Squeezy API client (checkout, webhook verify, portal)
│   ├── app-settings.ts           # getAppSettings, getTrialDays (reads app_settings table)
│   ├── theme-engine.ts           # Brand color compilation helpers
│   ├── i18n.tsx                  # Internationalization context + hook
│   ├── translations.ts           # EN/ES translation strings
│   └── utils.ts                  # cn() and utility helpers
├── supabase/
│   ├── schema.sql                # Base database schema
│   └── migrations/               # Incremental SQL migrations (001–024)
└── public/
    └── assets/images/            # Static assets
```

---

## Features & Functionality

### Authentication
- **Email/password auth** via Supabase Auth with session persistence via cookies
- **Protected routes** enforced by `middleware.ts` — unauthenticated users redirected to `/login`
- **Email confirmation** with redirect back to login after verification
- **Password reset** via emailed magic link
- **Centralized auth state** — `AuthContext` exposes `user`, `session`, `loading`, `avatarUrl`, `profile`, `role`, `subscription`, `refreshProfile`, and `refreshSubscription` globally

### Subscription & Trial System

#### Trial Flow
1. User signs up → `startTrial()` auto-creates a `subscriptions` row (`status: "trialing"`, `current_period_end = now + trial_days`)
2. **Trial active** — `TrialPill` shows `"Free trial ends in X days"` in the header (gold `#FFBF00`)
3. **Trial expired** — `TrialPill` changes to a `"Subscribe"` button; `TrialPaywall` shows a full-screen overlay on Chat, Knowledge, Channels, and CRM pages; `super_admin` users can dismiss the overlay for testing
4. **Subscribed** — webhook updates `status: "active"`; overlay and pill disappear

#### Payments
- **US users** → [Stripe](https://stripe.com/) (`/api/stripe/checkout`, `/api/stripe/webhook`)
- **Non-US users** → [Lemon Squeezy](https://lemonsqueezy.com/) (`/api/lemonsqueezy/checkout`, `/api/lemonsqueezy/webhook`) — handles global tax/VAT as Merchant of Record
- Routing logic in `CheckoutButton` — checks `profile.location` to select processor
- `BillingPortalButton` — routes to Stripe portal or Lemon Squeezy customer portal based on which `*_subscription_id` is populated

#### Pricing Plans
| Plan | Price | Processor |
|---|---|---|
| Solo | $30/month | Stripe (US) / Lemon Squeezy (non-US) |
| Team | $50/month | Stripe (US) / Lemon Squeezy (non-US) |
| Enterprise | Custom | Calendly booking (`/support`) |

### Super Admin Panel (`/admin`)
Accessible only to users with `role = "super_admin"`.

- **Platform Overview** — Total users, active trials, expired trials, paid subscribers
- **Business Metrics** — MRR, ARR, ARPU, trial→paid conversion rate, churn rate, plan breakdown
- **User Role Management** — Assign `user` / `manager` / `admin` / `super_admin` to any user by email
- **Trial Configuration** — Quick presets (7/14/30/60 days) + custom input; updates `app_settings` and retroactively recalculates `current_period_end` for all active trialing users via service role API
- **Announcement Banner** — Toggle + message stored in `app_settings`; displayed as a dismissible gold bar at the top of all app pages

### Tech Support (`/support`)
- Nav rail item (gold `#FFBF00`, headphones icon) on desktop and mobile
- Embeds a Calendly booking widget (`https://calendly.com/urbanseed-ai/ai-bureau-services`)

### Announcement Banner
- Stored in `app_settings` (`announcement_text`, `announcement_enabled`)
- Rendered by `AnnouncementBanner` component on Chat, Knowledge, Channels, CRM pages
- Dismissible per session; managed from Super Admin panel

### AI Chat
- **Cinematic background** — animated gradient driven by configured brand colors (primary + secondary) with configurable style (cinematic, minimal, gradient, aurora) and mood (futuristic, calm, corporate, vibrant)
- **Brand logo display** — company logo shown prominently in the empty-state chat view
- **Greeting** — personalised greeting using the user's first name
- **Animated placeholders** — rotating suggestion prompts in the chat input
- **Message history** — user and AI messages rendered with role-based alignment, copy and regenerate actions
- **Source citations** — AI responses show referenced document names
- **Confidence indicator** — responses tagged high / medium / low confidence
- **Sidebar** — collapsible recent chats panel
- **Chat input themes:**
  - **Light mode** — clean white background
  - **Dark mode** — brand-derived dark gradient background auto-computed from `themePrimary` + `themeSecondary` using WCAG luminance contrast math; border glow and box-shadow derived from brand colors
  - **Toggle** — `SunMoon` button persists preference to `localStorage` per user
- **Mobile responsive** — sidebars collapse, breakpoint-adjusted padding and font sizes

### Dynamic Brand Theme Engine (`/lib/theme-engine.ts`)
- `compileTheme()` — generates a full `CompiledTheme` from `primaryColor`, `secondaryColor`, `style`, and `mood`
- `getBrandInputColors(primary, secondary?)` — returns `bgGradient`, `border`, `shadow`, `text`, `iconAccent` for the chat input dark mode, all derived from brand colors
- `getLuminance(hex)` — WCAG relative luminance calculation
- `isDark(hex)` — returns `true` if a color is perceptually dark (luminance < 0.5)
- `lighten()`, `darken()`, `toRgba()`, `generateAccent()` — color manipulation helpers
- Theme persisted to `localStorage` and synced from Supabase profile on load

### Knowledge Base
- **Document upload** — drag-and-drop or click-to-upload; accepts PDF, DOC/DOCX, TXT, MD, HTML, JSON, CSV, XML, PPTX, XLSX, EPUB
- **Upload modal** — preview filename + select category before confirming
- **Page counting** — PDF page count detected via `/api/count-pages` API route
- **Category sidebar** — 6 built-in default categories + unlimited custom categories per user (stored in `knowledge_categories` table)
- **Custom category management** — add via inline input (Enter to confirm, Escape/click-outside to cancel); delete with hover-reveal × button
- **Category count badges** — live document counts per category shown as badges; animate in without layout shift
- **Document list** — filename, category, page count, file size, status badge (Indexed / Processing / Error), relative upload time
- **Centered upload CTA** — upload button and instructions centered in the main content area when documents exist; hidden when the list is empty to avoid duplicate prompts
- **All Documents filter** — shows unfiltered list; resets automatically when active category is deleted
- **Supabase Storage** — files stored in `knowledge-base` bucket with per-user path prefix and RLS

### Profile & Company Settings
- **Auto-save** — all field changes debounce-save (1.5 s) to Supabase via `upsertProfile`
- **Sticky header** — profile card fixed at top with backdrop blur
- **Avatar upload** — image stored in `avatars` bucket; centralized via `AuthContext.refreshProfile()`
- **Logo upload** — stored in `logos` bucket; displayed on the chat page
- **Brand colors** — dual colour pickers (primary + secondary); drive the entire theme engine
- **Theme controls** — style (cinematic, minimal, gradient, aurora) + mood (futuristic, calm, corporate, vibrant)

#### Profile Fields
| Field | Type |
|---|---|
| Full Name, Job Title | Text |
| Phone | Text + international country code dropdown |
| Location | 200+ country dropdown |
| LinkedIn URL, Website URL | URL inputs |
| Company Name, Industry, Company Size, Year Founded | Text / dropdowns |
| Business Description, Target Audience, Key Products | Textarea |
| AI Name, AI Role, Brand Voice, Communication Style | Text / dropdowns |
| Tone Examples, Words to Avoid, Clarification Prompt | Textarea |
| Response Length, Languages | Dropdown / multi-select |
| Preferred Knowledge Sources, Document Categories | Multi-select dropdowns |
| Brand Colors (Primary + Secondary) | Color pickers |
| Brand Style + Mood | Dropdowns |
| Company Logo | Image upload |
| Token Cap | Number input |

### Channels (Integrations)
Connect the AI to the platforms your team and customers already use:

| Platform | Type | Status |
|---|---|---|
| WhatsApp Business | Meta Business API | UI ready |
| Gmail | Google OAuth | UI ready |
| Outlook | Microsoft OAuth | UI ready |
| Telegram | Bot token | UI ready |
| Website Chat | Embed widget | UI ready |
| Slack | Slack OAuth | UI ready |
| Microsoft Teams | Microsoft OAuth | UI ready |
| Instagram | Meta OAuth | UI ready |
| Facebook Messenger | Meta OAuth | UI ready |
| iCloud Email | App-specific password | UI ready |
| SMS / Text Messages | Twilio API | UI ready |
| Google Calendar | Google OAuth | UI ready |
| Hostinger | API key / webhook | UI ready |

> OAuth token storage (`channel_connections` table) and sync jobs are on the roadmap.

### Avatar & Profile — Flash-Free Architecture
- `AuthContext` fetches avatar and profile **once** at the root level
- All pages (`Chat`, `Knowledge`, `Channels`, `Profile`, `Navbar`) consume `avatarUrl` and `loading` from context — no per-page fetches, no `localStorage` reads, no green flash on transparent images
- Avatar button uses dark background during load; transitions to avatar image with `transition-opacity`

### Internationalization (i18n)
- **EN / ES** — full translations across all pages and UI strings
- **Language toggle** — EN/ES switcher in every authenticated page header
- **Translation storage** — strings in `/lib/translations.ts` (typed keys) + optional Supabase `translations` table for DB-driven overrides
- **`useI18n()` hook** — provides `t(key)`, `lang`, and `setLang` anywhere in the app

### UI/UX System
- **Dark design** — deep navy base (`#2a3444`), emerald primary accent (`#10b981`), white/5 borders
- **3D card effects** — `hover:-translate-y-0.5` lift + shadow transitions
- **Nav Rail** — persistent icon-based sidebar with active state; settings icon pinned to bottom
- **Custom dropdowns** — all `<select>` elements replaced with fully dark-themed custom dropdowns
- **Responsive** — mobile-first breakpoints; sidebars collapse to overlay with backdrop
- **Backdrop blur headers** — sticky page and profile headers with `backdrop-blur-md`
- **Animated gradients** — `CinematicBackground` uses CSS keyframe drift animations driven by brand colors

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
- [x] Trial pill (`TrialPill`) — active and expired states with `#FFBF00` gold styling
- [x] Trial paywall overlay — full-screen soft block on expiry; dismissible for `super_admin`
- [x] Stripe checkout + webhook + billing portal
- [x] Lemon Squeezy checkout + webhook + billing portal (replaced FastSpring)
- [x] Super admin panel — stats, business metrics (MRR/ARR/ARPU/churn/conversion), user role management, trial config, announcement banner
- [x] Announcement banner — admin-controlled global message bar
- [x] Tech Support nav item with Calendly booking
- [x] EN/ES translations across all pages

### Pending
- [ ] Vector embeddings — chunk documents, embed via AI model, store in Supabase `pgvector`
- [ ] RAG pipeline — retrieve relevant chunks at query time, inject into AI context
- [ ] Real AI responses — connect DeepSeek / OpenAI / Anthropic to chat
- [ ] OAuth sync routes — pull emails/messages from Gmail, Slack, Outlook into knowledge base
- [ ] Agents — configurable AI agents with tools and memory
- [ ] Analytics — conversation volume, response quality, token usage dashboards
- [ ] Automations — trigger-based workflows (e.g. email received → draft reply)
- [ ] CAC tracking — marketing spend input for full LTV/CAC reporting in admin

---

## License

Private — All rights reserved © Exploro AI
