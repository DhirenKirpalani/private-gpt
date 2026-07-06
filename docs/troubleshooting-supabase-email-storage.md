# Troubleshooting: Supabase Free Plan Storage Exceeded — Email Messages Table

## Issue

The `email_messages` table in Supabase exceeded the free plan storage limit (500 MB). This caused all Supabase queries to fail, breaking email sync, CRM inbox, and channels functionality across the application.

## Root Cause

When a user connected an email account (Gmail, Outlook, or IMAP), the email fetch endpoint (`/api/email/fetch`) retrieved **all** emails from the inbox without any filtering:

1. **No date filter** — All historical emails were fetched, going back months or years
2. **No keyword filter** — Every email was stored, including newsletters, promotions, social notifications, and personal emails
3. **No pagination limit** — The fetch loop continued until all messages were processed
4. **Full email bodies stored** — Both plain text and HTML bodies were saved to the database, consuming large amounts of storage per message

For a user with a typical inbox (5,000+ emails), this could easily consume 200–500 MB of Supabase storage in a single sync.

## Symptoms

- Supabase dashboard shows storage usage at or near the 500 MB free plan limit
- API calls to Supabase return errors like:
  ```
  {"code":"54000","message":"row is too big"}
  ```
  or
  ```
  {"error":"Database is in read-only mode due to exceeding storage limits"}
  ```
- Email sync fails when fetching new messages
- CRM page fails to load email messages
- Channels page inbox shows empty or errors out
- Other Supabase tables (profiles, documents, contacts) may also fail to read/write

## Fix Applied

Three filters were added to the email fetch endpoint (`app/api/email/fetch/route.ts`):

### 1. Date Window Filter (15-day lookback)

Only emails from the **last 15 days** (relative to the email connection date) are fetched:

```typescript
// 15-day window since connection
const connectionDate = new Date(conn.created_at)
const cutoffDate = new Date(connectionDate)
cutoffDate.setDate(cutoffDate.getDate() - 15)
const afterTimestamp = Math.floor(cutoffDate.getTime() / 1000)
```

- **Gmail**: Uses `after:{timestamp}` query parameter
- **Microsoft Graph**: Uses `$filter=receivedDateTime ge {cutoffISO}`
- **IMAP**: Uses `SINCE {date}` search criteria

### 2. Business Keyword Filter

Only emails containing business-relevant keywords in the subject or body are stored:

```typescript
const BUSINESS_KEYWORDS = [
  "proposal", "invoice", "contract", "quote", "order", "purchase",
  "payment", "receipt", "agreement", "deal", "lead", "client",
  "project", "billing", "estimate", "PO", "due", "refund",
  "sales", "opportunity", "milestone", "deliverable", "deadline",
  "status", "update", "approval", "sign", "legal",
]

function matchesBusinessKeywords(text: string): boolean {
  const lower = text.toLowerCase()
  return BUSINESS_KEYWORDS.some(k => lower.includes(k.toLowerCase()))
}
```

Each email's subject + body is checked against these keywords before being inserted into Supabase. Non-business emails (newsletters, promotions, social notifications) are skipped.

### 3. Batch Deduplication

Before fetching full email details, the code checks which messages already exist in the database:

```typescript
const { data: existingRows } = await supabase
  .from("email_messages")
  .select("message_id")
  .eq("user_id", userId)
  .eq("connection_id", conn.id)
  .in("message_id", messageIds)

const existingIds = new Set((existingRows || []).map((r: any) => r.message_id))
const newIds = messageIds.filter((id: string) => !existingIds.has(id))
```

This prevents re-fetching and re-storing emails that were already synced.

### 4. Pagination (50 messages per page)

Fetches are limited to 50 messages per API call, with `nextPageToken` returned for loading more:

- **Gmail**: `maxResults=50`
- **Microsoft Graph**: `$top=50`
- **IMAP**: Processes all found messages but with the date + keyword filters above

## Affected Files

| File | Change |
|------|--------|
| `app/api/email/fetch/route.ts` | Added 15-day window, keyword filter, batch dedup, pagination |
| `lib/supabase.ts` | `getEmailMessages()` already supports optional `direction` filter |
| `app/api/email/messages/route.ts` | Already filters by `userId` and optional `provider` |

## How to Clean Up Existing Oversized Data

If the table is already over the limit, run this SQL in the Supabase SQL Editor:

### Step 1: Check current table size

```sql
SELECT
  schemaname AS schema,
  relname AS table,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
WHERE relname = 'email_messages'
ORDER BY pg_total_relation_size(relid) DESC;
```

### Step 2: Delete old non-business emails (older than 15 days)

```sql
DELETE FROM email_messages
WHERE created_at < NOW() - INTERVAL '15 days';
```

### Step 3: Delete emails without business keywords (if still over limit)

```sql
DELETE FROM email_messages
WHERE NOT (
  body ILIKE '%proposal%' OR body ILIKE '%invoice%' OR body ILIKE '%contract%'
  OR body ILIKE '%quote%' OR body ILIKE '%order%' OR body ILIKE '%purchase%'
  OR body ILIKE '%payment%' OR body ILIKE '%receipt%' OR body ILIKE '%agreement%'
  OR body ILIKE '%deal%' OR body ILIKE '%lead%' OR body ILIKE '%client%'
  OR body ILIKE '%project%' OR body ILIKE '%billing%' OR body ILIKE '%estimate%'
  OR body ILIKE '%refund%' OR body ILIKE '%sales%' OR body ILIKE '%opportunity%'
  OR subject ILIKE '%proposal%' OR subject ILIKE '%invoice%' OR subject ILIKE '%contract%'
  OR subject ILIKE '%quote%' OR subject ILIKE '%order%' OR subject ILIKE '%purchase%'
  OR subject ILIKE '%payment%' OR subject ILIKE '%receipt%' OR subject ILIKE '%agreement%'
  OR subject ILIKE '%deal%' OR subject ILIKE '%lead%' OR subject ILIKE '%client%'
  OR subject ILIKE '%project%' OR subject ILIKE '%billing%' OR subject ILIKE '%estimate%'
  OR subject ILIKE '%refund%' OR subject ILIKE '%sales%' OR subject ILIKE '%opportunity%'
);
```

### Step 4: Vacuum to reclaim space

```sql
VACUUM FULL email_messages;
```

### Step 5: Verify storage is back under limit

```sql
SELECT
  pg_size_pretty(pg_total_relation_size('email_messages')) AS table_size;
```

## Prevention

- The 15-day window ensures only recent emails are stored
- The keyword filter ensures only business-relevant emails are kept
- Pagination prevents bulk fetches from overwhelming the database
- Batch deduplication prevents duplicate storage on re-syncs
- Monitor storage in Supabase dashboard → Settings → Usage

## Upgrading Supabase Plan

If business needs require storing more emails:

1. Go to **Supabase Dashboard → Settings → Billing**
2. Upgrade to the **Pro plan** ($25/month) for 8 GB storage
3. Or the **Team plan** for 100 GB storage
4. The current filters can be relaxed (longer window, fewer keyword restrictions) once on a paid plan
