import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { cookies } from 'next/headers'
import { isClinicAuthorizedForContracts } from '@/lib/constants/contracts-allowlist'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        let clinicId = userData?.clinic_id
        if (!clinicId && userData?.role === 'SUPER_ADMIN') {
            const cookieStore = await cookies()
            clinicId = cookieStore.get('impersonation_clinic_id')?.value || cookieStore.get('clinic_id')?.value
        }

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não identificada' }, { status: 400 })
        }

        if (!isClinicAuthorizedForContracts(clinicId)) {
            return NextResponse.json({ error: 'Módulo de Contratos não autorizado para esta clínica' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const doctorId = searchParams.get('doctor_id')
        const patientId = searchParams.get('patient_id')

        const serviceRole = createServiceRoleClient()

        // 1. Busca dados da clínica
        const { data: clinic } = await serviceRole
            .from('clinics')
            .select('*')
            .eq('id', clinicId)
            .single()

        let clinicAddress: any = {}
        if (clinic?.address) {
            if (typeof clinic.address === 'string') {
                try { clinicAddress = JSON.parse(clinic.address) } catch { clinicAddress = { street: clinic.address } }
            } else {
                clinicAddress = clinic.address
            }
        }

        const initialVars: Record<string, string> = {
            contratante_razao_social: clinic?.name || '',
            contratante_cnpj: clinic?.cnpj || '',
            contratante_endereco: `${clinicAddress.street || ''} ${clinicAddress.number ? ', ' + clinicAddress.number : ''} ${clinicAddress.neighborhood ? '- ' + clinicAddress.neighborhood : ''}`.trim(),
            contratante_cidade: clinicAddress.city || 'São Paulo',
            contratante_estado: clinicAddress.state || 'SP',
            contratante_representante_nome: clinic?.responsible_name || 'Gestão da Clínica',
            contratante_representante_cpf: '',
            contratante_representante_email: clinic?.email || '',
            contratante_telefone: clinic?.phone || '',
            contrato_vigencia_inicial: new Intl.DateTimeFormat('pt-BR').format(new Date()),
            data_inicial_do_aditivo: new Intl.DateTimeFormat('pt-BR').format(new Date()),
            data_de_rescisao_do_contrato: new Intl.DateTimeFormat('pt-BR').format(new Date()),
        }

        // Calcula vigência final padrão de 1 ano
        const oneYearLater = new Date()
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
        initialVars.contrato_vigencia_final = new Intl.DateTimeFormat('pt-BR').format(oneYearLater)

        let targetData: any = null

        // 2. Se for médico/prestador
        if (doctorId) {
            const { data: doctor } = await serviceRole
                .from('doctors')
                .select('*')
                .eq('id', doctorId)
                .eq('clinic_id', clinicId)
                .maybeSingle()

            if (doctor) {
                targetData = doctor
                initialVars.prestador_razao_social = doctor.full_name || ''
                initialVars.prestador_representante_nome = doctor.full_name || ''
                initialVars.prestador_representante_cpf = doctor.cpf || ''
                initialVars.prestador_representante_email = doctor.email || ''
                initialVars.prestador_telefone = doctor.phone || ''
                initialVars.servicos_prestados = doctor.specialty ? `Atendimento em ${doctor.specialty}` : 'Serviços Clínicos Terapêuticos'
                initialVars.atribuicoes_servicos_prestados = `Atendimento clínico especializado, elaboração de plano terapêutico e registros diários em prontuário eletrônico.`
            }
        }

        // 3. Se for paciente/responsável
        if (patientId) {
            const { data: patient } = await serviceRole
                .from('patients')
                .select('*')
                .eq('id', patientId)
                .eq('clinic_id', clinicId)
                .maybeSingle()

            if (patient) {
                targetData = patient
                initialVars.nome_completo_menor = patient.full_name || ''
                initialVars.nacionalidade_menor = 'Brasileira'
                if (patient.date_of_birth) {
                    try {
                        const dob = new Date(patient.date_of_birth)
                        initialVars.data_nascimento_menor = new Intl.DateTimeFormat('pt-BR').format(dob)
                    } catch {
                        initialVars.data_nascimento_menor = patient.date_of_birth
                    }
                }

                // Responsável
                initialVars.nome_completo_responsavel = patient.guardian_name || patient.responsible_name || ''
                initialVars.cpf_responsavel = patient.guardian_cpf || patient.responsible_cpf || ''
                initialVars.nacionalidade_responsavel = 'Brasileira'
                initialVars.estado_civil_responsavel = 'Casado(a)'
                initialVars.profissao_responsavel = 'Do lar / Profissional'
                initialVars.endereco_responsavel = patient.address ? (typeof patient.address === 'string' ? patient.address : `${patient.address.street || ''}, ${patient.address.city || ''}`) : ''
            }
        }

        return NextResponse.json({
            variables: initialVars,
            target: targetData
        })
    } catch (err: any) {
        console.error('[CONTRACTS-AUTOFILL] Erro fatal:', err)
        return NextResponse.json({ error: 'Erro ao pré-carregar dados' }, { status: 500 })
    }
}
