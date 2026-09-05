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
            .select('id, clinic_id, role')
            .eq('id', user.id)
            .single()

        let clinicId = userData?.clinic_id
        if (!clinicId && userData?.role === 'SUPER_ADMIN') {
            const cookieStore = await cookies()
            clinicId = cookieStore.get('impersonation_clinic_id')?.value || cookieStore.get('clinic_id')?.value
        }

        const { searchParams } = new URL(request.url)
        const doctorId = searchParams.get('doctor_id')
        const checkPendingForCurrentUser = searchParams.get('pending_for_current_user') === 'true'

        const serviceRole = createServiceRoleClient()

        // Se estiver checando pendências para o profissional logado (Onboarding)
        if (checkPendingForCurrentUser) {
            // Busca se o usuário logado é um médico/profissional
            const { data: doctorRecord } = await serviceRole
                .from('doctors')
                .select('id, clinic_id')
                .eq('user_id', user.id)
                .maybeSingle()

            if (!doctorRecord) {
                return NextResponse.json({ pending_signatures: [] })
            }

            const { data: pending, error: pendErr } = await serviceRole
                .from('professional_term_signatures')
                .select('*')
                .eq('doctor_id', doctorRecord.id)
                .eq('status', 'PENDING')
                .order('created_at', { ascending: false })

            if (pendErr) {
                console.error('[PROFESSIONAL-SIGNATURES] Erro ao buscar pendências do usuário:', pendErr)
                return NextResponse.json({ pending_signatures: [] })
            }

            return NextResponse.json({
                pending_signatures: pending || [],
                doctor_id: doctorRecord.id,
            })
        }

        if (!doctorId) {
            return NextResponse.json({ error: 'doctor_id é obrigatório' }, { status: 400 })
        }

        let query = serviceRole
            .from('professional_term_signatures')
            .select('*')
            .eq('doctor_id', doctorId)
            .order('created_at', { ascending: false })

        if (clinicId) {
            query = query.eq('clinic_id', clinicId)
        }

        const { data: signatures, error } = await query

        if (error) {
            console.error('[PROFESSIONAL-SIGNATURES] Erro ao buscar:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ signatures: signatures || [] })
    } catch (err: any) {
        console.error('[PROFESSIONAL-SIGNATURES] Erro fatal GET:', err)
        return NextResponse.json({ error: 'Erro ao buscar termos do profissional' }, { status: 500 })
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
            doctor_id,
            template_id,
            title,
            category,
            raw_content,
            signer_name,
            signer_cpf,
            signer_phone,
            signer_email,
            professional_council,
            professional_specialty,
        } = body

        if (!doctor_id) {
            return NextResponse.json({ error: 'doctor_id é obrigatório' }, { status: 400 })
        }

        const serviceRole = createServiceRoleClient()

        // 1. Busca dados do médico/profissional e seu usuário vinculado
        const { data: doctor, error: doctorErr } = await serviceRole
            .from('doctors')
            .select(`
                id,
                clinic_id,
                specialty,
                crm,
                crm_state,
                consultation_price,
                user:users(id, full_name, email, phone, cpf)
            `)
            .eq('id', doctor_id)
            .single()

        if (doctorErr || !doctor) {
            return NextResponse.json({ error: 'Profissional não encontrado' }, { status: 404 })
        }

        const effectiveClinicId = clinicId || doctor.clinic_id

        // Busca dados da clínica
        const { data: clinic } = await serviceRole
            .from('clinics')
            .select('id, name, logo_url')
            .eq('id', effectiveClinicId)
            .single()

        // Busca contrato financeiro (repasse/percentual) se existir
        const { data: contractData } = await serviceRole
            .from('doctor_contracts')
            .select('percentage_private, fixed_value_private')
            .eq('doctor_id', doctor_id)
            .maybeSingle()

        // 2. Determina o conteúdo base (do template ou customizado)
        let baseContent = raw_content || ''
        let documentTitle = title || 'Contrato de Prestação de Serviços'
        let docCategory = category || 'contrato_equipe'

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

        // 3. Resolve identificação do profissional
        const docUser = (doctor.user as any) || {}
        const resolvedName = signer_name?.trim() || docUser.full_name?.trim() || 'Profissional'
        const resolvedCpf = signer_cpf?.trim() || docUser.cpf?.trim() || 'Não informado'
        const resolvedPhone = signer_phone?.trim() || docUser.phone?.trim() || 'Não informado'
        const resolvedEmail = signer_email?.trim() || docUser.email?.trim() || 'Não informado'

        const councilStr = professional_council?.trim() || (doctor.crm ? `${doctor.crm}${doctor.crm_state ? '/' + doctor.crm_state : ''}` : 'Não informado')
        const specialtyStr = professional_specialty?.trim() || doctor.specialty || 'Terapêutica / Médica'

        const repasseStr = contractData?.percentage_private
            ? `${Number(contractData.percentage_private).toFixed(0)}%`
            : '70%'

        const consultationPriceVal = doctor.consultation_price || 200
        const consultationPriceStr = `R$ ${Number(consultationPriceVal).toFixed(2)}`

        // 4. Formata a data atual em português
        const dataAtualStr = new Intl.DateTimeFormat('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        }).format(new Date())

        // 5. Substitui as tags dinâmicas
        const renderedContent = replaceDynamicTags(baseContent, {
            nome_profissional: resolvedName,
            cpf_profissional: resolvedCpf,
            conselho_regional: councilStr,
            especialidade: specialtyStr,
            email_profissional: resolvedEmail,
            telefone_profissional: resolvedPhone,
            valor_consulta: consultationPriceStr,
            porcentagem_repasse: repasseStr,
            nome_clinica: clinic?.name || 'Clínica',
            data_atual: dataAtualStr,
        })

        // 6. Insere o registro de assinatura com token único
        const { data: signatureRecord, error: insertError } = await serviceRole
            .from('professional_term_signatures')
            .insert({
                clinic_id: effectiveClinicId,
                doctor_id: doctor.id,
                template_id: template_id || null,
                title: documentTitle,
                category: docCategory,
                document_content: renderedContent,
                signer_name: resolvedName,
                signer_cpf: resolvedCpf,
                signer_phone: resolvedPhone,
                signer_email: resolvedEmail,
                professional_council: councilStr,
                professional_specialty: specialtyStr,
                status: 'PENDING',
            })
            .select()
            .single()

        if (insertError) {
            console.error('[PROFESSIONAL-SIGNATURES] Erro ao emitir termo:', insertError)
            return NextResponse.json({ error: insertError.message }, { status: 500 })
        }

        const signingUrl = `/assinar/${signatureRecord.signing_token}`

        return NextResponse.json({
            signature: signatureRecord,
            signing_url: signingUrl,
        }, { status: 201 })
    } catch (err: any) {
        console.error('[PROFESSIONAL-SIGNATURES] Erro fatal POST:', err)
        return NextResponse.json({ error: 'Erro ao emitir termo para o profissional' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID da assinatura é obrigatório' }, { status: 400 })
        }

        const serviceRole = createServiceRoleClient()

        const { data: sig, error: fetchErr } = await serviceRole
            .from('professional_term_signatures')
            .select('id, status')
            .eq('id', id)
            .single()

        if (fetchErr || !sig) {
            return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
        }

        if (sig.status === 'SIGNED') {
            return NextResponse.json({ error: 'Documentos já assinados não podem ser excluídos por motivos legais' }, { status: 400 })
        }

        const { error: delErr } = await serviceRole
            .from('professional_term_signatures')
            .delete()
            .eq('id', id)

        if (delErr) {
            console.error('[PROFESSIONAL-SIGNATURES] Erro ao deletar:', delErr)
            return NextResponse.json({ error: delErr.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Documento cancelado com sucesso' })
    } catch (err: any) {
        console.error('[PROFESSIONAL-SIGNATURES] Erro fatal DELETE:', err)
        return NextResponse.json({ error: 'Erro interno ao cancelar termo' }, { status: 500 })
    }
}
