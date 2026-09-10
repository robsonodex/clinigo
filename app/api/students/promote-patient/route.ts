import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const promoteSchema = z.object({
    patient_id: z.string().uuid('ID do paciente inválido'),
    program: z.string().optional().nullable(),
    supervising_doctor_id: z.string().uuid().optional().nullable().or(z.literal('')),
})

/**
 * POST /api/students/promote-patient
 * Safely converts a legacy patient record into a student (aluna/mentoranda) record.
 * 1. Checks existing medical records count (never deletes them).
 * 2. Creates the student record.
 * 3. Migrates future appointments to appointment_type='STUDENT', student_id=newId, patient_id=null.
 * 4. Marks original patient record as status='archived' (never hard-deletes).
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 403 })
        }

        const body = await request.json()
        const validated = promoteSchema.parse(body)

        // 1. Fetch patient
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, full_name, phone, email, clinic_id')
            .eq('id', validated.patient_id)
            .eq('clinic_id', profile.clinic_id)
            .single()

        if (patientError || !patient) {
            return NextResponse.json({ error: 'Paciente não encontrado na sua clínica' }, { status: 404 })
        }

        // 2. Count existing medical records (audit preservation)
        const { count: medicalRecordsCount } = await supabase
            .from('medical_records')
            .select('id', { count: 'exact', head: true })
            .eq('patient_id', patient.id)

        // 3. Create student record
        const { data: newStudent, error: createStudentError } = await supabase
            .from('students')
            .insert({
                clinic_id: profile.clinic_id,
                full_name: patient.full_name,
                contact_phone: patient.phone,
                contact_email: patient.email,
                program: validated.program || 'Mentoria / Estágio',
                supervising_doctor_id: validated.supervising_doctor_id || null,
                status: 'active',
                created_by: user.id,
            })
            .select()
            .single()

        if (createStudentError || !newStudent) {
            console.error('[API promote-patient] Error creating student:', createStudentError)
            return NextResponse.json({ error: 'Erro ao criar registro de aluna' }, { status: 500 })
        }

        // 4. Update future appointments from today onwards
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
        const { data: updatedAppointments, error: updateApptError } = await supabase
            .from('appointments')
            .update({
                student_id: newStudent.id,
                patient_id: null,
                appointment_type: 'STUDENT',
                waiting_room_notes: `[Aluna / Mentoria] Convertido do cadastro anterior de paciente`,
            })
            .eq('patient_id', patient.id)
            .eq('clinic_id', profile.clinic_id)
            .gte('appointment_date', todayStr)
            .select('id')

        if (updateApptError) {
            console.error('[API promote-patient] Error migrating appointments:', updateApptError)
        }

        // 5. Mark legacy patient as archived
        await supabase
            .from('patients')
            .update({ status: 'archived' })
            .eq('id', patient.id)
            .eq('clinic_id', profile.clinic_id)

        return NextResponse.json({
            success: true,
            student: newStudent,
            medicalRecordsPreserved: medicalRecordsCount || 0,
            futureAppointmentsMigrated: updatedAppointments?.length || 0,
            message: `Aluna ${newStudent.full_name} cadastrada com sucesso. ${updatedAppointments?.length || 0} agendamento(s) futuro(s) migrado(s). ${medicalRecordsCount || 0} prontuário(s) anterior(es) preservado(s) e arquivado(s).`
        })
    } catch (err: any) {
        if (err.name === 'ZodError') {
            return NextResponse.json({ error: 'Dados inválidos', details: err.errors }, { status: 400 })
        }
        console.error('[API promote-patient] Unexpected error:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
