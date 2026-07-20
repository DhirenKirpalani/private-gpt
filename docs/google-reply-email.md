Confirming narrower scopes

Hello Google Third Party Data Safety Team,

Thank you for reviewing our verification request and recommending narrower scopes. We have updated our Cloud Console project to follow your recommendations for both Gmail and Google Drive.

**Gmail — Switched to recommended narrower scopes:**
- Removed: `gmail.modify` and `gmail.labels`
- Added: `gmail.send`
- Now using: `gmail.readonly` + `gmail.send`
- Our application reads incoming emails so the AI can summarize customer inquiries and draft replies (`gmail.readonly`), and sends AI-drafted replies and user-composed emails on the user's behalf (`gmail.send`). No label management or email modification is performed. Read/unread tracking is handled internally in our application database, not via the Gmail API.

**Google Drive — Switched to recommended narrower scope:**
- Removed: `drive.readonly` and `drive.metadata.readonly`
- Now using: `drive.file` only
- We have implemented the Google Picker API for file selection. Users explicitly select which files from their Google Drive to import into the AI knowledge base. The app only accesses files the user picks via the Picker or files created by the app. No broader Drive access is needed.

**Updated scope configuration in Cloud Console:**
- Gmail: `gmail.readonly` (restricted) + `gmail.send` (sensitive)
- Drive: `drive.file` (non-sensitive)
- Calendar: `calendar.events` (sensitive), `calendar.readonly` (sensitive), `calendar.events.readonly` (sensitive)
- Meet: `meetings.space.created` (sensitive), `meetings.space.readonly` (sensitive)

The updated scopes have been added to our Cloud Console project and submitted for verification. We have not deployed any code changes to production yet — we will deploy only after verification is completed, as instructed.

We understand that `gmail.readonly` is a restricted scope and we will complete the CASA security assessment as required.

Please let us know if any additional information is needed.

Best regards,
[Your Name]
[Your Title]
Exploro OS
[Your Email]
