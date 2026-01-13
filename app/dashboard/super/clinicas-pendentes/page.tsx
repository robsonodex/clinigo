'use client'

import { useState, useEffect } from 'react'
import { Building2, CheckCircle, XCircle, Clock, Loader2, ChevronDown, ChevronUp, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface PendingClinic {
    id: string
    name: string
    cnpj: string
    email: string
    phone: string
    responsible_name: string
    responsible_phone: string
    plan_type: string
    address: any
    created_at: string
}

export default function ClinicasPendentesPage() {
    const [clinics, setClinics] = useState<PendingClinic[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [expandedClinic, setExpandedClinic] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [showRejectModal, setShowRejectModal] = useState<string | null>(null)

    useEffect(() => {
        fetchPendingClinics()
    }, [])

    const fetchPendingClinics = async () => {
        try {
            const response = await fetch('/api/super-admin/pending-clinics')
            const data = await response.json()

            if (data.success) {
                setClinics(data.clinics)
            } else {
                toast.error('Erro ao carregar clínicas pendentes')
            }
        } catch (error) {
            toast.error('Erro ao carregar clínicas pendentes')
        } finally {
            setIsLoading(false)
        }
    }

    const handleApprove = async (clinicId: string) => {
        setActionLoading(clinicId)

        try {
            const response = await fetch('/api/super-admin/approve-clinic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicId })
            })

            const data = await response.json()

            if (data.success) {
                toast.success(data.message)
                setClinics(clinics.filter(c => c.id !== clinicId))
            } else {
                toast.error(data.error?.message || 'Erro ao aprovar clínica')
            }
        } catch (error) {
            toast.error('Erro ao aprovar clínica')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (clinicId: string) => {
        setActionLoading(clinicId)

        try {
            const response = await fetch('/api/super-admin/reject-clinic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicId, reason: rejectReason })
            })

            const data = await response.json()

            if (data.success) {
                toast.success(data.message)
                setClinics(clinics.filter(c => c.id !== clinicId))
                setShowRejectModal(null)
                setRejectReason('')
            } else {
                toast.error(data.error?.message || 'Erro ao rejeitar clínica')
            }
        } catch (error) {
            toast.error('Erro ao rejeitar clínica')
        } finally {
            setActionLoading(null)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatCNPJ = (cnpj: string) => {
        if (!cnpj) return 'Não informado'
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Building2 className="h-8 w-8 text-emerald-600" />
                    <h1 className="text-2xl font-bold text-gray-900">Clínicas Pendentes</h1>
                </div>
                <p className="text-gray-600">
                    Revise e aprove ou rejeite cadastros de novas clínicas
                </p>
            </div>

            {/* Stats */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <Clock className="h-6 w-6 text-amber-600" />
                <span className="text-amber-800 font-medium">
                    {clinics.length} {clinics.length === 1 ? 'clínica aguardando' : 'clínicas aguardando'} aprovação
                </span>
            </div>

            {/* Clinics List */}
            {clinics.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma clínica pendente</h3>
                    <p className="text-gray-500">Todas as solicitações foram processadas!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {clinics.map((clinic) => (
                        <div
                            key={clinic.id}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm"
                        >
                            {/* Clinic Header */}
                            <div className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">{clinic.name}</h3>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${clinic.plan_type === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
                                                    clinic.plan_type === 'PRO' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {clinic.plan_type}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                            <div>
                                                <span className="text-gray-400">CNPJ:</span> {formatCNPJ(clinic.cnpj)}
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Email:</span> {clinic.email}
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Responsável:</span> {clinic.responsible_name || 'Não informado'}
                                            </div>
                                            <div>
                                                <span className="text-gray-400">Telefone:</span> {clinic.phone || clinic.responsible_phone || 'Não informado'}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-3">
                                            Cadastrado em: {formatDate(clinic.created_at)}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => setExpandedClinic(expandedClinic === clinic.id ? null : clinic.id)}
                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Ver detalhes"
                                        >
                                            {expandedClinic === clinic.id ? (
                                                <ChevronUp className="h-5 w-5" />
                                            ) : (
                                                <ChevronDown className="h-5 w-5" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleApprove(clinic.id)}
                                            disabled={actionLoading === clinic.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {actionLoading === clinic.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="h-4 w-4" />
                                            )}
                                            Aprovar
                                        </button>
                                        <button
                                            onClick={() => setShowRejectModal(clinic.id)}
                                            disabled={actionLoading === clinic.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <XCircle className="h-4 w-4" />
                                            Rejeitar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedClinic === clinic.id && (
                                <div className="px-6 pb-6 pt-0 border-t border-gray-100">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3 mt-4">Endereço</h4>
                                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                                        {clinic.address ? (
                                            <>
                                                {clinic.address.street && `${clinic.address.street}, ${clinic.address.number || 'S/N'}`}
                                                {clinic.address.complement && ` - ${clinic.address.complement}`}
                                                <br />
                                                {clinic.address.neighborhood && `${clinic.address.neighborhood}, `}
                                                {clinic.address.city && `${clinic.address.city}`}
                                                {clinic.address.state && ` - ${clinic.address.state}`}
                                                {clinic.address.zip && ` | CEP: ${clinic.address.zip}`}
                                            </>
                                        ) : (
                                            'Endereço não informado'
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rejeitar Clínica</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Deseja informar um motivo para a rejeição? (opcional)
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Ex: Documentação incompleta, CNPJ inválido..."
                            className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => {
                                    setShowRejectModal(null)
                                    setRejectReason('')
                                }}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleReject(showRejectModal)}
                                disabled={actionLoading === showRejectModal}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {actionLoading === showRejectModal ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    'Confirmar Rejeição'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
