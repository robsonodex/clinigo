/**
 * PATCH /api/appointments/[appointmentId]/video-link
 * Generates or regenerates video link for an appointment
 */
import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, ForbiddenError, NotFoundError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { generateVideoRoomUrl } from '@/lib/utils/video'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ appointmentId: string }> }
) {
    try {
        const { appointmentId } = await params
        const userId = request.headers.get('x-user-id')
        const userRole = request.headers.get('x-user-role')
        const clinicId = request.headers.get('x-clinic-id')

        if (!userId) {
            throw new ForbiddenError('Não autorizado')
        }

        // Only staff can generate video links
        if (!['CLINIC_ADMIN', 'SUPER_ADMIN', 'DOCTOR', 'RECEPTIONIST'].includes(userRole || '')) {
            throw new ForbiddenError('Sem permissão para gerar link de vídeo')
        }

        const supabase = createServiceRoleClient() as any

        // Get appointment
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select('id, clinic_id, status')
            .eq('id', appointmentId)
            .single()

        if (appointmentError || !appointment) {
            throw new NotFoundError('Agendamento')
        }

        // Verify clinic access (except super admin)
        if (userRole !== 'SUPER_ADMIN' && appointment.clinic_id !== clinicId) {
            throw new ForbiddenError('Sem permissão para este agendamento')
        }

        // Generate video link
        const videoLink = generateVideoRoomUrl(appointmentId)

        // Update appointment with video link
        const { error: updateError } = await supabase
            .from('appointments')
            .update({ video_link: videoLink })
            .eq('id', appointmentId)

        if (updateError) throw updateError

        console.log('[VideoLink] Generated for appointment:', appointmentId, videoLink)

        return successResponse({
            success: true,
            video_link: videoLink,
            message: 'Link de vídeo gerado com sucesso!',
        })
    } catch (error) {
        return handleApiError(error)
    }
}
