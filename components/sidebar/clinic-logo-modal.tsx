'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { uploadClinicLogo } from '@/app/actions/white-label'
import { toast } from 'sonner'
import {
    ImageIcon,
    Loader2,
    Settings,
    Trash2,
    Upload,
    CheckCircle2,
} from 'lucide-react'

interface ClinicLogoModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    clinicId?: string | null
    clinicName?: string | null
    currentLogoUrl?: string | null
    onLogoUpdated?: () => Promise<void> | void
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024

export function ClinicLogoModal({
    open,
    onOpenChange,
    clinicId,
    clinicName,
    currentLogoUrl,
    onLogoUpdated,
}: ClinicLogoModalProps) {
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const previewUrlRef = useRef<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isRemoving, setIsRemoving] = useState(false)
    const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)

    // Limpa estado temporário ao fechar o modal e revoga object URL ao desmontar
    useEffect(() => {
        if (!open) {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current)
                previewUrlRef.current = null
            }
            setSelectedFile(null)
            setPreviewUrl(null)
            setIsDragging(false)
            setConfirmRemoveOpen(false)
        }
    }, [open])

    useEffect(() => {
        return () => {
            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current)
                previewUrlRef.current = null
            }
        }
    }, [])

    const handleSelectFile = (file: File | null | undefined) => {
        if (!file) return

        if (!file.type.startsWith('image/')) {
            toast.error('Selecione um arquivo de imagem válido (PNG, JPG, WebP ou SVG).')
            return
        }

        if (file.size > MAX_LOGO_BYTES) {
            toast.error('A imagem deve ter no máximo 2MB.')
            return
        }

        if (previewUrlRef.current) {
            URL.revokeObjectURL(previewUrlRef.current)
        }

        const nextUrl = URL.createObjectURL(file)
        previewUrlRef.current = nextUrl
        setSelectedFile(file)
        setPreviewUrl(nextUrl)
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleSelectFile(e.target.files?.[0])
        e.target.value = ''
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        handleSelectFile(e.dataTransfer.files?.[0])
    }

    const handleSave = async () => {
        if (!selectedFile) {
            fileInputRef.current?.click()
            return
        }

        if (!clinicId) {
            toast.error('Identificador da clínica não encontrado. Recarregue a página e tente novamente.')
            return
        }

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', selectedFile)
            formData.append('clinicId', clinicId)

            const result = await uploadClinicLogo(formData)

            if (result.success && result.url) {
                toast.success('Logotipo da clínica salvo com sucesso!')
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent('clinic-profile-updated', {
                            detail: { logo_url: result.url },
                        })
                    )
                }
                await onLogoUpdated?.()
                onOpenChange(false)
            } else {
                toast.error(result.error || 'Erro ao enviar o logotipo.')
            }
        } catch {
            toast.error('Erro ao processar a imagem. Tente novamente.')
        } finally {
            setIsUploading(false)
        }
    }

    const handleConfirmRemove = async () => {
        if (!clinicId) return

        setIsRemoving(true)
        try {
            const response = await fetch(`/api/clinics/${clinicId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logo_url: null }),
            })
            const result = await response.json().catch(() => ({}))

            if (!response.ok || !result.success) {
                toast.error(result.error?.message || 'Erro ao remover o logotipo.')
                return
            }

            toast.success('Logotipo removido com sucesso.')
            if (typeof window !== 'undefined') {
                window.dispatchEvent(
                    new CustomEvent('clinic-profile-updated', {
                        detail: { logo_url: null },
                    })
                )
            }
            await onLogoUpdated?.()
            setConfirmRemoveOpen(false)
            onOpenChange(false)
        } catch {
            toast.error('Erro de conexão ao remover o logotipo.')
        } finally {
            setIsRemoving(false)
        }
    }

    const displayedLogo = previewUrl || currentLogoUrl || null

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <ImageIcon className="w-5 h-5 text-primary" />
                            Logotipo da Clínica
                        </DialogTitle>
                        <DialogDescription>
                            Envie a imagem da sua marca para exibi-la no menu lateral, prontuários impressos e página pública da clínica.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Input oculto de arquivo */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/*"
                            onChange={handleInputChange}
                            className="hidden"
                            aria-label="Selecionar arquivo de logotipo da clínica"
                        />

                        {/* Área clicável / drag-and-drop */}
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => fileInputRef.current?.click()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    fileInputRef.current?.click()
                                }
                            }}
                            onDragOver={(e) => {
                                e.preventDefault()
                                setIsDragging(true)
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                                isDragging
                                    ? 'border-primary bg-accent/60'
                                    : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50'
                            }`}
                        >
                            {displayedLogo ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-20 max-w-[220px] px-4 py-2 rounded-lg border border-border bg-card flex items-center justify-center">
                                        <img
                                            src={displayedLogo}
                                            alt={clinicName || 'Prévia do logotipo'}
                                            className="max-h-14 max-w-[190px] w-auto object-contain"
                                        />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium text-foreground">
                                            {selectedFile ? selectedFile.name : 'Logotipo atual da clínica'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Clique aqui ou arraste outra imagem para substituir (PNG, JPG, WebP ou SVG · máx. 2MB)
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2.5">
                                    <div className="w-11 h-11 rounded-lg bg-accent text-primary flex items-center justify-center">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-foreground">
                                            Clique para selecionar a imagem do computador
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            ou arraste e solte aqui · PNG com fundo transparente recomendado (máx. 2MB)
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Prévia no Menu Claro e Menu Escuro */}
                        {displayedLogo && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Prévia no cabeçalho do menu
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-2.5">
                                        <Image
                                            src="/logo_black.svg"
                                            alt="CliniGo"
                                            width={74}
                                            height={24}
                                            style={{ height: '24px', width: 'auto' }}
                                            unoptimized
                                        />
                                        <div className="w-[1px] h-4 bg-border shrink-0" />
                                        <img
                                            src={displayedLogo}
                                            alt="Prévia Menu Claro"
                                            className="h-6 max-w-[82px] object-contain"
                                        />
                                    </div>
                                    <div className="rounded-lg border border-[#1F3A32] bg-[#0D1E19] p-3 flex items-center gap-2.5">
                                        <Image
                                            src="/logo_white.svg"
                                            alt="CliniGo"
                                            width={74}
                                            height={24}
                                            style={{ height: '24px', width: 'auto' }}
                                            unoptimized
                                        />
                                        <div className="w-[1px] h-4 bg-[#243E36] shrink-0" />
                                        <img
                                            src={displayedLogo}
                                            alt="Prévia Menu Escuro"
                                            className="h-6 max-w-[82px] object-contain"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Botões auxiliares: Escolher imagem / Remover / Configurações */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading || isRemoving}
                                >
                                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                                    {displayedLogo ? 'Trocar imagem' : 'Escolher imagem'}
                                </Button>
                                {currentLogoUrl && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setConfirmRemoveOpen(true)}
                                        disabled={isUploading || isRemoving}
                                        className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                        Remover logo
                                    </Button>
                                )}
                            </div>
                            <Link
                                href="/dashboard/configuracoes"
                                prefetch={false}
                                onClick={() => onOpenChange(false)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                Mais opções em Configurações
                            </Link>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isUploading || isRemoving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={isUploading || isRemoving || (!selectedFile && Boolean(currentLogoUrl))}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Enviando...
                                </>
                            ) : selectedFile ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Salvar Logotipo
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Selecionar Imagem
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Alerta obrigatório de confirmação para remoção */}
            <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover logotipo da clínica?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o logotipo atual da clínica? Esta ação não pode ser desfeita e o espaço voltará a exibir o botão &quot;+ Sua Logo&quot;.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isRemoving}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault()
                                handleConfirmRemove()
                            }}
                            disabled={isRemoving}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isRemoving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Removendo...
                                </>
                            ) : (
                                'Sim, remover logotipo'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
