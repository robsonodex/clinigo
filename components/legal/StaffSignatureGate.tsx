'use client'

import { useEffect, useState } from 'react'
import { Shield, Loader2, CheckCircle2, FileText } from 'lucide-react'

interface PendingDocument {
    id: string
    title: string
    content: string
    version: string
    type: string
}

export function StaffSignatureGate({ children }: { children: React.ReactNode }) {
    const [checking, setChecking] = useState(true)
    const [needsSignature, setNeedsSignature] = useState(false)
    const [document, setDocument] = useState<PendingDocument | null>(null)
    const [fullName, setFullName] = useState('')
    const [cpf, setCpf] = useState('')
    const [accepted, setAccepted] = useState(false)
    const [signing, setSigning] = useState(false)
    const [signed, setSigned] = useState(false)

    useEffect(() => {
        checkSignature()
    }, [])

    const checkSignature = async () => {
        try {
            const res = await fetch('/api/legal/staff-signature')
            const data = await res.json()
            if (data.needs_signature && data.document) {
                setNeedsSignature(true)
                setDocument(data.document)
            }
        } catch (err) {
            console.error('Signature check error:', err)
        } finally {
            setChecking(false)
        }
    }

    const handleSign = async () => {
        if (!document || !fullName || !accepted) return
        setSigning(true)
        try {
            const res = await fetch('/api/legal/staff-signature', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    document_id: document.id,
                    full_name: fullName,
                    cpf,
                }),
            })
            if (res.ok) {
                setSigned(true)
                setTimeout(() => {
                    setNeedsSignature(false)
                }, 1500)
            }
        } catch (err) {
            console.error('Sign error:', err)
        } finally {
            setSigning(false)
        }
    }

    const formatCpf = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11)
        if (digits.length <= 3) return digits
        if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
        if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
    }

    if (checking) return <>{children}</>
    if (!needsSignature) return <>{children}</>

    if (signed) {
        return (
            <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 to-emerald-700 flex items-center justify-center z-[100]">
                <div className="text-center text-white">
                    <CheckCircle2 className="w-20 h-20 mx-auto mb-4 text-emerald-300" />
                    <h1 className="text-2xl font-bold">Termo Assinado com Sucesso!</h1>
                    <p className="text-emerald-200 mt-2">Redirecionando...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center z-[100] overflow-y-auto">
            <div className="text-white max-w-2xl w-full px-6 py-8">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-8 h-8 text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-bold">Assinatura Obrigatória</h1>
                    <p className="text-slate-400 mt-2">
                        Para continuar utilizando o sistema, é necessário ler e assinar o documento abaixo.
                    </p>
                </div>

                {/* Document */}
                {document && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-5 h-5 text-amber-400" />
                            <h2 className="font-semibold text-lg">{document.title}</h2>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4 max-h-[40vh] overflow-y-auto text-sm text-slate-300 whitespace-pre-line leading-relaxed">
                            {document.content}
                        </div>
                    </div>
                )}

                {/* Signature form */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 space-y-4">
                    <h3 className="font-semibold">Dados do Signatário</h3>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Nome completo *</label>
                        <input
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-slate-500"
                            placeholder="Digite seu nome completo"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">CPF</label>
                        <input
                            value={cpf}
                            onChange={(e) => setCpf(formatCpf(e.target.value))}
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder-slate-500"
                            placeholder="000.000.000-00"
                        />
                    </div>
                    <div className="flex gap-2 text-xs text-slate-400">
                        <span>📅 {new Date().toLocaleDateString('pt-BR')}</span>
                        <span>🕒 {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>

                {/* Accept checkbox */}
                <div className="mb-6">
                    <button
                        onClick={() => setAccepted(!accepted)}
                        className="flex items-start gap-3 text-left hover:text-slate-200 transition-colors"
                    >
                        <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${accepted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}`}>
                            {accepted && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <span className="text-sm">
                            Declaro que li, compreendi e concordo integralmente com todos os termos do documento acima,
                            assumindo as responsabilidades e obrigações nele descritas.
                        </span>
                    </button>
                </div>

                {/* Sign button */}
                <button
                    onClick={handleSign}
                    disabled={!accepted || !fullName || signing}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3 ${
                        accepted && fullName
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-xl'
                            : 'bg-white/10 text-white/30 cursor-not-allowed'
                    }`}
                >
                    {signing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                    ASSINAR DIGITALMENTE
                </button>

                <p className="text-xs text-slate-500 text-center mt-4">
                    Assinatura eletrônica conforme Lei nº 14.063/2020. Registramos data, hora, IP e identificação do signatário.
                </p>
            </div>
        </div>
    )
}
