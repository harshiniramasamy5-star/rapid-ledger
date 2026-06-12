# RAPID Ledger v2 — Architecture Sprint Deliverables
**Date:** 2026-06-05

---

## Files Modified

| File | Change |
|------|--------|
| prisma/schema.prisma | +7 AuditAction values |
| prisma/migrations/20260605150000_add_audit_actions/ | New migration |
| apps/api/src/routes/totp.routes.ts | Audit log on enable/disable |
| apps/api/src/routes/transcript.routes.ts | Audit log on export |
| apps/api/src/routes/integrations.routes.ts | +resync endpoint |
| apps/api/src/services/webhookDispatcher.ts | Failure audit log |
| apps/api/src/services/notion.service.ts | sync_failed audit log |
| apps/api/src/index.ts.backup | DELETED |

## Audit Log Coverage — Final

| Event | Status |
|-------|--------|
| Login / Failed | ✅ |
| Document full lifecycle | ✅ |
| Org created | ✅ |
| Invite sent/accepted | ✅ |
| User created/updated | ✅ |
| TOTP enabled | ✅ |
| TOTP disabled | ✅ |
| Transcript uploaded | ✅ |
| Transcript exported | ✅ |
| Notion synced | ✅ |
| Webhook failed | ✅ |
| Webhook retried | ✅ |
| Sync failed | ✅ |
| Email verified | ✅ |

## Routes Added

| Route | Method | Purpose |
|-------|--------|---------|
| /integrations/notion/resync/:id | POST | Force resync (reset PENDING + retry) |

## Environment Variables Required

Railway: NOTION_API_KEY, NOTION_DATABASE_ID (set in dashboard)
Vercel: NEXT_PUBLIC_API_URL

## Success Criteria

- [x] Fathom -> RAPID Ledger -> Approval -> Notion
- [x] Multi-tenancy
- [x] Full audit logging
- [x] 2FA (TOTP)
- [x] Transcript support
- [x] Approval workflow
- [x] Event dispatcher
- [x] Notion sync
- [x] Automated archival on approval
- [x] Linear NOT primary destination
