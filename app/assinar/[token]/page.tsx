'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { SignaturePad } from '@/components/signature/SignaturePad'
import {
    ShieldCheck,
    FileText,
    CheckCircle2,
    Lock,
    Printer,
    Building2,
    Calendar,
    User,
    AlertCircle,
    Copy,
    Check,
    Briefcase,
    FileSignature
} from 'lucide-react'
import { toast } from 'sonner'

export default function PublicSignaturePage() {
    const params = useParams()
    const token = params?.token as string

    const [isLoading, setIsLoading] = useState(true)
    const [data, setData] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    // Form de assinatura
    const [signerName, setSignerName] = useState('')
    const [signerCpf, setSignerCpf] = useState('')
    const [signatureImage, setSignatureImage] = useState<string | null>(null)
    const [acceptedConsent, setAcceptedConsent] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [signedResult, setSignedResult] = useState<any>(null)
    const [copiedHash, setCopiedHash] = useState(false)

    useEffect(() => {
        if (!token) return

        const fetchDoc = async () => {
            try {
                setIsLoading(true)
                const res = await fetch(`/api/public/signature/${token}`)
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.error || 'Link inválido ou expirado')
                }
                const json = await res.json()
                setData(json)
                setSignerName(json.document?.signer_name || '')
                setSignerCpf(json.document?.signer_cpf || '')

                if (json.document?.status === 'SIGNED') {
                    setSignedResult({
                        document_id: json.document.id,
                        signed_at: json.document.signed_at,
                        security_hash: json.document.security_hash,
                        ip: json.document.signed_ip || 'IP Auditado',
                        signer: json.document.signer_name,
                        signature_image: json.document.signature_image,
                    })
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar documento')
            } finally {
                setIsLoading(false)
            }
        }

        fetchDoc()
    }, [token])

    const handleSign = async () => {
        if (!signerName.trim()) {
            toast.error('Por favor, informe seu nome completo')
            return
        }

        if (!signatureImage) {
            toast.error('Por favor, desenhe sua assinatura no quadro')
            return
        }

        if (!acceptedConsent) {
            toast.error('Por favor, confirme a declaração de concordância')
            return
        }

        try {
            setIsSubmitting(true)
            const res = await fetch(`/api/public/signature/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    signature_data_url: signatureImage,
                    signer_name: signerName.trim(),
                    signer_cpf: signerCpf.trim(),
                }),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao registrar assinatura')
            }

            const json = await res.json()
            setSignedResult({
                signer: json.signer_name || signerName,
                signed_at: json.signed_at || new Date().toISOString(),
                security_hash: json.security_hash,
                ip: json.ip || 'Conexão Registrada',
                signature_image: signatureImage,
            })
            toast.success('Assinatura eletrônica concluída com sucesso')
        } catch (err: any) {
            toast.error(err.message || 'Erro ao finalizar assinatura')
        } finally {
            setIsSubmitting(false)
        }
    }

    const copyHash = () => {
        if (!signedResult?.security_hash) return
        navigator.clipboard.writeText(signedResult.security_hash)
        setCopiedHash(true)
        setTimeout(() => setCopiedHash(false), 2000)
        toast.success('Código Hash SHA-256 copiado para a área de transferência')
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center">
                <div className="max-w-2xl w-full space-y-4">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-96 w-full rounded-xl" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center">
                <Card className="max-w-md w-full border-slate-200 shadow-md">
                    <CardHeader className="text-center">
                        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-2">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-lg text-slate-900">Link Indisponível ou Expirado</CardTitle>
                        <CardDescription className="text-xs text-slate-600">{error}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-xs text-slate-500">
                        Caso necessite assinar este documento, entre em contato com a clínica para solicitar a emissão de um novo link.
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { target_type, document: doc, clinic, patient, professional } = data || {}
    const isContractDoc = target_type === 'CONTRACT'
    const isProfessionalDoc = target_type === 'PROFESSIONAL'

    return (
        <div className="min-h-screen bg-slate-50/70 py-6 px-3 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Cabeçalho Institucional */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div className="text-center sm:text-left">
                            <h2 className="font-bold text-base sm:text-lg text-slate-900">
                                {clinic?.name || 'Clínica'}
                            </h2>
                            <p className="text-xs text-slate-500">
                                Portal de Assinatura Eletrônica • CliniGO
                            </p>
                        </div>
                    </div>

                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold text-[11px] px-2.5 py-1 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Ambiente Seguro Criptografado
                    </Badge>
                </div>

                {/* Se já foi assinado: Certificado Probatório */}
                {signedResult ? (
                    <Card className="border border-emerald-300 bg-white shadow-sm overflow-hidden">
                        <div className="h-1.5 bg-emerald-600" />
                        <CardHeader className="text-center pb-4 pt-6">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900">
                                Documento Assinado com Sucesso
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm text-slate-600">
                                Sua assinatura eletrônica foi validada e registrada com integridade probatória.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 pt-0">
                            {/* Certificado de Autenticidade */}
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                                    Certificado de Autenticidade Digital
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <p className="text-slate-500 text-[11px]">Signatário</p>
                                        <p className="font-semibold text-slate-900">{signedResult.signer}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[11px]">Documento</p>
                                        <p className="font-semibold text-slate-900">{doc?.document_number || doc?.title}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[11px]">Data e Hora da Assinatura</p>
                                        <p className="font-semibold text-slate-900">
                                            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(signedResult.signed_at))}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[11px]">IP Registrado</p>
                                        <p className="font-semibold text-slate-900 font-mono text-[11px]">{signedResult.ip}</p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200">
                                    <p className="text-slate-500 text-[11px] mb-1">Hash Criptográfico SHA-256 (Integridade Legal)</p>
                                    <div className="flex items-center gap-2 bg-white p-2 rounded-md border border-slate-300 font-mono text-[10px] break-all">
                                        <span className="flex-1 text-slate-800">{signedResult.security_hash}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={copyHash}
                                            className="h-7 w-7 shrink-0"
                                            title="Copiar Hash"
                                        >
                                            {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                        </Button>
                                    </div>
                                </div>

                                {signedResult.signature_image && (
                                    <div className="pt-2 border-t border-slate-200">
                                        <p className="text-slate-500 text-[11px] mb-1.5">Rubrica Manuscrita Registrada</p>
                                        <div className="p-2 bg-white rounded-md border border-slate-200 inline-block max-w-[240px]">
                                            <img
                                                src={signedResult.signature_image}
                                                alt="Rubrica Digital"
                                                className="max-h-16 object-contain"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                                Documento assinado eletronicamente com validade jurídica assegurada pela <strong>Medida Provisória nº 2.200-2/2001</strong>, pela <strong>Lei Federal nº 14.063/2020</strong> e pelo <strong>art. 784, §4º do CPC</strong>.
                            </p>

                            <div className="flex justify-center pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => window.print()}
                                    className="h-11 min-h-[44px] px-6 text-xs font-semibold border-slate-300"
                                >
                                    <Printer className="w-4 h-4 mr-2 text-slate-600" />
                                    Imprimir / Salvar Comprovante
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    /* Formulário de Leitura e Assinatura */
                    <Card className="border border-slate-200 bg-white shadow-sm">
                        <CardHeader className="border-b border-slate-200 pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {doc?.document_number && (
                                            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                                {doc.document_number}
                                            </span>
                                        )}
                                        {doc?.signer_role && (
                                            <Badge variant="outline" className="text-xs uppercase text-slate-700">
                                                {doc.signer_role}
                                            </Badge>
                                        )}
                                    </div>
                                    <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">
                                        {doc?.title}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500 mt-1">
                                        Signatário: <strong className="text-slate-800">{doc?.signer_name}</strong>
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 text-amber-700 border-amber-300 bg-amber-50 shrink-0 self-start sm:self-center">
                                    Aguardando Assinatura
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6 pt-5">
                            {/* Texto do Instrumento */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    Texto Integral do Documento
                                </h3>
                                <div className="p-4 sm:p-5 rounded-xl border border-slate-200 bg-slate-50/50 max-h-[380px] overflow-y-auto font-serif text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap select-text">
                                    {doc?.content}
                                </div>
                            </div>

                            {/* Confirmação de Identidade */}
                            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-3">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-emerald-700" />
                                    Confirmação de Dados do Signatário
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="signer_name" className="text-xs font-medium text-slate-700">Nome Completo *</Label>
                                        <Input
                                            id="signer_name"
                                            value={signerName}
                                            onChange={(e) => setSignerName(e.target.value)}
                                            placeholder="Seu nome completo"
                                            className="h-11 min-h-[44px] text-base sm:text-xs border-slate-300 bg-white"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="signer_cpf" className="text-xs font-medium text-slate-700">CPF do Signatário</Label>
                                        <Input
                                            id="signer_cpf"
                                            value={signerCpf}
                                            onChange={(e) => setSignerCpf(e.target.value)}
                                            placeholder="000.000.000-00"
                                            className="h-11 min-h-[44px] text-base sm:text-xs font-mono border-slate-300 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Assinatura Manuscrita com o Dedo (Touch Pad) */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-800">
                                    Assinatura Eletrônica (Desenhe no quadro abaixo com o dedo ou mouse) *
                                </Label>
                                <SignaturePad
                                    onSave={(dataUrl) => setSignatureImage(dataUrl)}
                                    onClear={() => setSignatureImage(null)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Declaração de Aceite Formal */}
                            <div className="p-3.5 rounded-xl border border-emerald-300 bg-emerald-50/60 flex items-start gap-3">
                                <Checkbox
                                    id="consent"
                                    checked={acceptedConsent}
                                    onCheckedChange={(c) => setAcceptedConsent(!!c)}
                                    className="mt-0.5 w-5 h-5 data-[state=checked]:bg-emerald-700 data-[state=checked]:border-emerald-700"
                                />
                                <label
                                    htmlFor="consent"
                                    className="text-xs text-emerald-950 leading-relaxed cursor-pointer font-medium select-none"
                                >
                                    Declaro, sob as penas da lei, que li integralmente o documento acima referente à clínica <strong>{clinic?.name || 'Clínica'}</strong>, estou de pleno acordo com todas as suas cláusulas e condições estipuladas, e reconheço expressamente a autenticidade e plena validade jurídica desta assinatura eletrônica (nos termos do art. 10, §2º da Medida Provisória nº 2.200-2/2001, Lei Federal nº 14.063/2020 e Art. 784, §4º do Código de Processo Civil).
                                </label>
                            </div>

                            {/* Botão de Conclusão */}
                            <div className="pt-2">
                                <Button
                                    onClick={handleSign}
                                    disabled={isSubmitting || !acceptedConsent || !signatureImage}
                                    className="w-full h-12 min-h-[48px] text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2"
                                >
                                    <ShieldCheck className="w-5 h-5" />
                                    {isSubmitting ? 'Validando e Gravando Assinatura...' : 'Confirmar e Assinar Eletronicamente'}
                                </Button>

                                <p className="text-[11px] text-slate-500 text-center mt-2.5">
                                    Ao assinar, serão registrados seu endereço IP, carimbo de data/hora UTC e hash criptográfico SHA-256 inalterável.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
