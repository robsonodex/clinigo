import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // Buscar clinic_id do usuário logado
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

        if (!clinicId && userData?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        let query = supabase
            .from('patients')
            .select('id, full_name, date_of_birth, phone, email, clinic_id')
            .not('date_of_birth', 'is', null)
            .is('deleted_at', null)
            .eq('is_active', true)

        if (clinicId) {
            query = query.eq('clinic_id', clinicId)
        }

        const { data: patients, error } = await query

        if (error) {
            console.error('[BIRTHDAYS-API] Erro ao buscar pacientes:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1
        const currentDay = now.getDate()
        const startOfToday = new Date(currentYear, now.getMonth(), currentDay).getTime()

        const processed = (patients || [])
            .map((p) => {
                if (!p.date_of_birth) return null

                // Formato YYYY-MM-DD
                const parts = String(p.date_of_birth).split('-')
                if (parts.length < 3) return null

                const birthYear = parseInt(parts[0], 10)
                const birthMonth = parseInt(parts[1], 10)
                const birthDay = parseInt(parts[2], 10)

                if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return null

                const isToday = birthMonth === currentMonth && birthDay === currentDay

                let nextBirthday = new Date(currentYear, birthMonth - 1, birthDay)
                if (nextBirthday.getTime() < startOfToday && !isToday) {
                    nextBirthday = new Date(currentYear + 1, birthMonth - 1, birthDay)
                }

                const diffTime = nextBirthday.getTime() - startOfToday
                const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24))
                const turningAge = currentYear - birthYear

                return {
                    id: p.id,
                    full_name: p.full_name,
                    date_of_birth: p.date_of_birth,
                    phone: p.phone,
                    email: p.email,
                    birth_day: birthDay,
                    birth_month: birthMonth,
                    is_today: isToday,
                    days_until: isToday ? 0 : daysUntil,
                    turning_age: turningAge > 0 ? turningAge : 0,
                }
            })
            .filter(Boolean) as any[]

        // Aniversariantes de Hoje
        const todayBirthdays = processed
            .filter((p) => p.is_today)
            .sort((a, b) => a.full_name.localeCompare(b.full_name))

        // Próximos da Semana / 30 dias
        const upcomingBirthdays = processed
            .filter((p) => !p.is_today && p.days_until >= 0 && p.days_until <= 30)
            .sort((a, b) => a.days_until - b.days_until)

        // Todos deste mês
        const thisMonthBirthdays = processed
            .filter((p) => p.birth_month === currentMonth)
            .sort((a, b) => a.birth_day - b.birth_day)

        return NextResponse.json({
            success: true,
            today: todayBirthdays,
            upcoming: upcomingBirthdays,
            this_month: thisMonthBirthdays,
            total_today: todayBirthdays.length,
        })
    } catch (err: any) {
        console.error('[BIRTHDAYS-API] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro ao buscar aniversariantes' }, { status: 500 })
    }
}
