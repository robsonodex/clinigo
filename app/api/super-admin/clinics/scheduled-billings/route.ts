// @ts-nocheck
/**
 * API: Manage scheduled billings for clinics
 * POST /api/super-admin/clinics/scheduled-billings
 * GET /api/super-admin/clinics/scheduled-billings
 * PATCH /api/super-admin/clinics/scheduled-billings
 * DELETE /api/super-admin/clinics/scheduled-billings
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// Middleware de autenticação Super Admin
async function verifySuperAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new ForbiddenError('Not authenticated')

    const { data: userData } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', user.id)
        .single()

    if (userData?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenError('Super admin only')
    }

    return userData
}

// GET: Listar agendamentos (opcionalmente filtrando por clinic_id)
export async function GET(request: NextRequest) {
    try {
        await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()

        const { searchParams } = new URL(request.url)
        const clinicId = searchParams.get('clinicId')

        let query = supabaseAdmin
            .from('scheduled_billings')
            .select('*')
            .order('scheduled_for', { ascending: true })

        if (clinicId) {
            query = query.eq('clinic_id', clinicId)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching scheduled billings:', error)
            return new Response(JSON.stringify({ error: 'Erro ao buscar agendamentos' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        return successResponse(data)
    } catch (error) {
        return handleApiError(error)
    }
}

// POST: Criar novos agendamentos para datas e horários específicos
export async function POST(request: NextRequest) {
    try {
        const adminUser = await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()

        const { clinicId, clinicName, title, message, dates, times } = await request.json()

        if (!clinicId || !clinicName || !title || !message || !dates || !times) {
            throw new BadRequestError('Todos os campos (clinicId, clinicName, title, message, dates, times) são obrigatórios')
        }

        const insertData = []

        // Para cada data e horário selecionado, cria um agendamento individual
        for (const date of dates) {
            for (const time of times) {
                // Montar o ISO string considerando o fuso horário de Brasília (UTC-3)
                // Ex: date = '2026-06-15', time = '09:00' -> '2026-06-15T09:00:00-03:00'
                const scheduledFor = `${date}T${time}:00-03:00`

                insertData.push({
                    clinic_id: clinicId,
                    clinic_name: clinicName,
                    title: title.trim(),
                    message: message.trim(),
                    scheduled_for: scheduledFor,
                    status: 'pending'
                })
            }
        }

        const { data, error } = await supabaseAdmin
            .from('scheduled_billings')
            .insert(insertData)
            .select()

        if (error) {
            console.error('Error creating scheduled billings:', error)
            return new Response(JSON.stringify({ error: 'Erro ao salvar agendamentos' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        return successResponse({
            success: true,
            createdCount: insertData.length,
            data
        })
    } catch (error) {
        return handleApiError(error)
    }
}

// PATCH: Atualizar status do agendamento (pausar, retomar ou cancelar)
export async function PATCH(request: NextRequest) {
    try {
        await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()

        const { id, status } = await request.json()

        if (!id || !status) {
            throw new BadRequestError('id e status são obrigatórios')
        }

        if (!['pending', 'paused', 'cancelled'].includes(status)) {
            throw new BadRequestError('Status inválido. Use pending, paused ou cancelled')
        }

        const { data, error } = await supabaseAdmin
            .from('scheduled_billings')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('Error updating scheduled billing:', error)
            return new Response(JSON.stringify({ error: 'Erro ao atualizar agendamento' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        return successResponse(data)
    } catch (error) {
        return handleApiError(error)
    }
}

// DELETE: Excluir um agendamento
export async function DELETE(request: NextRequest) {
    try {
        await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            throw new BadRequestError('id é obrigatório')
        }

        const { error } = await supabaseAdmin
            .from('scheduled_billings')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting scheduled billing:', error)
            return new Response(JSON.stringify({ error: 'Erro ao excluir agendamento' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        return successResponse({ success: true, message: 'Agendamento excluído com sucesso' })
    } catch (error) {
        return handleApiError(error)
    }
}
