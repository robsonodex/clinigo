/**
 * Transcription Service
 * 
 * Uses OpenAI Whisper API to transcribe audio from teleconsultas
 */

import { createServiceRoleClient } from '@/lib/supabase/server'

interface TranscriptionResult {
    text: string
    language: string
    duration: number
    segments?: TranscriptionSegment[]
}

interface TranscriptionSegment {
    id: number
    start: number
    end: number
    text: string
}

/**
 * Transcribe audio using OpenAI Whisper API
 * Note: Requires OPENAI_API_KEY environment variable
 */
export async function transcribeAudio(
    audioBuffer: Buffer | Blob,
    options: {
        language?: string
        prompt?: string
        responseFormat?: 'json' | 'text' | 'verbose_json'
    } = {}
): Promise<TranscriptionResult> {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured. Transcription is not available.')
    }

    const formData = new FormData()

    // Handle both Buffer and Blob
    if (audioBuffer instanceof Buffer) {
        formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm')
    } else {
        formData.append('file', audioBuffer, 'audio.webm')
    }

    formData.append('model', 'whisper-1')
    formData.append('language', options.language || 'pt')
    formData.append('response_format', options.responseFormat || 'verbose_json')

    if (options.prompt) {
        formData.append('prompt', options.prompt)
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
        body: formData,
    })

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new Error(`Whisper API error: ${error.error?.message || response.statusText}`)
    }

    const result = await response.json()

    return {
        text: result.text,
        language: result.language,
        duration: result.duration || 0,
        segments: result.segments?.map((seg: any) => ({
            id: seg.id,
            start: seg.start,
            end: seg.end,
            text: seg.text,
        })),
    }
}

/**
 * Save transcription to consultation record
 */
export async function saveTranscription(
    appointmentId: string,
    text: string,
    metadata: {
        language?: string
        duration?: number
        segments?: TranscriptionSegment[]
    } = {}
): Promise<void> {
    const supabase = createServiceRoleClient()

    // Update consultation with transcription
    const { error } = await supabase
        .from('consultations')
        .update({
            transcription: text,
            transcription_metadata: {
                language: metadata.language,
                duration: metadata.duration,
                segmentCount: metadata.segments?.length,
                timestamps: metadata.segments?.map(s => ({ start: s.start, end: s.end })),
                transcribedAt: new Date().toISOString(),
            },
        })
        .eq('appointment_id', appointmentId)

    if (error) {
        console.error('Error saving transcription:', error)
        throw new Error(`Failed to save transcription: ${error.message}`)
    }
}

/**
 * Transcribe a recording file from storage
 */
export async function transcribeRecordingFromStorage(
    recordingPath: string,
    appointmentId: string
): Promise<TranscriptionResult> {
    const supabase = createServiceRoleClient()

    // Download the recording
    const { data: fileData, error: downloadError } = await supabase.storage
        .from('teleconsultas')
        .download(recordingPath)

    if (downloadError || !fileData) {
        throw new Error(`Failed to download recording: ${downloadError?.message}`)
    }

    // Transcribe
    const result = await transcribeAudio(fileData, {
        language: 'pt',
        prompt: 'Esta é uma transcrição de uma consulta médica em português brasileiro.',
    })

    // Save transcription
    await saveTranscription(appointmentId, result.text, {
        language: result.language,
        duration: result.duration,
        segments: result.segments,
    })

    return result
}

/**
 * Check if transcription is available (API key configured)
 */
export function isTranscriptionAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY
}
