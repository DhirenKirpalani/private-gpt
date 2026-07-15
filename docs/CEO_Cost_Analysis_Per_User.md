# Exploro OS — Cost Per User Analysis

---

## 1. Tools Used (Actual Stack)

| Tool | Type | Cost |
|------|------|------|
| **DeepSeek** (`deepseek-v4-flash`) | LLM — chat + web search query rewriting | $0.14/1M input, $0.28/1M output |
| **Serper.dev** | Google web search API | $1.00/1K queries (Starter), $0.50/1K (Scale) |
| **Supabase** | Database, Auth, Storage | $25/mo (Pro) or $299/mo (Team) fixed |
| **Vercel** | Hosting, serverless API routes | $20/mo (Pro) fixed |
| **Stripe** | Payment processing (US) | 2.9% + $0.30 per transaction |
| **Lemon Squeezy** | Payment processing (MX/LATAM) | 5% + $0.50 per transaction |
| **WhatsApp Business API** | Messaging channel (Team+ only) | ~$0.008/template msg (MX), service msgs free |
| **Calendly** | Scheduling (Team+ only) | $10/seat (Standard), $16/seat (Teams) |
| Google OAuth (Gmail, Calendar, Drive, Meet) | Integrations | **Free** |
| Microsoft Graph (Outlook) | Email/calendar | **Free** |
| Telegram Bot API | Messaging (Enterprise) | **Free** |
| pdf-parse, mammoth, xlsx, JSZip | Document parsing | **Free** (open source) |

---

## 2. Fixed Costs (Platform-Level, Shared Across All Users)

These are paid monthly regardless of how many users are on the platform:

| Item | Cost/Month | Notes |
|------|-----------|-------|
| Supabase Pro | **$25** | Up to 100K auth users, 8 GB DB, 100 GB storage |
| Vercel Pro | **$20** | 1 TB bandwidth, 1K GB-hrs serverless |
| Domain + DNS | **~$1** | Annual amortized |
| **Total Fixed** | **~$46/mo** | Same whether you have 1 or 10,000 users |

*At 1,000 users: fixed cost per user = **$0.046/mo** — negligible.*

---

## 3. Variable Costs (Per User, Scales With Usage)

| Item | How It Scales | Solo Cost/Mo | Team Cost/Mo | Enterprise Cost/Mo |
|------|--------------|-------------|-------------|-------------------|
| **DeepSeek tokens** | Per chat message | $0.52 | $1.15 | $2.25 |
| **Serper web search** | Per web-search-enabled message (2.5 calls each) | $0.45 | $1.13 | $1.20 |
| **WhatsApp** | Per template message (service msgs free) | $0 (not included) | $0.16 | $0.40 |
| **Calendly** | Per seat, fixed monthly subscription | $0 (not included) | $10.00 | $16.00 |
| **Payment processing** | % of transaction | $1.17 (Stripe) / $2.00 (Lemon) | $1.75 / $3.00 | $3.20 / $5.50 |
| **Supabase (variable portion)** | Storage per user | ~$0.03 | $0.05 | $5.98 (Team tier) |
| **Vercel (variable portion)** | Serverless invocations | ~$0.02 | $0.04 | $2.00 |
| **Multimodal (Qwen2.5-VL + DeepSeek)** | Per image message (optional add-on) | +$0.16 | +$0.27 | +$0.43 |

---

## 4. Cost Summary by Plan

### SOLO — $30/month

| Category | Cost (Stripe) | Cost (Lemon Squeezy) |
|----------|--------------|---------------------|
| **Fixed** (amortized @ 1K users) | $0.05 | $0.05 |
| **Variable — AI** (DeepSeek + Serper) | $0.97 | $0.97 |
| **Variable — Payment** | $1.17 | $2.00 |
| **Variable — Other** | $0.02 | $0.02 |
| **Total Cost/User** | **$2.21** | **$3.04** |
| **Revenue** | $30.00 | $30.00 |
| **Margin** | **$27.79 (93%)** | **$26.96 (90%)** |

---

### TEAM — $50/seat/month

| Category | Cost (Stripe) | Cost (Lemon Squeezy) |
|----------|--------------|---------------------|
| **Fixed** (amortized @ 1K users) | $0.05 | $0.05 |
| **Variable — AI** (DeepSeek + Serper) | $2.28 | $2.28 |
| **Variable — Calendly** | $10.00 | $10.00 |
| **Variable — WhatsApp** | $0.16 | $0.16 |
| **Variable — Payment** | $1.75 | $3.00 |
| **Variable — Other** (infra) | $0.09 | $0.09 |
| **Total Cost/Seat** | **$14.33** | **$15.58** |
| **Revenue** | $50.00 | $50.00 |
| **Margin** | **$35.67 (71%)** | **$34.42 (69%)** |

*Without Calendly: Total = $4.33–$5.58, Margin = **89–91%***

---

### ENTERPRISE — $100–$150/seat/month

| Category | Cost (Stripe) | Cost (Lemon Squeezy) |
|----------|--------------|---------------------|
| **Fixed** (Supabase Team $299 + Vercel ~$100, amortized @ 50 seats) | $7.98 | $7.98 |
| **Variable — AI** (DeepSeek + Serper) | $3.45 | $3.45 |
| **Variable — Calendly** | $16.00 | $16.00 |
| **Variable — WhatsApp** | $0.40 | $0.40 |
| **Variable — Payment** | $3.20 | $5.50 |
| **Variable — Other** (SSO, custom) | $2.00 | $2.00 |
| **Total Cost/Seat** | **$33.03** | **$35.33** |
| **Revenue** (at $100) | $100.00 | $100.00 |
| **Margin** | **$66.97 (67%)** | **$64.67 (65%)** |
| **Revenue** (at $150) | $150.00 | $150.00 |
| **Margin** | **$116.97 (78%)** | **$114.67 (76%)** |

*Without Calendly: Total = $17.03–$19.33, Margin at $100 = **83–87%***

---

## 5. Multimodal (Image/PDF Upload) — Qwen2.5-VL + DeepSeek Pipeline

DeepSeek's hosted API is text-only (no vision). For image/PDF uploads, we use a two-step pipeline:

```
User uploads image/PDF
       │
       ▼
  Qwen2.5-VL 7B         (image understanding + OCR → extracts text/structured data)
       │
       ▼
Extracted text
       │
       ▼
    DeepSeek             (reasoning, analysis, answering — same as text-only messages)
```

**Why Qwen2.5-VL:**
- Excellent OCR, document/chart/table understanding
- Open-weight (could self-host later for zero API cost)
- OpenAI-compatible API via Alibaba DashScope
- Cheapest hosted vision model available

**Pricing (verified July 2026, Alibaba DashScope):**

| Model | Input/1M | Output/1M | Notes |
|-------|----------|-----------|-------|
| **Qwen2.5-VL 7B Instruct** | $0.20 | $0.20 | Recommended — best value |
| Qwen3 VL Flash (newer) | $0.05 | $0.40 | Even cheaper input, monitor for stability |
| Gemini 2.5 Flash-Lite (alt) | $0.10 | $0.40 | Single-step alternative |

**Cost per image message (Qwen2.5-VL + DeepSeek pipeline):**
- Qwen2.5-VL: image (~258 tokens) + prompt (~100 tokens) → extracted text (~750 output tokens) = **~$0.0002**
- DeepSeek: extracted text + user question + context → answer = **~$0.0007** (same as current text-only)
- **Total: ~$0.0009 per image message** (vs $0.0007 for text-only — virtually identical)

### Cost Impact if 20% of Messages Include Images

| Plan | Image Messages/Mo | Extra Cost/Mo | New Total (Stripe) | New Margin % |
|------|-------------------|-------------|--------------------|-------------| 
| Solo | 180 | +$0.16 | $2.37 | **92%** |
| Team | 300 | +$0.27 | $14.60 | **71%** |
| Enterprise | 480 | +$0.43 | $33.46 | **67%** |

**Verdict:** Negligible impact (<$0.50/user/month). Include as free feature in all plans.

---

## 6. The One-Page Summary

| Plan | Price | Fixed Cost | Variable Cost | Total Cost | Margin |
|------|-------|-----------|--------------|-----------|--------|
| **Solo** | $30 | $0.05 | $2.16 | **$2.21** | **93%** |
| **Team** (w/ Calendly) | $50 | $0.05 | $14.28 | **$14.33** | **71%** |
| **Team** (no Calendly) | $50 | $0.05 | $4.28 | **$4.33** | **91%** |
| **Enterprise** (w/ Calendly) | $100 | $7.98 | $25.05 | **$33.03** | **67%** |
| **Enterprise** (no Calendly) | $100 | $7.98 | $9.05 | **$17.03** | **83%** |

*(All figures via Stripe. Lemon Squeezy adds ~$0.83–$2.30/user for VAT/tax handling.)*

---

## 7. Key Takeaways

1. **Fixed costs are negligible** — $46/mo total platform, near-zero per user at scale
2. **Calendly is the #1 cost driver** for Team/Enterprise ($10–$16/seat). Dropping it doubles margins
3. **DeepSeek is extremely cheap** — $0.52–$2.25/user, major competitive advantage
4. **Serper is the #2 variable cost** — drops 50% at scale ($1.00 → $0.50/1K queries)
5. **WhatsApp is nearly free** — service messages (AI replies) cost nothing
6. **Multimodal adds <$0.50/user** — Qwen2.5-VL + DeepSeek pipeline, include free as a differentiator
7. **Trial cost: ~$1.10/user for 15 days** — at 1,000 trials = $1,100 total (very low CAC)

### Recommendations for Mexico Launch
- **Solo at $30**: 93% margin — room for aggressive promo pricing
- **Team at $50**: 71% with Calendly, 91% without — consider dropping Calendly or using Free tier
- **Enterprise at $100+**: 67% with Calendly, 83% without — don't go below $80/seat
- **Use Lemon Squeezy for MX** (handles VAT) but push Stripe where possible (2% cheaper)

---

*All pricing verified from official provider websites, July 2026. Based on actual codebase tools only.*
