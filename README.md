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

Create a `.env.local` file (see `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

For future platform integrations (OAuth channels):

```env
# Google (Gmail + Google Calendar)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft (Outlook + Teams)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common

# Slack
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Meta (WhatsApp + Instagram + Messenger)
META_APP_ID=
META_APP_SECRET=
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
│   ├── auth-provider.tsx       # Global AuthContext (user, session, avatarUrl, profile)
│   ├── layout.tsx              # Root layout (AuthProvider, Navbar, Footer)
│   ├── page.tsx                # Landing page
│   ├── login/                  # Login page
│   ├── signup/                 # Signup / registration
│   ├── chat/                   # AI chat workspace
│   ├── knowledge/              # Knowledge base (documents + categories)
│   ├── channels/               # Platform integrations
│   ├── agents/                 # AI agents dashboard
│   ├── analytics/              # Analytics & ROI
│   ├── profile/                # User + company profile settings
│   ├── about/                  # About page
│   └── api/
│       └── count-pages/        # PDF page counting API route
├── components/
│   ├── navbar.tsx              # Top navigation bar (avatar, language toggle)
│   ├── nav-rail.tsx            # Vertical side navigation rail
│   ├── cinematic-background.tsx # Animated gradient background
│   ├── animated-placeholder.tsx # Rotating chat input placeholders
│   ├── exploro-form.tsx        # Reusable form components
│   └── ui/                     # shadcn/ui primitives
├── lib/
│   ├── supabase.ts             # Supabase client + all DB/Storage helpers
│   ├── theme-engine.ts         # Brand color compilation + dark/contrast helpers
│   ├── i18n.tsx                # Internationalization context + hook
│   ├── translations.ts         # EN/ES translation strings
│   └── utils.ts                # cn() and utility helpers
├── supabase/
│   ├── schema.sql              # Base database schema
│   └── migrations/             # Incremental SQL migrations
└── public/
    └── assets/images/          # Static assets (Exploro logo, etc.)
```

---

## Features & Functionality

### Authentication
- **Email/password auth** via Supabase Auth with session persistence via cookies
- **Protected routes** enforced by `middleware.ts` — unauthenticated users redirected to `/login`
- **Email confirmation** with redirect back to login after verification
- **Password reset** via emailed magic link
- **Centralized auth state** — `AuthContext` (`/app/auth-provider.tsx`) exposes `user`, `session`, `loading`, `avatarUrl`, `profile`, and `refreshProfile` globally; eliminates localStorage flash and redundant per-page profile fetches

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

- [ ] `channel_connections` table — store OAuth tokens per platform per user
- [ ] OAuth sync routes — pull emails/messages from Gmail, Slack, Outlook into knowledge base
- [ ] Vector embeddings — chunk documents, embed via OpenAI, store in Supabase `pgvector`
- [ ] RAG pipeline — retrieve relevant chunks at query time and inject into AI context
- [ ] Real AI responses — replace mock responses with OpenAI / Anthropic API calls
- [ ] Agents — configurable AI agents with tools and memory
- [ ] Analytics — conversation volume, response quality, token usage dashboards
- [ ] Automations — trigger-based workflows (e.g. email received → draft reply)

---

## License

Private — All rights reserved © Exploro AI
