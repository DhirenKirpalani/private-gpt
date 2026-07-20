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

### Production-Ready

All requested scopes correspond to production-ready, user-facing features available in our application:
1. **Gmail**: Users can read, draft, and send emails through the AI assistant
2. **Google Calendar**: Users can view, create, and manage calendar events via AI
3. **Google Drive**: Users can import documents from Drive into the AI knowledge base
4. **Google Meet**: Users can generate Meet links for scheduling

### Scope Justification

Exploro OS is an AI-powered business assistant. Each Google API integration serves a distinct user-facing feature:

- **Gmail**: The AI reads incoming emails to provide summaries, draft responses, and prioritize messages. The `gmail.readonly` scope is used to read email threads and message content. The `gmail.send` scope is required to send AI-drafted replies and user-composed emails on the user's behalf. These are the minimum scopes needed — `gmail.readonly` for reading and `gmail.send` for sending. No label management or email modification is performed.

- **Google Calendar**: The AI creates events on behalf of the user (e.g., "Schedule a meeting with John next Tuesday at 2pm") and displays upcoming events in the dashboard. `calendar.events` is the narrowest scope that allows both reading and creating events. `calendar.readonly` would prevent the AI from creating events, which is a critical feature.

- **Google Drive**: The AI imports user-selected documents into its knowledge base for Q&A. We use the Google Picker API to let users select specific files from their Drive. The `drive.file` scope is the narrowest Drive scope and only grants access to files the user explicitly selects via the Picker or files created by the app. No broader Drive access is needed.

- **Google Meet**: The AI generates Meet links when scheduling meetings or when a user requests a video call. `meetings.space.created` is the narrowest Meet scope available.

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
- Meet: `meetings.space.created` (sensitive) — no restricted Meet scopes

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
