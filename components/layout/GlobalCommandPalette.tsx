'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Calendar,
    ClipboardList,
    FileCheck2,
    FileText,
    HelpCircle,
    LayoutDashboard,
    Loader2,
    MessageSquare,
    Receipt,
    Search,
    Settings,
    User,
    UserCheck,
    Users,
    Wallet,
    X,
} from 'lucide-react'
import { useRole } from '@/lib/hooks/use-auth'

interface QuickPatientResult {
    id: string
    full_name: string
    phone?: string | null
    cpf?: string | null
    billing_type?: string | null
}

interface QuickNavigationItem {
    id: string
    label: string
    description: string
    href: string
    keywords: string
    icon: React.ComponentType<{ className?: string }>
    visible: boolean
}

interface GlobalCommandPaletteProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

function sanitizePhoneForWhatsApp(phone?: string | null): string | null {
    if (!phone) return null
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) return null
    return digits.startsWith('55') ? digits : `55${digits}`
}

export function GlobalCommandPalette({
    open,
    onOpenChange,
}: GlobalCommandPaletteProps) {
    const router = useRouter()
    const { isClinicAdmin, isSuperAdmin, isReceptionist, isDoctor, role } = useRole()

    const [query, setQuery] = useState('')
    const [patients, setPatients] = useState<QuickPatientResult[]>([])
    const [isSearchingPatients, setIsSearchingPatients] = useState(false)
    const [searchError, setSearchError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const isFinancial = role === 'FINANCIAL'
    const canSeeMedicalRecords = !isReceptionist
    const canSeeFinancial = isClinicAdmin || isSuperAdmin || isFinancial
    const canSeeTiss = isClinicAdmin || isSuperAdmin || isFinancial || isReceptionist
    const canSeeSettings = isClinicAdmin || isSuperAdmin || isReceptionist

    // Atalho global Ctrl+K / Cmd+K
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault()
                onOpenChange(!open)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, onOpenChange])

    // Foco automático e limpeza ao abrir/fechar
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 40)
        } else {
            setQuery('')
            setPatients([])
            setSearchError(null)
        }
    }, [open])

    // Busca de pacientes com debounce e cancelamento (AbortController)
    useEffect(() => {
        if (!open) return
        const trimmed = query.trim()
        if (trimmed.length < 2) {
            setPatients([])
            setIsSearchingPatients(false)
            setSearchError(null)
            return
        }

        const controller = new AbortController()
        const timer = setTimeout(async () => {
            setIsSearchingPatients(true)
            setSearchError(null)
            try {
                const res = await fetch(
                    `/api/patients?search=${encodeURIComponent(trimmed)}&limit=8`,
                    { signal: controller.signal }
                )
                if (!res.ok) {
                    throw new Error('Não foi possível consultar pacientes agora.')
                }
                const payload = await res.json()
                const list = Array.isArray(payload?.patients)
                    ? payload.patients
                    : Array.isArray(payload?.data)
                    ? payload.data
                    : []
                setPatients(list.slice(0, 8))
            } catch (err: any) {
                if (err?.name === 'AbortError') return
                setSearchError('Erro ao buscar pacientes. Tente novamente.')
                setPatients([])
            } finally {
                setIsSearchingPatients(false)
            }
        }, 220)

        return () => {
            clearTimeout(timer)
            controller.abort()
        }
    }, [open, query])

    const quickNavItems = useMemo<QuickNavigationItem[]>(
        () =>
            [
                {
                    id: 'dashboard',
                    label: 'Painel Principal',
                    description: 'Visão geral e radar operacional da clínica',
                    href: '/dashboard',
                    keywords: 'inicio home dashboard painel resumo',
                    icon: LayoutDashboard,
                    visible: true,
                },
                {
                    id: 'agenda',
                    label: 'Agenda de Atendimentos',
                    description: 'Consultas, sessões recorrentes e horários',
                    href: '/dashboard/agenda',
                    keywords: 'agenda consultas horarios sessoes calendario',
                    icon: Calendar,
                    visible: true,
                },
                {
                    id: 'pacientes',
                    label: 'Lista de Pacientes',
                    description: 'Buscar, cadastrar e abrir fichas completas',
                    href: '/dashboard/pacientes',
                    keywords: 'pacientes fichas cadastro prontuario',
                    icon: Users,
                    visible: true,
                },
                {
                    id: 'recepcao',
                    label: 'Recepção e Check-in',
                    description: 'Chegada de pacientes, confirmação e fila',
                    href: '/dashboard/recepcao',
                    keywords: 'recepcao checkin chegada atendimento sala espera',
                    icon: UserCheck,
                    visible: !isDoctor || isClinicAdmin || isSuperAdmin,
                },
                {
                    id: 'prontuarios',
                    label: 'Prontuários e Evoluções',
                    description: 'Registro clínico, assinatura e planos de sessão',
                    href: '/dashboard/prontuarios',
                    keywords: 'prontuario evolucao aba terapia plano sessao',
                    icon: FileText,
                    visible: canSeeMedicalRecords,
                },
                {
                    id: 'contratos',
                    label: 'Contratos e Termos',
                    description: 'Emissão, modelos e assinatura eletrônica',
                    href: '/dashboard/contratos',
                    keywords: 'contratos termos assinatura documentos',
                    icon: FileCheck2,
                    visible: true,
                },
                {
                    id: 'fila-espera',
                    label: 'Fila de Espera',
                    description: 'Pacientes aguardando vaga e contato comercial',
                    href: '/dashboard/terapia/fila-espera',
                    keywords: 'fila espera comercial whatsapp vagas',
                    icon: ClipboardList,
                    visible: true,
                },
                {
                    id: 'tiss',
                    label: 'Convênios e Faturamento TISS',
                    description: 'Lotes, score de saúde, guias e recursos de glosa',
                    href: '/dashboard/tiss',
                    keywords: 'tiss convenios lotes guias glosas faturamento',
                    icon: Receipt,
                    visible: canSeeTiss,
                },
                {
                    id: 'financeiro',
                    label: 'Financeiro e Repasses',
                    description: 'Receitas, despesas, DRE e folha de profissionais',
                    href: '/dashboard/financeiro',
                    keywords: 'financeiro repasse folha dre pagamentos',
                    icon: Wallet,
                    visible: canSeeFinancial,
                },
                {
                    id: 'configuracoes',
                    label: 'Configurações da Clínica',
                    description: 'Módulos clínicos, usuários, salas e integrações',
                    href: '/dashboard/configuracoes',
                    keywords: 'configuracoes modulos clinicos usuarios permissoes',
                    icon: Settings,
                    visible: canSeeSettings,
                },
                {
                    id: 'ajuda',
                    label: 'Central de Ajuda',
                    description: 'Manual passo a passo e guias por perfil',
                    href: '/dashboard/help',
                    keywords: 'ajuda manual guia tutorial suporte',
                    icon: HelpCircle,
                    visible: true,
                },
            ].filter((item) => item.visible),
        [
            isDoctor,
            isClinicAdmin,
            isSuperAdmin,
            canSeeMedicalRecords,
            canSeeTiss,
            canSeeFinancial,
            canSeeSettings,
        ]
    )

    const filteredNavItems = useMemo(() => {
        const q = query.toLowerCase().trim()
        if (!q) return quickNavItems
        return quickNavItems.filter(
            (item) =>
                item.label.toLowerCase().includes(q) ||
                item.description.toLowerCase().includes(q) ||
                item.keywords.toLowerCase().includes(q)
        )
    }, [quickNavItems, query])

    const navigateTo = useCallback(
        (href: string) => {
            onOpenChange(false)
            router.push(href)
        },
        [onOpenChange, router]
    )

    const handleKeyDownInput = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            if (patients.length > 0) {
                event.preventDefault()
                navigateTo(`/dashboard/pacientes/${patients[0].id}`)
            } else if (filteredNavItems.length > 0) {
                event.preventDefault()
                navigateTo(filteredNavItems[0].href)
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>Busca Global e Ações Rápidas</DialogTitle>
                    <DialogDescription>
                        Encontre pacientes e acesse qualquer módulo do CliniGo em segundos.
                    </DialogDescription>
                </DialogHeader>

                {/* Barra de busca principal */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-white pr-12">
                    <Search className="w-5 h-5 text-slate-400 shrink-0" />
                    <Input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDownInput}
                        placeholder="Digite o nome do paciente, CPF ou módulo (ex.: agenda, TISS, contratos)..."
                        className="border-0 shadow-none focus-visible:ring-0 px-1 h-10 text-base sm:text-sm"
                        style={{ fontSize: '16px' }}
                        aria-label="Buscar paciente ou módulo"
                    />
                    {query && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setQuery('')}
                            className="h-8 w-8 text-slate-400 hover:text-slate-700 shrink-0"
                            aria-label="Limpar busca"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>

                {/* Resultados */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-5 bg-slate-50/40">
                    {/* Seção de Pacientes */}
                    {query.trim().length >= 2 && (
                        <section className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    Pacientes ({patients.length})
                                </span>
                                {isSearchingPatients && (
                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Buscando...
                                    </span>
                                )}
                            </div>

                            {searchError ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                                    {searchError}
                                </div>
                            ) : !isSearchingPatients && patients.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500">
                                    Nenhum paciente encontrado para &ldquo;{query.trim()}&rdquo;.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {patients.map((patient) => {
                                        const waPhone = sanitizePhoneForWhatsApp(patient.phone)
                                        return (
                                            <div
                                                key={patient.id}
                                                className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-emerald-300 transition-colors"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigateTo(`/dashboard/pacientes/${patient.id}`)
                                                    }
                                                    className="flex items-center gap-2.5 text-left min-w-0 flex-1 group"
                                                >
                                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-[#155E4B] border border-emerald-200 shrink-0">
                                                        <User className="w-4 h-4" />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 group-hover:text-[#155E4B] truncate">
                                                            {patient.full_name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 truncate">
                                                            {patient.phone || 'Sem telefone cadastrado'}
                                                        </p>
                                                    </div>
                                                </button>

                                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() =>
                                                            navigateTo(
                                                                `/dashboard/pacientes/${patient.id}`
                                                            )
                                                        }
                                                        className="h-8 px-2.5 text-xs bg-[#E6F2EE] text-[#155E4B] hover:bg-[#D5EAE2] border border-emerald-200 shadow-none font-medium"
                                                    >
                                                        Abrir Ficha
                                                    </Button>

                                                    {canSeeMedicalRecords && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                navigateTo(
                                                                    `/dashboard/pacientes/${patient.id}?tab=evolutions`
                                                                )
                                                            }
                                                            className="h-8 px-2.5 text-xs border-slate-200"
                                                        >
                                                            <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                                            Prontuário
                                                        </Button>
                                                    )}

                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            navigateTo(
                                                                `/dashboard/pacientes/${patient.id}?tab=contracts`
                                                            )
                                                        }
                                                        className="h-8 px-2.5 text-xs border-slate-200"
                                                    >
                                                        <FileCheck2 className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                                        Contratos
                                                    </Button>

                                                    {waPhone && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                window.open(
                                                                    `https://wa.me/${waPhone}`,
                                                                    '_blank',
                                                                    'noopener,noreferrer'
                                                                )
                                                                onOpenChange(false)
                                                            }}
                                                            className="h-8 px-2.5 text-xs border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                                                            title="Abrir conversa no WhatsApp"
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                                            WhatsApp
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Seção de Navegação Rápida */}
                    <section className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                Atalhos Rápidos ({filteredNavItems.length})
                            </span>
                            {query.trim().length < 2 && (
                                <span className="text-[11px] text-slate-400">
                                    Digite 2+ letras para buscar pacientes
                                </span>
                            )}
                        </div>

                        {filteredNavItems.length === 0 ? (
                            <p className="text-xs text-slate-500 px-1 py-2">
                                Nenhum módulo corresponde a &ldquo;{query.trim()}&rdquo;.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {filteredNavItems.map((item) => {
                                    const Icon = item.icon
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => navigateTo(item.href)}
                                            className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 text-left transition-colors min-h-[56px]"
                                        >
                                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                                                <Icon className="w-4 h-4" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">
                                                    {item.label}
                                                </p>
                                                <p className="text-xs text-slate-500 line-clamp-1">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </section>
                </div>

                {/* Rodapé com dica de teclado */}
                <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline-flex items-center gap-1">
                            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                Enter
                            </Badge>
                            abrir primeiro resultado
                        </span>
                        <span className="inline-flex items-center gap-1">
                            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                                Esc
                            </Badge>
                            fechar
                        </span>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="h-7 px-2 text-xs text-slate-500"
                    >
                        Fechar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
