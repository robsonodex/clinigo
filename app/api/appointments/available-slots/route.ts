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

        const daysToFetch = parseInt(searchParams.get('days') || '1')
        // Limit max days to 7 to prevent abuse
        const validatedDays = Math.min(Math.max(daysToFetch, 1), 7)

        // Validate start date
        const startDate = parseDate(query.date)
        if (isDateInPast(startDate)) {
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

        // Generate response for multiple days
        const responseData = []

        for (let i = 0; i < validatedDays; i++) {
            const currentDate = new Date(startDate)
            currentDate.setDate(startDate.getDate() + i)
            const dateStr = currentDate.toISOString().split('T')[0]

            // Get available slots for this date
            const { data: slots, error: slotsError } = await supabase
                .rpc('get_available_slots', {
                    p_doctor_id: query.doctor_id,
                    p_date: dateStr,
                })

            if (slotsError) {
                console.error(`Error fetching slots for ${dateStr}:`, slotsError)
                continue
            }

            let availableSlots = slots || []

            // Filter if today
            if (isToday(currentDate)) {
                availableSlots = availableSlots.filter((slot: { slot_time: string }) =>
                    isSlotAvailableToday(slot.slot_time)
                )
            }

            // Format slots
            const formattedSlots = availableSlots.map((slot: { slot_time: string; slot_end_time: string }) => ({
                time: slot.slot_time.substring(0, 5),
                end_time: slot.slot_end_time.substring(0, 5),
                available: true,
            }))

            responseData.push({
                date: dateStr,
                slots: formattedSlots
            })
        }

        // If requesting single day (legacy compatibility), return old format
        if (validatedDays === 1) {
            return successResponse({
                date: responseData[0].date,
                doctor_id: query.doctor_id,
                available_slots: responseData[0].slots,
                total_available: responseData[0].slots.length,
            })
        }

        // New format for multi-day
        return successResponse({
            doctor_id: query.doctor_id,
            start_date: query.date,
            days: responseData,
            total_days: responseData.length
        })
    } catch (error) {
        return handleApiError(error)
    }
}

