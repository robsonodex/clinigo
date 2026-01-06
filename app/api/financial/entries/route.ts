import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List financial entries with filters
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
        const type = searchParams.get('type') // 'INCOME' | 'EXPENSE'
        const status = searchParams.get('status')
        const categoryId = searchParams.get('category_id')
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')
        const patientId = searchParams.get('patient_id')
        const doctorId = searchParams.get('doctor_id')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '20')
        const offset = (page - 1) * limit

        let query = supabase
            .from('financial_entries')
            .select(`
        *,
        category:financial_categories(id, name, color),
        patient:patients(id, full_name),
        doctor:doctors(id, users(full_name)),
        account:financial_accounts(id, name)
      `, { count: 'exact' })
            .eq('clinic_id', clinicId)
            .order('due_date', { ascending: false })
            .range(offset, offset + limit - 1)

        if (type) query = query.eq('entry_type', type)
        if (status) query = query.eq('status', status)
        if (categoryId) query = query.eq('category_id', categoryId)
        if (startDate) query = query.gte('due_date', startDate)
        if (endDate) query = query.lte('due_date', endDate)
        if (patientId) query = query.eq('patient_id', patientId)
        if (doctorId) query = query.eq('doctor_id', doctorId)

        const { data: entries, error, count } = await query

        if (error) {
            console.error('Financial entries error:', error)
            return NextResponse.json({ error: 'Erro ao buscar lançamentos' }, { status: 500 })
        }

        return NextResponse.json({
            entries,
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        })
    } catch (error) {
        console.error('Financial error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create financial entry
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
            entry_type,
            category_id,
            description,
            notes,
            amount,
            discount = 0,
            due_date,
            competence_date,
            payment_method,
            account_id,
            patient_id,
            appointment_id,
            doctor_id,
            recurrence = 'NONE',
            recurrence_end_date,
            document_number,
            tags = []
        } = body

        // Validate required fields
        if (!entry_type || !description || !amount || !due_date) {
            return NextResponse.json({
                error: 'Campos obrigatórios: entry_type, description, amount, due_date'
            }, { status: 400 })
        }

        // Create entry
        const { data: entry, error } = await supabase
            .from('financial_entries')
            .insert({
                clinic_id: clinicId,
                entry_type,
                category_id,
                description,
                notes,
                amount,
                discount,
                due_date,
                competence_date: competence_date || due_date,
                payment_method,
                account_id,
                patient_id,
                appointment_id,
                doctor_id,
                recurrence,
                recurrence_end_date,
                document_number,
                tags,
                created_by: user.id
            })
            .select(`
        *,
        category:financial_categories(id, name, color)
      `)
            .single()

        if (error) {
            console.error('Create entry error:', error)
            return NextResponse.json({ error: 'Erro ao criar lançamento' }, { status: 500 })
        }

        // Generate recurring entries if needed
        if (recurrence !== 'NONE' && recurrence_end_date) {
            await generateRecurringEntries(supabase, entry, recurrence, new Date(recurrence_end_date))
        }

        return NextResponse.json({ entry })
    } catch (error) {
        console.error('Financial create error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// Helper: Generate recurring entries
async function generateRecurringEntries(
    supabase: any,
    parentEntry: any,
    recurrence: string,
    endDate: Date
) {
    const entries = []
    let currentDate = new Date(parentEntry.due_date)

    const addInterval = (date: Date, type: string) => {
        const newDate = new Date(date)
        switch (type) {
            case 'DAILY': newDate.setDate(newDate.getDate() + 1); break
            case 'WEEKLY': newDate.setDate(newDate.getDate() + 7); break
            case 'MONTHLY': newDate.setMonth(newDate.getMonth() + 1); break
            case 'YEARLY': newDate.setFullYear(newDate.getFullYear() + 1); break
        }
        return newDate
    }

    currentDate = addInterval(currentDate, recurrence)

    while (currentDate <= endDate) {
        entries.push({
            clinic_id: parentEntry.clinic_id,
            entry_type: parentEntry.entry_type,
            category_id: parentEntry.category_id,
            description: parentEntry.description,
            notes: parentEntry.notes,
            amount: parentEntry.amount,
            discount: parentEntry.discount,
            due_date: currentDate.toISOString().split('T')[0],
            competence_date: currentDate.toISOString().split('T')[0],
            account_id: parentEntry.account_id,
            patient_id: parentEntry.patient_id,
            doctor_id: parentEntry.doctor_id,
            recurrence: 'NONE',
            recurrence_parent_id: parentEntry.id,
            created_by: parentEntry.created_by
        })

        currentDate = addInterval(currentDate, recurrence)

        // Limit to 52 entries (one year of weekly)
        if (entries.length >= 52) break
    }

    if (entries.length > 0) {
        await supabase.from('financial_entries').insert(entries)
    }
}
