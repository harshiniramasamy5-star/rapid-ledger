# RAPID Ledger — Demo Script

**Duration:** 12–15 minutes  
**URL:** https://portal-beta-bay.vercel.app  
**API:** https://rapid-ledger-production.up.railway.app  
**Audience:** Sanjay / investors / enterprise reviewers

---

## Pre-Demo Setup (5 min before)

1. Open https://portal-beta-bay.vercel.app in a clean browser tab
2. Have Microsoft Authenticator ready on your phone
3. Open https://notion.so — log in to Complyance workspace
4. Open https://linear.app — log in to confirm issues appear after approval

---

## Act 1 — Authentication (2 min)

**Narration:** "RAPID Ledger uses enterprise-grade authentication — email verification, rate-limited login, and optional TOTP two-factor authentication."

1. Go to `/register` — show domain restriction message if you type a Gmail address
2. Go to `/login` — log in as `harshini@antna.co.in`
3. When TOTP prompt appears — open Authenticator, enter 6-digit code
4. **Point out:** "Two-factor authentication enforced server-side — the JWT is never issued until both factors pass."

---

## Act 2 — Manual Transcript Import (3 min)

**Narration:** "A compliance decision starts with a meeting. We paste the transcript from Fathom — our AI instantly extracts decisions and assigns RAPID roles to each participant."

1. Go to `/admin/meetings`
2. Fill in:
   - **Title:** `[RAPID] Q3 Budget Approval`
   - **Participants:** `harshini@antna.co.in, sanjay@complyance.io`
   - **Transcript:** paste this:
     ```
     Sanjay: I've reviewed the Q3 budget proposal. I recommend we approve 
     the 50,000 allocation for the compliance tooling upgrade.
     
     Harshini: The numbers look solid. I've cross-checked with the 
     vendor quotes — all within range. I agree with the recommendation.
     
     Sanjay: Approved. Harshini will execute the procurement process 
     and submit receipts by end of month.
     ```
3. Click **Import Meeting**
4. **Point out:** "Groq AI analyzed the transcript in under 2 seconds. Sanjay is assigned Decide, Harshini is assigned Agree — based on what they actually said."

---

## Act 3 — RAPID Decision Workflow (4 min)

**Narration:** "The transcript becomes a structured RAPID document. Every participant sees their own action button — no workflow blocking, everyone acts in parallel."

1. Go to `/documents` — show the newly created TRANSCRIPT document
2. Open the document — show:
   - AI-extracted decision summary
   - Role assignments (Decide, Agree)
   - Each role's action button
3. Click **Approve** as the Agree role
4. Show the approval confirmation
5. **Point out:** "Every action writes an immutable audit log entry — who did what, when, from which IP."

---

## Act 4 — Notion Sync (2 min)

**Narration:** "On approval, RAPID Ledger automatically pushes the decision to our Notion compliance archive — no manual export, no copy-paste."

1. Go to Notion → RAPID Compliance Archive database
2. Show the newly created page with all 12 mapped properties:
   - Title, Status, Decision ID, Approver, Date, Recommenders, Agreers, Performers, Summary, Audit Ref
3. **Point out:** "Stakeholders without a RAPID Ledger account can still see and search all approved decisions in Notion."

---

## Act 5 — Linear Integration (1 min)

**Narration:** "Approved decisions automatically become Linear issues — the Perform role owner sees exactly what to execute."

1. Go to Linear → show the auto-created issue
2. Show: title `[RAPID Approved] TRANSCRIPT-XXX`, decision summary, RAPID roles, audit reference
3. **Point out:** "Decision → action, automated. No manual ticket creation."

---

## Act 6 — Audit Log (1 min)

**Narration:** "Every single action in RAPID Ledger is immutably recorded — who, what, when. Full compliance trail."

1. Go to `/audit-log`
2. Show entries: `login`, `transcript_imported`, `evidence_added`, `document_approved`, `webhook_dispatched`
3. **Point out:** "This is the compliance record. Immutable, org-scoped, exportable."

---

## Act 7 — Invite Flow (1 min, optional)

**Narration:** "Onboarding a new team member takes 30 seconds."

1. Go to `/orgs` — show Invite Member card
2. Enter an email, select role (Approver), click Send
3. **Point out:** "They receive a magic link, create an account, and are automatically added to the org with the correct role. Token expires in 7 days, single-use."

---

## Closing Statement

> "RAPID Ledger transforms compliance decision-making from scattered emails and meeting notes into a structured, auditable, automated workflow. Every decision is traceable from the meeting transcript all the way to Notion and Linear — with a full audit trail at every step."

---

## Backup: API Smoke Test (if demo breaks)

```python
python3 << 'EOF'
import urllib.request, json

# 1. Validate TOTP — replace code
req = urllib.request.Request(
    "https://rapid-ledger-production.up.railway.app/api/auth/totp/validate",
    data=json.dumps({"userId":"cmq2j6ea5000012wmconjox11","code":"REPLACE"}).encode(),
    headers={"Content-Type":"application/json"}, method="POST")
token = json.loads(urllib.request.urlopen(req).read()).get("token")

# 2. Import transcript
req2 = urllib.request.Request(
    "https://rapid-ledger-production.up.railway.app/api/integrations/fathom/manual",
    data=json.dumps({"title":"[RAPID] Live Demo","emails":["harshini@antna.co.in","sanjay@complyance.io"],"transcript":"Sanjay: I recommend approval. Harshini: Agreed. Sanjay: Approved. Harshini will execute."}).encode(),
    headers={"Content-Type":"application/json","Authorization":f"Bearer {token}"}, method="POST")
r = json.loads(urllib.request.urlopen(req2).read())
print(r.get("documentCode"), "—", r.get("aiRoleAssignments"))
EOF
```
