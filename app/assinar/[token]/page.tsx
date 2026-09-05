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
                        ip: json.document.signed_ip,
                        signer: json.document.signer_name,
                        signature_image: json.document.signature_image,
                    })
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar termo')
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
            toast.error('Por favor, marque a declaração de concordância com as normas')
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
                ...json.certificate,
                signature_image: signatureImage,
            })
            toast.success('Documento assinado com sucesso!')
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
        toast.success('Código Hash SHA-256 copiado!')
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 flex items-center justify-center">
                <div className="max-w-2xl w-full space-y-4">
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-96 w-full rounded-xl" />
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-8 flex items-center justify-center">
                <Card className="max-w-md w-full border-border/80 shadow-md">
                    <CardHeader className="text-center">
                        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-2">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-lg">Link Indisponível</CardTitle>
                        <CardDescription className="text-xs">{error}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center text-xs text-muted-foreground">
                        Caso necessite assinar este documento, entre em contato com a recepção da clínica para solicitar um novo link.
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { document: doc, clinic, patient } = data || {}

    return (
        <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 py-6 px-3 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header Institucional da Clínica */}
                <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div className="text-center sm:text-left">
                            <h2 className="font-bold text-base sm:text-lg text-foreground">
                                {clinic?.name || 'Clínica'}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Portal Seguro de Assinatura Eletrônica • CliniGO
                            </p>
                        </div>
                    </div>

                    <Badge variant="outline" className="bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-300 font-semibold text-[11px] px-2.5 py-1 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Ambiente Seguro Criptografado
                    </Badge>
                </div>

                {/* Se já foi assinado: Comprovante de Conclusão */}
                {signedResult ? (
                    <Card className="border border-emerald-300 dark:border-emerald-800 bg-card shadow-sm overflow-hidden">
                        <div className="h-1.5 bg-emerald-500" />
                        <CardHeader className="text-center pb-4 pt-6">
                            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <CardTitle className="text-xl sm:text-2xl font-bold text-foreground">
                                Documento Assinado com Sucesso!
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Sua assinatura eletrônica foi validada e arquivada no prontuário do paciente.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6 pt-0">
                            {/* Certificado de Auditoria */}
                            <div className="p-4 rounded-xl bg-muted/40 border border-border/80 space-y-3 text-xs">
                                <h3 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    Certificado de Autenticidade Digital
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <p className="text-muted-foreground text-[11px]">Signatário / Responsável</p>
                                        <p className="font-semibold text-foreground">{signedResult.signer}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-[11px]">Paciente</p>
                                        <p className="font-semibold text-foreground">{patient?.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-[11px]">Data e Hora da Assinatura</p>
                                        <p className="font-semibold text-foreground">
                                            {new Date(signedResult.signed_at).toLocaleString('pt-BR')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-[11px]">Endereço IP Registrado</p>
                                        <p className="font-semibold text-foreground">{signedResult.ip}</p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-border/60">
                                    <p className="text-muted-foreground text-[11px] mb-1">Hash Criptográfico SHA-256 (Integridade Legal)</p>
                                    <div className="flex items-center gap-2 bg-background p-2 rounded-md border border-border font-mono text-[10px] break-all">
                                        <span className="flex-1">{signedResult.security_hash}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={copyHash}
                                            className="h-6 w-6 shrink-0"
                                            title="Copiar Hash"
                                        >
                                            {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                        </Button>
                                    </div>
                                </div>

                                {signedResult.signature_image && (
                                    <div className="pt-2 border-t border-border/60">
                                        <p className="text-muted-foreground text-[11px] mb-1.5">Rubrica Digital Registrada</p>
                                        <div className="p-2 bg-background rounded-md border border-border inline-block max-w-[240px]">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={signedResult.signature_image}
                                                alt="Rubrica Digital"
                                                className="max-h-16 object-contain"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Base Legal */}
                            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                                Documento assinado eletronicamente com validade jurídica assegurada pela <strong>Medida Provisória nº 2.200-2/2001</strong> e pela <strong>Lei Federal nº 14.063/2020</strong>.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => window.print()}
                                    className="w-full sm:w-auto h-10 gap-2 text-xs font-semibold"
                                >
                                    <Printer className="w-4 h-4" />
                                    Imprimir / Salvar Cópia
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    /* Formulário de Leitura e Assinatura */
                    <Card className="border border-border/80 bg-card shadow-sm">
                        <CardHeader className="border-b border-border/70 pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                                        {doc?.title}
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-1">
                                        Paciente: <strong className="text-foreground">{patient?.name}</strong> • Responsável: <strong className="text-foreground">{doc?.signer_name}</strong>
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="text-[11px] px-2.5 py-0.5 self-start sm:self-center font-medium">
                                    Aguardando Assinatura
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6 pt-5">
                            {/* Visualizador do Texto do Contrato / Termo */}
                            <div>
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-primary" />
                                    Texto Integral do Documento
                                </h3>
                                <div className="p-4 sm:p-5 rounded-xl border border-border bg-muted/10 max-h-[380px] overflow-y-auto font-sans text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap select-text space-y-2">
                                    {doc?.content}
                                </div>
                            </div>

                            {/* Dados do Signatário para Confirmação */}
                            <div className="p-4 rounded-xl border border-border/70 bg-muted/20 space-y-3">
                                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                                    Identificação do Responsável Legal
                                </h3>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="signer_name" className="text-xs font-medium">Nome Completo *</Label>
                                        <Input
                                            id="signer_name"
                                            value={signerName}
                                            onChange={(e) => setSignerName(e.target.value)}
                                            placeholder="Seu nome completo"
                                            className="h-9 text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="signer_cpf" className="text-xs font-medium">CPF do Responsável</Label>
                                        <Input
                                            id="signer_cpf"
                                            value={signerCpf}
                                            onChange={(e) => setSignerCpf(e.target.value)}
                                            placeholder="000.000.000-00"
                                            className="h-9 text-xs font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Quadro de Assinatura com o Dedo (Touch Pad) */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <span>Assinatura Digital (Rubrique no quadro abaixo) *</span>
                                </Label>
                                <SignaturePad
                                    onSave={(dataUrl) => setSignatureImage(dataUrl)}
                                    onClear={() => setSignatureImage(null)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Checkbox de Aceite Formal */}
                            <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-3">
                                <Checkbox
                                    id="consent"
                                    checked={acceptedConsent}
                                    onCheckedChange={(c) => setAcceptedConsent(!!c)}
                                    className="mt-0.5 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                />
                                <label
                                    htmlFor="consent"
                                    className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed cursor-pointer font-medium"
                                >
                                    Declaro, sob as penas da lei, que sou o(a) responsável legal pelo paciente <strong>{patient?.name}</strong>, li integralmente o documento acima, estou de pleno acordo com todas as cláusulas e reconheço a autenticidade e plena validade jurídica desta assinatura eletrônica (nos termos da MP 2.200-2/2001 e Lei 14.063/2020).
                                </label>
                            </div>

                            {/* Botão de Finalizar */}
                            <div className="pt-2">
                                <Button
                                    onClick={handleSign}
                                    disabled={isSubmitting || !acceptedConsent || !signatureImage}
                                    className="w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                                >
                                    <ShieldCheck className="w-5 h-5" />
                                    {isSubmitting ? 'Validando e Registrando...' : 'Confirmar e Assinar Digitalmente'}
                                </Button>

                                <p className="text-[11px] text-muted-foreground text-center mt-2.5">
                                    Serão registrados o seu endereço IP, carimbo de data/hora e hash de integridade criptográfica.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
