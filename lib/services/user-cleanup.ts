import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Realiza a limpeza cirúrgica de dependências e exclusão definitiva de um usuário
 * e de seus vínculos como profissional/médico, garantindo integridade referencial
 * tanto no PostgreSQL quanto no Supabase Auth.
 */
export async function permanentlyDeleteUser(
    adminClient: any,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // 1. Localizar se o usuário possui vínculo como médico/profissional
        const { data: doctorRecord } = await adminClient
            .from('doctors')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle()

        if (doctorRecord && doctorRecord.id) {
            const doctorId = doctorRecord.id

            // Limpar dependências restritivas do médico
            await safeExecute(() => adminClient.from('therapist_capacity').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('supervision_records').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('recurring_appointment_series').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('waiting_list').update({ preferred_doctor_id: null }).eq('preferred_doctor_id', doctorId))
            await safeExecute(() => adminClient.from('nps_surveys').update({ doctor_id: null }).eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('patients').update({ origin_referrer_id: null }).eq('origin_referrer_id', doctorId))
            await safeExecute(() => adminClient.from('referrals').update({ target_doctor_id: null }).eq('target_doctor_id', doctorId))
            await safeExecute(() => adminClient.from('referrals').update({ referring_doctor_id: null }).eq('referring_doctor_id', doctorId))
            await safeExecute(() => adminClient.from('doctor_patient_rates').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('schedules').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('doctor_health_insurances').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('doctor_contracts').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('professional_financial_documents').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('professional_term_signatures').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('schedule_price_ranges').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('session_packages').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('therapeutic_plans').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('tiss_authorization_requests').delete().eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('tiss_guides').update({ doctor_id: null }).eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('appointments').update({ doctor_id: null, co_doctor_id: null, professional_supervised_id: null }).or(`doctor_id.eq.${doctorId},co_doctor_id.eq.${doctorId},professional_supervised_id.eq.${doctorId}`))
            await safeExecute(() => adminClient.from('consultations').update({ doctor_id: null }).eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('consulting_rooms').update({ doctor_id: null }).eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('medical_records').update({ doctor_id: null }).eq('doctor_id', doctorId))
            await safeExecute(() => adminClient.from('walk_in_registrations').update({ doctor_id: null }).eq('doctor_id', doctorId))

            // Excluir da tabela doctors
            const { error: doctorDeleteError } = await adminClient
                .from('doctors')
                .delete()
                .eq('id', doctorId)

            if (doctorDeleteError) {
                console.warn('[permanentlyDeleteUser] Aviso ao excluir registro de doctors:', doctorDeleteError)
            }
        }

        // 2. Limpar dependências restritivas do usuário
        await safeExecute(() => adminClient.from('staff_legal_acceptances').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('therapist_start_biometric_events').delete().eq('therapist_user_id', userId))
        await safeExecute(() => adminClient.from('chat_participants').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('chat_messages').delete().eq('sender_id', userId))
        await safeExecute(() => adminClient.from('chat_message_reads').delete().eq('user_id', userId))

        // Desvincular de agendamentos
        await safeExecute(() => adminClient.from('appointments').update({
            called_by: null,
            doctor_checked_in_by: null,
            manual_checkin_unlocked_by: null,
            checked_in_by: null,
            cancelled_by: null,
            created_by_user_id: null,
            marked_no_show_by: null
        }).or(`called_by.eq.${userId},doctor_checked_in_by.eq.${userId},manual_checkin_unlocked_by.eq.${userId},checked_in_by.eq.${userId},cancelled_by.eq.${userId},created_by_user_id.eq.${userId},marked_no_show_by.eq.${userId}`))

        // Desvincular eventos e biometria
        await safeExecute(() => adminClient.from('patient_checkin_events').update({ confirmed_by_user_id: null }).eq('confirmed_by_user_id', userId))
        await safeExecute(() => adminClient.from('patient_face_biometrics').update({ therapist_user_id: null }).eq('therapist_user_id', userId))
        await safeExecute(() => adminClient.from('reception_pins').delete().eq('created_by', userId))
        await safeExecute(() => adminClient.from('checkin_capture_tokens').delete().eq('created_by', userId))
        await safeExecute(() => adminClient.from('checkin_capture_tokens').update({ confirmed_by_user_id: null }).eq('confirmed_by_user_id', userId))
        await safeExecute(() => adminClient.from('clinic_devices').update({ created_by: null }).eq('created_by', userId))

        // Desvincular financeiro e reembolsos
        await safeExecute(() => adminClient.from('patient_reimbursements').update({ approved_by: null, created_by: null }).or(`approved_by.eq.${userId},created_by.eq.${userId}`))
        await safeExecute(() => adminClient.from('financial_entries').update({ created_by: null, cancelled_by: null }).or(`created_by.eq.${userId},cancelled_by.eq.${userId}`))
        await safeExecute(() => adminClient.from('medical_payroll').update({ paid_by: null, approved_by: null }).or(`paid_by.eq.${userId},approved_by.eq.${userId}`))
        await safeExecute(() => adminClient.from('payroll_items').update({ adjusted_by: null }).eq('adjusted_by', userId))
        await safeExecute(() => adminClient.from('partner_commissions').update({ paid_by: null }).eq('paid_by', userId))

        // Desvincular prescrições e prontuários
        await safeExecute(() => adminClient.from('prescriptions').update({ signed_by: null, sent_by: null }).or(`signed_by.eq.${userId},sent_by.eq.${userId}`))
        await safeExecute(() => adminClient.from('consultations').update({ signed_by: null, last_autosave_by: null }).or(`signed_by.eq.${userId},last_autosave_by.eq.${userId}`))
        await safeExecute(() => adminClient.from('medical_record_autosave_log').update({ updated_by: null }).eq('updated_by', userId))
        await safeExecute(() => adminClient.from('medical_record_templates').update({ created_by: null }).eq('created_by', userId))
        await safeExecute(() => adminClient.from('digital_signatures').delete().eq('doctor_id', userId))

        // Desvincular taxas e configurações
        await safeExecute(() => adminClient.from('doctor_patient_rates').update({ created_by: null, updated_by: null }).or(`created_by.eq.${userId},updated_by.eq.${userId}`))
        await safeExecute(() => adminClient.from('doctor_patient_rate_history').update({ changed_by: null }).eq('changed_by', userId))
        await safeExecute(() => adminClient.from('recurring_appointment_series').update({ created_by: null }).eq('created_by', userId))
        await safeExecute(() => adminClient.from('stock_movements').update({ moved_by: null }).eq('moved_by', userId))

        // Desvincular TISS
        await safeExecute(() => adminClient.from('tiss_batch_signatures').update({ signed_by: null }).eq('signed_by', userId))
        await safeExecute(() => adminClient.from('tiss_glosa_contests').update({ submitted_by: null }).eq('submitted_by', userId))
        await safeExecute(() => adminClient.from('tiss_batches').update({ created_by: null, submitted_by: null }).or(`created_by.eq.${userId},submitted_by.eq.${userId}`))
        await safeExecute(() => adminClient.from('tiss_eligibility_checks').update({ checked_by: null }).eq('checked_by', userId))
        await safeExecute(() => adminClient.from('tiss_import_errors').update({ resolved_by: null }).eq('resolved_by', userId))
        await safeExecute(() => adminClient.from('tiss_returns').update({ uploaded_by: null }).eq('uploaded_by', userId))
        await safeExecute(() => adminClient.from('tiss_validation_errors').update({ resolved_by: null }).eq('resolved_by', userId))

        // Desvincular planos e psicomotricidade
        await safeExecute(() => adminClient.from('sessoes_psicomotricidade').update({ profissional_id: null, editada_por: null }).or(`profissional_id.eq.${userId},editada_por.eq.${userId}`))
        await safeExecute(() => adminClient.from('planos_sessao').update({ profissional_id: null }).eq('profissional_id', userId))
        await safeExecute(() => adminClient.from('paciente_objetivos').update({ profissional_id: null }).eq('profissional_id', userId))
        await safeExecute(() => adminClient.from('ficha_capa_psicomotricidade').update({ profissional_referencia: null }).eq('profissional_referencia', userId))
        await safeExecute(() => adminClient.from('ficha_revisoes_psicomotricidade').update({ profissional_id: null }).eq('profissional_id', userId))

        // Desvincular logs e auditorias do sistema
        await safeExecute(() => adminClient.from('audit_log').update({ user_id: null }).eq('user_id', userId))
        await safeExecute(() => adminClient.from('audit_logs').update({ user_id: null }).eq('user_id', userId))
        await safeExecute(() => adminClient.from('system_logs').update({ target_user_id: null }).eq('target_user_id', userId))
        await safeExecute(() => adminClient.from('system_logs').update({ admin_id: null }).eq('admin_id', userId))
        await safeExecute(() => adminClient.from('system_settings').update({ updated_by: null }).eq('updated_by', userId))
        await safeExecute(() => adminClient.from('clinic_bulletins').update({ sender_id: null }).eq('sender_id', userId))
        await safeExecute(() => adminClient.from('clinic_plan_history').update({ changed_by_user_id: null }).eq('changed_by_user_id', userId))
        await safeExecute(() => adminClient.from('clinics').update({ approved_by: null }).eq('approved_by', userId))
        await safeExecute(() => adminClient.from('impersonation_sessions').update({ admin_id: null }).eq('admin_id', userId))
        await safeExecute(() => adminClient.from('import_jobs').update({ created_by: null }).eq('created_by', userId))
        await safeExecute(() => adminClient.from('document_views').update({ viewed_by: null }).eq('viewed_by', userId))
        await safeExecute(() => adminClient.from('email_logs').update({ user_id: null }).eq('user_id', userId))
        await safeExecute(() => adminClient.from('feature_suggestions').update({ user_id: null }).eq('user_id', userId))
        await safeExecute(() => adminClient.from('clinic_custom_permissions').update({ enabled_by: null }).eq('enabled_by', userId))
        await safeExecute(() => adminClient.from('professional_financial_documents').update({ statement_uploaded_by: null, paid_by: null, invoice_uploaded_by: null }).or(`statement_uploaded_by.eq.${userId},paid_by.eq.${userId},invoice_uploaded_by.eq.${userId}`))

        // Limpar sessões, tokens e preferências
        await safeExecute(() => adminClient.from('activation_tokens').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('password_reset_tokens').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('one_time_tokens').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('user_sessions').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('active_sessions').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('user_preferences').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('user_mfa').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('notifications').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('notification_preferences').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('webauthn_challenges').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('webauthn_credentials').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('account_deletion_requests').delete().eq('user_id', userId))
        await safeExecute(() => adminClient.from('data_export_requests').delete().eq('user_id', userId))

        // 3. Excluir da tabela public.users
        const { error: userDeleteError } = await adminClient
            .from('users')
            .delete()
            .eq('id', userId)

        if (userDeleteError) {
            console.error('[permanentlyDeleteUser] Erro ao deletar public.users:', userDeleteError)
            return { success: false, error: userDeleteError.message }
        }

        // 4. Excluir o usuário no Supabase Auth para liberar e-mail e licença
        try {
            const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)
            if (authDeleteError) {
                console.warn('[permanentlyDeleteUser] Aviso ao deletar auth.users:', authDeleteError)
            }
        } catch (authErr: any) {
            console.warn('[permanentlyDeleteUser] Exceção ao deletar auth.users:', authErr?.message)
        }

        return { success: true }
    } catch (err: any) {
        console.error('[permanentlyDeleteUser] Falha na exclusão definitiva:', err)
        return { success: false, error: err?.message || 'Erro ao excluir usuário' }
    }
}

async function safeExecute(fn: () => any) {
    try {
        await fn()
    } catch {
        // Ignora silenciosamente se a tabela/coluna opcional não existir ou não contiver registros
    }
}
