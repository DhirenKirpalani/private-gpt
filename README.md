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

- **Private AI** — AI trained exclusively on your business data
- **Multi-channel deployment** — WhatsApp, Email, Web Chat, and more
- **Knowledge base** — Upload documents, PDFs, and data sources
- **AI Agents** — Automate tasks across your team
- **Analytics** — Track conversations, performance, and ROI
- **Secure by design** — Your data never leaves your environment

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
