# ARCHITECTURE_AUDIT.md
Generated: 2026-06-06

## Backend (apps/api)

### Services
| Service | Purpose |
|---|---|
| auth.service.ts | JWT login, register, token refresh, account lockout |
| document.service.ts | RAPID document lifecycle, status transitions, webhook dispatch |
| approval.service.ts | Per-user approval decisions, RAPID role enforcement |
| ledger.service.ts | Immutable ledger entry creation on finalization |
| notion.service.ts | Notion API sync, page create/update, SyncStatus tracking |
| webhookDispatcher.ts | Central async event bus — document.approved → Notion handler |
| linear.service.ts | Optional Linear issue creation (env-gated, non-primary) |
| totp.service.ts | TOTP secret generation, QR code, enable/disable/verify |
| org.service.ts | Organization create/update/delete, invite, member management |

### Routes
| Route File | Prefix | Key Endpoints |
|---|---|---|
| auth.routes.ts | /auth | login, register, me, refresh |
| document.routes.ts | /documents | CRUD, submit, approve, finalize, version, export-pdf |
| transcript.routes.ts | /documents | /:id/transcript, /:id/transcript/export |
| approval.routes.ts | /approvals | my, decide, needs-changes |
| ledger.routes.ts | /ledger | list, export CSV |
| integrations.routes.ts | /integrations | notion/connect, sync, status, resync |
| org.routes.ts | /orgs | create, invite, accept, remove, change-role |
| totp.routes.ts | /auth/totp | setup, enable, disable, verify |
| audit.routes.ts | /audit | list audit logs |
| ai.routes.ts | /ai | ChatCL via Groq llama-3.3-70b-versatile |
| webhook.routes.ts | /webhooks | Linear trigger (optional, env-gated) |
| user.routes.ts | /users | list, unlock (admin) |
| comments.routes.ts | /documents/:id/comments | threaded comments + replies |

### Prisma Schema
| Model | Key Fields |
|---|---|
| User | id, email, role, failedLogins, lockedUntil, totpSecret, totpEnabled |
| RapidDocument | id, documentCode, status, syncStatus, notionPageId, syncedAt, parentDocumentId, transcriptContent, mediaUrl |
| Organization | id, name, domain, ownerId |
| Approval | id, documentId, approverId, decision |
| LedgerEntry | id, documentId, hash, sealed (immutable) |
| AuditLog | id, userId, action, entityType, entityId, details |

### Enums
- UserRole: admin, creator, approver, viewer, recommender, performer
- DocumentStatus: draft, submitted, awaiting_agreement, approved, finalized, execution_complete, rejected, needs_changes
- SyncStatus: PENDING, SYNCED, FAILED
- DocumentType: RAPID, PORTAL, TRANSCRIPT
- AuditAction: document_created, document_approved, transcript_exported, webhook_retried, login_failed, evidence_added, sync_failed

### Infrastructure
| Component | Provider | URL |
|---|---|---|
| API | Railway | https://rapid-ledger-production.up.railway.app |
| Database | Railway PostgreSQL | kodama.proxy.rlwy.net:58012 |
| Frontend | Vercel | https://rapid-ledger.vercel.app |
| Portal | Vercel | apps/portal/index.html |

### Environment Variables (Railway)
- DATABASE_URL
- DATABASE_PUBLIC_URL
- JWT_SECRET
- JWT_REFRESH_SECRET
- GROQ_API_KEY
- NOTION_API_KEY
- NOTION_DATABASE_ID
- FRONTEND_URL
- NODE_ENV
- PORT

## Frontend (apps/web)

### Pages
| Page | Path | Purpose |
|---|---|---|
| Login | /login | JWT auth via cookie |
| Dashboard | /dashboard | Document list, analytics, pagination |
| Document Detail | /documents/[id] | Full lifecycle UI, timeline, transcript, Notion badge |
| Document Edit | /documents/[id]/edit | Edit draft/needs_changes docs |
| Approvals | /approvals | Pending approval queue |
| Ledger | /ledger | Immutable ledger entries |
| Audit Log | /audit-log | Full audit trail |
| ChatCL | /chatcl | Groq-powered AI assistant |
| Orgs | /orgs | Organization management |
| TOTP | /settings/2fa | 2FA setup |

### Key Components
- Notion sync badge (PENDING/SYNCED/FAILED) in document header
- Document timeline card (Created → Approved → Synced → Finalized)
- Recharts analytics (status, risk, department breakdown)
- Threaded comments with replies
- Transcript upload (file + paste) with Fathom link

## CI/CD
- GitHub Actions: lint + typecheck + vitest + jest on push to main
- Railway: auto-deploy on main push
- Vercel: auto-deploy on main push

## Test Coverage
| Suite | Count | Tool |
|---|---|---|
| API unit + integration | 80 | Vitest |
| Frontend component | 38 | Jest + RTL |
| E2E | 12 | Playwright |
| Total | 130 | — |
