import Elysia from 'elysia'
import { prisma } from '../lib/prisma'
import crypto from 'crypto'

const FATHOM_SECRET = process.env.FATHOM_WEBHOOK_SECRET ?? ''
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? ''
const COMPLYANCE_ORG_ID = 'cmq2vwnsj0008j8lfjqanx4dz'

// AI analyses the transcript and assigns RAPID roles per speaker
async function detectRolesFromTranscript(
  transcript: string,
  attendees: Array<{ email: string; name: string }>
): Promise<Record<string, string>> {
  const attendeeList = attendees.map(a => `${a.name} <${a.email}>`).join('\n')

  const prompt = `You are analyzing a meeting transcript to assign RAPID decision-making framework roles.

RAPID roles:
- recommend: provides expert knowledge, analysis, recommendations
- input: shares context, asks clarifying questions, provides data or requirements
- agree: approves, validates, gives sign-off ("looks good", "approved", "I agree")
- decide: makes final calls, resolves conflicts, has ultimate authority
- perform: commits to executing tasks, owns action items

Meeting attendees:
${attendeeList}

Transcript:
${transcript.slice(0, 4000)}

Analyze what each attendee contributes and assign exactly one RAPID role per person.
Return ONLY valid JSON like:
{
  "email@domain.com": "recommend",
  "email2@domain.com": "agree"
}
No explanation. No markdown. Only JSON.`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 500,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json() as any
    const text = data.choices?.[0]?.message?.content ?? '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    // Validate all values are valid RoleType
    const valid = ['recommend', 'agree', 'perform', 'input', 'decide']
    const result: Record<string, string> = {}
    for (const [email, role] of Object.entries(parsed)) {
      result[email] = valid.includes(role as string) ? (role as string) : 'input'
    }
    console.log('[Fathom Webhook] AI role assignments:', result)
    return result
  } catch (e) {
    console.error('[Fathom Webhook] Groq role detection failed:', e)
    // Fallback: everyone gets input
    return Object.fromEntries(attendees.map(a => [a.email, 'input']))
  }
}

// AI extracts structured decisions, actions, owners, deadlines from transcript
async function extractDecisionsFromTranscript(
  transcript: string,
  attendees: Array<{ email: string; name: string }>
): Promise<{ decisions: string[]; actions: string[]; owners: string[]; deadlines: string[] }> {
  const attendeeList = attendees.map(a => `${a.name} <${a.email}>`).join('\n')

  const prompt = `You are analyzing a compliance meeting transcript.

Meeting attendees:
${attendeeList}

Transcript:
${transcript.slice(0, 4000)}

Extract the following and return ONLY valid JSON with these exact keys:
{
  "decisions": ["list of decisions made, e.g. Budget approved for Q3", "Vendor X rejected"],
  "actions": ["list of action items, e.g. Submit revised proposal by Friday", "Update compliance register"],
  "owners": ["list of owners of actions, e.g. Sarah to submit proposal", "John to update register"],
  "deadlines": ["list of any dates or deadlines mentioned, e.g. by Friday June 14", "before Q3 review"]
}

If nothing found for a category, return an empty array.
No explanation. No markdown. Only JSON.`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 800,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json() as any
    const text = data.choices?.[0]?.message?.content ?? '{}'
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    const result = {
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      actions:   Array.isArray(parsed.actions)   ? parsed.actions   : [],
      owners:    Array.isArray(parsed.owners)     ? parsed.owners    : [],
      deadlines: Array.isArray(parsed.deadlines)  ? parsed.deadlines : [],
    }
    console.log('[Fathom Webhook] AI structured extraction:', JSON.stringify(result))
    return result
  } catch (e) {
    console.error('[Fathom Webhook] Groq decision extraction failed:', e)
    return { decisions: [], actions: [], owners: [], deadlines: [] }
  }
}

// Auto-register @complyance.io users who aren't in DB yet
async function ensureUser(email: string, name: string) {
  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } }
  })
  if (existing) return existing

  // Auto-create with emailVerified — domain is trusted
  const newUser = await prisma.user.create({
    data: {
      email,
      name: name || email.split('@')[0],
      password: 'webhook_created_' + crypto.randomBytes(8).toString('hex'),
      role: 'viewer',
      emailVerified: true,
      orgId: COMPLYANCE_ORG_ID,
    }
  })
  console.log('[Fathom Webhook] Auto-created user:', email)
  return newUser
}

export const fathomWebhookRoutes = new Elysia({ prefix: '/webhooks' })
  .post('/fathom', async ({ request, set }) => {
    const rawBody = await request.clone().text()

    // 1. Validate signature
    const sigHeader = request.headers.get('x-fathom-signature') ?? ''
    if (FATHOM_SECRET) {
      const receivedHex = sigHeader.replace('sha256=', '')
      if (!receivedHex) { set.status = 401; return { error: 'Missing signature header' } }
      const expected = crypto.createHmac('sha256', FATHOM_SECRET).update(rawBody).digest('hex')
      try {
        if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(receivedHex, 'hex'))) {
          set.status = 401; return { error: 'Signature mismatch' }
        }
      } catch { set.status = 401; return { error: 'Invalid signature' } }
    }

    // 2. Parse
    let payload: any
    try { payload = JSON.parse(rawBody) }
    catch { set.status = 400; return { error: 'Invalid JSON' } }

    const eventType = payload.event ?? payload.event_type ?? payload.type ?? ''
    if (!['call.completed', 'transcript', 'recording.completed', 'call_ended'].includes(eventType)) {
      return { ok: true, skipped: true, event: eventType }
    }

    const call = payload.call ?? payload.data ?? payload.recording ?? {}

    // [RAPID] prefix filter — only process decision meetings
    const rawTitle: string = call.title ?? ''
    if (!rawTitle.startsWith('[RAPID]')) {
      console.log('[Fathom Webhook] Skipping non-RAPID meeting:', rawTitle || '(no title)')
      return { ok: true, skipped: true, reason: 'Not a RAPID meeting — title must start with [RAPID]' }
    }

    const attendees: Array<{ email: string; name: string }> = call.attendees ?? []
    const transcriptText: string = call.transcript ?? ''
    const summary: string = call.summary ?? ''
    const title = `[Transcript] ${rawTitle}`

    console.log('[Fathom Webhook] Attendees:', JSON.stringify(attendees))
    console.log('[Fathom Webhook] Event:', eventType, '| Title:', title)

    if (!transcriptText) return { ok: true, skipped: true, reason: 'Empty transcript' }
    if (attendees.length === 0) return { ok: true, skipped: true, reason: 'No attendees in payload' }

    // Idempotency: skip if we already imported this exact callId
    const callId = call.id ?? call.call_id ?? ''
    if (callId) {
      const existingDoc = await prisma.rapidDocument.findFirst({
        where: {
          documentType: 'TRANSCRIPT' as any,
          auditLogs: {
            some: {
              action: 'transcript_imported' as any,
              details: { contains: callId },
            },
          },
        },
      })
      if (existingDoc) {
        console.log(`[Fathom Webhook] Skipping duplicate callId: ${callId}`)
        return { ok: true, skipped: true, reason: 'Already imported', documentId: existingDoc.id }
      }
    }

    // 3. Ensure all attendees exist in DB (auto-create @complyance.io users)
    const users = await Promise.all(
      attendees.map(a => ensureUser(a.email, a.name))
    )

    // 4. AI analyses transcript — run both extractions in parallel
    const [aiRoles, aiStructured] = await Promise.all([
      detectRolesFromTranscript(transcriptText, attendees),
      extractDecisionsFromTranscript(transcriptText, attendees),
    ])

    // 5. Generate document code
    const docCount = await prisma.rapidDocument.count()
    const documentCode = `TRANSCRIPT-${String(docCount + 1).padStart(3, '0')}`

    // 6. Create doc + role assignments + audit log in one transaction
    const doc = await prisma.$transaction(async (tx) => {
      const document = await tx.rapidDocument.create({
        data: {
          title,
          documentCode,
          decisionSummary: aiStructured.decisions.length
            ? aiStructured.decisions.join('\n')
            : summary || transcriptText.slice(0, 500),
          businessContext: aiStructured.actions.length
            ? 'Actions:\n' + aiStructured.actions.join('\n') + '\n\nOwners:\n' + aiStructured.owners.join('\n')
            : undefined,
          proposedDecision: aiStructured.deadlines.length
            ? 'Deadlines:\n' + aiStructured.deadlines.join('\n')
            : undefined,
          transcriptContent: transcriptText,
          documentType: 'TRANSCRIPT' as any,
          status: 'awaiting_agreement' as any,
          createdById: users[0].id,
          orgId: COMPLYANCE_ORG_ID,
        },
      })

      // Assign RAPID roles based on AI analysis
      await Promise.all(
        users.map((user, i) => {
          const email = attendees[i]?.email ?? user.email
          const rapidRole = aiRoles[email] ?? aiRoles[email.toLowerCase()] ?? 'input'
          return tx.roleAssignment.create({
            data: {
              documentId: document.id,
              userId: user.id,
              roleType: rapidRole as any,
            },
          })
        })
      )

      await tx.auditLog.create({
        data: {
          userId: users[0].id,
          action: 'transcript_imported' as any,
          entityType: 'RapidDocument',
          entityId: document.id,
          details: JSON.stringify({
            source: 'fathom_webhook',
            callId: call.id,
            callUrl: call.url,
            meetingTitle: call.title,
            aiRoleAssignments: aiRoles,
            aiDecisions: aiStructured.decisions,
            aiActions: aiStructured.actions,
            aiOwners: aiStructured.owners,
            aiDeadlines: aiStructured.deadlines,
            participantCount: users.length,
            importedAt: new Date().toISOString(),
          }),
        },
      })

      return document
    })

    console.log(`[Fathom Webhook] Created ${doc.documentCode} — "${title}" — ${users.length} participants`)
    return {
      ok: true,
      documentId: doc.id,
      documentCode: doc.documentCode,
      title,
      participantCount: users.length,
      aiRoleAssignments: aiRoles,
    }
  })
