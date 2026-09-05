import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Função auxiliar para substituir tags dinâmicas no documento
function replaceDynamicTags(content: string, vars: Record<string, string>): string {
    let result = content
    for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`{{${key}}}`, 'g')
        result = result.replace(regex, value || '')
    }
    return result
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        let clinicId = userData?.clinic_id
        if (!clinicId && userData?.role === 'SUPER_ADMIN') {
            const cookieStore = await cookies()
            clinicId = cookieStore.get('impersonation_clinic_id')?.value || cookieStore.get('clinic_id')?.value
        }

        const { searchParams } = new URL(request.url)
        const patientId = searchParams.get('patient_id')

        if (!patientId) {
            return NextResponse.json({ error: 'patient_id é obrigatório' }, { status: 400 })
        }

        const serviceRole = createServiceRoleClient()
        let query = serviceRole
            .from('patient_term_signatures')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })

        if (clinicId) {
            query = query.eq('clinic_id', clinicId)
        }

        const { data: signatures, error } = await query

        if (error) {
            console.error('[PATIENT-SIGNATURES] Erro ao buscar:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ signatures: signatures || [] })
    } catch (err: any) {
        console.error('[PATIENT-SIGNATURES] Erro fatal GET:', err)
        return NextResponse.json({ error: 'Erro ao buscar termos do paciente' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        let clinicId = userData?.clinic_id
        if (!clinicId && userData?.role === 'SUPER_ADMIN') {
            const cookieStore = await cookies()
            clinicId = cookieStore.get('impersonation_clinic_id')?.value || cookieStore.get('clinic_id')?.value
        }

        const body = await request.json()
        const {
            patient_id,
            template_id,
            title,
            category,
            raw_content,
            signer_name,
            signer_cpf,
            signer_phone,
            signer_email,
        } = body

        if (!patient_id) {
            return NextResponse.json({ error: 'patient_id é obrigatório' }, { status: 400 })
        }

        const serviceRole = createServiceRoleClient()

        // 1. Busca dados do paciente e da clínica
        const { data: patient, error: patientErr } = await serviceRole
            .from('patients')
            .select('id, full_name, cpf, date_of_birth, phone, email, clinic_id, insurance_holder_name, insurance_holder_cpf')
            .eq('id', patient_id)
            .single()

        if (patientErr || !patient) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        const effectiveClinicId = clinicId || patient.clinic_id

        const { data: clinic } = await serviceRole
            .from('clinics')
            .select('id, name, logo_url')
            .eq('id', effectiveClinicId)
            .single()

        // 2. Determina o conteúdo base (do template ou customizado)
        let baseContent = raw_content || ''
        let documentTitle = title || 'Termo de Aceite'
        let docCategory = category || 'termo_aceite'

        if (template_id) {
            const { data: tmpl } = await serviceRole
                .from('clinic_document_templates')
                .select('*')
                .eq('id', template_id)
                .single()

            if (tmpl) {
                baseContent = tmpl.content
                documentTitle = title || tmpl.title
                docCategory = category || tmpl.category
            }
        }

        if (!baseContent.trim()) {
            return NextResponse.json({ error: 'Conteúdo do documento não pode ser vazio' }, { status: 400 })
        }

        // 3. Resolve nome e dados do responsável
        const resolvedSignerName = signer_name?.trim() || patient.insurance_holder_name?.trim() || 'Responsável Legal'
        const resolvedSignerCpf = signer_cpf?.trim() || patient.insurance_holder_cpf?.trim() || ''
        const resolvedSignerPhone = signer_phone?.trim() || patient.phone?.trim() || ''
        const resolvedSignerEmail = signer_email?.trim() || patient.email?.trim() || ''

        // 4. Formata a data atual em português
        const dataAtualStr = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }).format(new Date())

        const dataNascimentoStr = patient.date_of_birth
            ? new Date(patient.date_of_birth + 'T12:00:00').toLocaleDateString('pt-BR')
            : 'Não informada'

        // 5. Substitui as tags dinâmicas
        const renderedContent = replaceDynamicTags(baseContent, {
            nome_paciente: patient.full_name,
            cpf_paciente: patient.cpf || 'Não informado',
            data_nascimento: dataNascimentoStr,
            nome_responsavel: resolvedSignerName,
            cpf_responsavel: resolvedSignerCpf || 'Não informado',
            telefone_responsavel: resolvedSignerPhone || 'Não informado',
            nome_clinica: clinic?.name || 'Clínica',
            data_atual: dataAtualStr,
        })

        // 6. Insere o registro de assinatura com token único
        const { data: signatureRecord, error: insertError } = await serviceRole
            .from('patient_term_signatures')
            .insert({
                clinic_id: effectiveClinicId,
                patient_id: patient.id,
                template_id: template_id || null,
                title: documentTitle,
                category: docCategory,
                document_content: renderedContent,
                signer_name: resolvedSignerName,
                signer_cpf: resolvedSignerCpf,
                signer_phone: resolvedSignerPhone,
                signer_email: resolvedSignerEmail,
                status: 'PENDING',
            })
            .select()
            .single()

        if (insertError) {
            console.error('[PATIENT-SIGNATURES] Erro ao emitir termo:', insertError)
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        const signingUrl = `/assinar/${signatureRecord.signing_token}`

        return NextResponse.json({
            signature: signatureRecord,
            signing_url: signingUrl,
        }, { status: 201 })
    } catch (err: any) {
        console.error('[PATIENT-SIGNATURES] Erro fatal POST:', err)
        return NextResponse.json({ error: 'Erro ao emitir termo para assinatura' }, { status: 500 })
    }
}
