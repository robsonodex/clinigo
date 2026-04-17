'use client'

/**
 * CertificateUploadModal - Modal de cadastro de certificado digital ICP-Brasil
 * Permite upload de arquivo .pfx com validação e criptografia server-side
 */

import { useState, useCallback } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
    Upload,
    FileKey2,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Lock,
    Shield,
    Eye,
    EyeOff,
} from 'lucide-react'

interface CertificateUploadModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

interface CertificateResult {
    certificate_serial: string
    valid_until: string
    crm: string
    crm_state: string
    owner_name: string
    issuer: string
    days_until_expiry: number
}

export function CertificateUploadModal({ open, onOpenChange, onSuccess }: CertificateUploadModalProps) {
    const [file, setFile] = useState<File | null>(null)
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [state, setState] = useState<UploadState>('idle')
    const [errorMessage, setErrorMessage] = useState('')
    const [result, setResult] = useState<CertificateResult | null>(null)
    const { toast } = useToast()

    const resetForm = useCallback(() => {
        setFile(null)
        setPassword('')
        setState('idle')
        setErrorMessage('')
        setResult(null)
    }, [])

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) resetForm()
        onOpenChange(isOpen)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            const name = selectedFile.name.toLowerCase()
            if (!name.endsWith('.pfx') && !name.endsWith('.p12')) {
                toast({ title: 'Formato inválido', description: 'Selecione um arquivo .pfx ou .p12', variant: 'destructive' })
                return
            }
            setFile(selectedFile)
            setState('idle')
            setErrorMessage('')
        }
    }

    const handleSubmit = async () => {
        if (!file || !password) return

        setState('uploading')
        setErrorMessage('')

        try {
            const formData = new FormData()
            formData.append('pfx_file', file)
            formData.append('pfx_password', password)

            const res = await fetch('/api/pep/sign/certificate', {
                method: 'POST',
                body: formData,
            })

            const data = await res.json()

            if (!res.ok) {
                setState('error')
                setErrorMessage(data.error || 'Erro ao processar certificado')
                return
            }

            setState('success')
            setResult(data)
            setPassword('') // Clear password immediately

            toast({
                title: '✅ Certificado cadastrado',
                description: `Válido até ${data.valid_until}`,
            })

            onSuccess?.()

        } catch {
            setState('error')
            setErrorMessage('Erro de conexão. Tente novamente.')
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileKey2 className="h-5 w-5 text-primary" />
                        Cadastrar Certificado Digital
                    </DialogTitle>
                    <DialogDescription>
                        Envie seu certificado ICP-Brasil (A1) no formato .pfx para habilitar a assinatura digital.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 mt-2">
                    {/* Security notice */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2.5">
                        <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700">
                            Seu certificado é armazenado com <strong>criptografia AES-256 de nível bancário</strong>.
                            A senha do certificado <strong>nunca é salva</strong> — ela é usada apenas para validar e extrair os metadados.
                        </p>
                    </div>

                    {state === 'success' && result ? (
                        /* Success state */
                        <div className="space-y-4">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                                    <span className="font-semibold text-emerald-800">Certificado validado com sucesso!</span>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Titular:</span>
                                        <span className="font-medium">{result.owner_name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">CRM:</span>
                                        <span className="font-medium">{result.crm}-{result.crm_state}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Válido até:</span>
                                        <span className="font-medium">{result.valid_until}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Emissor:</span>
                                        <span className="font-medium text-xs">{result.issuer}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Serial:</span>
                                        <code className="text-[10px] bg-muted px-1 rounded">
                                            {result.certificate_serial.substring(0, 24)}...
                                        </code>
                                    </div>
                                </div>
                            </div>
                            <Button className="w-full" onClick={() => handleClose(false)}>
                                Fechar
                            </Button>
                        </div>
                    ) : (
                        /* Upload form */
                        <>
                            {/* File dropzone */}
                            <div className="space-y-2">
                                <Label htmlFor="pfx-file">Arquivo do certificado (.pfx)</Label>
                                <div
                                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                                        ${file ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30'}`}
                                    onClick={() => document.getElementById('pfx-file')?.click()}
                                >
                                    {file ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <FileKey2 className="w-5 h-5 text-primary" />
                                            <span className="text-sm font-medium">{file.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                ({(file.size / 1024).toFixed(1)} KB)
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">
                                                Clique para selecionar o arquivo <strong>.pfx</strong>
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <input
                                    id="pfx-file"
                                    type="file"
                                    accept=".pfx,.p12"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label htmlFor="pfx-password">Senha do certificado</Label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="pfx-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Digite a senha do seu certificado"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-9 pr-9"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Error message */}
                            {state === 'error' && errorMessage && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-red-700">{errorMessage}</p>
                                </div>
                            )}

                            {/* Submit */}
                            <Button
                                className="w-full"
                                onClick={handleSubmit}
                                disabled={!file || !password || state === 'uploading'}
                            >
                                {state === 'uploading' ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Validando certificado...</>
                                ) : (
                                    <><Shield className="w-4 h-4 mr-2" /> Validar e Cadastrar</>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
