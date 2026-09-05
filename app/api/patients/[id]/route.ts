import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// GET - Get single patient
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: patient, error } = await supabase
            .from('patients')
            .select(`
                *,
                health_insurances:health_insurance_id (
                    id,
                    name,
                    code
                )
            `)
            .eq('id', id)
            .eq('is_active', true)
            .single()

        if (error || !patient) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        return NextResponse.json(patient)

    } catch (error) {
        console.error('Patient fetch error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH - Update patient
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()

        const updatePayload: any = { ...body }
        if (body.billing_type !== undefined) {
            const isConvenio = body.billing_type === 'convenio'
            updatePayload.billing_type = isConvenio ? 'convenio' : 'particular'
            if (!isConvenio) {
                updatePayload.health_insurance_id = null
                updatePayload.insurance_card_number = null
                updatePayload.insurance_validity = null
                updatePayload.insurance_plan_name = null
            }
            updatePayload.health_insurance = {
                billing_type: updatePayload.billing_type,
                health_insurance_id: isConvenio ? (body.health_insurance_id || null) : null,
                insurance_card_number: isConvenio ? (body.insurance_card_number || null) : null,
                insurance_validity: isConvenio ? (body.insurance_validity || null) : null,
                insurance_plan_name: isConvenio ? (body.insurance_plan_name || null) : null,
                insurance_holder_name: body.insurance_holder_name || null,
                insurance_holder_cpf: body.insurance_holder_cpf || null,
            }
        }

        const { data: patient, error } = await supabase
            .from('patients')
            .update({
                ...updatePayload,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select(`
                *,
                health_insurances:health_insurance_id (
                    id,
                    name,
                    code
                )
            `)
            .single()

        if (error) {
            console.error('Patient update error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar paciente' }, { status: 500 })
        }

        return NextResponse.json(patient)

    } catch (error) {
        console.error('Patient update error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// DELETE - Hard delete if no medical history, or Soft delete (LGPD compliant)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Get user role and clinic
        const { data: profile } = await supabase
            .from('users')
            .select('id, role, clinic_id')
            .eq('id', user.id)
            .single()

        if (!profile) {
            return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
        }

        const allowedRoles = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST']
        if (!allowedRoles.includes(profile.role || '')) {
            return NextResponse.json({ error: 'Sem permissão para excluir pacientes' }, { status: 403 })
        }

        const serviceRole = createServiceRoleClient()

        // Buscar paciente para validação de clínica (multi-tenant isolation)
        const { data: patient, error: fetchError } = await serviceRole
            .from('patients')
            .select('id, clinic_id, full_name, cpf')
            .eq('id', id)
            .single()

        if (fetchError || !patient) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        // Validação estrita de clínica
        if (profile.role !== 'SUPER_ADMIN' && profile.clinic_id !== patient.clinic_id) {
            return NextResponse.json({ error: 'Acesso negado: paciente pertence a outra clínica' }, { status: 403 })
        }

        // 1. Tenta exclusão direta (ideal para cadastros duplicados ou sem histórico clínico/financeiro)
        const { error: hardDeleteError } = await serviceRole
            .from('patients')
            .delete()
            .eq('id', id)

        if (!hardDeleteError) {
            return NextResponse.json({
                success: true,
                deleted: true,
                message: 'Paciente removido com sucesso.'
            })
        }

        // 2. Se a exclusão física falhar por chave estrangeira (histórico de consultas/financeiro),
        // realiza o Soft Delete e anonimização LGPD respeitando as constraints NOT NULL do banco
        const anonSuffix = id.replace(/-/g, '').slice(0, 8)
        const anonymizedCpf = `DEL_${anonSuffix}`
        const anonymizedEmail = `anon_${anonSuffix}@anonimizado.clinigo.app`
        const anonymizedPhone = '00000000000'

        const { error: softDeleteError } = await serviceRole
            .from('patients')
            .update({
                is_active: false,
                is_anonymized: true,
                deleted_at: new Date().toISOString(),
                full_name: 'Paciente Removido (LGPD)',
                email: anonymizedEmail,
                phone: anonymizedPhone,
                cpf: anonymizedCpf,
                address: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)

        if (softDeleteError) {
            console.error('Patient soft-delete error:', softDeleteError)
            return NextResponse.json({
                error: `Erro ao anonimizar paciente: ${softDeleteError.message}`
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            anonymized: true,
            message: 'Paciente inativado e dados anonimizados conforme LGPD.'
        })

    } catch (error: any) {
        console.error('Patient delete error:', error)
        return NextResponse.json({ error: error?.message || 'Erro interno ao excluir paciente' }, { status: 500 })
    }
}
