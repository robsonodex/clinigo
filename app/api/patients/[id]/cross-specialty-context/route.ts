import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const SPECIALTY_LABELS: Record<string, string> = {
    intervencao_precoce_aba: 'ABA / Intervenção Precoce',
    psicologia: 'Psicologia',
    fonoaudiologia: 'Fonoaudiologia',
    terapia_ocupacional: 'Terapia Ocupacional',
    fisioterapia: 'Fisioterapia',
    psicomotricidade: 'Psicomotricidade',
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: patientId } = await params
        if (!patientId || !UUID_REGEX.test(patientId)) {
            return NextResponse.json({ error: 'Paciente inválido' }, { status: 404 })
        }

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
            .select('clinic_id, role')
            .eq('id', user.id)
            .maybeSingle()) as { data: { clinic_id: string | null; role: string | null } | null }

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 403 })
        }

        const role = (profile.role || '').toUpperCase()
        if (role === 'RECEPTIONIST' || role === 'FINANCIAL' || role === 'READONLY') {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const excludeSpecialty = searchParams.get('excludeSpecialty') || ''
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]

        const serviceClient = createServiceRoleClient() as any

        const [{ data: plans }, { data: psicoSessions }] = await Promise.all([
            serviceClient
                .from('planos_sessao')
                .select(
                    'id, especialidade, data_sessao, condicao_inicial, analise_clinica, decisao_proxima_sessao, grafico_indicadores, users:profissional_id(full_name)'
                )
                .eq('clinica_id', profile.clinic_id)
                .eq('paciente_id', patientId)
                .gte('data_sessao', sevenDaysAgo)
                .order('data_sessao', { ascending: false })
                .limit(10),
            excludeSpecialty !== 'psicomotricidade'
                ? serviceClient
                      .from('sessoes_psicomotricidade')
                      .select('id, created_at, observacoes_iniciais, conduta_proxima_sessao, users:profissional_id(full_name)')
                      .eq('clinica_id', profile.clinic_id)
                      .eq('paciente_id', patientId)
                      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
                      .order('created_at', { ascending: false })
                      .limit(4)
                : Promise.resolve({ data: [] }),
        ])

        const notes: Array<{
            id: string
            specialty: string
            specialtyLabel: string
            date: string
            professionalName: string
            summary: string
            interferingCount: number
        }> = []

        for (const p of Array.isArray(plans) ? plans : []) {
            if (excludeSpecialty && p.especialidade === excludeSpecialty) continue
            const u = Array.isArray(p.users) ? p.users[0] : p.users
            const condObs = p.condicao_inicial?.observacoes || ''
            const condStates = Array.isArray(p.condicao_inicial?.estados_gerais)
                ? p.condicao_inicial.estados_gerais.slice(0, 2).join(', ')
                : ''
            const nextGoal = p.decisao_proxima_sessao?.proxima_meta || ''
            const limitador = p.analise_clinica?.limitador_principal || ''
            const interfering = Number(p.grafico_indicadores?.interferingTotal || 0)

            const summary =
                [condStates, condObs, limitador, nextGoal]
                    .map((s) => String(s || '').trim())
                    .filter(Boolean)
                    .join(' · ')
                    .slice(0, 220) || 'Sessão registrada sem intercorrências relevantes.'

            notes.push({
                id: p.id,
                specialty: p.especialidade,
                specialtyLabel: SPECIALTY_LABELS[p.especialidade] || p.especialidade,
                date: String(p.data_sessao || '').slice(0, 10),
                professionalName: u?.full_name || 'Profissional',
                summary,
                interferingCount: interfering,
            })
        }

        for (const ps of Array.isArray(psicoSessions) ? psicoSessions : []) {
            const u = Array.isArray(ps.users) ? ps.users[0] : ps.users
            const summary =
                [ps.observacoes_iniciais, ps.conduta_proxima_sessao]
                    .map((s) => String(s || '').trim())
                    .filter(Boolean)
                    .join(' · ')
                    .slice(0, 220) || 'Sessão de Psicomotricidade registrada.'

            notes.push({
                id: ps.id,
                specialty: 'psicomotricidade',
                specialtyLabel: 'Psicomotricidade',
                date: String(ps.created_at || '').slice(0, 10),
                professionalName: u?.full_name || 'Profissional',
                summary,
                interferingCount: 0,
            })
        }

        notes.sort((a, b) => b.date.localeCompare(a.date))

        return NextResponse.json({
            success: true,
            notes: notes.slice(0, 5),
        })
    } catch (error) {
        console.error('[CROSS-SPECIALTY-CONTEXT] Erro:', error)
        return NextResponse.json({ success: true, notes: [] })
    }
}

