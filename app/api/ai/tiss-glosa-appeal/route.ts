import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireTissAction } from '@/lib/auth/tiss-role-guard'
import { runClinigoAiTask } from '@/lib/ai/clinigo-ai-engine'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
    // RBAC estrito de TISS: exclusivo CLINIC_ADMIN, FINANCIAL e SUPER_ADMIN
    const guard = await requireTissAction(request as any, 'glosa.revisar')
    if (!guard.authorized) {
        return 'response' in guard
            ? guard.response
            : NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 })
    }

    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = (await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .maybeSingle()) as { data: { clinic_id: string | null } | null }

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 })
        }

        const body = await request.json()
        const guideId = String(body.guideId || '')
        if (!UUID_REGEX.test(guideId)) {
            return NextResponse.json({ success: false, error: 'Guia inválida' }, { status: 400 })
        }

        const clinicId = profile.clinic_id
        const db = supabase as any

        const { data: guide } = await db
            .from('tiss_guides')
            .select(
                'id, batch_id, appointment_id, patient_id, guide_number, patient_name, patient_card_number, procedure_code, procedure_name, total_value, glosa_value, glosa_code, glosa_description, authorization_code, execution_date, biometric_proof_id'
            )
            .eq('id', guideId)
            .eq('clinic_id', clinicId)
            .maybeSingle()

        if (!guide) {
            return NextResponse.json({ success: false, error: 'Guia não encontrada' }, { status: 404 })
        }

        const [{ data: clinic }, { data: batch }, { data: glosas }, { data: appointment }, { data: medicalRecords }, { data: biometrics }] =
            await Promise.all([
                db.from('clinics').select('name').eq('id', clinicId).maybeSingle(),
                guide.batch_id
                    ? db
                          .from('tiss_batches')
                          .select('batch_number, insurance_company_name, protocol_number')
                          .eq('id', guide.batch_id)
                          .eq('clinic_id', clinicId)
                          .maybeSingle()
                    : Promise.resolve({ data: null }),
                db
                    .from('tiss_glosas')
                    .select('glosa_code, glosa_description, glosa_value, operator_note')
                    .eq('guide_id', guideId)
                    .eq('clinic_id', clinicId)
                    .is('deleted_at', null),
                guide.appointment_id
                    ? db
                          .from('appointments')
                          .select('status, appointment_date, appointment_time, checked_in_at, completed_at')
                          .eq('id', guide.appointment_id)
                          .eq('clinic_id', clinicId)
                          .maybeSingle()
                    : Promise.resolve({ data: null }),
                guide.appointment_id
                    ? db
                          .from('medical_records')
                          .select('signed_at, digital_signature_signer, digital_signature_hash')
                          .eq('appointment_id', guide.appointment_id)
                          .eq('clinic_id', clinicId)
                          .order('created_at', { ascending: false })
                          .limit(1)
                    : Promise.resolve({ data: [] }),
                guide.patient_id
                    ? db
                          .from('patient_face_biometrics')
                          .select('id, consent_given, consent_date')
                          .eq('patient_id', guide.patient_id)
                          .eq('clinic_id', clinicId)
                          .order('created_at', { ascending: false })
                          .limit(1)
                    : Promise.resolve({ data: [] }),
            ])

        const evolution = Array.isArray(medicalRecords) ? medicalRecords[0] || null : null
        const biometric = Array.isArray(biometrics) ? biometrics[0] || null : null
        const glosaList = Array.isArray(glosas) ? glosas : []

        const glosaSummary =
            glosaList.length > 0
                ? glosaList
                      .map(
                          (g: any) =>
                              `Código ANS ${g.glosa_code || 'N/I'}: ${g.glosa_description || 'Motivo não detalhado'} (R$ ${Number(g.glosa_value || 0).toFixed(2)})`
                      )
                      .join('; ')
                : `Glosa total de R$ ${Number(guide.glosa_value || 0).toFixed(2)} (${guide.glosa_code || 'Motivo geral'})`

        const realProofs: string[] = []
        if (guide.authorization_code) {
            realProofs.push(`Autorização/Senha prévia nº ${guide.authorization_code}`)
        }
        if (appointment?.checked_in_at || appointment?.status === 'COMPLETED') {
            realProofs.push(
                `Trilha de atendimento registrada em ${appointment.appointment_date || guide.execution_date} (status: ${appointment.status}${appointment.checked_in_at ? ', check-in presencial confirmado' : ''})`
            )
        }
        if (biometric || guide.biometric_proof_id) {
            realProofs.push(
                `Evidência biométrica facial ativa e consentida (LGPD) vinculada ao comparecimento`
            )
        }
        if (evolution?.signed_at) {
            realProofs.push(
                `Evolução clínica assinada eletronicamente${evolution.digital_signature_hash ? ` com hash criptográfico ${String(evolution.digital_signature_hash).slice(0, 16)}...` : ''} conforme Lei 14.063/2020`
            )
        } else if (evolution) {
            realProofs.push('Registro clínico localizado no prontuário eletrônico da clínica')
        }

        const systemPrompt = [
            'Você é um especialista técnico em auditoria de contas médicas e recursos de glosa no padrão TISS/ANS (RN 501 e Padrão TISS).',
            'REGRAS INVIOLÁVEIS:',
            '1. Cite EXCLUSIVAMENTE as provas realmente presentes nos dados fornecidos. NUNCA afirme que há biometria ou assinatura se não estiver na lista de provas.',
            '2. Escreva uma Carta Técnica de Recurso de Glosa formal, objetiva e persuasiva em Português do Brasil (120 a 220 palavras), SEM emojis e SEM markdown com asteriscos.',
            '3. Solicite expressamente a reanálise e a liberação do pagamento do valor glosado com base nas evidências anexadas no dossiê.',
        ].join('\n')

        const userPrompt = [
            `Operadora: ${batch?.insurance_company_name || 'Operadora de Saúde'} | Lote: ${batch?.batch_number || 'N/I'}`,
            `Guia TISS: ${guide.guide_number} | Procedimento TUSS: ${guide.procedure_code} — ${guide.procedure_name || 'Procedimento assistencial'}`,
            `Data de execução: ${guide.execution_date || 'N/I'} | Valor cobrado: R$ ${Number(guide.total_value || 0).toFixed(2)}`,
            `Motivo(s) de glosa a contestar: ${glosaSummary}`,
            realProofs.length > 0
                ? `Provas auditáveis REALMENTE disponíveis no dossiê:\n- ${realProofs.join('\n- ')}`
                : 'Provas disponíveis: guia TISS faturada e histórico de atendimento no prontuário da clínica.',
            'Redija a fundamentação técnica de recurso de glosa pronta para protocolar no portal da operadora e incluir na Seção 4 do Dossiê Probatório.',
        ].join('\n\n')

        const buildLocalFallback = () =>
            `À Auditoria Técnica da ${batch?.insurance_company_name || 'Operadora de Saúde'},\n\n` +
            `Vimos, respeitosamente, interpor Recurso de Glosa referente à guia TISS nº ${guide.guide_number} (procedimento TUSS ${guide.procedure_code}, executado em ${guide.execution_date || 'data registrada'}, ${glosaSummary}). ` +
            `O atendimento foi efetivamente prestado ao beneficiário conforme comprovam as evidências auditáveis reunidas neste Dossiê Probatório: ${realProofs.join('; ') || 'registro assistencial regular em prontuário'}.\n\n` +
            `Diante da comprovação inequívoca da execução assistencial e da conformidade cadastral e normativa no padrão TISS/ANS, requeremos a reanálise do corte aplicado e a liberação integral do valor glosado.`

        const aiRes = await runClinigoAiTask({
            clinicId,
            userId: user.id,
            patientId: guide.patient_id || undefined,
            taskKey: `tiss-glosa-appeal-${guide.id}`,
            interactionType: 'GENERAL_QUERY',
            tier: 'high',
            systemPrompt,
            userPrompt,
            entities: {
                patientName: guide.patient_name,
                clinicName: clinic?.name,
                cardNumber: guide.patient_card_number,
            },
            maxTokens: 700,
            temperature: 0.2,
            buildLocalFallback,
        })

        return NextResponse.json({
            success: true,
            data: {
                guideId: guide.id,
                guideNumber: guide.guide_number,
                appealText: aiRes.text,
                proofsCount: realProofs.length,
                provider: aiRes.provider,
                model: aiRes.model,
                fromCache: aiRes.fromCache,
                lgpdShielded: aiRes.lgpdShielded,
                latencyMs: aiRes.latencyMs,
                disclaimer: aiRes.disclaimer,
            },
        })
    } catch (error) {
        console.error('[AI-TISS-GLOSA-APPEAL] Erro:', error)
        return NextResponse.json(
            { success: false, error: 'Não foi possível redigir a carta de recurso agora.' },
            { status: 500 }
        )
    }
}

