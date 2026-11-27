import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdminSalesHq } from '../../_auth'
import { parseContactListInput, validateDomainsMxBatch } from '@/lib/sales/outreach-parser'

export async function POST(request: NextRequest) {
    const auth = await requireSuperAdminSalesHq()
    if (!auth.ok) return auth.response

    let rawText = ''
    let shouldCheckMx = true

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
        try {
            const fd = await request.formData()
            const file = fd.get('file')
            const textField = fd.get('raw_text')
            shouldCheckMx = fd.get('validate_mx') !== 'false'

            if (file instanceof File) {
                if (file.size > 5 * 1024 * 1024) {
                    return NextResponse.json({ error: 'Arquivo de lista excede 5 MB.' }, { status: 400 })
                }
                rawText = await file.text()
            } else if (typeof textField === 'string') {
                rawText = textField
            }
        } catch {
            return NextResponse.json({ error: 'Falha ao ler arquivo enviado.' }, { status: 400 })
        }
    } else {
        try {
            const body = await request.json()
            rawText = String(body?.raw_text || '')
            if (typeof body?.validate_mx === 'boolean') {
                shouldCheckMx = body.validate_mx
            }
        } catch {
            return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
        }
    }

    if (!rawText.trim()) {
        return NextResponse.json({ error: 'Envie um arquivo TXT/CSV ou cole os contatos.' }, { status: 400 })
    }

    const parsed = parseContactListInput(rawText)
    const emails = parsed.contacts.map((c) => c.email)

    const [suppressionsRes, crmRes] = await Promise.all([
        emails.length > 0
            ? auth.supabaseAdmin
                  .from('sales_outreach_suppressions' as any)
                  .select('email')
                  .in('email', emails)
            : Promise.resolve({ data: [] }),
        emails.length > 0
            ? auth.supabaseAdmin
                  .from('sales_prospects' as any)
                  .select('email')
            : Promise.resolve({ data: [] }),
    ])

    const suppressedSet = new Set(
        ((suppressionsRes.data || []) as Array<{ email: string }>).map((r) => r.email.toLowerCase())
    )
    const crmSet = new Set(
        ((crmRes.data || []) as Array<{ email: string }>)
            .filter((r) => Boolean(r.email))
            .map((r) => r.email.trim().toLowerCase())
    )

    const activeContacts = parsed.contacts.filter((c) => !suppressedSet.has(c.email))
    const suppressedRemoved = parsed.contacts.length - activeContacts.length
    const alreadyInCrmCount = activeContacts.filter((c) => crmSet.has(c.email)).length

    let mxInvalidEmails: string[] = []
    if (shouldCheckMx && activeContacts.length > 0) {
        const mxResult = await validateDomainsMxBatch(activeContacts.map((c) => c.email))
        mxInvalidEmails = mxResult.invalidEmails
    }
    const mxInvalidSet = new Set(mxInvalidEmails)
    const cleanContacts = activeContacts.filter((c) => !mxInvalidSet.has(c.email))

    return NextResponse.json({
        valid: cleanContacts,
        invalid_lines: parsed.invalidLines.slice(0, 50),
        duplicates_removed: parsed.duplicatesRemoved,
        suppressed_removed: suppressedRemoved,
        already_in_crm_count: alreadyInCrmCount,
        mx_invalid_emails: mxInvalidEmails,
    })
}

