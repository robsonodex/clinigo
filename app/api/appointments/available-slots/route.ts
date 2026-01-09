/**
 * GET /api/appointments/available-slots
 * PUBLIC endpoint - Get available time slots for a doctor on a specific date
 */
import { type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { handleApiError, BadRequestError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'
import { availableSlotsQuerySchema } from '@/lib/validations/appointment'
import { isDateInPast, isToday, isSlotAvailableToday, parseDate } from '@/lib/utils/date'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)

        const query = availableSlotsQuerySchema.parse({
            doctor_id: searchParams.get('doctor_id'),
            date: searchParams.get('date'),
        })

        // Validate date is not in the past
        // Use parseDate to ensure local time is used (avoiding UTC timezone issues)
        const requestedDate = parseDate(query.date)
        if (isDateInPast(requestedDate)) {
            throw new BadRequestError('Data não pode ser no passado')
        }

        const supabase = createServiceRoleClient() as any

        // Verify doctor exists
        const { data: doctor, error: doctorError } = await supabase
            .from('doctors')
            .select('id, is_accepting_appointments, clinic_id')
            .eq('id', query.doctor_id)
            .single()

        if (doctorError || !doctor) {
            throw new BadRequestError('Médico não encontrado')
        }

        if (!doctor.is_accepting_appointments) {
            return successResponse({
                date: query.date,
                doctor_id: query.doctor_id,
                available_slots: [],
                message: 'Médico não está aceitando agendamentos',
            })
        }

        // Get all available slots using database function
        const { data: slots, error: slotsError } = await supabase
            .rpc('get_available_slots', {
                p_doctor_id: query.doctor_id,
                p_date: query.date,
            })

        if (slotsError) throw slotsError

        // Filter slots if today (remove slots that are too close)
        let availableSlots = slots || []

        if (isToday(requestedDate)) {
            availableSlots = availableSlots.filter((slot: { slot_time: string }) =>
                isSlotAvailableToday(slot.slot_time)
            )
        }

        // Format response
        const formattedSlots = availableSlots.map((slot: { slot_time: string; slot_end_time: string }) => ({
            time: slot.slot_time.substring(0, 5), // HH:MM format
            end_time: slot.slot_end_time.substring(0, 5),
            available: true,
        }))

        return successResponse({
            date: query.date,
            doctor_id: query.doctor_id,
            available_slots: formattedSlots,
            total_available: formattedSlots.length,
        })
    } catch (error) {
        return handleApiError(error)
    }
}

