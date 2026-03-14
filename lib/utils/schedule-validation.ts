/**
 * Schedule Validation Utility - CliniGo
 * 
 * Validates if a given time falls within a doctor's configured schedule.
 * Also resolves price based on schedule_price_ranges if configured.
 */

import { SupabaseClient } from '@supabase/supabase-js'

interface ScheduleValidationResult {
  valid: boolean
  message: string
  scheduleId?: string
}

interface PriceResolutionResult {
  price: number
  source: 'schedule_price_range' | 'doctor_default'
  label?: string
}

/**
 * Check if a given appointment time falls within a doctor's configured schedule
 */
export async function isWithinSchedule(
  supabase: SupabaseClient,
  doctorId: string,
  date: string,       // YYYY-MM-DD
  time: string,        // HH:MM or HH:MM:SS
  durationMinutes: number = 30
): Promise<ScheduleValidationResult> {
  try {
    // Get day of week (0=Sunday, 6=Saturday)
    const appointmentDate = new Date(date + 'T12:00:00') // Use noon to avoid timezone issues
    const dayOfWeek = appointmentDate.getDay()

    // Normalize time to HH:MM:SS format
    const normalizedTime = time.length === 5 ? `${time}:00` : time

    // Get active schedules for this doctor and day
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select('id, start_time, end_time, slot_duration_minutes')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)

    if (error) {
      console.error('[SCHEDULE_VALIDATION] Error fetching schedules:', error)
      // Don't block if we can't fetch - fail open
      return { valid: true, message: 'Validação de horário indisponível' }
    }

    if (!schedules || schedules.length === 0) {
      return {
        valid: false,
        message: `Profissional não atende neste dia da semana`
      }
    }

    // Check if time falls within any schedule block
    for (const schedule of schedules) {
      const startTime = schedule.start_time.substring(0, 5) // HH:MM
      const endTime = schedule.end_time.substring(0, 5)     // HH:MM
      const appointmentTimeShort = normalizedTime.substring(0, 5)

      if (appointmentTimeShort >= startTime && appointmentTimeShort < endTime) {
        return {
          valid: true,
          message: 'Horário dentro do expediente',
          scheduleId: schedule.id
        }
      }
    }

    // Format schedule info for error message
    const scheduleInfo = schedules
      .map(s => `${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)}`)
      .join(', ')

    return {
      valid: false,
      message: `Horário fora do expediente configurado. Horários disponíveis: ${scheduleInfo}`
    }
  } catch (error) {
    console.error('[SCHEDULE_VALIDATION] Unexpected error:', error)
    // Fail open - don't block appointments on validation errors
    return { valid: true, message: 'Validação de horário indisponível' }
  }
}

/**
 * Resolve the price for a given appointment based on schedule_price_ranges
 * Falls back to doctor's default consultation_price if no range matches
 */
export async function resolveAppointmentPrice(
  supabase: SupabaseClient,
  doctorId: string,
  date: string,      // YYYY-MM-DD
  time: string,       // HH:MM or HH:MM:SS
  defaultPrice: number
): Promise<PriceResolutionResult> {
  try {
    const normalizedTime = time.length === 5 ? `${time}:00` : time
    const appointmentTimeShort = normalizedTime.substring(0, 5)

    // Check schedule_price_ranges for this doctor
    const { data: priceRanges, error } = await supabase
      .from('schedule_price_ranges')
      .select('price, start_time, end_time, label')
      .eq('doctor_id', doctorId)

    if (error || !priceRanges || priceRanges.length === 0) {
      return { price: defaultPrice, source: 'doctor_default' }
    }

    // Find matching time range
    for (const range of priceRanges) {
      const startTime = range.start_time.substring(0, 5)
      const endTime = range.end_time.substring(0, 5)

      if (appointmentTimeShort >= startTime && appointmentTimeShort < endTime) {
        return {
          price: range.price,
          source: 'schedule_price_range',
          label: range.label || undefined
        }
      }
    }

    // No matching range found, use default
    return { price: defaultPrice, source: 'doctor_default' }
  } catch (error) {
    console.error('[PRICE_RESOLUTION] Unexpected error:', error)
    return { price: defaultPrice, source: 'doctor_default' }
  }
}
