# Troubleshooting: Department Head Names & Web Search Inconsistency

## Issue

Two issues reported during review cycles:

1. **Review 07.20.2026** — Admin panel shows a generated number (member count) instead of the name of the person in charge of each department
2. **Review 07.22.2026** — "ChatGPT" must be replaced with "Public AI" across the platform, and the system web search is intermittently activating/deactivating when it should always be on

---

## Issue 1: Department Head Name Not Displayed

### Root Cause

In the admin panel's Workspaces tab, the workspace header row displays a member count (e.g., "3 members") instead of identifying the department owner by name.

The workspace header in `app/admin/page.tsx` (line 1316) renders:

```tsx
<span className="shrink-0 text-xs text-muted-foreground">
  {ws.members.length} {ws.members.length !== 1 ? t("adminMembers") : t("adminMember")}
</span>
```

This shows a count of members rather than the owner's name. The owner data is available in `ws.members` (filtered by `m.role === "owner"`) but is only shown after expanding the workspace — with a crown icon and email, not the owner's full name.

Additionally, the companies API (`app/api/admin/companies/route.ts`) only returns member emails, not full names from the `profiles` table.

### Symptoms

- Admin sees "3 members" on each workspace row instead of the department head's name
- Must expand the workspace to see who the owner is
- Owner is shown as an email address, not a full name

### Fix Applied

#### 1. Update Companies API (`app/api/admin/companies/route.ts`)

Fetch `full_name` from `profiles` for each workspace member:

```typescript
// Build a map of user_id → full_name from profiles
const { data: allProfiles } = await adminClient
  .from("profiles")
  .select("user_id, full_name")

const nameMap: Record<string, string> = {}
allProfiles?.forEach(p => { nameMap[p.user_id] = p.full_name ?? "" })
```

Include `name` in each member object:

```typescript
members: (memberMap[ws.id] ?? []).map(m => ({
  userId: m.user_id,
  email: emailMap[m.user_id] ?? m.user_id,
  name: nameMap[m.user_id] ?? emailMap[m.user_id] ?? "Unknown",
  role: m.role,
})),
```

#### 2. Update Admin UI (`app/admin/page.tsx`)

Replace the member count on the workspace header with the owner's name and a crown icon:

```tsx
{(() => {
  const owner = ws.members.find(m => m.role === "owner")
  return owner ? (
    <>
      <Crown className="h-3 w-3 shrink-0 text-[#FFBF00]" />
      <span className="truncate text-xs font-medium text-[#FFBF00]">{owner.name}</span>
    </>
  ) : null
})()}
<span className="shrink-0 text-xs text-muted-foreground">
  · {ws.members.length} {ws.members.length !== 1 ? t("adminMembers") : t("adminMember")}
</span>
```

### Affected Files

| File | Change |
|------|--------|
| `app/api/admin/companies/route.ts` | Fetch `full_name` from profiles, include `name` in member objects |
| `app/admin/page.tsx` | Display owner name with crown icon on workspace header row |

### Status

**Pending** — Requires code changes in both the API endpoint and the admin UI component.

---

## Issue 2a: Replace "ChatGPT" with "Public AI"

### Root Cause

The platform should refer to generic AI chatbots as "Public AI" rather than "ChatGPT" across all user-facing text, marketing pages, and comparison sections.

### Fix Applied

A codebase-wide search confirms **no remaining instances** of "ChatGPT" in any source files. The platform already uses "Public AI" consistently in:

- `lib/translations.ts` — Comparison table label (`comparisonPublicAI: "Public AI"`)
- `app/page.tsx` — Landing page comparison section ("Exploro OS vs. Public AI")
- `app/layout.tsx` — FAQ structured data
- `app/privacy/page.tsx` — Privacy policy references

### Verification

A case-insensitive grep for "chatgpt" across the entire codebase returned **zero results**. All references now use "Public AI" as the generic AI label.

### Status

**Resolved** — No further action required.

---

## Issue 2b: Web Search Intermittently Activating

### Root Cause

When the Web Search toggle is enabled, the system should perform a web search on every query. However, three separate causes create inconsistent behavior:

#### Cause 1 — Internal Query Detection (by design, but too aggressive)

In `app/chat/page.tsx` (lines 395–407), the function `isInternalQuery()` checks if the user's message contains phrases like "my document", "the file", "knowledge base", etc. If matched, web search is **silently skipped** even when the toggle is ON:

```typescript
// Line 426
const actuallySearchingWeb = webSearchEnabled && !userAsksAboutInternal
```

This is intended to avoid web-searching for internal KB queries, but it causes confusion because the user sees the toggle as active but no search occurs.

#### Cause 2 — 15-second timeout kills long searches

The web search request has a hardcoded 15-second timeout via `AbortController`. If the Serper API or DeepSeek query rewriter is slow, the search is aborted silently:

```typescript
// Line 632
const wsTimeout = setTimeout(() => wsController.abort(), 15000)
```

The chat proceeds without web results. The user sees no error — just a response without web citations.

#### Cause 3 — Silent API failures

If the Serper API returns a non-OK status, or the response has `empty: true`, or any network error occurs, the web search context is simply left empty and the chat continues without web data. No user-visible indication is shown:

```typescript
// Lines 640–656 — all error paths are caught and logged to console only
```

### Symptoms

- Web Search toggle shows as active (green) but some queries don't include web results
- No error message is shown when web search fails or times out
- Responses sometimes include `[1]`, `[2]` citations and sometimes don't, with no explanation
- Queries mentioning "document", "file", "knowledge base" never trigger web search even with toggle ON

### Fix Applied

#### 1. Remove internal query skip (`app/chat/page.tsx`, line 426)

Change:
```typescript
const actuallySearchingWeb = webSearchEnabled && !userAsksAboutInternal
```
To:
```typescript
const actuallySearchingWeb = webSearchEnabled
```

The system prompt already instructs the AI to prioritize KB sources when both are active, so running web search alongside KB context is safe.

#### 2. Increase timeout from 15s to 30s (`app/chat/page.tsx`, line 632)

Change:
```typescript
const wsTimeout = setTimeout(() => wsController.abort(), 15000)
```
To:
```typescript
const wsTimeout = setTimeout(() => wsController.abort(), 30000)
```

#### 3. Add user-visible feedback on failure (optional but recommended)

When web search fails or returns empty, show a subtle indicator on the response so the user knows the toggle is working but the API was unavailable.

### Affected Files

| File | Change |
|------|--------|
| `app/chat/page.tsx` (line 426) | Remove `&& !userAsksAboutInternal` from `actuallySearchingWeb` |
| `app/chat/page.tsx` (line 632) | Increase timeout from `15000` to `30000` |
| `app/chat/page.tsx` (lines 640–656) | Optional: Add user-visible feedback on web search failure |

### Status

**Pending** — Requires code changes in `app/chat/page.tsx`. Estimated effort: 20 minutes for core fix, 40 minutes with UI indicators.

---

## Prevention

- Always test web search with both KB-enabled and KB-disabled scenarios after changes
- Monitor Serper API uptime and response times
- Consider adding a health check endpoint for the web search API to detect outages early
- When adding new query-skip logic, always surface it to the user via UI indicators
- For admin workspace views, always show human-readable names (from `profiles.full_name`) rather than counts or UUIDs
