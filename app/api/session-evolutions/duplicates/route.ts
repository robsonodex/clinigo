import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/session-evolutions/duplicates
 * Remove evoluções duplicadas (mantém a mais antiga de cada grupo).
 * 
 * Body: { evolution_ids: string[] }
 *   — IDs específicos para excluir
 * 
 * OU
 * 
 * Body: { auto_clean: true }
 *   — Remove automaticamente duplicatas (mantém a mais antiga de cada grupo doctor+patient+date)
 * 
 * Somente CLINIC_ADMIN ou SUPER_ADMIN podem usar este endpoint.
 */
export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!userData?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        // Apenas admins podem remover duplicatas finalizadas
        if (!['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(userData.role)) {
            return NextResponse.json(
                { error: 'Apenas administradores podem remover evoluções duplicadas.' },
                { status: 403 }
            )
        }

        const body = await request.json()

        if (body.evolution_ids && Array.isArray(body.evolution_ids) && body.evolution_ids.length > 0) {
            // Modo manual: excluir IDs específicos
            // Verificar que todos pertencem à mesma clínica
            const { data: toDelete, error: fetchError } = await supabase
                .from('session_evolutions')
                .select('id')
                .eq('clinic_id', userData.clinic_id)
                .in('id', body.evolution_ids)

            if (fetchError) throw fetchError

            const validIds = (toDelete || []).map((e: any) => e.id)
            if (validIds.length === 0) {
                return NextResponse.json({ error: 'Nenhuma evolução encontrada para os IDs informados' }, { status: 404 })
            }

            const { error: deleteError } = await supabase
                .from('session_evolutions')
                .delete()
                .in('id', validIds)

            if (deleteError) throw deleteError

            return NextResponse.json({
                success: true,
                deleted: validIds.length,
                message: `${validIds.length} evolução(ões) duplicada(s) removida(s) com sucesso.`
            })
        }

        if (body.auto_clean) {
            // Modo automático: detectar e remover duplicatas mantendo a mais antiga
            const { data: evolutions, error: fetchError } = await supabase
                .from('session_evolutions')
                .select('id, doctor_id, patient_id, evolution_date, created_at')
                .eq('clinic_id', userData.clinic_id)
                .order('created_at', { ascending: true })

            if (fetchError) throw fetchError

            // Agrupar por doctor_id + patient_id + evolution_date
            const groups: Record<string, any[]> = {}
            ;(evolutions || []).forEach((evo: any) => {
                if (!evo.doctor_id || !evo.patient_id) return
                const key = `${evo.doctor_id}__${evo.patient_id}__${evo.evolution_date}`
                if (!groups[key]) groups[key] = []
                groups[key].push(evo)
            })

            // Identificar duplicatas (manter a mais antiga = groups[key][0])
            const idsToDelete: string[] = []
            for (const [, items] of Object.entries(groups)) {
                if (items.length > 1) {
                    // Remove tudo exceto o primeiro (mais antigo, pois ordenamos por created_at ASC)
                    for (let i = 1; i < items.length; i++) {
                        idsToDelete.push(items[i].id)
                    }
                }
            }

            if (idsToDelete.length === 0) {
                return NextResponse.json({
                    success: true,
                    deleted: 0,
                    message: 'Nenhuma duplicata encontrada. Tudo limpo!'
                })
            }

            // Deletar em lotes de 50
            let totalDeleted = 0
            for (let i = 0; i < idsToDelete.length; i += 50) {
                const batch = idsToDelete.slice(i, i + 50)
                const { error: deleteError } = await supabase
                    .from('session_evolutions')
                    .delete()
                    .in('id', batch)

                if (deleteError) {
                    console.error('Batch delete error:', deleteError)
                } else {
                    totalDeleted += batch.length
                }
            }

            return NextResponse.json({
                success: true,
                deleted: totalDeleted,
                total_duplicates_found: idsToDelete.length,
                message: `${totalDeleted} evolução(ões) duplicada(s) removida(s) automaticamente. A mais antiga de cada grupo foi preservada.`
            })
        }

        return NextResponse.json(
            { error: 'Informe evolution_ids ou auto_clean: true' },
            { status: 400 }
        )

    } catch (error: any) {
        console.error('DELETE session-evolutions/duplicates error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

/**
 * GET /api/session-evolutions/duplicates
 * Lista todas as evoluções duplicadas da clínica com detalhes para o admin decidir.
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!userData?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        if (!['SUPER_ADMIN', 'CLINIC_ADMIN'].includes(userData.role)) {
            return NextResponse.json({ error: 'Acesso restrito a administradores' }, { status: 403 })
        }

        const { data: evolutions, error } = await supabase
            .from('session_evolutions')
            .select(`
                id, doctor_id, patient_id, evolution_date, created_at, finalized_at,
                patients(full_name),
                doctors(id, users(full_name))
            `)
            .eq('clinic_id', userData.clinic_id)
            .order('created_at', { ascending: true })

        if (error) throw error

        // Agrupar por doctor_id + patient_id + evolution_date
        const groups: Record<string, any[]> = {}
        ;(evolutions || []).forEach((evo: any) => {
            if (!evo.doctor_id || !evo.patient_id) return
            const key = `${evo.doctor_id}__${evo.patient_id}__${evo.evolution_date}`
            if (!groups[key]) groups[key] = []
            groups[key].push(evo)
        })

        const getName = (obj: any) => {
            const o = Array.isArray(obj) ? obj[0] : obj
            return o?.full_name || (o?.users ? (Array.isArray(o.users) ? o.users[0]?.full_name : o.users?.full_name) : 'N/A')
        }

        const duplicates = Object.entries(groups)
            .filter(([, items]) => items.length > 1)
            .map(([key, items]) => {
                const [, , date] = key.split('__')
                return {
                    date,
                    patient_name: getName(items[0]?.patients),
                    doctor_name: getName(items[0]?.doctors),
                    count: items.length,
                    evolutions: items.map((e: any) => ({
                        id: e.id,
                        created_at: e.created_at,
                        finalized_at: e.finalized_at,
                        is_oldest: e === items[0], // primeiro = mais antigo
                    })),
                    // IDs recomendados para exclusão (tudo exceto o mais antigo)
                    ids_to_remove: items.slice(1).map((e: any) => e.id),
                }
            })
            .sort((a, b) => b.date.localeCompare(a.date))

        return NextResponse.json({
            total_groups: duplicates.length,
            total_duplicates_to_remove: duplicates.reduce((sum, d) => sum + d.ids_to_remove.length, 0),
            duplicates,
        })

    } catch (error: any) {
        console.error('GET session-evolutions/duplicates error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
