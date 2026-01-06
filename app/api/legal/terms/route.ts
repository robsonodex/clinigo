/**
 * API endpoint for legal terms acceptance
 */
import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

/**
 * POST - Accept a legal term
 */
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')

        if (!userId) {
            throw new ForbiddenError('Autenticação necessária')
        }

        const body = await request.json()
        const { term_type, signature, crm, ip_address } = body

        if (!term_type || !signature) {
            return Response.json(
                { success: false, error: 'Dados incompletos' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        // Get current active term
        const { data: term, error: termError } = await supabase
            .from('legal_terms')
            .select('id')
            .eq('term_type', term_type)
            .eq('is_active', true)
            .single()

        if (termError || !term) {
            return Response.json(
                { success: false, error: 'Termo não encontrado' },
                { status: 404 }
            )
        }

        // Check if already accepted
        const { data: existing } = await supabase
            .from('legal_terms_acceptance')
            .select('id')
            .eq('user_id', userId)
            .eq('term_id', term.id)
            .single()

        if (existing) {
            return successResponse({ message: 'Termo já aceito anteriormente', id: existing.id })
        }

        // Record acceptance
        const { data: acceptance, error: insertError } = await supabase
            .from('legal_terms_acceptance')
            .insert({
                user_id: userId,
                term_id: term.id,
                digital_signature: signature,
                signature_name: signature,
                crm: crm || null,
                ip_address: ip_address || request.headers.get('x-forwarded-for') || '0.0.0.0',
                user_agent: request.headers.get('user-agent'),
            })
            .select('id')
            .single()

        if (insertError) throw insertError

        return successResponse({
            message: 'Termo aceito com sucesso',
            id: acceptance.id,
        })
    } catch (error) {
        return handleApiError(error)
    }
}

/**
 * GET - Check if user has accepted current terms
 */
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        const { searchParams } = new URL(request.url)
        const termType = searchParams.get('type')

        if (!userId) {
            throw new ForbiddenError('Autenticação necessária')
        }

        const supabase = await createClient()

        // Get pending terms for user
        const { data: terms } = await supabase
            .from('legal_terms')
            .select('id, term_type, title, version')
            .eq('is_active', true)

        if (!terms || terms.length === 0) {
            return successResponse({ pending: [], accepted: [] })
        }

        // Get user's acceptances
        const { data: acceptances } = await supabase
            .from('legal_terms_acceptance')
            .select('term_id')
            .eq('user_id', userId)

        const acceptedTermIds = new Set((acceptances || []).map((a) => a.term_id))

        const pending = terms.filter((t) => !acceptedTermIds.has(t.id))
        const accepted = terms.filter((t) => acceptedTermIds.has(t.id))

        // Filter by type if specified
        if (termType) {
            return successResponse({
                hasAccepted: accepted.some((t) => t.term_type === termType),
                pending: pending.filter((t) => t.term_type === termType),
            })
        }

        return successResponse({ pending, accepted })
    } catch (error) {
        return handleApiError(error)
    }
}
