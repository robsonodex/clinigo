/**
 * Google Meet Integration Service
 * Uses Google Calendar API to create events with Google Meet links
 */
import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar.events']

/**
 * Get OAuth2 client with stored refresh token
 */
function getOAuth2Client() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    )

    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    })

    return oauth2Client
}

export interface GenerateMeetLinkParams {
    appointment_id: string
    doctor_name: string
    patient_name: string
    clinic_name: string
    appointment_date: string // YYYY-MM-DD
    appointment_time: string // HH:MM
    duration_minutes: number
}

export interface MeetLinkResult {
    video_link: string
    meeting_id: string
    calendar_event_id: string
}

/**
 * Generate a Google Meet link by creating a Calendar event
 */
export async function generateMeetLink(
    params: GenerateMeetLinkParams
): Promise<MeetLinkResult> {
    const auth = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth })

    // Parse date and time
    const [year, month, day] = params.appointment_date.split('-').map(Number)
    const [hours, minutes] = params.appointment_time.split(':').map(Number)

    const startTime = new Date(year, month - 1, day, hours, minutes)
    const endTime = new Date(startTime.getTime() + params.duration_minutes * 60 * 1000)

    // Create calendar event with Meet conference
    const event = {
        summary: `Teleconsulta - ${params.doctor_name}`,
        description: `Consulta médica online
    
Médico: ${params.doctor_name}
Paciente: ${params.patient_name}
Clínica: ${params.clinic_name}

ID do Agendamento: ${params.appointment_id}`,
        start: {
            dateTime: startTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
        },
        end: {
            dateTime: endTime.toISOString(),
            timeZone: 'America/Sao_Paulo',
        },
        conferenceData: {
            createRequest: {
                requestId: params.appointment_id,
                conferenceSolutionKey: {
                    type: 'hangoutsMeet',
                },
            },
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 30 },
                { method: 'popup', minutes: 10 },
            ],
        },
    }

    const response = await calendar.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        requestBody: event,
    })

    const meetLink = response.data.hangoutLink
    const conferenceId = response.data.conferenceData?.conferenceId

    if (!meetLink) {
        throw new Error('Failed to generate Google Meet link')
    }

    return {
        video_link: meetLink,
        meeting_id: conferenceId || '',
        calendar_event_id: response.data.id || '',
    }
}

/**
 * Delete a calendar event (used when appointment is cancelled)
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
    const auth = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.events.delete({
        calendarId: 'primary',
        eventId,
    })
}

/**
 * Update a calendar event (used when appointment is rescheduled)
 */
export async function updateCalendarEvent(
    eventId: string,
    newDate: string,
    newTime: string,
    durationMinutes: number
): Promise<void> {
    const auth = getOAuth2Client()
    const calendar = google.calendar({ version: 'v3', auth })

    const [year, month, day] = newDate.split('-').map(Number)
    const [hours, minutes] = newTime.split(':').map(Number)

    const startTime = new Date(year, month - 1, day, hours, minutes)
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)

    await calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody: {
            start: {
                dateTime: startTime.toISOString(),
                timeZone: 'America/Sao_Paulo',
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: 'America/Sao_Paulo',
            },
        },
    })
}

/**
 * Generate OAuth URL for Google Calendar authorization
 * Used for initial setup to get refresh token
 */
export function getAuthUrl(): string {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    )

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',
    })
}

/**
 * Exchange authorization code for tokens
 * Used during initial setup
 */
export async function getTokensFromCode(code: string) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)
    return tokens
}

