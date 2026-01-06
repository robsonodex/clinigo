/**
 * Date and Time Utilities for Appointments
 */

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
}

/**
 * Format time to HH:MM
 */
export function formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5)
}

/**
 * Parse date string (YYYY-MM-DD) to Date object
 */
export function parseDate(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export function parseTimeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number)
    return hours * 60 + minutes
}

/**
 * Convert minutes since midnight to HH:MM string
 */
export function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Get day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(date: Date): number {
    return date.getDay()
}

/**
 * Check if a date is in the past
 */
export function isDateInPast(date: Date): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
    const today = new Date()
    return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
    )
}

/**
 * Generate time slots based on schedule
 */
export function generateTimeSlots(
    startTime: string,
    endTime: string,
    durationMinutes: number
): string[] {
    const slots: string[] = []
    const startMinutes = parseTimeToMinutes(startTime)
    const endMinutes = parseTimeToMinutes(endTime)

    for (let time = startMinutes; time + durationMinutes <= endMinutes; time += durationMinutes) {
        slots.push(minutesToTime(time))
    }

    return slots
}

/**
 * Check if a time slot is still available today (considering current time)
 * Requires at least 1 hour advance booking
 */
export function isSlotAvailableToday(timeString: string): boolean {
    const now = new Date()
    const [hours, minutes] = timeString.split(':').map(Number)

    const slotTime = new Date()
    slotTime.setHours(hours, minutes, 0, 0)

    // Slot must be at least 1 hour in the future
    const minBookingTime = new Date()
    minBookingTime.setHours(minBookingTime.getHours() + 1)

    return slotTime > minBookingTime
}

/**
 * Calculate hours until appointment
 */
export function hoursUntilAppointment(date: string, time: string): number {
    const [year, month, day] = date.split('-').map(Number)
    const [hours, minutes] = time.split(':').map(Number)

    const appointmentDate = new Date(year, month - 1, day, hours, minutes)
    const now = new Date()

    return (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)
}

/**
 * Combine date and time strings into a Date object
 */
export function combineDateAndTime(date: string, time: string): Date {
    const [year, month, day] = date.split('-').map(Number)
    const [hours, minutes] = time.split(':').map(Number)

    return new Date(year, month - 1, day, hours, minutes)
}

/**
 * Get appointment end time based on duration
 */
export function getAppointmentEndTime(
    startTime: string,
    durationMinutes: number
): string {
    const startMinutes = parseTimeToMinutes(startTime)
    return minutesToTime(startMinutes + durationMinutes)
}

/**
 * Format date for display (DD/MM/YYYY)
 */
export function formatDateBR(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
}

/**
 * Get date ranges for common periods
 */
export function getDateRanges() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    return {
        today: formatDate(today),
        tomorrow: formatDate(tomorrow),
        weekStart: formatDate(weekStart),
        weekEnd: formatDate(weekEnd),
        monthStart: formatDate(monthStart),
        monthEnd: formatDate(monthEnd),
    }
}
