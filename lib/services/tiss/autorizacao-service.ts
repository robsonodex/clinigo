/**
 * TISS Authorization Service
 * Serviço para gerenciar solicitações de autorização TISS (SP/SADT)
 */
import { createServiceRoleClient } from '@/lib/supabase/server'

export interface CreateAuthorizationRequestInput {
    clinic_id: string
    patient_id: string
    doctor_id: string
    health_insurance_id: string
    clinical_indication: string
    procedures: Array<{
        code: string
        description: string
        quantity: number
    }>
    attachments?: File[]
}

export class AutorizacaoService {
    private supabase = createServiceRoleClient()

    /**
     * Gerar número único de solicitação
     */
    private generateRequestNumber(): string {
        const timestamp = Date.now().toString().slice(-8)
        const random = Math.random().toString(36).substring(2, 6).toUpperCase()
        return `AUTH${timestamp}${random}`
    }

    /**
     * Criar nova solicitação de autorização
     */
    async createAuthorizationRequest(data: CreateAuthorizationRequestInput) {
        const requestNumber = this.generateRequestNumber()

        // 1. Criar registro principal
        const { data: request, error: requestError } = await this.supabase
            .from('tiss_authorization_requests')
            .insert({
                clinic_id: data.clinic_id,
                patient_id: data.patient_id,
                doctor_id: data.doctor_id,
                health_insurance_id: data.health_insurance_id,
                request_number: requestNumber,
                request_type: 'SP_SADT',
                clinical_indication: data.clinical_indication,
                status: 'PENDING',
            })
            .select()
            .single()

        if (requestError) throw requestError

        // 2. Criar procedimentos
        if (data.procedures.length > 0) {
            const proceduresData = data.procedures.map(proc => ({
                authorization_request_id: request.id,
                procedure_code: proc.code,
                procedure_description: proc.description,
                quantity: proc.quantity,
            }))

            const { error: procError } = await this.supabase
                .from('tiss_authorization_procedures')
                .insert(proceduresData)

            if (procError) throw procError
        }

        // 3. Upload de anexos (stub - implementar com Supabase Storage)
        // TODO: Implementar upload para Supabase Storage
        if (data.attachments && data.attachments.length > 0) {
            console.log(`[AUTHORIZATION] ${data.attachments.length} attachments to upload`)
            // const attachmentsData = await this.uploadAttachments(request.id, data.attachments)
        }

        return request
    }

    /**
     * Listar solicitações por clínica
     */
    async listRequests(clinicId: string, filters?: {
        status?: string
        startDate?: string
        endDate?: string
    }) {
        let query = this.supabase
            .from('tiss_authorization_requests')
            .select(`
        *,
        patient:patients(full_name, cpf),
        doctor:doctors(user:users(full_name)),
        health_insurance:health_insurances(name),
        procedures:tiss_authorization_procedures(*)
      `)
            .eq('clinic_id', clinicId)
            .order('created_at', { ascending: false })

        if (filters?.status) {
            query = query.eq('status', filters.status)
        }

        if (filters?.startDate) {
            query = query.gte('created_at', filters.startDate)
        }

        if (filters?.endDate) {
            query = query.lte('created_at', filters.endDate)
        }

        const { data, error } = await query

        if (error) throw error
        return data
    }

    /**
     * Enviar solicitação para operadora
     */
    async sendToOperator(requestId: string) {
        // TODO: Integrar com webservice da operadora
        // Por enquanto, apenas muda status para SENT

        const { data, error } = await this.supabase
            .from('tiss_authorization_requests')
            .update({
                status: 'SENT',
                sent_at: new Date().toISOString(),
            })
            .eq('id', requestId)
            .select()
            .single()

        if (error) throw error
        return data
    }

    /**
     * Atualizar status da solicitação
     */
    async updateStatus(
        requestId: string,
        status: 'PENDING' | 'SENT' | 'APPROVED' | 'REJECTED',
        authorizationNumber?: string,
        rejectionReason?: string
    ) {
        const updateData: any = { status }

        if (status === 'APPROVED') {
            updateData.authorization_number = authorizationNumber
            updateData.approved_at = new Date().toISOString()
        }

        if (status === 'REJECTED') {
            updateData.rejection_reason = rejectionReason
        }

        const { data, error } = await this.supabase
            .from('tiss_authorization_requests')
            .update(updateData)
            .eq('id', requestId)
            .select()
            .single()

        if (error) throw error
        return data
    }
}
