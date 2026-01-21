import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/video/upload-recording
 * Upload teleconsulta recording to Supabase Storage
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            )
        }

        // Parse multipart form data
        const formData = await req.formData()
        const file = formData.get('file') as Blob | null
        const appointmentId = formData.get('appointmentId') as string
        const clinicId = formData.get('clinicId') as string
        const filePath = formData.get('path') as string | null

        if (!file) {
            return NextResponse.json(
                { error: 'Arquivo não fornecido' },
                { status: 400 }
            )
        }

        if (!appointmentId || !clinicId) {
            return NextResponse.json(
                { error: 'appointmentId e clinicId são obrigatórios' },
                { status: 400 }
            )
        }

        // Verify user has access to this appointment
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select('id, clinic_id, doctor_id')
            .eq('id', appointmentId)
            .single()

        if (appointmentError || !appointment) {
            return NextResponse.json(
                { error: 'Agendamento não encontrado' },
                { status: 404 }
            )
        }

        // Only the doctor or clinic admin can upload recordings
        const { data: profile } = await supabase
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        const isAuthorized =
            profile?.role === 'SUPER_ADMIN' ||
            (profile?.role === 'CLINIC_ADMIN' && profile?.clinic_id === appointment.clinic_id) ||
            (profile?.role === 'DOCTOR' && profile?.clinic_id === appointment.clinic_id)

        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Sem permissão para fazer upload' },
                { status: 403 }
            )
        }

        // Use service role client for storage operations
        const serviceClient = createServiceRoleClient()

        // Generate file path if not provided
        const finalPath = filePath || `teleconsultas/${clinicId}/${appointmentId}_${Date.now()}.webm`

        // Convert Blob to Buffer for upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await serviceClient.storage
            .from('teleconsultas')
            .upload(finalPath, buffer, {
                contentType: 'video/webm',
                upsert: false,
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json(
                { error: `Erro ao fazer upload: ${uploadError.message}` },
                { status: 500 }
            )
        }

        // Get public URL
        const { data: urlData } = serviceClient.storage
            .from('teleconsultas')
            .getPublicUrl(finalPath)

        // Update consultation record with recording URL
        const { error: updateError } = await serviceClient
            .from('consultations')
            .update({
                recording_url: urlData.publicUrl,
                recording_path: finalPath,
                recording_uploaded_at: new Date().toISOString(),
            })
            .eq('appointment_id', appointmentId)

        if (updateError) {
            console.warn('Failed to update consultation:', updateError)
            // Don't fail the request, recording is already uploaded
        }

        // Also update video_rooms if exists
        await serviceClient
            .from('video_rooms')
            .update({
                recording_url: urlData.publicUrl,
            })
            .eq('appointment_id', appointmentId)

        return NextResponse.json({
            success: true,
            url: urlData.publicUrl,
            path: finalPath,
            size: buffer.length,
            message: 'Gravação salva com sucesso',
        })

    } catch (error) {
        console.error('Error uploading recording:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

/**
 * GET /api/video/upload-recording
 * Check if recording exists for an appointment
 */
export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { searchParams } = new URL(req.url)
        const appointmentId = searchParams.get('appointmentId')

        if (!appointmentId) {
            return NextResponse.json(
                { error: 'appointmentId é obrigatório' },
                { status: 400 }
            )
        }

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            )
        }

        // Get consultation with recording info
        const { data: consultation, error } = await supabase
            .from('consultations')
            .select('recording_url, recording_path, recording_uploaded_at, transcription')
            .eq('appointment_id', appointmentId)
            .single()

        if (error || !consultation) {
            return NextResponse.json({
                hasRecording: false,
                hasTranscription: false,
            })
        }

        return NextResponse.json({
            hasRecording: !!consultation.recording_url,
            hasTranscription: !!consultation.transcription,
            recordingUrl: consultation.recording_url,
            uploadedAt: consultation.recording_uploaded_at,
        })

    } catch (error) {
        console.error('Error checking recording:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
