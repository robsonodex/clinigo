import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { computeSupervisionRadar } from '@/lib/session-plans/supervision-radar'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: profile } = (await supabase
            .from('users')
            .select('clinic_id, role, is_coordinator')
            .eq('id', user.id)
            .maybeSingle()) as {
            data: { clinic_id: string | null; role: string | null; is_coordinator?: boolean | null } | null
        }

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 403 })
        }

        const role = (profile.role || '').toUpperCase()
        if (role === 'RECEPTIONIST' || role === 'FINANCIAL' || role === 'READONLY') {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const rawDays = Number(searchParams.get('days') || 60)
        const windowDays = [30, 60, 90].includes(rawDays) ? rawDays : 60
        const cutoffIso = new Date(Date.now() - windowDays * 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]

        const serviceClient = createServiceRoleClient() as any

        let query = serviceClient
            .from('planos_sessao')
            .select(
                'id, paciente_id, profissional_id, especialidade, data_sessao, registro_desempenho, grafico_indicadores, status, patients:paciente_id(full_name), users:profissional_id(full_name)'
            )
            .eq('clinica_id', profile.clinic_id)
            .gte('data_sessao', cutoffIso)
            .order('data_sessao', { ascending: true })
            .limit(600)

        // Terapeuta não-coordenador visualiza apenas suas próprias sessões
        if (role === 'DOCTOR' && !profile.is_coordinator) {
            query = query.eq('profissional_id', user.id)
        }

        const { data: rows, error } = await query
        if (error) {
            throw error
        }

        const normalized = (Array.isArray(rows) ? rows : []).map((r: any) => {
            const p = Array.isArray(r.patients) ? r.patients[0] : r.patients
            const u = Array.isArray(r.users) ? r.users[0] : r.users
            return {
                id: r.id,
                paciente_id: r.paciente_id,
                patient_name: p?.full_name || 'Paciente',
                profissional_id: r.profissional_id || null,
                professional_name: u?.full_name || 'Profissional',
                especialidade: r.especialidade,
                data_sessao: r.data_sessao,
                registro_desempenho: r.registro_desempenho,
                grafico_indicadores: r.grafico_indicadores,
                status: r.status,
            }
        })

        const report = computeSupervisionRadar(normalized, windowDays)

        return NextResponse.json({
            success: true,
            data: report,
        })
    } catch (error) {
        console.error('[SUPERVISION-RADAR] Erro:', error)
        return NextResponse.json(
            { error: 'Não foi possível carregar o radar de supervisão clínica.' },
            { status: 500 }
        )
    }
}

