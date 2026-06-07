import Elysia from 'elysia'
import { prisma } from '../lib/prisma'
import crypto from 'crypto'

const FATHOM_SECRET = process.env.FATHOM_WEBHOOK_SECRET ?? ''

const ROLE_MAP: Record<string, string> = {
  admin:     'decide',
  approver:  'agree',
  creator:   'recommend',
  performer: 'perform',
  viewer:    'input',
}

export const fathomWebhookRoutes = new Elysia({ prefix: '/webhooks' })
  .post('/fathom', async ({ request, set }) => {
    // Read raw body first (needed for HMAC validation before JSON parse)
    const rawBody = await request.clone().text()

    // 1. Validate Fathom signature
    const sigHeader = request.headers.get('x-fathom-signature') ?? ''
    if (FATHOM_SECRET) {
      const receivedHex = sigHeader.replace('sha256=', '')
      if (!receivedHex) {
        set.status = 401
        return { error: 'Missing signature header' }
      }
      const expected = crypto
        .createHmac('sha256', FATHOM_SECRET)
        .update(rawBody)
        .digest('hex')
      try {
        const match = crypto.timingSafeEqual(
          Buffer.from(expected, 'hex'),
          Buffer.from(receivedHex, 'hex')
        )
        if (!match) {
          set.status = 401
          return { error: 'Signature mismatch' }
        }
      } catch {
        set.status = 401
        return { error: 'Invalid signature' }
      }
    }

    // 2. Parse payload
    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch {
      set.status = 400
      return { error: 'Invalid JSON body' }
    }

    // Only handle call.completed events
    const eventType = payload.event ?? payload.event_type ?? payload.type ?? ''
    if (!['call.completed', 'transcript', 'recording.completed', 'call_ended'].includes(eventType)) {
      return { ok: true, skipped: true, event: eventType }
    }

    const call = payload.call ?? payload.data ?? payload.recording ?? {}
    const attendees: Array<{ email: string; name: string }> = call.attendees ?? []
    const transcriptText: string = call.transcript ?? ''
    const summary: string = call.summary ?? ''
    const title = call.title
      ? `[Transcript] ${call.title}`
      : `Meeting Transcript — ${new Date().toLocaleDateString('en-IN')}`

    if (!transcriptText) {
      return { ok: true, skipped: true, reason: 'Empty transcript' }
    }

    // 3. Match attendee emails → RAPID Ledger users
    const userMatches = (
      await Promise.all(
        attendees.map(async (a) => {
          const user = await prisma.user.findFirst({
            where: { email: { equals: a.email, mode: 'insensitive' } },
          })
          return user ? { user, name: a.name, email: a.email } : null
        })
      )
    ).filter(Boolean) as Array<{ user: any; name: string; email: string }>

    const unmatchedEmails = attendees
      .filter((a) => !userMatches.find((m) => m.email.toLowerCase() === a.email.toLowerCase()))
      .map((a) => a.email)

    if (userMatches.length === 0) {
      // No users matched — still store transcript against default org
      console.warn('[Fathom Webhook] No matching users for:', attendees.map((a) => a.email))
      return { ok: true, skipped: true, reason: 'No matching users', unmatchedEmails }
    }

    const orgId = userMatches[0].user.orgId
    const createdById = userMatches[0].user.id

    // 4. Create Document + role assignments + audit log in one transaction
    const doc = await prisma.$transaction(async (tx) => {
      const docCount = await tx.rapidDocument.count()
      const documentCode = `TRANSCRIPT-${String(docCount + 1).padStart(3, '0')}`

      const document = await tx.rapidDocument.create({
        data: {
          title,
          documentCode,
          decisionSummary: summary || transcriptText.slice(0, 500),
          transcriptContent: transcriptText,
          documentType: 'TRANSCRIPT' as any,
          status: 'draft' as any,
          createdById,
          orgId,
        },
      })

      // 5. Auto-assign RAPID roles based on each participant's user role
      await Promise.all(
        userMatches.map((m) => {
          const rapidRole = ROLE_MAP[m.user.role] ?? 'INPUT'
          return tx.roleAssignment.create({
            data: {
              documentId: document.id,
              userId: m.user.id,
              roleType: rapidRole as any,
            },
          })
        })
      )

      // 6. Immutable audit log entry
      await tx.auditLog.create({
        data: {
          userId: createdById,
          action: 'transcript_imported',
          entityType: 'RapidDocument',
          entityId: document.id,
          details: JSON.stringify({
            source: 'fathom_webhook',
            callId: call.id,
            callUrl: call.url,
            meetingTitle: call.title,
            participantCount: userMatches.length,
            unmatchedEmails,
            importedAt: new Date().toISOString(),
          }),
        },
      })

      return document
    })

    console.log(`[Fathom Webhook] Created doc ${doc.id} — "${title}" — ${userMatches.length} participants`)
    return { ok: true, documentId: doc.id, title, participantCount: userMatches.length }
  })
