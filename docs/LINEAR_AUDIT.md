# LINEAR_AUDIT.md
Generated: 2026-06-06

## Summary
Linear has been demoted from primary document destination to an optional engineering integration.
The primary compliance archive destination is now Notion via the WebhookDispatcher.

## References Found

### apps/api/src/services/linear.service.ts
**Classification: KEEP**
Optional integration. Creates ENG-series Linear issues on document approval.
Only executes when LINEAR_API_KEY and LINEAR_TEAM_ID are present in environment.
Not a compliance record store — purely an engineering notification mechanism.

### apps/api/src/routes/webhook.routes.ts
**Classification: KEEP (modified)**
Linear handler registered only when env vars are present.
Comment in file explicitly states: Linear is NOT the primary destination.
Approved compliance records go to Notion via WebhookDispatcher.

### apps/api/src/index.ts
**Classification: KEEP**
Linear webhook handler registered conditionally:
if (LINEAR_API_KEY && LINEAR_TEAM_ID) webhookDispatcher.register(linearHandler)

### apps/api/src/services/webhookDispatcher.ts
**Classification: KEEP**
Central event bus. Notion handler is always registered.
Linear handler registration is env-gated and optional.

## Approved Final Workflow

Meeting → Fathom AI
→ Transcript upload to RAPID Ledger
→ TRANSCRIPT document created
→ Linked to parent RAPID document
→ Approval workflow
→ document.approved event dispatched
→ WebhookDispatcher → NotionSyncService
→ Page created in RAPID Compliance Archive (Notion)
→ notionPageId + syncedAt + syncStatus=SYNCED stored in DB
→ Audit log entry written

## Linear Status
- Linear: OPTIONAL engineering integration (env-gated)
- Notion: PRIMARY compliance archive (always active when env vars set)
- No Linear dependency in core document lifecycle
