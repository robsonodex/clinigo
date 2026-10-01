-- Verificação somente leitura pós-migrações conferindo a existência de todas as tabelas, colunas, funções e índices criados pelas migrations de 2026.
WITH checks AS (
    -- 20260929120000_tiss_convenios_glosas_repasse.sql
    SELECT '20260929120000' AS migration, 'TABELA' AS tipo, 'tuss_procedures' AS objeto,
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tuss_procedures') AS existe
    UNION ALL
    SELECT '20260929120000', 'TABELA', 'health_insurance_price_tables',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'health_insurance_price_tables')
    UNION ALL
    SELECT '20260929120000', 'TABELA', 'tiss_glosa_reasons_ans',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tiss_glosa_reasons_ans')
    UNION ALL
    SELECT '20260929120000', 'TABELA', 'tiss_return_imports',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tiss_return_imports')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'clinics.repasse_regime',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'repasse_regime')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'clinics.glosa_policy',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'glosa_policy')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'health_insurances.closing_day',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_insurances' AND column_name = 'closing_day')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'health_insurances.appeal_deadline_days',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'health_insurances' AND column_name = 'appeal_deadline_days')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'tiss_authorization_requests.sessions_authorized',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_authorization_requests' AND column_name = 'sessions_authorized')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'tiss_authorization_requests.sessions_used',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_authorization_requests' AND column_name = 'sessions_used')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'tiss_guides.copay_value',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'copay_value')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'tiss_guides.paid_value',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'paid_value')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'tiss_guides.biometric_proof_id',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'biometric_proof_id')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'tiss_guides.term_signature_id',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'term_signature_id')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'tiss_guides.status_history',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'status_history')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'tiss_batches.dispatch_channel',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'dispatch_channel')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'tiss_batches.receipt_proof_url',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'receipt_proof_url')
    UNION ALL
    SELECT '20260929120000', 'COLUNA', 'tiss_batches.file_hash',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'file_hash')
    UNION ALL
    SELECT '20260929120000', 'INDICE', 'idx_tuss_procedures_code',
           EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_tuss_procedures_code')
    UNION ALL
    SELECT '20260929120000', 'INDICE', 'uq_tiss_guides_appointment_proc',
           EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_tiss_guides_appointment_proc')

    -- 20260929130000_tiss_undo_rpc_and_reimport.sql
    UNION ALL
    SELECT '20260929130000', 'COLUNA', 'tiss_return_imports.status',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_return_imports' AND column_name = 'status')
    UNION ALL
    SELECT '20260929130000', 'COLUNA', 'clinics.tiss_hash_algorithm',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinics' AND column_name = 'tiss_hash_algorithm')
    UNION ALL
    SELECT '20260929130000', 'INDICE', 'uq_tiss_return_file_hash_active',
           EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_tiss_return_file_hash_active')
    UNION ALL
    SELECT '20260929130000', 'FUNCAO', 'tiss_undo_return_import',
           EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'tiss_undo_return_import')

    -- 20260929140000_tiss_batch_hash_tracking.sql
    UNION ALL
    SELECT '20260929140000', 'COLUNA', 'tiss_batches.hash_algorithm',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'hash_algorithm')
    UNION ALL
    SELECT '20260929140000', 'COLUNA', 'tiss_batches.hash_value',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'hash_value')
    UNION ALL
    SELECT '20260929140000', 'COLUNA', 'tiss_batches.xml_generated_at',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'xml_generated_at')

    -- 20260929150000_tiss_premium_foundation.sql
    UNION ALL
    SELECT '20260929150000', 'TABELA', 'tiss_guide_counters',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tiss_guide_counters')
    UNION ALL
    SELECT '20260929150000', 'TABELA', 'tiss_batch_xml_versions',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tiss_batch_xml_versions')
    UNION ALL
    SELECT '20260929150000', 'TABELA', 'tiss_appeal_justification_templates',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tiss_appeal_justification_templates')
    UNION ALL
    SELECT '20260929150000', 'COLUNA', 'tiss_guides.deleted_at',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'deleted_at')
    UNION ALL
    SELECT '20260929150000', 'COLUNA', 'tiss_guides.version',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'version')
    UNION ALL
    SELECT '20260929150000', 'COLUNA', 'tiss_batches.closed_at',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'closed_at')
    UNION ALL
    SELECT '20260929150000', 'COLUNA', 'tiss_batches.checksum',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'checksum')
    UNION ALL
    SELECT '20260929150000', 'COLUNA', 'tiss_glosa_contests.version',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_glosa_contests' AND column_name = 'version')
    UNION ALL
    SELECT '20260929150000', 'FUNCAO', 'generate_tiss_guide_number',
           EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_tiss_guide_number')

    -- 20260929160000_tiss_premium_hardening.sql
    UNION ALL
    SELECT '20260929160000', 'INDICE', 'uq_tiss_guides_clinic_number',
           EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_tiss_guides_clinic_number')

    -- 20260929170000_tiss_guide_cancelled_status.sql
    UNION ALL
    SELECT '20260929170000', 'COLUNA', 'tiss_guides.cancellation_reason',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'cancellation_reason')
    UNION ALL
    SELECT '20260929170000', 'COLUNA', 'tiss_guides.cancelled_at',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'cancelled_at')
    UNION ALL
    SELECT '20260929170000', 'COLUNA', 'tiss_batch_xml_versions.validation_status',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batch_xml_versions' AND column_name = 'validation_status')
    UNION ALL
    SELECT '20260929170000', 'INDICE', 'idx_tiss_guides_clinic_status_active',
           EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_tiss_guides_clinic_status_active')

    -- 20260930100000_create_patient_intake_module.sql
    UNION ALL
    SELECT '20260930100000', 'TABELA', 'patient_intake_links',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_intake_links')
    UNION ALL
    SELECT '20260930100000', 'TABELA', 'patient_intake_submissions',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_intake_submissions')
    UNION ALL
    SELECT '20260930100000', 'TABELA', 'patient_intake_files',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_intake_files')
    UNION ALL
    SELECT '20260930100000', 'TABELA', 'patient_intake_audit',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_intake_audit')

    -- 20260930110000_tiss_premium_p0_extensions.sql
    UNION ALL
    SELECT '20260930110000', 'TABELA', 'tiss_appeals',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tiss_appeals')
    UNION ALL
    SELECT '20260930110000', 'TABELA', 'tiss_appeal_items',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tiss_appeal_items')
    UNION ALL
    SELECT '20260930110000', 'TABELA', 'tiss_appeal_attachments',
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tiss_appeal_attachments')
    UNION ALL
    SELECT '20260930110000', 'COLUNA', 'tiss_glosa_contests.appeal_id',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_glosa_contests' AND column_name = 'appeal_id')
    UNION ALL
    SELECT '20260930110000', 'COLUNA', 'tiss_return_imports.dry_run_token',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_return_imports' AND column_name = 'dry_run_token')
    UNION ALL
    SELECT '20260930110000', 'COLUNA', 'tiss_batches.protocol_number',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'protocol_number')
    UNION ALL
    SELECT '20260930110000', 'COLUNA', 'tiss_batches.receipt_proof_url',
           EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'receipt_proof_url')
    UNION ALL
    SELECT '20260930110000', 'INDICE', 'idx_tiss_appeals_clinic_status',
           EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_tiss_appeals_clinic_status')
    UNION ALL
    SELECT '20260930110000', 'INDICE', 'idx_tiss_appeal_items_appeal',
           EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_tiss_appeal_items_appeal')
    UNION ALL
    SELECT '20260930110000', 'INDICE', 'idx_tiss_appeal_attachments_appeal',
           EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_tiss_appeal_attachments_appeal')
)
SELECT 
    migration,
    tipo AS tipo_objeto,
    objeto,
    CASE WHEN existe THEN 'SIM' ELSE 'NAO' END AS existe
FROM checks
ORDER BY migration, tipo, objeto;
