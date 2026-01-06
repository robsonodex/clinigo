import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List TISS guides
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
        const status = searchParams.get('status')
        const operatorId = searchParams.get('operator_id')
        const patientId = searchParams.get('patient_id')
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = (page - 1) * limit

        let query = supabase
            .from('tiss_guides')
            .select(`
        *,
        operator:insurance_operators(id, name, ans_code),
        patient:patients(id, full_name, cpf),
        doctor:doctors(id, users(full_name), crm),
        procedures:tiss_guide_procedures(*)
      `, { count: 'exact' })
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (status) query = query.eq('status', status)
        if (operatorId) query = query.eq('operator_id', operatorId)
        if (patientId) query = query.eq('patient_id', patientId)
        if (startDate) query = query.gte('execution_date', startDate)
        if (endDate) query = query.lte('execution_date', endDate)

        const { data: guides, error, count } = await query

        if (error) {
            console.error('TISS guides error:', error)
            return NextResponse.json({ error: 'Erro ao buscar guias' }, { status: 500 })
        }

        return NextResponse.json({
            guides,
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        })
    } catch (error) {
        console.error('TISS error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create TISS guide
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
            guide_type,
            patient_id,
            patient_insurance_id,
            appointment_id,
            doctor_id,
            execution_date,
            cid_primary,
            cid_secondary = [],
            authorization_number,
            procedures = []
        } = body

        if (!guide_type || !patient_id || !patient_insurance_id) {
            return NextResponse.json({
                error: 'Campos obrigatórios: guide_type, patient_id, patient_insurance_id'
            }, { status: 400 })
        }

        // Get patient insurance info
        const { data: insurance } = await supabase
            .from('patient_insurance')
            .select('*, operator:insurance_operators(*)')
            .eq('id', patient_insurance_id)
            .single()

        if (!insurance) {
            return NextResponse.json({ error: 'Convênio do paciente não encontrado' }, { status: 404 })
        }

        // Get clinic operator info
        const { data: clinicOperator } = await supabase
            .from('clinic_operators')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('operator_id', (insurance as any).operator_id)
            .single()

        // Generate guide number
        const year = new Date().getFullYear()
        const { count: guideCount } = await supabase
            .from('tiss_guides')
            .select('id', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .gte('created_at', `${year}-01-01`)

        const guideNumber = `${year}${String((guideCount || 0) + 1).padStart(6, '0')}`

        // Get doctor info
        let professionalData: any = {}
        if (doctor_id) {
            const { data: doctor } = await supabase
                .from('doctors')
                .select('*, users(full_name)')
                .eq('id', doctor_id)
                .single()

            if (doctor) {
                professionalData = {
                    doctor_id,
                    professional_crm: (doctor as any).crm,
                    professional_name: (doctor as any).users?.full_name,
                    professional_cbo: (doctor as any).cbo_code
                }
            }
        }

        // Create guide
        const { data: guide, error: guideError } = await supabase
            .from('tiss_guides')
            .insert({
                clinic_id: clinicId,
                guide_type,
                guide_number: guideNumber,
                operator_id: (insurance as any).operator_id,
                clinic_operator_id: clinicOperator?.id,
                patient_id,
                patient_insurance_id,
                appointment_id,
                authorization_number,
                execution_date: execution_date || new Date().toISOString().split('T')[0],
                contractor_cnes: clinicOperator?.cnes_code,
                cid_primary,
                cid_secondary,
                ...professionalData,
                created_by: user.id
            })
            .select()
            .single()

        if (guideError) {
            console.error('Create guide error:', guideError)
            return NextResponse.json({ error: 'Erro ao criar guia' }, { status: 500 })
        }

        // Add procedures if provided
        if (procedures.length > 0) {
            const procedureRecords = procedures.map((proc: any) => ({
                guide_id: guide.id,
                procedure_code: proc.code,
                procedure_description: proc.description,
                execution_date: proc.execution_date || execution_date,
                quantity: proc.quantity || 1,
                unit_price: proc.unit_price || 0,
                total_price: (proc.quantity || 1) * (proc.unit_price || 0),
                reduction_factor: proc.reduction_factor || 1
            }))

            await supabase.from('tiss_guide_procedures').insert(procedureRecords)
        }

        // Fetch complete guide
        const { data: completeGuide } = await supabase
            .from('tiss_guides')
            .select(`
        *,
        operator:insurance_operators(id, name),
        patient:patients(id, full_name),
        procedures:tiss_guide_procedures(*)
      `)
            .eq('id', guide.id)
            .single()

        return NextResponse.json({ guide: completeGuide })
    } catch (error) {
        console.error('Create TISS guide error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
