# Exploro

**Your business. Your knowledge. Your AI.**

Exploro is a private, AI-powered business platform built for SMEs. It lets you train an AI on your own documents, knowledge base, and processes — then deploy it across your team via WhatsApp, Email, web chat, and more.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Fonts | Inter (Google Fonts) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/exploro.git
cd exploro

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

---

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout (Navbar, Footer)
│   ├── page.tsx            # Homepage (landing)
│   ├── login/              # Login page
│   ├── signup/             # Signup page
│   ├── chat/               # AI chat interface
│   ├── agents/             # AI agents dashboard
│   ├── analytics/          # Analytics dashboard
│   ├── automations/        # Automations
│   ├── channels/           # Communication channels
│   ├── contacts/           # Contacts & CRM
│   ├── knowledge/          # Knowledge base
│   └── inbox/              # Inbox
├── components/
│   ├── navbar.tsx          # Top navigation bar
│   ├── footer.tsx          # Site footer
│   └── ui/                 # shadcn/ui components
├── public/
│   └── assets/images/      # Static assets (logo, etc.)
└── lib/
    └── utils.ts            # Utility functions
```

---

## Key Features

### Core Platform
- **Private AI** — AI trained exclusively on your business data. No public model training.
- **Multi-channel deployment** — Deploy AI across WhatsApp, Email, Web Chat, Telegram, Slack, Instagram, Facebook Messenger, Microsoft Teams, and SMS.
- **Knowledge Base** — Upload, categorize, and manage documents. AI answers from your actual documentation with source citations.
- **AI Chat** — Conversational interface with company branding. Ask questions about your business and get instant, cited answers.
- **Analytics** — Track conversations, performance, and ROI.
- **Automations** — Build AI-driven workflows across your team.
- **Secure by design** — Isolated workspaces, encrypted knowledge base, temporary memory that clears after use.

### Authentication & Onboarding
- **Supabase Auth** — Secure email/password authentication.
- **Post-login redirect** — Users land on their profile page after signing in.
- **Protected routes** — Authenticated-only access to workspace pages.

### Profile & Company Setup
- **Account Profile Card** — Displays avatar, full name, job title, email, plan badge, and country badge.
- **Auto-save to Supabase** — All form changes debounce-save automatically (1.5s) via `upsertProfile`.
- **Sticky profile header** — Stays fixed at the top with backdrop blur as you scroll.

#### Profile Fields
| Field | Type | Notes |
|---|---|---|
| Full Name | Text | Personal name |
| Job Title | Text | Role in company |
| Phone | Text + Country Dropdown | International country code selector with flag icons |
| Location | Country Dropdown | 200+ countries, custom Exploro-themed dropdown |
| LinkedIn URL | URL input | Social profile link |
| Website URL | URL input | Company website |
| Company Name | Text | Business name |
| Industry | Single-select dropdown | Custom-themed dropdown |
| Company Size | Single-select dropdown | Team size ranges |
| Date Founded | Date picker | Native HTML5 date input with Exploro theme |
| Communication Style | Single-select dropdown | Brand voice selection |
| Preferred Knowledge Sources | Multi-select dropdown | Google Drive, Notion, PDFs, etc. |
| Document Categories | Multi-select dropdown | SOPs, FAQs, Training Material, Policies, Reports |
| Brand Colors | Dual color inputs | Primary + Secondary colors with live swatch preview |
| Company Logo | Image upload | MIME-validated upload, displayed on chat page |

### Knowledge Base (Documents)
- **Document categories sidebar** — 6 default categories + ability to add/remove custom categories.
- **Add custom categories** — Inline input with Enter to confirm, Escape to cancel. Click-outside closes the input.
- **Remove custom categories** — Hover-reveal X button on custom categories only. Auto-resets filter to "All Documents".
- **Upload with validation** — Accepts PDF, DOC/DOCX, TXT, Markdown, HTML, JSON, CSV, XML, PPTX, XLSX, EPUB.
- **Upload preview modal** — After selecting a file, a modal shows file preview + category dropdown to classify before confirming upload.
- **Document list** — Displays name, translated category, pages, size, status (Indexed/Processing/Error), and upload time.
- **Dynamic indexed count** — Footer shows live count of indexed documents.
- **Empty state** — Prompts users to upload when no documents exist.

### Channels (Integrations)
Connect your AI to the tools your team already uses:
- WhatsApp Business
- Gmail
- Outlook
- Telegram
- Website Chat
- Slack
- Microsoft Teams
- Instagram
- Facebook Messenger
- iCloud Email
- SMS / Text Messages
- Google Calendar
- Notion, Dropbox, Google Drive, OneDrive (displayed on landing page)

### Internationalization (i18n)
- **Bilingual support** — Full English and Spanish translations across all pages.
- **Language toggle** — EN/ES switcher in the header of every authenticated page.
- **Translation system** — Centralized in `/lib/translations.ts` with typed keys.

### UI/UX Design System (Exploro Theme)
- **Dark theme** — Deep navy backgrounds (`#2a3444`), emerald accents (`#10b981`).
- **Custom dropdowns** — All native `<select>` elements replaced with fully themed custom dropdowns (dark background, emerald focus ring, border-white/10).
- **3D card effects** — Hover lift and shadow transitions on cards.
- **Sticky headers** — Profile and page headers stick to top with `backdrop-blur-md`.
- **Nav Rail** — Persistent vertical navigation with active state highlighting, settings icon pinned to bottom.
- **Responsive** — Mobile sidebar with backdrop, responsive breakpoints for all layouts.
- **Logo** — Exploro logo loaded from `/public/assets/images/` with overflow containment.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

---

## License

Private — All rights reserved © Exploro AI
