/**
 * Parser inteligente para listas de contatos de prospecção em CSV, TXT ou texto colado.
 * Extrai e-mail, nome, clínica e telefone com limpeza automática, deduplicação e inferência de clínica.
 */
import dns from 'dns/promises'
import type { ParsedOutreachContact } from './outreach-types'

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

const GENERIC_EMAIL_DOMAINS = new Set([
    'gmail.com',
    'googlemail.com',
    'hotmail.com',
    'hotmail.com.br',
    'outlook.com',
    'outlook.com.br',
    'live.com',
    'msn.com',
    'yahoo.com',
    'yahoo.com.br',
    'icloud.com',
    'me.com',
    'uol.com.br',
    'bol.com.br',
    'terra.com.br',
    'ig.com.br',
    'globo.com',
    'globomail.com',
    'proton.me',
    'protonmail.com',
    'zoho.com',
    'aol.com',
    'r7.com',
    'oi.com.br',
])

const HEADER_KEYWORDS = new Set([
    'email',
    'e-mail',
    'mail',
    'nome',
    'name',
    'contato',
    'responsavel',
    'responsável',
    'clinica',
    'clínica',
    'empresa',
    'telefone',
    'phone',
    'whatsapp',
    'celular',
    'tel',
])

function stripQuotes(value: string): string {
    return value.trim().replace(/^["']+|["']+$/g, '').trim()
}

function splitLineRespectingQuotes(line: string, delimiter: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"'
                i++
            } else {
                inQuotes = !inQuotes
            }
        } else if (ch === delimiter && !inQuotes) {
            result.push(stripQuotes(current))
            current = ''
        } else {
            current += ch
        }
    }
    result.push(stripQuotes(current))
    return result
}

function detectDelimiter(lines: string[]): string | null {
    const sample = lines.slice(0, 10)
    const candidates = [';', ',', '\t', '|']
    let best: string | null = null
    let bestScore = 0

    for (const delim of candidates) {
        const counts = sample.map((line) => splitLineRespectingQuotes(line, delim).length)
        const multiColLines = counts.filter((c) => c >= 2).length
        const avgCols = counts.reduce((acc, c) => acc + c, 0) / Math.max(1, counts.length)
        const score = multiColLines * 10 + avgCols
        if (multiColLines >= Math.ceil(sample.length * 0.5) && score > bestScore) {
            bestScore = score
            best = delim
        }
    }

    return best
}

export function normalizeBrazilianPhone(raw: string): string {
    const digits = (raw || '').replace(/\D/g, '')
    if (digits.length < 8 || digits.length > 15) return ''
    let local = digits
    if (local.startsWith('55') && local.length >= 12) {
        local = local.slice(2)
    }
    if (local.length === 11) {
        return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
    }
    if (local.length === 10) {
        return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
    }
    return digits
}

function extractPhoneFromText(text: string): string {
    const match = text.match(/(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?(?:9?\d{4})[\s.-]?\d{4}/)
    if (!match) return ''
    return normalizeBrazilianPhone(match[0])
}

export function inferClinicNameFromEmail(email: string): string {
    const domain = (email.split('@')[1] || '').toLowerCase().trim()
    if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) return ''

    const base = domain
        .replace(/\.(com\.br|med\.br|psi\.br|org\.br|net\.br|com|net|org|app|br|io|co|health|clinic)$/i, '')
        .replace(/^(www|mail|contato)\./i, '')
        .split('.')[0]

    if (!base || base.length < 3) return ''

    const formatted = base
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
        .join(' ')

    return formatted
}

function looksLikeHeaderRow(cells: string[]): boolean {
    if (cells.some((c) => EMAIL_REGEX.test(c))) return false
    const normalized = cells.map((c) => c.toLowerCase().trim())
    const matches = normalized.filter((c) =>
        Array.from(HEADER_KEYWORDS).some((kw) => c === kw || c.includes(kw))
    )
    return matches.length >= 1
}

function mapHeaderColumns(headers: string[]) {
    const normalized = headers.map((h) => h.toLowerCase().trim())
    const findIdx = (patterns: RegExp[]) =>
        normalized.findIndex((h) => patterns.some((p) => p.test(h)))

    return {
        emailIdx: findIdx([/^e-?mail$/, /e-?mail/, /mail/]),
        nameIdx: findIdx([/^nome$/, /respons[aá]vel/, /contato/, /pessoa/, /name/, /gestor/, /diretor/]),
        clinicIdx: findIdx([/cl[ií]nica/, /empresa/, /consult[oó]rio/, /institui/, /razao/, /fantasia/, /company/]),
        phoneIdx: findIdx([/whatsapp/, /whats/, /telefone/, /celular/, /fone/, /phone/, /^tel$/]),
    }
}

function looksLikeClinicLabel(value: string): boolean {
    return /\b(cl[ií]nica|espa[cç]o|centro|instituto|nucleo|n[uú]cleo|terapia|terapias|sa[uú]de|fono|fisio|psico|infantil|tea|aba|neuro|multidisciplinar|consult[oó]rio|reabilita)\b/i.test(
        value
    )
}

export function parseContactListInput(rawInput: string): {
    contacts: ParsedOutreachContact[]
    invalidLines: Array<{ line: number; raw: string; reason: string }>
    duplicatesRemoved: number
} {
    const normalizedText = (rawInput || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const rawLines = normalizedText.split('\n')

    const nonEmptyEntries = rawLines
        .map((text, idx) => ({ line: idx + 1, text: text.trim() }))
        .filter((entry) => entry.text.length > 0 && !entry.text.startsWith('#'))

    if (nonEmptyEntries.length === 0) {
        return { contacts: [], invalidLines: [], duplicatesRemoved: 0 }
    }

    const delimiter = detectDelimiter(nonEmptyEntries.map((e) => e.text))
    let headerMap: ReturnType<typeof mapHeaderColumns> | null = null
    let startIndex = 0

    if (delimiter) {
        const firstCells = splitLineRespectingQuotes(nonEmptyEntries[0].text, delimiter)
        if (looksLikeHeaderRow(firstCells)) {
            headerMap = mapHeaderColumns(firstCells)
            startIndex = 1
        }
    }

    const seenEmails = new Set<string>()
    const contacts: ParsedOutreachContact[] = []
    const invalidLines: Array<{ line: number; raw: string; reason: string }> = []
    let duplicatesRemoved = 0

    for (let i = startIndex; i < nonEmptyEntries.length; i++) {
        const entry = nonEmptyEntries[i]
        let email = ''
        let contactName = ''
        let clinicName = ''
        let phone = ''

        if (delimiter) {
            const cells = splitLineRespectingQuotes(entry.text, delimiter)

            if (headerMap && headerMap.emailIdx >= 0) {
                email = (cells[headerMap.emailIdx] || '').trim().toLowerCase()
                if (headerMap.nameIdx >= 0) contactName = (cells[headerMap.nameIdx] || '').trim()
                if (headerMap.clinicIdx >= 0) clinicName = (cells[headerMap.clinicIdx] || '').trim()
                if (headerMap.phoneIdx >= 0) phone = normalizeBrazilianPhone(cells[headerMap.phoneIdx] || '')
            }

            // Fallback se coluna de e-mail não veio mapeada ou célula veio deslocada
            if (!STRICT_EMAIL_REGEX.test(email)) {
                const emailCellIdx = cells.findIndex((c) => EMAIL_REGEX.test(c))
                if (emailCellIdx >= 0) {
                    const matched = cells[emailCellIdx].match(EMAIL_REGEX)
                    email = matched ? matched[0].toLowerCase() : ''

                    const remaining = cells.filter((_, idx) => idx !== emailCellIdx).map((c) => c.trim()).filter(Boolean)
                    for (const item of remaining) {
                        const maybePhone = normalizeBrazilianPhone(item)
                        if (!phone && maybePhone && item.replace(/[\d\s()+.-]/g, '').length <= 2) {
                            phone = maybePhone
                        } else if (!clinicName && looksLikeClinicLabel(item)) {
                            clinicName = item
                        } else if (!contactName) {
                            contactName = item
                        } else if (!clinicName) {
                            clinicName = item
                        }
                    }
                }
            }
        } else {
            // Modo TXT livre: extrai e-mail, telefone e texto restante (ex.: "Dra. Ana - Clinica Vida - ana@vida.com.br - (21) 99999-9999")
            const emailMatch = entry.text.match(EMAIL_REGEX)
            if (emailMatch) {
                email = emailMatch[0].toLowerCase()
                const withoutEmail = entry.text.replace(emailMatch[0], ' ').trim()
                phone = extractPhoneFromText(withoutEmail)

                const cleanedRemainder = withoutEmail
                    .replace(/(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?(?:9?\d{4})[\s.-]?\d{4}/g, ' ')
                    .replace(/[<>()[\]]/g, ' ')
                    .trim()

                const parts = cleanedRemainder
                    .split(/\s*[-–—/|;,]+\s*/)
                    .map((p) => p.trim())
                    .filter((p) => p.length >= 2)

                for (const part of parts) {
                    if (!clinicName && looksLikeClinicLabel(part)) {
                        clinicName = part
                    } else if (!contactName) {
                        contactName = part
                    } else if (!clinicName) {
                        clinicName = part
                    }
                }
            }
        }

        if (!email || !STRICT_EMAIL_REGEX.test(email)) {
            invalidLines.push({
                line: entry.line,
                raw: entry.text.slice(0, 120),
                reason: 'Nenhum endereço de e-mail válido encontrado nesta linha',
            })
            continue
        }

        if (seenEmails.has(email)) {
            duplicatesRemoved++
            continue
        }
        seenEmails.add(email)

        let inferredClinic = false
        if (!clinicName) {
            const guessed = inferClinicNameFromEmail(email)
            if (guessed) {
                clinicName = guessed
                inferredClinic = true
            }
        }

        // Se o campo "nome" claramente é o nome da clínica e clinicName está vazio
        if (!clinicName && contactName && looksLikeClinicLabel(contactName)) {
            clinicName = contactName
            contactName = ''
        }

        contacts.push({
            email,
            contact_name: contactName.slice(0, 120),
            clinic_name: clinicName.slice(0, 160),
            phone: phone.slice(0, 40),
            inferred_clinic: inferredClinic,
        })
    }

    return { contacts, invalidLines, duplicatesRemoved }
}

// Cache curto de DNS MX por domínio para acelerar listas grandes sem spam de lookup
const mxCache = new Map<string, { valid: boolean; expiresAt: number }>()

export async function validateEmailDomainMx(email: string, timeoutMs = 2500): Promise<boolean> {
    const domain = (email.split('@')[1] || '').toLowerCase().trim()
    if (!domain || !domain.includes('.')) return false

    const now = Date.now()
    const cached = mxCache.get(domain)
    if (cached && now < cached.expiresAt) {
        return cached.valid
    }

    const withTimeout = <T,>(promise: Promise<T>): Promise<T> =>
        new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('DNS_TIMEOUT')), timeoutMs)
            promise
                .then((val) => {
                    clearTimeout(timer)
                    resolve(val)
                })
                .catch((err) => {
                    clearTimeout(timer)
                    reject(err)
                })
        })

    let isValid = false
    try {
        const records = await withTimeout(dns.resolveMx(domain))
        isValid = Array.isArray(records) && records.length > 0 && records.some((r) => Boolean(r.exchange))
    } catch (err: any) {
        const code = err?.code || ''
        if (code === 'ENODATA' || code === 'ENOTFOUND' || code === 'NXDOMAIN') {
            // Fallback RFC 5321: alguns domínios antigos aceitam e-mail via registro A direto
            try {
                const aRecords = await withTimeout(dns.resolve4(domain))
                isValid = Array.isArray(aRecords) && aRecords.length > 0
            } catch {
                isValid = false
            }
        } else {
            // Em caso de timeout transitório de DNS, não bloqueamos falsamente um e-mail válido
            isValid = true
        }
    }

    mxCache.set(domain, { valid: isValid, expiresAt: now + 10 * 60_000 })
    return isValid
}

export async function validateDomainsMxBatch(
    emails: string[]
): Promise<{ invalidEmails: string[]; domainStatus: Record<string, boolean> }> {
    const uniqueDomains = Array.from(
        new Set(
            emails
                .map((e) => (e.split('@')[1] || '').toLowerCase().trim())
                .filter(Boolean)
        )
    )

    const domainStatus: Record<string, boolean> = {}
    const CONCURRENCY = 8

    for (let i = 0; i < uniqueDomains.length; i += CONCURRENCY) {
        const slice = uniqueDomains.slice(i, i + CONCURRENCY)
        await Promise.all(
            slice.map(async (domain) => {
                domainStatus[domain] = await validateEmailDomainMx(`check@${domain}`)
            })
        )
    }

    const invalidEmails = emails.filter((e) => {
        const domain = (e.split('@')[1] || '').toLowerCase().trim()
        return domainStatus[domain] === false
    })

    return { invalidEmails, domainStatus }
}

