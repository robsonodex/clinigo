// @ts-nocheck
/**
 * API: Send billing notification to a clinic
 * POST /api/super-admin/clinics/send-billing
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, ForbiddenError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const supabaseAdmin = createServiceRoleClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new ForbiddenError('Not authenticated')

        // Verificar se é super admin
        const { data: userData } = await supabase
            .from('users')
            .select('role, email')
            .eq('id', user.id)
            .single()

        if (userData?.role !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Super admin only')
        }

        const { clinicId, clinicName, dueDate } = await request.json()

        if (!clinicId || !clinicName) {
            return new Response(JSON.stringify({ error: 'clinicId and clinicName are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Format date for message
        const formattedDate = dueDate
            ? new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
              })
            : 'em breve'

        // Get the clinic admin user(s) to notify
        const { data: clinicUsers } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('clinic_id', clinicId)
            .eq('role', 'CLINIC_ADMIN')

        if (!clinicUsers || clinicUsers.length === 0) {
            return new Response(JSON.stringify({ error: 'Nenhum administrador encontrado para esta clínica' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Create notification message - professional and discreet
        const title = 'Aviso de Faturamento: CliniGo'
        const message = `A mensalidade do plano ${clinicName} vence em ${formattedDate}. Por favor, regularize o pagamento para manter seu acesso ativo.\n\nSuporte: suporte@clinigo.app`

        // Insert notification for each clinic admin
        const notifications = clinicUsers.map((u: any) => ({
            user_id: u.id,
            clinic_id: clinicId,
            title,
            message,
            type: 'billing_reminder',
            read: false,
            metadata: {
                sent_by: userData.email,
                due_date: dueDate || null,
                clinic_name: clinicName,
            },
        }))

        const { error: insertError } = await supabaseAdmin
            .from('notifications')
            .insert(notifications)

        if (insertError) {
            console.error('Error inserting notifications:', insertError)
            return new Response(JSON.stringify({ error: 'Erro ao enviar notificação' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Log the action
        try {
            await supabaseAdmin.from('system_logs').insert({
                admin_email: userData.email,
                action_type: 'BILLING_NOTIFICATION',
                action_category: 'BILLING',
                action_description: `Enviou lembrete de cobrança para ${clinicName}`,
                target_clinic: clinicName,
                ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                request_path: '/api/super-admin/clinics/send-billing',
            })
        } catch {
            // Log table might not exist
        }

        return successResponse({
            success: true,
            notifiedUsers: clinicUsers.length,
            message: `Notificação de cobrança enviada para ${clinicUsers.length} administrador(es) da ${clinicName}`,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
