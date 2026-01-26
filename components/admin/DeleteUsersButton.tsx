import React, { useState } from 'react';
import { Trash2, Loader2, AlertTriangle, CheckCircle, X } from 'lucide-react';

const DeleteUsersButton = () => {
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [result, setResult] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);

    // Lista de usuários (simula uma busca do banco)
    const availableUsers = [
        { id: 'a956fd09-4efb-4b66-a4ad-56203e5ff751', name: 'Jose', email: '123braz28@gmail.com' },
        { id: '7eea10f7-2953-47a6-8aaf-70a6a25459c4', name: 'Admin Demo', email: 'admin@demo.clinigo.app' },
        { id: '83d38b72-ea42-454e-8375-aa712eb4cd06', name: 'cicera', email: 'medeiros.braz28@gmail.com' },
        { id: '0716e3dc-a8f1-48a9-88c7-500290d1b3e5', name: 'Dr. João Silva', email: 'medico@demo.clinigo.app' },
        { id: '27c9541d-f32a-4633-90c6-5b218871a42c', name: 'robson-nodex', email: 'nodexs.aia@gmail.com' },
    ];

    const toggleUser = (userId) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const deleteUsers = async () => {
        if (selectedUsers.length === 0) {
            alert('Selecione pelo menos um usuário para deletar');
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            // Aqui você faria a chamada real para o Supabase
            // Por enquanto, vou simular o SQL que funcionou

            const sqlQuery = `
DO $$
DECLARE
    uids_to_delete UUID[] := ARRAY[
        '${selectedUsers.join("'::UUID,\n        '")}'::UUID
    ];
    doctor_ids UUID[];
    deleted_count INTEGER;
BEGIN
    -- Desabilitar triggers temporariamente
    SET session_replication_role = replica;
    
    -- Obter IDs dos médicos
    SELECT ARRAY_AGG(id) INTO doctor_ids 
    FROM public.doctors 
    WHERE user_id = ANY(uids_to_delete);
    
    -- NÍVEL 3: Deletar dependências mais profundas
    DELETE FROM public.consultation_ai_analyses WHERE doctor_id = ANY(doctor_ids);
    DELETE FROM public.appointment_checkins WHERE patient_id = ANY(uids_to_delete);
    DELETE FROM public.appointment_lock_audit WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.pre_checkin_submissions WHERE patient_id = ANY(uids_to_delete);
    
    -- NÍVEL 2: Deletar referências intermediárias
    DELETE FROM public.appointment_queue WHERE patient_id = ANY(uids_to_delete) OR doctor_id = ANY(doctor_ids);
    DELETE FROM public.appointment_slot_locks WHERE doctor_id = ANY(doctor_ids);
    DELETE FROM public.appointments WHERE patient_id = ANY(uids_to_delete) OR doctor_id = ANY(doctor_ids);
    DELETE FROM public.consultations WHERE doctor_id = ANY(doctor_ids) OR patient_id = ANY(uids_to_delete);
    DELETE FROM public.doctor_reviews WHERE doctor_id = ANY(doctor_ids) OR patient_id = ANY(uids_to_delete);
    DELETE FROM public.medical_records WHERE patient_id = ANY(uids_to_delete) OR doctor_id = ANY(doctor_ids);
    DELETE FROM public.tiss_authorization_requests WHERE patient_id = ANY(uids_to_delete) OR doctor_id = ANY(doctor_ids);
    DELETE FROM public.tiss_guides WHERE patient_id = ANY(uids_to_delete) OR doctor_id = ANY(doctor_ids);
    DELETE FROM public.walk_in_registrations WHERE doctor_id = ANY(doctor_ids) OR patient_id = ANY(uids_to_delete);
    DELETE FROM public.payments WHERE patient_id = ANY(uids_to_delete);
    DELETE FROM public.payroll_items WHERE patient_id = ANY(uids_to_delete);
    DELETE FROM public.schedules WHERE doctor_id = ANY(doctor_ids);
    DELETE FROM public.medical_payroll WHERE doctor_id = ANY(doctor_ids);
    
    -- NÍVEL 1: Deletar referências diretas a doctors
    DELETE FROM public.doctor_contracts WHERE doctor_id = ANY(doctor_ids);
    DELETE FROM public.doctor_health_insurances WHERE doctor_id = ANY(doctor_ids);
    DELETE FROM public.doctors WHERE user_id = ANY(uids_to_delete);
    
    -- Deletar outras referências ao user_id
    DELETE FROM public.account_deletion_requests WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.activation_tokens WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.activity_log WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.aia_triage_sessions WHERE patient_id = ANY(uids_to_delete);
    DELETE FROM public.audit_log WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.audit_logs WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.batch_timeline WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.data_export_requests WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.email_logs WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.lgpd_consents WHERE patient_id = ANY(uids_to_delete);
    DELETE FROM public.notification_preferences WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.notification_queue WHERE patient_id = ANY(uids_to_delete);
    DELETE FROM public.notifications WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.password_reset_tokens WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.patient_credentials WHERE patient_id = ANY(uids_to_delete);
    DELETE FROM public.patient_documents WHERE patient_id = ANY(uids_to_delete);
    DELETE FROM public.patient_sessions WHERE patient_id = ANY(uids_to_delete);
    DELETE FROM public.reschedule_tokens WHERE patient_id = ANY(uids_to_delete);
    DELETE FROM public.user_mfa WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.user_preferences WHERE user_id = ANY(uids_to_delete);
    DELETE FROM public.user_sessions WHERE user_id = ANY(uids_to_delete);
    
    -- Auth schema
    DELETE FROM auth.sessions WHERE user_id = ANY(uids_to_delete);
    DELETE FROM auth.mfa_factors WHERE user_id = ANY(uids_to_delete);
    DELETE FROM auth.one_time_tokens WHERE user_id = ANY(uids_to_delete);
    DELETE FROM auth.oauth_consents WHERE user_id = ANY(uids_to_delete);
    DELETE FROM auth.oauth_authorizations WHERE user_id = ANY(uids_to_delete);
    DELETE FROM auth.identities WHERE user_id = ANY(uids_to_delete);
    
    -- Deletar users (public)
    DELETE FROM public.users WHERE id = ANY(uids_to_delete);
    
    -- Deletar auth.users (por último)
    DELETE FROM auth.users WHERE id = ANY(uids_to_delete);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Reabilitar triggers
    SET session_replication_role = DEFAULT;
    
    RAISE NOTICE '✅ Deleção concluída! % usuários removidos', deleted_count;
END $$;
      `;

            // Simulação de sucesso (em produção, execute o SQL via Supabase)
            await new Promise(resolve => setTimeout(resolve, 2000));

            setResult({
                success: true,
                message: `${selectedUsers.length} usuário(s) deletado(s) com sucesso!`,
                deletedCount: selectedUsers.length,
                sqlQuery: sqlQuery
            });

            setSelectedUsers([]);
            setShowConfirm(false);

        } catch (error) {
            setResult({
                success: false,
                message: error.message || 'Erro ao deletar usuários',
                error: error
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
                        <div className="flex items-center gap-3">
                            <Trash2 className="w-8 h-8" />
                            <div>
                                <h1 className="text-2xl font-bold">Deletar Usuários</h1>
                                <p className="text-red-100 text-sm">Sistema de remoção completa com todas as referências</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Lista de usuários */}
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold mb-4 text-gray-800">
                                Selecione os usuários para deletar:
                            </h2>
                            <div className="space-y-2">
                                {availableUsers.map(user => (
                                    <label
                                        key={user.id}
                                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedUsers.includes(user.id)
                                                ? 'bg-red-50 border-red-500'
                                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => toggleUser(user.id)}
                                            className="w-5 h-5 text-red-600 rounded"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{user.name}</div>
                                            <div className="text-sm text-gray-600">{user.email}</div>
                                            <div className="text-xs text-gray-400 font-mono mt-1">{user.id}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Seleção atual */}
                        {selectedUsers.length > 0 && (
                            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-6">
                                <div className="flex items-center gap-2 text-amber-800">
                                    <AlertTriangle className="w-5 h-5" />
                                    <span className="font-semibold">
                                        {selectedUsers.length} usuário(s) selecionado(s)
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Botão de ação */}
                        <button
                            onClick={() => setShowConfirm(true)}
                            disabled={loading || selectedUsers.length === 0}
                            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Deletando...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-5 h-5" />
                                    Deletar {selectedUsers.length > 0 ? `${selectedUsers.length} Usuário(s)` : 'Usuários'}
                                </>
                            )}
                        </button>

                        {/* Resultado */}
                        {result && (
                            <div className={`mt-6 p-4 rounded-lg ${result.success
                                    ? 'bg-green-50 border-2 border-green-500'
                                    : 'bg-red-50 border-2 border-red-500'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {result.success ? (
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    ) : (
                                        <AlertTriangle className="w-6 h-6 text-red-600" />
                                    )}
                                    <div className="flex-1">
                                        <p className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                            {result.message}
                                        </p>
                                        {result.success && result.sqlQuery && (
                                            <details className="mt-3">
                                                <summary className="cursor-pointer text-sm text-green-700 hover:text-green-900">
                                                    Ver SQL executado
                                                </summary>
                                                <pre className="mt-2 p-3 bg-gray-900 text-green-400 text-xs rounded overflow-x-auto">
                                                    {result.sqlQuery}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Aviso */}
                        <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-600 rounded">
                            <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-800">
                                    <p className="font-semibold mb-2">⚠️ ATENÇÃO - Operação Irreversível!</p>
                                    <ul className="space-y-1 text-xs">
                                        <li>• Deleta o usuário de auth.users e public.users</li>
                                        <li>• Remove TODAS as referências em cascata (50+ tabelas)</li>
                                        <li>• Inclui: consultas, agendamentos, prontuários, pagamentos, etc</li>
                                        <li>• Triggers são desabilitados temporariamente para evitar erros</li>
                                        <li>• NÃO HÁ COMO DESFAZER esta operação!</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal de confirmação */}
                {showConfirm && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-start gap-4">
                                <div className="bg-red-100 rounded-full p-3">
                                    <AlertTriangle className="w-8 h-8 text-red-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Confirmar Deleção
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        Você está prestes a deletar <strong>{selectedUsers.length} usuário(s)</strong> e
                                        todas as suas referências no banco de dados. Esta ação é irreversível!
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => {
                                                deleteUsers();
                                            }}
                                            disabled={loading}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                                        >
                                            Sim, Deletar
                                        </button>
                                        <button
                                            onClick={() => setShowConfirm(false)}
                                            disabled={loading}
                                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeleteUsersButton;
