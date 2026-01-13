/**
 * Video Room URL Generator
 * Generates video conference room URLs for telemedicine appointments
 */

/**
 * Generates a video room URL for an appointment
 * The room ID is based on the appointment ID for easy tracking
 * 
 * @param appointmentId - The unique appointment ID
 * @param clinicSlug - The clinic's slug for the URL
 * @returns The full URL to the video room
 */
export function generateVideoRoomUrl(appointmentId: string, clinicSlug?: string): string {
    // Always use production URL for video links (env may have localhost in dev)
    const baseUrl = 'https://www.clinigo.app'

    // Room ID is the appointment ID itself for simple mapping
    const roomId = appointmentId

    // Generate URL to the video room page
    return `${baseUrl}/video/${roomId}`
}

/**
 * Generates separate URLs for doctor and patient
 * Both use the same room but different entry points for role-based UI
 */
export function generateVideoRoomUrls(appointmentId: string): {
    doctorUrl: string
    patientUrl: string
    roomId: string
} {
    const baseUrl = 'https://www.clinigo.app'
    const roomId = appointmentId

    return {
        doctorUrl: `${baseUrl}/video/${roomId}?role=doctor`,
        patientUrl: `${baseUrl}/video/${roomId}?role=patient`,
        roomId,
    }
}

/**
 * Checks if video link should be generated for an appointment type
 * Only telemedicine appointments need video links
 */
export function shouldGenerateVideoLink(appointmentType?: string): boolean {
    if (!appointmentType) return false

    const videoAppointmentTypes = ['telemedicina', 'teleconsulta', 'online', 'video']
    return videoAppointmentTypes.includes(appointmentType.toLowerCase())
}
