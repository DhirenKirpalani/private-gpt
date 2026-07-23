import type { Metadata } from "next"
import HomeClient from "./home-client"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://exploro-os.com"

export const metadata: Metadata = {
  title: "Exploro OS — AI-Powered Business Platform for SMEs",
  description: "Exploro OS is an AI-powered business assistant for SMEs that unifies company knowledge, Gmail, Google Drive, Calendar, WhatsApp, and other business tools into a secure, searchable workspace. It uses retrieval-augmented generation (RAG) to provide accurate, context-aware answers based on your organization's data.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Exploro OS — AI-Powered Business Platform for SMEs",
    description: "Unify company knowledge, Gmail, Google Drive, Calendar, WhatsApp, and business tools into a secure AI workspace with RAG-powered answers.",
    url: baseUrl,
  },
}

export default function HomePage() {
  return (
    <>
      {/* SSR content for Googlebot and AI Overview — hidden visually, visible to crawlers */}
      <div className="sr-only">
        <h1>Exploro OS — AI-Powered Business Platform for SMEs</h1>
        <p>
          Exploro OS is an AI-powered business assistant for small and medium enterprises that unifies company
          knowledge, Gmail, Google Drive, Google Calendar, WhatsApp, Telegram, and other business tools into a
          single secure, searchable workspace. It uses retrieval-augmented generation (RAG) to provide accurate,
          context-aware answers based on your organization&apos;s own data — so every response is grounded in
          your documents, not hallucinated.
        </p>

        <h2>What is Exploro OS?</h2>
        <p>
          Exploro OS is a private AI workspace built for small and medium businesses. Think of it as Public AI for
          your company — but instead of answering from the public internet, it answers from your own documents,
          emails, calendar, and business tools. You upload your knowledge base, connect your Gmail or Outlook,
          sync your calendar, and link WhatsApp or Telegram. Then you ask questions in plain English and get
          answers with citations pointing to the exact source document.
        </p>

        <h2>Who is Exploro OS for?</h2>
        <p>
          Exploro OS is designed for small and medium businesses that need a private, secure AI assistant
          connected to their real business data. It works well for:
        </p>
        <ul>
          <li>Consultants and agencies managing multiple client projects and documents</li>
          <li>Restaurants and hospitality businesses handling orders, menus, and customer communications</li>
          <li>Healthcare providers managing patient records, appointments, and compliance documents</li>
          <li>Real estate firms tracking listings, contracts, and client communications</li>
          <li>Educational institutions organizing curricula, research, and administrative documents</li>
          <li>Wellness centers and coaches managing client programs and content</li>
          <li>Any business that wants a private AI assistant trained on their own data</li>
        </ul>

        <h2>What problem does Exploro OS solve?</h2>
        <p>
          Most small businesses face three problems when trying to use AI:
        </p>
        <ol>
          <li>
            <strong>Scattered knowledge</strong> — Documents live in Google Drive, emails in Gmail, messages in
            WhatsApp, and files in Dropbox. No single AI can access all of them at once.
          </li>
          <li>
            <strong>Generic AI lacks context</strong> — Public AI and similar tools don&apos;t know your business,
            your clients, your contracts, or your processes. They hallucinate when asked specific questions.
          </li>
          <li>
            <strong>Data privacy concerns</strong> — Uploading sensitive business documents to public AI tools
            risks data leaks and compliance violations.
          </li>
        </ol>
        <p>
          Exploro OS solves all three by connecting your existing tools into one private AI workspace. Every
          answer is grounded in your own data, cites its source, and never trains on your documents.
        </p>

        <h2>How does Exploro OS work?</h2>
        <p>
          Exploro OS works in three steps:
        </p>
        <ol>
          <li>
            <strong>Connect your tools</strong> — Link your Gmail, Google Drive, Google Calendar, WhatsApp,
            Outlook, Slack, Notion, Dropbox, or OneDrive accounts with secure OAuth authentication.
          </li>
          <li>
            <strong>Build your knowledge base</strong> — Upload PDFs, spreadsheets, contracts, proposals, and
            any business documents. Exploro OS encrypts and indexes them using RAG (retrieval-augmented
            generation) technology.
          </li>
          <li>
            <strong>Ask questions in plain language</strong> — Type questions like &quot;What did the client
            agree to in the last proposal?&quot; or &quot;When is my next meeting with Acme Corp?&quot; and get
            instant answers with citations to the source document.
          </li>
        </ol>

        <h2>Key Features</h2>
        <ul>
          <li><strong>Private AI knowledge base</strong> — Upload documents and get RAG-powered answers with source citations</li>
          <li><strong>AI-powered CRM</strong> — Manage contacts, track deals, and view customer communication history</li>
          <li><strong>AI email assistant</strong> — Draft, reply, and manage Gmail or Outlook inbox with AI suggestions</li>
          <li><strong>Calendar integration</strong> — Sync Google Calendar and ask about upcoming meetings and events</li>
          <li><strong>WhatsApp &amp; Telegram integration</strong> — Connect business messaging channels for AI-assisted responses</li>
          <li><strong>Document management</strong> — Search across Google Drive, OneDrive, Dropbox, and Notion from one place</li>
          <li><strong>Team workspaces</strong> — Collaborate with role-based access control and shared knowledge bases</li>
          <li><strong>AI agents</strong> — Automate repetitive workflows and task execution</li>
          <li><strong>Multi-language support</strong> — Full interface in English and Spanish</li>
          <li><strong>Brand customization</strong> — Upload your logo, set brand colors, and customize your AI assistant&apos;s tone</li>
        </ul>

        <h2>Is Exploro OS secure?</h2>
        <p>
          Yes. Exploro OS is built with security as a foundational principle:
        </p>
        <ul>
          <li><strong>Encrypted knowledge base</strong> — All uploaded documents are encrypted at rest and in transit</li>
          <li><strong>Temporary memory</strong> — Conversation history is deleted after each session to prevent data contamination</li>
          <li><strong>No model training</strong> — Your data is never used to train AI models</li>
          <li><strong>Data isolation</strong> — Each business has its own isolated knowledge base with no cross-contamination</li>
          <li><strong>Source citations</strong> — Every AI response includes citations to the source document for verification</li>
          <li><strong>OAuth authentication</strong> — Tool integrations use secure OAuth — we never store your passwords</li>
        </ul>

        <h2>Exploro OS vs. Public AI: What&apos;s the difference?</h2>
        <p>
          Public AI is a general-purpose AI chatbot that answers from the public internet. It doesn&apos;t know your
          business, your documents, or your clients. Exploro OS is a private AI workspace that answers from your
          own data — your documents, emails, calendar, and messages. The key differences:
        </p>
        <ul>
          <li><strong>Data source:</strong> Public AI uses public internet data. Exploro OS uses your private business data.</li>
          <li><strong>Accuracy:</strong> Public AI can hallucinate. Exploro OS cites sources and declines to answer when it doesn&apos;t know.</li>
          <li><strong>Integrations:</strong> Public AI has no business tool integrations. Exploro OS connects to Gmail, Google Drive, Calendar, WhatsApp, and more.</li>
          <li><strong>Privacy:</strong> Public AI may use conversations for training. Exploro OS never trains on your data and deletes session memory.</li>
          <li><strong>Team collaboration:</strong> Public AI is individual-only. Exploro OS supports team workspaces with shared knowledge bases.</li>
        </ul>

        <h2>Integrations</h2>
        <p>Exploro OS connects directly to the tools your business already uses:</p>
        <ul>
          <li><strong>Gmail</strong> — AI email assistant for drafting, replying, and managing inbox</li>
          <li><strong>Google Drive</strong> — Document search and AI-powered retrieval across your files</li>
          <li><strong>Google Calendar</strong> — Event sync and upcoming meeting context for the AI</li>
          <li><strong>WhatsApp</strong> — Business messaging with AI-assisted responses</li>
          <li><strong>Outlook</strong> — Email integration via Microsoft Graph API</li>
          <li><strong>Slack</strong> — Team communication integration</li>
          <li><strong>Notion</strong> — Knowledge base synchronization</li>
          <li><strong>Dropbox</strong> — Cloud document storage integration</li>
          <li><strong>OneDrive</strong> — Microsoft cloud storage integration</li>
          <li><strong>Telegram</strong> — Messaging channel integration</li>
        </ul>

        <h2>Pricing</h2>
        <p>
          Exploro OS offers simple, transparent pricing with a 15-day free trial — no credit card required:
        </p>
        <ul>
          <li><strong>Solo plan</strong> — $30/month for individual users. Includes AI knowledge base, email integration, calendar sync, and messaging channels.</li>
          <li><strong>Team plan</strong> — $50/month per seat for collaborative workspaces. Includes everything in Solo plus team knowledge sharing, role-based access, and workspace management.</li>
          <li><strong>Free trial</strong> — 15 days, full access, no credit card required. Cancel anytime.</li>
        </ul>

        <h2>Why choose Exploro OS?</h2>
        <p>
          If you&apos;re a small or medium business looking for an AI assistant that actually knows your business,
          Exploro OS is the answer. It connects to your existing tools, uses your own data for context, maintains
          strict data privacy, and provides verifiable answers with source citations. No technical skills
          required — we handle the setup while you focus on running your business.
        </p>

        <h2>Frequently Asked Questions</h2>
        <h3>Is Exploro OS like Public AI?</h3>
        <p>
          No. Public AI answers from the public internet. Exploro OS answers from your own business documents,
          emails, and data — with source citations and no hallucinations.
        </p>
        <h3>Do I need technical skills to set up Exploro OS?</h3>
        <p>
          No. We handle the integration. You provide your documents and brand voice, and we set up the
          infrastructure for you.
        </p>
        <h3>Can Exploro OS browse the web?</h3>
        <p>
          Yes. When enabled, Exploro OS can search the web to supplement your knowledge base, always citing
          sources. You control when web search is active.
        </p>
        <h3>What communication channels does Exploro OS support?</h3>
        <p>
          WhatsApp, Telegram, email (Gmail and Outlook), and your website chatbot. All channels integrate
          directly and share information with your AI knowledge base.
        </p>
        <h3>Is my data used to train AI models?</h3>
        <p>
          No. Your data is never used for model training. Short-term memory is deleted after each session, and
          your long-term knowledge base is encrypted and isolated.
        </p>
      </div>
      {/* Interactive client-rendered homepage */}
      <HomeClient />
    </>
  )
}
