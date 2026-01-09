import { getRedisClient, CacheKeys, CacheTTL } from './redis-client'
import { createClient } from '@supabase/supabase-js'

export interface TimeSlot {
    time: string
    available: boolean
    appointmentId?: string
}

/**
 * Get cached available slots for a doctor on a specific date
 * Used by patient portal for instant loading
 */
export async function getCachedSlots(
    doctorId: string,
    date: string
): Promise<TimeSlot[]> {
    const redis = getRedisClient()
    const key = CacheKeys.slots(doctorId, date)

    // Try cache first
    const cached = await redis.get<TimeSlot[]>(key)
    if (cached) {
        console.log(`✅ Slots cache HIT for ${doctorId} on ${date}`)
        return cached
    }

    // Cache miss: calculate from database
    const slots = await calculateAvailableSlots(doctorId, date)

    // Cache for 10 minutes
    await redis.set(key, slots, { ex: CacheTTL.slots })
    console.log(`⏳ Slots cache MISS for ${doctorId} on ${date} (now cached)`)

    return slots
}

/**
 * Invalidate slots cache when appointment is created/cancelled
 */
export async function invalidateSlotsCache(
    doctorId: string,
    date: string
): Promise<void> {
    const redis = getRedisClient()
    const key = CacheKeys.slots(doctorId, date)
    await redis.del(key)
    console.log(`🗑️ Slots cache invalidated for ${doctorId} on ${date}`)
}

/**
 * Calculate available slots from database
 */
async function calculateAvailableSlots(
    doctorId: string,
    date: string
): Promise<TimeSlot[]> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get doctor's schedule for this day of week
    const dateObj = new Date(date)
    const dayOfWeek = dateObj.getDay()

    const { data: schedule } = await supabase
        .from('schedules')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .single()

    if (!schedule) {
        return []
    }

    // Get existing appointments for this date
    const { data: appointments } = await supabase
        .from('appointments')
        .select('scheduled_time')
        .eq('doctor_id', doctorId)
        .eq('scheduled_date', date)
        .in('status', ['PENDING', 'CONFIRMED', 'IN_PROGRESS'])

    const bookedTimes = new Set(
        appointments?.map(a => a.scheduled_time) || []
    )

    // Generate time slots
    const slots: TimeSlot[] = []
    const startTime = parseTime(schedule.start_time)
    const endTime = parseTime(schedule.end_time)
    const slotDuration = schedule.slot_duration_minutes || 30

    let currentTime = startTime
    while (currentTime < endTime) {
        const timeString = formatTime(currentTime)
        slots.push({
            time: timeString,
            available: !bookedTimes.has(timeString),
        })
        currentTime += slotDuration
    }

    return slots
}

function parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
}

function formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}
