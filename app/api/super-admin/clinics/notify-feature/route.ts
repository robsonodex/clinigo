// @ts-nocheck
/**
 * API: Broadcast new feature notification to ALL clinics
 * POST /api/super-admin/clinics/notify-feature
 * 
 * Body: { title: string, message: string, targetPlans?: string[] }
 * - title: Notification title
 * - message: Feature announcement message
 * - targetPlans: Optional filter - only notify clinics on these plans (e.g. ['PRO', 'ENTERPRISE'])
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, ForbiddenError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAILS = ['robsonfenriz@gmail.com', 'contato@gmail.com']

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

        if (userData?.role !== 'SUPER_ADMIN' && !SUPER_ADMIN_EMAILS.includes(userData?.email || '')) {
            throw new ForbiddenError('Super admin only')
        }

        const { title, message, targetPlans } = await request.json()

        if (!title?.trim() || !message?.trim()) {
            return new Response(JSON.stringify({ error: 'Título e mensagem são obrigatórios' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Get all clinics (optionally filtered by plan)
        let clinicQuery = supabaseAdmin
            .from('clinics')
            .select('id, name, plan_type')
            .eq('is_active', true)

        if (targetPlans && targetPlans.length > 0) {
            clinicQuery = clinicQuery.in('plan_type', targetPlans)
        }

        const { data: clinics, error: clinicsError } = await clinicQuery

        if (clinicsError || !clinics || clinics.length === 0) {
            return new Response(JSON.stringify({ error: 'Nenhuma clínica ativa encontrada' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Get all users from these clinics
        const clinicIds = clinics.map((c: any) => c.id)
        const { data: allUsers, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id, clinic_id')
            .in('clinic_id', clinicIds)

        if (usersError || !allUsers || allUsers.length === 0) {
            return new Response(JSON.stringify({ error: 'Nenhum usuário encontrado nas clínicas' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            })
        }

        // Create notifications for all users
        const notifications = allUsers.map((u: any) => ({
            user_id: u.id,
            clinic_id: u.clinic_id,
            title: title.trim(),
            message: message.trim(),
            type: 'feature_announcement',
            read: false,
            metadata: {
                sent_by: userData?.email,
                announcement_type: 'new_feature',
                target_plans: targetPlans || 'all',
                total_clinics: clinics.length,
            },
        }))

        // Insert in batches of 500 to avoid payload limits
        const BATCH_SIZE = 500
        let totalInserted = 0
        for (let i = 0; i < notifications.length; i += BATCH_SIZE) {
            const batch = notifications.slice(i, i + BATCH_SIZE)
            const { error: insertError } = await supabaseAdmin
                .from('notifications')
                .insert(batch)

            if (insertError) {
                console.error(`Error inserting notification batch ${i}:`, insertError)
                // Continue with other batches
            } else {
                totalInserted += batch.length
            }
        }

        // Log the action
        try {
            await supabaseAdmin.from('system_logs').insert({
                admin_email: userData?.email,
                action_type: 'FEATURE_ANNOUNCEMENT',
                action_category: 'NOTIFICATION',
                action_description: `Enviou anúncio de feature "${title.trim()}" para ${clinics.length} clínica(s) / ${totalInserted} usuário(s)`,
                target_clinic: `ALL (${clinics.length} clínicas)`,
                ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                request_path: '/api/super-admin/clinics/notify-feature',
            })
        } catch {
            // Log table might not exist
        }

        return successResponse({
            success: true,
            notifiedClinics: clinics.length,
            notifiedUsers: totalInserted,
            message: `✅ Notificação enviada para ${clinics.length} clínica(s) e ${totalInserted} usuário(s)`,
        })
    } catch (error) {
        return handleApiError(error)
    }
}
