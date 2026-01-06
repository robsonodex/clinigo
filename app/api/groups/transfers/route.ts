import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List transfers
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const searchParams = request.nextUrl.searchParams
        const direction = searchParams.get('direction') // 'incoming', 'outgoing', 'all'
        const status = searchParams.get('status')

        let query = supabase
            .from('inter_clinic_transfers')
            .select(`
        *,
        patient:patients(id, full_name, phone),
        from_clinic:clinics!from_clinic_id(id, name),
        to_clinic:clinics!to_clinic_id(id, name)
      `)
            .order('created_at', { ascending: false })

        if (direction === 'incoming') {
            query = query.eq('to_clinic_id', clinicId)
        } else if (direction === 'outgoing') {
            query = query.eq('from_clinic_id', clinicId)
        } else {
            query = query.or(`from_clinic_id.eq.${clinicId},to_clinic_id.eq.${clinicId}`)
        }

        if (status) {
            query = query.eq('status', status)
        }

        const { data: transfers, error } = await query.limit(50)

        if (error) {
            console.error('Transfers error:', error)
            return NextResponse.json({ error: 'Erro ao buscar transferências' }, { status: 500 })
        }

        return NextResponse.json({ transfers })
    } catch (error) {
        console.error('Transfers error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create transfer/referral
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const body = await request.json()
        const {
            patient_id,
            to_clinic_id,
            transfer_type = 'REFERRAL',
            reason,
            notes,
            specialty,
            urgency = 'normal'
        } = body

        if (!patient_id || !to_clinic_id) {
            return NextResponse.json({
                error: 'patient_id e to_clinic_id são obrigatórios'
            }, { status: 400 })
        }

        // Verify patient belongs to source clinic
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('id', patient_id)
            .eq('clinic_id', clinicId)
            .single()

        if (!patient) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 })
        }

        // Create transfer
        const { data: transfer, error } = await supabase
            .from('inter_clinic_transfers')
            .insert({
                patient_id,
                from_clinic_id: clinicId,
                to_clinic_id,
                transfer_type,
                reason,
                notes,
                specialty,
                urgency,
                created_by: user.id
            })
            .select(`
        *,
        to_clinic:clinics!to_clinic_id(id, name)
      `)
            .single()

        if (error) {
            console.error('Create transfer error:', error)
            return NextResponse.json({ error: 'Erro ao criar transferência' }, { status: 500 })
        }

        // If shared_patients is enabled in group, auto-share
        const { data: fromClinic } = await supabase
            .from('clinics')
            .select('group_id')
            .eq('id', clinicId)
            .single()

        const { data: toClinic } = await supabase
            .from('clinics')
            .select('group_id')
            .eq('id', to_clinic_id)
            .single()

        if ((fromClinic as any)?.group_id && (fromClinic as any)?.group_id === (toClinic as any)?.group_id) {
            const { data: group } = await supabase
                .from('clinic_groups')
                .select('shared_patients')
                .eq('id', (fromClinic as any).group_id)
                .single()

            if ((group as any)?.shared_patients) {
                // Auto-share patient with target clinic
                await supabase.from('shared_patients').upsert({
                    patient_id,
                    source_clinic_id: clinicId,
                    target_clinic_id: to_clinic_id,
                    access_level: 'READ',
                    shared_by: user.id
                }, { onConflict: 'patient_id,target_clinic_id' })
            }
        }

        return NextResponse.json({ transfer })
    } catch (error) {
        console.error('Create transfer error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// PATCH: Update transfer status
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { id, action, response_notes } = body

        if (!id || !action) {
            return NextResponse.json({ error: 'ID e action são obrigatórios' }, { status: 400 })
        }

        let updates: any = {
            responded_at: new Date().toISOString(),
            response_notes
        }

        switch (action) {
            case 'accept':
                updates.status = 'ACCEPTED'
                break
            case 'reject':
                updates.status = 'REJECTED'
                break
            case 'complete':
                updates.status = 'COMPLETED'
                break
            default:
                return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
        }

        const { data: transfer, error } = await supabase
            .from('inter_clinic_transfers')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Update transfer error:', error)
            return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
        }

        return NextResponse.json({ transfer })
    } catch (error) {
        console.error('Update transfer error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
