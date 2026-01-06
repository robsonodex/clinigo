'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Shield, ShieldCheck, ShieldOff, Copy, Check, AlertTriangle, Key } from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'

interface MFAStatus {
    mfa_enabled: boolean
    mfa_verified_at: string | null
    backup_codes_generated_at: string | null
    backup_codes_remaining: number
    recovery_email: string | null
    recovery_email_verified: boolean
}

interface SetupResponse {
    secret: string
    qr_code_uri: string
    issuer: string
}

export function MFASetup() {
    const [status, setStatus] = useState<MFAStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [setupData, setSetupData] = useState<SetupResponse | null>(null)
    const [qrCodeImage, setQrCodeImage] = useState<string>('')
    const [verificationCode, setVerificationCode] = useState('')
    const [disableCode, setDisableCode] = useState('')
    const [backupCodes, setBackupCodes] = useState<string[]>([])
    const [copiedCodes, setCopiedCodes] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [isDisabling, setIsDisabling] = useState(false)
    const [showSetupDialog, setShowSetupDialog] = useState(false)
    const [showDisableDialog, setShowDisableDialog] = useState(false)
    const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false)

    useEffect(() => {
        fetchMFAStatus()
    }, [])

    async function fetchMFAStatus() {
        try {
            const res = await fetch('/api/auth/mfa')
            if (res.ok) {
                const data = await res.json()
                setStatus(data)
            }
        } catch (error) {
            console.error('Failed to fetch MFA status:', error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSetup() {
        try {
            setLoading(true)
            const res = await fetch('/api/auth/mfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'setup' }),
            })

            if (!res.ok) {
                throw new Error('Falha ao configurar MFA')
            }

            const data: SetupResponse = await res.json()
            setSetupData(data)

            // Generate QR code image
            const qrImage = await QRCode.toDataURL(data.qr_code_uri, {
                width: 256,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff',
                },
            })
            setQrCodeImage(qrImage)
            setShowSetupDialog(true)
        } catch (error) {
            toast.error('Erro ao configurar MFA')
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    async function handleVerify() {
        if (!verificationCode || verificationCode.length !== 6) {
            toast.error('Digite um código de 6 dígitos')
            return
        }

        try {
            setIsVerifying(true)
            const res = await fetch('/api/auth/mfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify', code: verificationCode }),
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Código inválido')
                return
            }

            // Show backup codes
            setBackupCodes(data.backup_codes)
            setShowSetupDialog(false)
            setShowBackupCodesDialog(true)

            toast.success('MFA habilitado com sucesso!')
            fetchMFAStatus()
        } catch (error) {
            toast.error('Erro ao verificar código')
            console.error(error)
        } finally {
            setIsVerifying(false)
            setVerificationCode('')
        }
    }

    async function handleDisable() {
        if (!disableCode || disableCode.length !== 6) {
            toast.error('Digite um código de 6 dígitos')
            return
        }

        try {
            setIsDisabling(true)
            const res = await fetch('/api/auth/mfa', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: disableCode }),
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Código inválido')
                return
            }

            toast.success('MFA desabilitado com sucesso')
            setShowDisableDialog(false)
            fetchMFAStatus()
        } catch (error) {
            toast.error('Erro ao desabilitar MFA')
            console.error(error)
        } finally {
            setIsDisabling(false)
            setDisableCode('')
        }
    }

    async function handleGenerateNewBackupCodes() {
        try {
            const res = await fetch('/api/auth/mfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate_backup_codes' }),
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Erro ao gerar códigos')
                return
            }

            setBackupCodes(data.backup_codes)
            setShowBackupCodesDialog(true)
            toast.success('Novos códigos de backup gerados!')
            fetchMFAStatus()
        } catch (error) {
            toast.error('Erro ao gerar códigos de backup')
            console.error(error)
        }
    }

    function copyBackupCodes() {
        const codesText = backupCodes.join('\n')
        navigator.clipboard.writeText(codesText)
        setCopiedCodes(true)
        toast.success('Códigos copiados!')
        setTimeout(() => setCopiedCodes(false), 2000)
    }

    if (loading && !status) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <CardTitle>Autenticação de Dois Fatores (MFA)</CardTitle>
                    </div>
                    <CardDescription>
                        Adicione uma camada extra de segurança à sua conta usando um aplicativo autenticador.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {status?.mfa_enabled ? (
                                <ShieldCheck className="h-8 w-8 text-green-500" />
                            ) : (
                                <ShieldOff className="h-8 w-8 text-muted-foreground" />
                            )}
                            <div>
                                <p className="font-medium">
                                    {status?.mfa_enabled ? 'MFA Ativo' : 'MFA Desativado'}
                                </p>
                                {status?.mfa_verified_at && (
                                    <p className="text-sm text-muted-foreground">
                                        Ativado em {new Date(status.mfa_verified_at).toLocaleDateString('pt-BR')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Badge variant={status?.mfa_enabled ? 'default' : 'secondary'}>
                            {status?.mfa_enabled ? 'Protegido' : 'Desprotegido'}
                        </Badge>
                    </div>

                    {status?.mfa_enabled && (
                        <>
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Key className="h-4 w-4" />
                                        <span className="text-sm">Códigos de Backup</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={status.backup_codes_remaining > 3 ? 'outline' : 'destructive'}>
                                            {status.backup_codes_remaining} restantes
                                        </Badge>
                                        <Button size="sm" variant="outline" onClick={handleGenerateNewBackupCodes}>
                                            Gerar Novos
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {status.backup_codes_remaining <= 3 && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Poucos códigos de backup</AlertTitle>
                                    <AlertDescription>
                                        Você tem apenas {status.backup_codes_remaining} códigos restantes.
                                        Gere novos códigos para manter o acesso à sua conta.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    )}
                </CardContent>

                <CardFooter>
                    {status?.mfa_enabled ? (
                        <Button variant="destructive" onClick={() => setShowDisableDialog(true)}>
                            Desativar MFA
                        </Button>
                    ) : (
                        <Button onClick={handleSetup} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Ativar MFA
                        </Button>
                    )}
                </CardFooter>
            </Card>

            {/* Setup Dialog */}
            <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Configurar Autenticação de Dois Fatores</DialogTitle>
                        <DialogDescription>
                            Escaneie o QR Code com seu aplicativo autenticador (Google Authenticator, Authy, etc.)
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-4 py-4">
                        {qrCodeImage && (
                            <img src={qrCodeImage} alt="MFA QR Code" className="rounded-lg border" />
                        )}

                        {setupData?.secret && (
                            <div className="w-full space-y-2">
                                <p className="text-sm text-muted-foreground text-center">
                                    Ou digite o código manualmente:
                                </p>
                                <code className="block p-2 bg-muted rounded text-center text-sm font-mono break-all">
                                    {setupData.secret}
                                </code>
                            </div>
                        )}

                        <div className="w-full space-y-2">
                            <Label htmlFor="verification-code">Código de Verificação</Label>
                            <Input
                                id="verification-code"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                placeholder="000000"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                className="text-center text-lg tracking-widest"
                            />
                        </div>

                        <Button onClick={handleVerify} disabled={isVerifying} className="w-full">
                            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Verificar e Ativar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Backup Codes Dialog */}
            <Dialog open={showBackupCodesDialog} onOpenChange={setShowBackupCodesDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Códigos de Backup</DialogTitle>
                        <DialogDescription>
                            Guarde estes códigos em um lugar seguro. Cada código só pode ser usado uma vez.
                        </DialogDescription>
                    </DialogHeader>

                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Importante!</AlertTitle>
                        <AlertDescription>
                            Estes códigos não serão mostrados novamente. Salve-os agora!
                        </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                        {backupCodes.map((code, index) => (
                            <div key={index} className="text-center py-1">
                                {code}
                            </div>
                        ))}
                    </div>

                    <Button onClick={copyBackupCodes} variant="outline" className="w-full">
                        {copiedCodes ? (
                            <>
                                <Check className="mr-2 h-4 w-4" />
                                Copiado!
                            </>
                        ) : (
                            <>
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar Códigos
                            </>
                        )}
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Disable MFA Dialog */}
            <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Desativar MFA</DialogTitle>
                        <DialogDescription>
                            Digite o código do seu autenticador para confirmar.
                        </DialogDescription>
                    </DialogHeader>

                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Atenção</AlertTitle>
                        <AlertDescription>
                            Desativar o MFA reduz a segurança da sua conta.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="disable-code">Código de Verificação</Label>
                            <Input
                                id="disable-code"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                placeholder="000000"
                                value={disableCode}
                                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                                className="text-center text-lg tracking-widest"
                            />
                        </div>

                        <Button
                            onClick={handleDisable}
                            disabled={isDisabling}
                            variant="destructive"
                            className="w-full"
                        >
                            {isDisabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Desativação
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
