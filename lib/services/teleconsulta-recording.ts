/**
 * Teleconsulta Recording Service
 * 
 * Uses MediaRecorder API to record video consultations
 * and uploads to Supabase Storage
 */

'use client'

export interface RecordingChunk {
    blob: Blob
    timestamp: number
}

export interface RecordingOptions {
    mimeType?: string
    videoBitsPerSecond?: number
    audioBitsPerSecond?: number
}

export interface RecordingResult {
    recordingBlob: Blob
    duration: number
    startedAt: Date
    endedAt: Date
}

const DEFAULT_OPTIONS: RecordingOptions = {
    mimeType: 'video/webm;codecs=vp9,opus',
    videoBitsPerSecond: 2500000, // 2.5 Mbps
    audioBitsPerSecond: 128000,  // 128 kbps
}

/**
 * Get supported MIME type for recording
 */
function getSupportedMimeType(): string {
    const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4',
    ]

    for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
            return mimeType
        }
    }

    return 'video/webm'
}

/**
 * Recording Service Class
 */
export class TeleconsultaRecorder {
    private mediaRecorder: MediaRecorder | null = null
    private recordedChunks: RecordingChunk[] = []
    private stream: MediaStream | null = null
    private startTime: Date | null = null
    private options: RecordingOptions

    constructor(options: RecordingOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options }
    }

    /**
     * Check if recording is supported
     */
    static isSupported(): boolean {
        return typeof MediaRecorder !== 'undefined' &&
            typeof navigator !== 'undefined' &&
            !!navigator.mediaDevices
    }

    /**
     * Get supported MIME types
     */
    static getSupportedMimeTypes(): string[] {
        if (!this.isSupported()) return []

        return [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4',
        ].filter(mimeType => MediaRecorder.isTypeSupported(mimeType))
    }

    /**
     * Initialize recorder with stream
     */
    async initialize(stream: MediaStream): Promise<void> {
        this.stream = stream

        const mimeType = this.options.mimeType || getSupportedMimeType()

        this.mediaRecorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: this.options.videoBitsPerSecond,
            audioBitsPerSecond: this.options.audioBitsPerSecond,
        })

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.recordedChunks.push({
                    blob: event.data,
                    timestamp: Date.now(),
                })
            }
        }
    }

    /**
     * Start recording
     */
    start(timeslice: number = 1000): void {
        if (!this.mediaRecorder) {
            throw new Error('Recorder not initialized. Call initialize() first.')
        }

        if (this.mediaRecorder.state !== 'inactive') {
            console.warn('Recorder is already running')
            return
        }

        this.recordedChunks = []
        this.startTime = new Date()
        this.mediaRecorder.start(timeslice)
        console.log('Recording started')
    }

    /**
     * Stop recording and return result
     */
    async stop(): Promise<RecordingResult> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder || !this.startTime) {
                reject(new Error('Recorder not initialized or not started'))
                return
            }

            if (this.mediaRecorder.state === 'inactive') {
                reject(new Error('Recorder is not running'))
                return
            }

            this.mediaRecorder.onstop = () => {
                const endedAt = new Date()
                const duration = (endedAt.getTime() - this.startTime!.getTime()) / 1000

                const recordingBlob = new Blob(
                    this.recordedChunks.map(chunk => chunk.blob),
                    { type: this.mediaRecorder!.mimeType }
                )

                console.log(`Recording stopped. Duration: ${duration}s, Size: ${recordingBlob.size} bytes`)

                resolve({
                    recordingBlob,
                    duration,
                    startedAt: this.startTime!,
                    endedAt,
                })
            }

            this.mediaRecorder.onerror = (event) => {
                reject(new Error(`Recording error: ${event}`))
            }

            this.mediaRecorder.stop()
        })
    }

    /**
     * Pause recording
     */
    pause(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.pause()
            console.log('Recording paused')
        }
    }

    /**
     * Resume recording
     */
    resume(): void {
        if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
            this.mediaRecorder.resume()
            console.log('Recording resumed')
        }
    }

    /**
     * Get current state
     */
    getState(): RecordingState | null {
        return this.mediaRecorder?.state ?? null
    }

    /**
     * Get recording duration in seconds
     */
    getDuration(): number {
        if (!this.startTime) return 0
        return (Date.now() - this.startTime.getTime()) / 1000
    }

    /**
     * Clean up resources
     */
    destroy(): void {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop()
        }
        this.mediaRecorder = null
        this.stream = null
        this.recordedChunks = []
        this.startTime = null
    }
}

/**
 * Upload recording to Supabase Storage
 */
export async function uploadRecording(
    recordingBlob: Blob,
    appointmentId: string,
    clinicId: string
): Promise<{ url: string; path: string }> {
    const fileName = `${appointmentId}_${Date.now()}.webm`
    const filePath = `teleconsultas/${clinicId}/${fileName}`

    const formData = new FormData()
    formData.append('file', recordingBlob, fileName)
    formData.append('appointmentId', appointmentId)
    formData.append('clinicId', clinicId)
    formData.append('path', filePath)

    const response = await fetch('/api/video/upload-recording', {
        method: 'POST',
        body: formData,
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to upload recording')
    }

    return response.json()
}

/**
 * Hook for using recorder in components
 */
export function useRecording() {
    const recorderRef = { current: null as TeleconsultaRecorder | null }

    const initRecorder = async (stream: MediaStream) => {
        recorderRef.current = new TeleconsultaRecorder()
        await recorderRef.current.initialize(stream)
        return recorderRef.current
    }

    const startRecording = () => {
        recorderRef.current?.start()
    }

    const stopRecording = async (): Promise<RecordingResult | null> => {
        if (!recorderRef.current) return null
        return recorderRef.current.stop()
    }

    const pauseRecording = () => {
        recorderRef.current?.pause()
    }

    const resumeRecording = () => {
        recorderRef.current?.resume()
    }

    const getState = () => recorderRef.current?.getState() ?? null
    const getDuration = () => recorderRef.current?.getDuration() ?? 0

    const cleanup = () => {
        recorderRef.current?.destroy()
        recorderRef.current = null
    }

    return {
        initRecorder,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        getState,
        getDuration,
        cleanup,
        isSupported: TeleconsultaRecorder.isSupported,
    }
}
