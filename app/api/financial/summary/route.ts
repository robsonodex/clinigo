import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Financial summary and reports
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
        const reportType = searchParams.get('type') || 'summary'
        const startDate = searchParams.get('start_date') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
        const endDate = searchParams.get('end_date') || new Date().toISOString().split('T')[0]
        const accountId = searchParams.get('account_id')

        switch (reportType) {
            case 'summary':
                return await getFinancialSummary(supabase, clinicId, startDate, endDate)

            case 'cash_flow':
                return await getCashFlow(supabase, clinicId, startDate, endDate, accountId)

            case 'expenses_by_category':
                return await getExpensesByCategory(supabase, clinicId, startDate, endDate)

            case 'income_by_category':
                return await getIncomeByCategory(supabase, clinicId, startDate, endDate)

            case 'dre':
                return await getDRE(supabase, clinicId, startDate, endDate)

            default:
                return NextResponse.json({ error: 'Tipo de relatório inválido' }, { status: 400 })
        }
    } catch (error) {
        console.error('Financial summary error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

async function getFinancialSummary(supabase: any, clinicId: string, startDate: string, endDate: string) {
    // Try database function first
    const { data, error } = await supabase.rpc('get_financial_summary', {
        p_clinic_id: clinicId,
        p_start_date: startDate,
        p_end_date: endDate
    })

    if (!error && data?.[0]) {
        return NextResponse.json({ summary: data[0] })
    }

    // Fallback to manual calculation
    const { data: entries } = await supabase
        .from('financial_entries')
        .select('entry_type, status, amount, amount_paid, discount')
        .eq('clinic_id', clinicId)
        .gte('due_date', startDate)
        .lte('due_date', endDate)

    const summary = {
        total_income: 0,
        total_expense: 0,
        net_result: 0,
        pending_income: 0,
        pending_expense: 0,
        overdue_income: 0,
        overdue_expense: 0
    }

    for (const entry of entries || []) {
        const isIncome = entry.entry_type === 'INCOME'
        const netAmount = entry.amount - (entry.discount || 0)

        if (entry.status === 'PAID') {
            if (isIncome) summary.total_income += entry.amount_paid
            else summary.total_expense += entry.amount_paid
        } else if (entry.status === 'PENDING') {
            if (isIncome) summary.pending_income += netAmount
            else summary.pending_expense += netAmount
        } else if (entry.status === 'OVERDUE') {
            if (isIncome) summary.overdue_income += netAmount
            else summary.overdue_expense += netAmount
        }
    }

    summary.net_result = summary.total_income - summary.total_expense

    return NextResponse.json({ summary })
}

async function getCashFlow(supabase: any, clinicId: string, startDate: string, endDate: string, accountId: string | null) {
    // Try database function
    const { data, error } = await supabase.rpc('get_cash_flow', {
        p_clinic_id: clinicId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_account_id: accountId
    })

    if (!error && data) {
        return NextResponse.json({ cashFlow: data })
    }

    // Fallback
    let query = supabase
        .from('financial_entries')
        .select('entry_type, status, amount_paid, paid_date')
        .eq('clinic_id', clinicId)
        .eq('status', 'PAID')
        .gte('paid_date', startDate)
        .lte('paid_date', endDate)
        .order('paid_date')

    if (accountId) query = query.eq('account_id', accountId)

    const { data: entries } = await query

    const grouped: Record<string, { income: number; expense: number }> = {}

    for (const entry of entries || []) {
        const day = entry.paid_date
        if (!grouped[day]) grouped[day] = { income: 0, expense: 0 }

        if (entry.entry_type === 'INCOME') {
            grouped[day].income += entry.amount_paid
        } else {
            grouped[day].expense += entry.amount_paid
        }
    }

    let runningBalance = 0
    const cashFlow = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([period, { income, expense }]) => {
            runningBalance += income - expense
            return {
                period,
                total_income: income,
                total_expense: expense,
                net_flow: income - expense,
                running_balance: runningBalance
            }
        })

    return NextResponse.json({ cashFlow })
}

async function getExpensesByCategory(supabase: any, clinicId: string, startDate: string, endDate: string) {
    const { data, error } = await supabase.rpc('get_expenses_by_category', {
        p_clinic_id: clinicId,
        p_start_date: startDate,
        p_end_date: endDate
    })

    if (!error && data) {
        return NextResponse.json({ categories: data })
    }

    // Fallback
    const { data: entries } = await supabase
        .from('financial_entries')
        .select(`
      amount_paid,
      category:financial_categories(id, name, color)
    `)
        .eq('clinic_id', clinicId)
        .eq('entry_type', 'EXPENSE')
        .eq('status', 'PAID')
        .gte('paid_date', startDate)
        .lte('paid_date', endDate)

    const grouped: Record<string, { name: string; color: string; amount: number }> = {}
    let total = 0

    for (const entry of entries || []) {
        const cat = entry.category || { id: 'other', name: 'Sem categoria', color: '#6B7280' }
        const key = cat.id || 'other'

        if (!grouped[key]) {
            grouped[key] = { name: cat.name, color: cat.color, amount: 0 }
        }
        grouped[key].amount += entry.amount_paid
        total += entry.amount_paid
    }

    const categories = Object.entries(grouped).map(([id, data]) => ({
        category_id: id,
        category_name: data.name,
        category_color: data.color,
        total_amount: data.amount,
        percentage: total > 0 ? ((data.amount / total) * 100).toFixed(2) : 0
    })).sort((a, b) => b.total_amount - a.total_amount)

    return NextResponse.json({ categories })
}

async function getIncomeByCategory(supabase: any, clinicId: string, startDate: string, endDate: string) {
    const { data: entries } = await supabase
        .from('financial_entries')
        .select(`
      amount_paid,
      category:financial_categories(id, name, color)
    `)
        .eq('clinic_id', clinicId)
        .eq('entry_type', 'INCOME')
        .eq('status', 'PAID')
        .gte('paid_date', startDate)
        .lte('paid_date', endDate)

    const grouped: Record<string, { name: string; color: string; amount: number }> = {}
    let total = 0

    for (const entry of entries || []) {
        const cat = entry.category || { id: 'other', name: 'Sem categoria', color: '#6B7280' }
        const key = cat.id || 'other'

        if (!grouped[key]) {
            grouped[key] = { name: cat.name, color: cat.color, amount: 0 }
        }
        grouped[key].amount += entry.amount_paid
        total += entry.amount_paid
    }

    const categories = Object.entries(grouped).map(([id, data]) => ({
        category_id: id,
        category_name: data.name,
        category_color: data.color,
        total_amount: data.amount,
        percentage: total > 0 ? ((data.amount / total) * 100).toFixed(2) : 0
    })).sort((a, b) => b.total_amount - a.total_amount)

    return NextResponse.json({ categories })
}

async function getDRE(supabase: any, clinicId: string, startDate: string, endDate: string) {
    // Get income and expenses grouped by category
    const { data: entries } = await supabase
        .from('financial_entries')
        .select(`
      entry_type,
      amount_paid,
      category:financial_categories(id, name)
    `)
        .eq('clinic_id', clinicId)
        .eq('status', 'PAID')
        .gte('paid_date', startDate)
        .lte('paid_date', endDate)

    const income: Record<string, number> = {}
    const expenses: Record<string, number> = {}
    let totalIncome = 0
    let totalExpenses = 0

    for (const entry of entries || []) {
        const catName = entry.category?.name || 'Outros'

        if (entry.entry_type === 'INCOME') {
            income[catName] = (income[catName] || 0) + entry.amount_paid
            totalIncome += entry.amount_paid
        } else {
            expenses[catName] = (expenses[catName] || 0) + entry.amount_paid
            totalExpenses += entry.amount_paid
        }
    }

    return NextResponse.json({
        dre: {
            period: { start: startDate, end: endDate },
            income: Object.entries(income).map(([name, value]) => ({ name, value })),
            expenses: Object.entries(expenses).map(([name, value]) => ({ name, value })),
            total_income: totalIncome,
            total_expenses: totalExpenses,
            gross_profit: totalIncome - totalExpenses,
            margin: totalIncome > 0 ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(2) : 0
        }
    })
}
