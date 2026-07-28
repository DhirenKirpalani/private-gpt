Subject: Re: [Action Needed] Your Google APIs Verification Request — Project exploro-os-501304

Hello Google Third Party Data Safety Team,

Thank you for the verification checklist. We have completed a thorough audit of our application, Cloud Console configuration, and submission materials. Below are our responses to each section.

---

## Scope Configuration & Justification

### Least Privilege

Exploro OS is an AI business assistant platform that integrates with Google services to provide users with a unified workspace. We request only the scopes necessary for our user-facing features. Below is a per-service breakdown:

**Gmail Integration** (OAuth connect: `/api/email/oauth/gmail/connect`)
- `openid` — User authentication
- `https://www.googleapis.com/auth/userinfo.email` — Identify the user's email address for account linking
- `https://www.googleapis.com/auth/gmail.readonly` — Read inbox emails so the AI can summarize, draft replies, and provide context-aware responses
- `https://www.googleapis.com/auth/gmail.send` — Send emails on behalf of the user (drafts, replies, AI-assisted responses)

**Google Calendar Integration** (OAuth connect: `/api/calendar/oauth/google/connect`)
- `openid` — User authentication
- `https://www.googleapis.com/auth/userinfo.email` — Identify user's email for account linking
- `https://www.googleapis.com/auth/calendar.events` — Read and create calendar events so the AI can schedule meetings, set reminders, and display upcoming events in the dashboard

**Google Drive Integration** (OAuth connect: `/api/drive/oauth/google/connect`)
- `openid` — User authentication
- `https://www.googleapis.com/auth/userinfo.email` — Identify user's email for account linking
- `https://www.googleapis.com/auth/drive.file` — Import files the user selects via Google Picker API into the AI knowledge base for document-based Q&A. Also allows uploading files to the user's Drive from within the app.

**Google Meet Integration** (OAuth connect: `/api/meet/oauth/google/connect`)
- `openid` — User authentication
- `https://www.googleapis.com/auth/userinfo.email` — Identify user's email for account linking
- `https://www.googleapis.com/auth/meetings.space.created` — Create Google Meet links for scheduled meetings and AI-initiated video calls
- `https://www.googleapis.com/auth/meetings.space.readonly` — Read existing Meet links associated with calendar events to display in the dashboard

### Removed Scopes

We have removed the following scopes from our Google Cloud Console configuration as they are not used by our application:
- `https://www.googleapis.com/auth/calendar.readonly` — Not needed; `calendar.events` already covers reading events
- `https://www.googleapis.com/auth/calendar.events.readonly` — Not needed; `calendar.events` already covers reading events

### Production-Ready

All requested scopes correspond to production-ready, user-facing features available in our application:
1. **Gmail**: Users can read, draft, and send emails through the AI assistant
2. **Google Calendar**: Users can view, create, and manage calendar events via AI
3. **Google Drive**: Users can import documents from Drive into the AI knowledge base
4. **Google Meet**: Users can generate Meet links for scheduling

### Detailed Scope Justification

Exploro OS is an AI-powered business assistant. Each Google API scope serves a specific, production-ready user-facing feature. Below we bridge the backend operations to the user experience for each scope:

---

#### `https://www.googleapis.com/auth/gmail.readonly`

**User-facing feature:** AI Email Assistant — Inbox Reading & Summarization

**How it works end-to-end:**
1. The user connects their Gmail account via the Channels page (`/channels`). The OAuth consent screen displays the `gmail.readonly` scope with a clear description.
2. After connection, the user opens the Chat page (`/chat`) and asks the AI questions like "What are my latest emails?", "Summarize my inbox", or "Did John reply about the contract?"
3. Our backend (`/api/email/fetch/route.ts`) calls the Gmail API (`GET /gmail/v1/users/me/messages`) to list messages from the user's inbox (excluding trash and spam). For each message, it fetches full content (`GET /gmail/v1/users/me/messages/{id}?format=full`) including subject, sender, body, and thread metadata.
4. The fetched emails are stored in our database (Supabase `email_messages` table) for the user's session context.
5. The email content is passed to our AI (DeepSeek API) which generates a natural language summary, identifies action items, or drafts a reply based on the email content.
6. The AI response is displayed in the chat interface, providing the user with an AI-powered email assistant experience.

**Why narrower permissions cannot be used:**
- `gmail.readonly` is the narrowest Gmail scope that allows reading email content. There is no more restrictive scope that provides access to message bodies and thread metadata.
- We do NOT request `gmail.modify` (which could delete or modify emails), `gmail.labels` (which could change labels/folders), or `gmail.metadata` (which is narrower but excludes email body content, which we need for AI summarization).
- We only read emails — we never modify, delete, or change labels on any email.

**Data accessed:** Email subject, sender, recipient, body content, thread ID, and message metadata (timestamps, labels for filtering).

---

#### `https://www.googleapis.com/auth/gmail.send`

**User-facing feature:** AI Email Assistant — Sending Drafts & Replies

**How it works end-to-end:**
1. While chatting with the AI assistant, the user asks the AI to draft an email (e.g., "Draft a reply to John about the pricing proposal" or "Send an email to sarah@company.com about tomorrow's meeting").
2. The AI generates an email draft with subject, body, and recipient. The draft is displayed in the chat interface with an inline "Send Email" action button.
3. The user reviews the draft and can edit the recipient, subject, CC/BCC, and body before sending using an inline edit form.
4. When the user clicks "Send", our backend (`/api/email/send/route.ts`) constructs a MIME-formatted email (RFC 2822) with proper headers (To, Cc, Bcc, From, Subject, References for threading) and sends it via the Gmail API (`POST /gmail/v1/users/me/messages/send`).
5. The sent email appears in the user's Gmail Sent folder, and the AI confirms successful delivery in the chat.

**Why narrower permissions cannot be used:**
- `gmail.send` is the narrowest Gmail scope that allows sending emails. There is no more restrictive scope for sending.
- We do NOT request `gmail.compose` (which is not a real scope), `gmail.modify` (which could modify existing emails), or `gmail.labels` (which could change email organization).
- All emails are user-initiated — the AI drafts the content, but the user must explicitly click "Send" to authorize sending. The AI cannot send emails autonomously.

**Data accessed:** No Gmail data is read with this scope. It is used only to send emails composed by the user (with AI assistance).

---

#### `https://www.googleapis.com/auth/calendar.events`

**User-facing feature:** AI Calendar Assistant — View & Create Events

**How it works end-to-end:**
1. The user connects their Google Calendar via the Channels page (`/channels`). The OAuth consent screen displays the `calendar.events` scope.
2. **Reading events:** When the user asks "What's on my schedule today?" or "Do I have any meetings this week?", our backend (`/api/calendar/fetch/route.ts`) calls the Google Calendar API (`GET /calendar/v3/calendars/primary/events`) to fetch events for the next 14 days. Events are filtered (birthdays and holidays excluded), stored in our database (`calendar_events` table), and displayed in the chat as a natural language schedule summary.
3. **Creating events:** When the user asks "Schedule a meeting with John next Tuesday at 2pm" or "Set a reminder for Friday at 9am", the AI extracts the event details (title, time, attendees, location). Our backend (`/api/calendar/create/route.ts`) calls the Calendar API (`POST /calendar/v3/calendars/primary/events`) to create the event on the user's primary calendar. If the user requests a video call, a Google Meet conference is attached to the event (`conferenceData` with `hangoutsMeet` solution).
4. The created event appears in the user's Google Calendar, and the AI confirms with event details and a link.

**Why narrower permissions cannot be used:**
- `calendar.events` is the narrowest scope that allows BOTH reading and creating events. We need both capabilities:
  - `calendar.events.readonly` would only allow reading — the AI could not create events, which is a core feature (users ask the AI to schedule meetings via natural language).
  - `calendar.readonly` would allow reading all calendar metadata but not creating events — same limitation.
- We do NOT request `calendar` (full access, which could delete calendars), `calendar.settings.readonly` (not needed), or `calendar.calendarlist.readonly` (not needed — we only use the primary calendar).
- We only read and create events on the user's primary calendar. We do not delete events, modify calendar settings, or access other calendars.

**Data accessed:** Event title, description, start/end time, attendees (email + display name + response status), location, Google Meet link, and event HTML link.

---

#### `https://www.googleapis.com/auth/meetings.space.created`

**User-facing feature:** AI Meeting Scheduler — Generate Google Meet Links

**How it works end-to-end:**
1. The user connects Google Meet via the Channels page (`/channels`). The OAuth consent screen displays the `meetings.space.created` scope.
2. When the user asks the AI to schedule a meeting with a video call (e.g., "Schedule a video call with the marketing team tomorrow at 3pm"), the AI creates a calendar event with `addGoogleMeet: true`.
3. Our backend (`/api/calendar/create/route.ts`) includes `conferenceData` with `conferenceSolutionKey: { type: "hangoutsMeet" }` in the Calendar API create request, which triggers Google to generate a Meet link for the event.
4. The generated Meet link is displayed in the chat and stored in our database (`calendar_events.event_link`), so the user can click to join the meeting directly from the AI assistant.

**Why narrower permissions cannot be used:**
- `meetings.space.created` is the narrowest Meet scope that allows creating meeting spaces. Without this scope, the AI cannot generate Meet links for scheduled meetings.
- We do NOT request broader Meet scopes that could modify meeting settings or manage participants.

**Data accessed:** Only creates meeting spaces (generates Meet URLs). No meeting content, participant data, or recording data is accessed.

---

#### `https://www.googleapis.com/auth/meetings.space.readonly`

**User-facing feature:** AI Meeting Scheduler — Display Existing Meet Links

**How it works end-to-end:**
1. When the user's calendar events are fetched (via `/api/calendar/fetch/route.ts`), some events may already have Google Meet links attached (created outside of Exploro OS, e.g., directly in Google Calendar).
2. This scope allows our app to read the `conferenceData` field on existing calendar events to extract Meet links, so we can display them in the AI assistant's schedule view.
3. When the user asks "What meetings do I have today?", the AI response includes Meet links for any events that have video calls, allowing the user to join with one click.

**Why narrower permissions cannot be used:**
- `meetings.space.readonly` is the narrowest Meet scope for reading meeting space information. Without it, we could not display existing Meet links in the AI assistant, creating an inconsistent experience where AI-scheduled meetings show links but user-created meetings don't.
- We do NOT request scopes that would allow reading meeting participant lists, meeting recordings, or meeting transcripts.

**Data accessed:** Meeting space URLs (Meet links) associated with calendar events. No meeting content, participant data, or recording data is accessed.

---

## Demo Video

**YouTube URL**: [INSERT YOUR YOUTUBE LINK HERE — public or unlisted]

The demo video shows:
1. User connects Gmail via OAuth — consent screen displayed with all scopes visible
2. AI reads and summarizes emails, drafts replies, sends responses
3. User connects Google Calendar — AI creates an event via natural language
4. User connects Google Drive — uses Google Picker to select a document, imports it into the knowledge base
5. User connects Google Meet — AI generates a Meet link for a scheduled meeting
6. All OAuth consent screens shown with scopes fully expanded

---

## App Access & Testing Environment

### Test Credentials
- **Test URL**: https://www.exploro-os.com/
- **Test account email**: [INSERT TEST EMAIL]
- **Test account password**: [INSERT TEST PASSWORD]
- No phone verification, credit card, or payment required to access the app or test Google integrations

### Navigation Instructions
1. Log in at [INSERT URL]
2. Navigate to "Channels" page (left sidebar)
3. Click "Connect" on Gmail, Google Calendar, Google Drive, or Google Meet
4. Complete OAuth flow — consent screen appears with all requested scopes
5. After connecting, return to Channels page to test each integration

---

## Privacy Policy Disclosures

Our Privacy Policy is hosted at: https://www.exploro-os.com/privacy

### Data Access
Exploro OS accesses the following Google user data:
- **Gmail**: Email subject, sender, recipient, body content, and thread metadata
- **Google Calendar**: Event title, description, start/end time, attendees, location
- **Google Drive**: File names, file types, file content (for documents imported into the knowledge base)
- **Google Meet**: Meeting space URLs created by the app

### Data Use
- **Gmail data**: Used to provide AI-powered email summaries, draft responses, and send emails on the user's behalf. Email content is sent to our LLM provider (DeepSeek) to generate contextual responses.
- **Calendar data**: Used to display upcoming events in the dashboard and allow the AI to schedule meetings on the user's behalf.
- **Drive data**: File content is extracted from user-selected files (via Google Picker API) and stored in our database (Supabase) to enable document-based Q&A with the AI assistant. The app only accesses files the user explicitly selects.
- **Meet data**: Used to create video meeting links for scheduled events.

### Data Transfer
- Google user data is transferred to **DeepSeek API** (our LLM provider, api.deepseek.com) for AI processing of email and document content. DeepSeek does not use customer data for model training (per their data policy).
- Google user data is stored in **Supabase** (our database provider, US/EU regions) for persistence and retrieval.
- No Google user data is transferred to data brokers, advertisers, or any third party for purposes other than providing user-facing features.

### Data Protection
- All data in transit is encrypted via TLS/HTTPS
- All data at rest is encrypted via Supabase (PostgreSQL with encryption at rest)
- OAuth tokens are stored encrypted in our database with row-level security (RLS) policies
- Access to user data is restricted via Supabase RLS — users can only access their own data
- Service role keys are stored as environment variables, never exposed client-side

### Data Retention & Deletion
- Google user data is retained for as long as the user has an active Exploro OS account
- Users can delete their account and all associated data at any time from Settings → Account → Delete Account
- Upon account deletion, all Google user data (emails, calendar events, drive imports, OAuth tokens) is permanently deleted from our database within 30 days
- Users can disconnect any Google integration at any time from the Channels page, which revokes OAuth tokens and stops data access immediately

---

## Data Handling: Limited Use Restrictions

### Prohibited Data Use
Exploro OS does not use Google user data for targeted advertising, lending, or any purpose other than providing user-facing AI assistant features.

### Prohibited Data Transfer
Exploro OS does not transfer or sell Google user data to data brokers, advertisers, or any third party for purposes other than providing user-facing features.

### AI/ML Model Training Restrictions
- Exploro OS does **not** use raw or aggregated Google user data to develop, improve, or train AI/ML models.
- Google user data (email content, document content) is sent to DeepSeek API solely for inference (generating responses), not for model training. DeepSeek's API terms explicitly state that customer data is not used for training.
- Exploro OS does not transfer Google user data to any third-party service that uses data for AI/ML model training.

### Limited Use Compliance Statement
Our application hosts the following compliance statement in our Privacy Policy and Terms of Service:

> "The use of raw or derived user data received from Google Workspace APIs will adhere to the Google User Data Policy, including the Limited Use requirements. Exploro OS does not use Google user data to train, develop, or improve AI/ML models. Google user data is processed solely to provide personalized AI assistant features for the individual user."

---

## Prohibited Use Cases
- Exploro OS does not send commercial/cold emails without recipient consent
- Exploro OS does not offer email warming services
- Exploro OS does not use Drive or Chat as a CDN
- Exploro OS does not reward YouTube users for interacting with channels
- All email sending is user-initiated (drafts, replies to existing conversations, or user-approved outreach)

---

## Cloud Application Security Assessment (CASA)
Our application no longer requests any Restricted scopes. We use only non-sensitive and sensitive scopes:
- Gmail: `gmail.readonly` (sensitive) and `gmail.send` (sensitive) — no restricted Gmail scopes
- Drive: `drive.file` (non-sensitive) — no restricted Drive scopes
- Calendar: `calendar.events` (sensitive) — no restricted Calendar scopes
- Meet: `meetings.space.created` (sensitive) and `meetings.space.readonly` (sensitive) — no restricted Meet scopes

We have removed `calendar.readonly` and `calendar.events.readonly` from our Cloud Console as they were redundant with `calendar.events`.

As we do not request any Restricted scopes, a CASA assessment is not required.

---

## Confirmation

We confirm that:
1. All scopes requested in our Cloud Console match the scopes used by our application code
2. The demo video shows all requested scopes in the OAuth consent flow
3. Our Privacy Policy covers all required data disclosures
4. Our application complies with the Google User Data Policy and Limited Use restrictions
5. Test credentials are provided for Google's review team

Please let us know if any additional information or changes are required. We are happy to address any questions.

Best regards,
[Your Name]
[Your Title]
Exploro OS
[Your Email]
[Your Phone]
