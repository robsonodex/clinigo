'use client'

import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useRole, useAuth } from '@/lib/hooks/use-auth'
import { usePlan } from '@/lib/hooks/use-plan'
import {
    LayoutDashboard,
    Calendar,
    Users,
    Clock,
    CreditCard,
    Settings,
    Building2,
    Layers,
    Video,
    Stethoscope,
    FileText,
    Key,
    Shield,
    BarChart3,
    MessageCircle,
    Package,
    DollarSign,
    FileArchive,
    Scale,
    UserPlus,
    Wallet,
    Receipt,
    HeartPulse,
    Clipboard,
    Send,
    ChevronDown,
    ChevronRight,
    Globe,
    Megaphone,
    Store,
    Users2,
    Lock,
    Activity,
    TrendingUp,
    TrendingDown,
    ShieldAlert,
    Target,
    Upload,
    Bot,
    MessagesSquare,
    ClipboardList,
    UserX,
    Brain,
    CheckCircle2,
    Sun,
    Moon,
    ShieldCheck,
    Plus,
    Tablet,
    FileSignature,
    ClipboardPen,
    CheckSquare,
} from 'lucide-react'
import { useClinic } from '@/lib/hooks/use-clinic'
import { useSidebarTheme } from '@/lib/hooks/use-app-theme'
import { useState, useEffect, useCallback } from 'react'
import type { PlanType } from '@/lib/constants/plans'
import { type FeatureKey, FEATURE_KEYS } from '@/lib/constants/features'
import { isClinicAuthorizedForContracts, isClinicAuthorizedForTeleconsulta, WORLD_SENSORY_CLINIC_ID } from '@/lib/constants/contracts-allowlist'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface HoveredNavTooltip {
    label: string
    badge?: string
    top: number
    left: number
}

interface NavItem {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    roles?: ('SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'NURSE' | 'STAFF' | 'FINANCIAL' | 'READONLY')[]
    badge?: string
    minPlan?: 'BASICO' | 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE'
    featureKey?: FeatureKey
    children?: NavItem[]
}

interface NavSection {
    title: string
    items: NavItem[]
}

/**
 * NAVEGAÇÃO COMPLETA - CliniGo SaaS
 */
const navigationSections: NavSection[] = [
    {
        title: 'Principal',
        items: [
            {
                title: 'Dashboard',
                href: '/dashboard',
                icon: LayoutDashboard,
                featureKey: FEATURE_KEYS.DASHBOARD,
            },
            {
                title: 'Tarefas',
                href: '/dashboard/tarefas',
                icon: CheckSquare,
                roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF'],
            },
            {
                title: 'Checklist Inicial',
                href: '/dashboard/onboarding',
                icon: CheckCircle2,
                roles: ['CLINIC_ADMIN'],
                // Visível apenas para CLINIC_ADMIN — após 30 dias some automaticamente
            },
        ],
    },
    {
        title: 'Agendamento',
        items: [
            {
                title: 'Agenda',
                href: '/dashboard/agenda',
                icon: Calendar,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
                featureKey: FEATURE_KEYS.AGENDA,
            },
            {
                title: 'Minha Agenda',
                href: '/dashboard/minha-agenda',
                icon: Calendar,
                roles: ['DOCTOR'],
                featureKey: FEATURE_KEYS.AGENDA,
            },
            {
                title: 'Teleconsulta',
                href: '/dashboard/teleconsulta',
                icon: Video,
                roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST'],
            },
            {
                title: 'Recepção',
                href: '/dashboard/recepcao',
                icon: Clipboard,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
                featureKey: FEATURE_KEYS.RECEPCAO,
            },
            {
                title: 'Horários',
                href: '/dashboard/horarios',
                icon: Clock,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
                featureKey: FEATURE_KEYS.HORARIOS,
            },
        ],
    },
    // DYNAMIC: 'Equipe' section uses professionalLabel — injected at render time
    {
        title: 'Equipe',
        items: [
            {
                title: '__PROFESSIONAL_PLURAL__',
                href: '/dashboard/medicos',
                icon: Users,
                roles: ['CLINIC_ADMIN'],
                featureKey: FEATURE_KEYS.MEDICOS,
            },
            {
                title: 'Pacientes',
                href: '/dashboard/pacientes',
                icon: UserPlus,
                roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE', 'STAFF'],
                featureKey: FEATURE_KEYS.PACIENTES,
            },
            {
                title: 'Pre-cadastros',
                href: '/dashboard/pre-cadastros',
                icon: ClipboardPen,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
                featureKey: FEATURE_KEYS.PRE_CADASTROS,
            },
        ],
    },
    {
        title: 'Prontuário',
        items: [
            {
                title: 'Prontuários',
                href: '/dashboard/prontuarios',
                icon: FileText,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
                featureKey: FEATURE_KEYS.PRONTUARIOS,
                // Acessível a todos os planos (BASICO+)
            },
            {
                title: 'Prescrições',
                href: '/dashboard/prescricoes',
                icon: Clipboard,
                roles: ['DOCTOR'],
                minPlan: 'PROFESSIONAL',
                featureKey: FEATURE_KEYS.PRESCRICOES,
            },
            {
                title: 'Documentos',
                href: '/dashboard/documentos',
                icon: FileArchive,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
                featureKey: FEATURE_KEYS.DOCUMENTOS,
                // Apenas ADM e Recepção podem acessar documentos (solicitação Jeferson - Espaço Incluir)
            },
            {
                title: 'Contratos e Assinaturas',
                href: '/dashboard/contratos',
                icon: FileSignature,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
            },
            {
                title: 'Modelos de Contratos',
                href: '/dashboard/contratos/modelos',
                icon: ShieldCheck,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
            },
            {
                title: 'Templates Prontuário',
                href: '/dashboard/configuracoes/templates-prontuario',
                icon: FileText,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
                featureKey: FEATURE_KEYS.TEMPLATES_PRONTUARIO,
            },
            {
                title: 'Planos Terapêuticos',
                href: '/dashboard/planos-terapeuticos',
                icon: ClipboardList,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
                featureKey: FEATURE_KEYS.PLANOS_TERAPEUTICOS,
            },
            {
                title: 'Evoluções',
                href: '/dashboard/evolucoes',
                icon: TrendingUp,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
                featureKey: FEATURE_KEYS.EVOLUCOES,
            },
            {
                title: 'Indicadores de Evolução',
                href: '/dashboard/terapia/conformidade-evolucao',
                icon: BarChart3,
                roles: ['CLINIC_ADMIN'],
                featureKey: FEATURE_KEYS.EVOLUCOES,
            },
            {
                title: 'Controle de Faltas',
                href: '/dashboard/controle-faltas',
                icon: UserX,
                roles: ['CLINIC_ADMIN'],
                featureKey: FEATURE_KEYS.CONTROLE_FALTAS,
            },
        ],
    },
    {
        title: 'Terapia',
        items: [
            {
                title: 'Fluxo e Clínico',
                href: '/dashboard/terapia/fila-espera',
                icon: Stethoscope,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR'],
                children: [
                    {
                        title: 'Fila de Espera',
                        href: '/dashboard/terapia/fila-espera',
                        icon: Clock,
                        featureKey: FEATURE_KEYS.FILA_ESPERA,
                    },
                    {
                        title: 'Encaminhamentos',
                        href: '/dashboard/terapia/encaminhamentos',
                        icon: Send,
                        minPlan: 'AVANCADO',
                        featureKey: FEATURE_KEYS.ENCAMINHAMENTOS,
                    },
                    {
                        title: 'Supervisão',
                        href: '/dashboard/terapia/supervisao',
                        icon: Stethoscope,
                        minPlan: 'AVANCADO',
                        featureKey: FEATURE_KEYS.SUPERVISAO,
                    },
                ],
            },
        ],
    },
    {
        title: 'Financeiro',
        items: [
            {
                title: 'Transações e Caixa',
                href: '/dashboard/financeiro',
                icon: DollarSign,
                roles: ['CLINIC_ADMIN', 'FINANCIAL'],
                featureKey: FEATURE_KEYS.FINANCEIRO,
                children: [
                    {
                        title: 'Lançamentos',
                        href: '/dashboard/financeiro',
                        icon: DollarSign,
                        featureKey: FEATURE_KEYS.FINANCEIRO,
                    },
                    {
                        title: 'Pagamentos',
                        href: '/dashboard/pagamentos',
                        icon: CreditCard,
                        featureKey: FEATURE_KEYS.PAGAMENTOS,
                    },
                    {
                        title: 'Fechamentos de Caixa',
                        href: '/dashboard/financeiro/fechamento',
                        icon: FileText,
                        featureKey: FEATURE_KEYS.FECHAMENTO_CAIXA,
                    },
                    {
                        title: 'Créditos de Pacientes',
                        href: '/dashboard/financial/credits',
                        icon: Wallet,
                        minPlan: 'PROFESSIONAL',
                        featureKey: FEATURE_KEYS.CREDITOS_PACIENTES,
                    },
                ]
            },
            {
                title: 'Repasses e Produção',
                href: '/dashboard/financial/payroll',
                icon: Users,
                roles: ['CLINIC_ADMIN', 'FINANCIAL'],
                minPlan: 'AVANCADO',
                featureKey: FEATURE_KEYS.REPASSE_MEDICO,
                children: [
                    {
                        title: 'Folha de Repasse',
                        href: '/dashboard/financial/payroll',
                        icon: Users,
                    },
                    {
                        title: 'Histórico de Repasses',
                        href: '/dashboard/financial/payroll/historico',
                        icon: FileText,
                    },
                    {
                        title: 'Produção por Profissional',
                        href: '/dashboard/financial/producao',
                        icon: TrendingUp,
                    },
                    {
                        title: 'Notas e Demonstrativos',
                        href: '/dashboard/financial/notas-demonstrativos',
                        icon: Receipt,
                    },
                ]
            },
            {
                title: 'Controladoria e BI',
                href: '/dashboard/financial/dre',
                icon: BarChart3,
                roles: ['CLINIC_ADMIN', 'FINANCIAL'],
                minPlan: 'AVANCADO',
                featureKey: FEATURE_KEYS.DRE,
                children: [
                    {
                        title: 'DRE Consolidada',
                        href: '/dashboard/financial/dre',
                        icon: TrendingUp,
                    },
                    {
                        title: 'Metas e Projeção',
                        href: '/dashboard/financial/goals',
                        icon: Target,
                        minPlan: 'PROFESSIONAL',
                    },
                ]
            },
            {
                title: 'Faturamento TISS',
                href: '/dashboard/tiss',
                icon: Receipt,
                roles: ['CLINIC_ADMIN', 'FINANCIAL'],
                minPlan: 'PROFESSIONAL',
                featureKey: FEATURE_KEYS.FATURAMENTO_TISS,
                children: [
                    {
                        title: 'Guias e Lotes',
                        href: '/dashboard/tiss',
                        icon: Receipt,
                    },
                    {
                        title: 'Gestão de Glosas',
                        href: '/dashboard/tiss/glosas',
                        icon: ShieldAlert,
                    },
                    {
                        title: 'Perdas (BI)',
                        href: '/dashboard/tiss/reports/loss-analysis',
                        icon: TrendingDown,
                    }
                ]
            },
            {
                title: 'Meu Financeiro',
                href: '/dashboard/meu-financeiro',
                icon: Wallet,
                roles: ['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'],
                minPlan: 'AVANCADO',
                featureKey: FEATURE_KEYS.MEU_FINANCEIRO,
                children: [
                    {
                        title: 'Meu Painel',
                        href: '/dashboard/meu-financeiro',
                        icon: Wallet,
                    },
                    {
                        title: 'Meu Histórico',
                        href: '/dashboard/meu-financeiro/historico',
                        icon: FileText,
                    },
                    {
                        title: 'Minha Produção',
                        href: '/dashboard/meu-financeiro/producao',
                        icon: BarChart3,
                    },
                    {
                        title: 'Notas e Demonstrativos',
                        href: '/dashboard/meu-financeiro/notas-demonstrativos',
                        icon: Receipt,
                    }
                ]
            },
            {
                title: 'Convênios e Reembolsos',
                href: '/dashboard/convenios',
                icon: Shield,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'FINANCIAL'],
                featureKey: FEATURE_KEYS.CONVENIOS,
                children: [
                    {
                        title: 'Convênios',
                        href: '/dashboard/convenios',
                        icon: Shield,
                    },
                    {
                        title: 'Regras de Reembolso',
                        href: '/dashboard/configuracoes/reembolso',
                        icon: Receipt,
                    },
                    {
                        title: 'Reembolso por Paciente',
                        href: '/dashboard/configuracoes/reembolso-paciente',
                        icon: Users,
                    },
                ]
            },
        ],
    },
    {
        title: 'Comunicação',
        items: [
            {
                title: 'Chat Interno',
                href: '/dashboard/chat',
                icon: MessagesSquare,
                roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'FINANCIAL'],
                minPlan: 'AVANCADO',
                featureKey: FEATURE_KEYS.CHAT,
            },
            {
                title: 'WhatsApp',
                href: '/dashboard/whatsapp',
                icon: MessageCircle,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
                minPlan: 'AVANCADO',
                featureKey: FEATURE_KEYS.WHATSAPP,
            },
            {
                title: 'Notificações',
                href: '/dashboard/notificacoes',
                icon: Send,
                roles: ['CLINIC_ADMIN', 'FINANCIAL'],
                featureKey: FEATURE_KEYS.NOTIFICACOES,
                // Acessível a todos os planos (BASICO+)
            },
            {
                title: 'FluxoMed',
                href: '/dashboard/crm',
                icon: Megaphone,
                roles: ['CLINIC_ADMIN'],
                minPlan: 'AVANCADO',
                featureKey: FEATURE_KEYS.FLUXOMED,
                children: [
                    {
                        title: 'Automações',
                        href: '/dashboard/crm',
                        icon: Megaphone,
                        minPlan: 'AVANCADO',
                    },
                    {
                        title: 'Pipeline',
                        href: '/dashboard/crm/pipeline',
                        icon: TrendingUp,
                        minPlan: 'AVANCADO',
                    },
                ],
            },
        ],
    },
    {
        title: 'Gestão',
        items: [
            {
                title: 'Estoque',
                href: '/dashboard/estoque',
                icon: Package,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
                featureKey: FEATURE_KEYS.ESTOQUE,
                // Acessível a todos os planos (BASICO+)
            },
            {
                title: 'Relatórios',
                href: '/dashboard/relatorios',
                icon: BarChart3,
                roles: ['CLINIC_ADMIN'],
                featureKey: FEATURE_KEYS.RELATORIOS,
                // Acessível a todos os planos (BASICO+)
            },
            {
                title: 'Termos Legais',
                href: '/dashboard/termos',
                icon: Scale,
                roles: ['CLINIC_ADMIN'],
                featureKey: FEATURE_KEYS.TERMOS_LEGAIS,
                // Acessível a todos os planos (BASICO+)
            },
            {
                title: 'Importação',
                href: '/dashboard/importacao',
                icon: Upload,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
                minPlan: 'AVANCADO',
                featureKey: FEATURE_KEYS.IMPORTACAO,
            },
            {
                title: 'Automação',
                href: '/dashboard/automacao',
                icon: Bot,
                roles: ['CLINIC_ADMIN'],
                minPlan: 'AVANCADO',
                featureKey: FEATURE_KEYS.AUTOMACAO,
                children: [
                    {
                        title: 'Painel',
                        href: '/dashboard/automacao',
                        icon: Bot,
                        minPlan: 'AVANCADO',
                    },
                    {
                        title: 'Configurações',
                        href: '/dashboard/automacao/configuracoes',
                        icon: Settings,
                        minPlan: 'AVANCADO',
                    }
                ]
            },
            {
                title: 'Auditoria',
                href: '/dashboard/logs-auditoria',
                icon: Shield,
                roles: ['CLINIC_ADMIN'],
                featureKey: FEATURE_KEYS.LOGS_AUDITORIA,
            },
        ],
    },
    {
        title: 'Configurações',
        items: [
            {
                title: 'Minha Clínica',
                href: '/dashboard/configuracoes',
                icon: Settings,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
                featureKey: FEATURE_KEYS.MINHA_CLINICA,
            },
            {
                title: 'Página Pública',
                href: '/dashboard/configuracoes/pagina-publica',
                icon: Globe,
                roles: ['CLINIC_ADMIN'],
                featureKey: FEATURE_KEYS.PAGINA_PUBLICA,
            },
            {
                title: 'Usuários',
                href: '/dashboard/configuracoes/usuarios',
                icon: Users,
                roles: ['CLINIC_ADMIN'],
                featureKey: FEATURE_KEYS.USUARIOS,
            },
            {
                title: 'Terapias',
                href: '/dashboard/configuracoes/terapias',
                icon: Stethoscope,
                roles: ['CLINIC_ADMIN'],
                featureKey: FEATURE_KEYS.TERAPIAS_CONFIG,
            },
            {
                title: 'Assinatura',
                href: '/dashboard/configuracoes/assinatura',
                icon: CreditCard,
                roles: ['CLINIC_ADMIN'],
                featureKey: FEATURE_KEYS.ASSINATURA,
            },
            {
                title: 'Segurança',
                href: '/dashboard/seguranca',
                icon: Lock,
                roles: ['CLINIC_ADMIN'],
                featureKey: FEATURE_KEYS.SEGURANCA,
            },
            {
                title: 'Dispositivos Pareados',
                href: '/dashboard/configuracoes/dispositivos',
                icon: Tablet,
                roles: ['CLINIC_ADMIN'],
            },
        ],
    },
    // Admin da Plataforma (Super Admin)
    {
        title: 'Administração',
        items: [
            {
                title: 'Master Hub',
                href: '/system-master-hub',
                icon: Shield,
                roles: ['SUPER_ADMIN'],
            },
            {
                title: 'Clínicas',
                href: '/dashboard/clinicas',
                icon: Building2,
                roles: ['SUPER_ADMIN'],
            },
            {
                title: 'Planos',
                href: '/dashboard/planos',
                icon: Layers,
                roles: ['SUPER_ADMIN'],
            },
            {
                title: 'Cobrança',
                href: '/dashboard/cobranca',
                icon: Wallet,
                roles: ['SUPER_ADMIN'],
            },
            {
                title: 'Grupos',
                href: '/dashboard/grupos',
                icon: Users2,
                roles: ['SUPER_ADMIN'],
            },
            {
                title: 'Relatórios Globais',
                href: '/dashboard/relatorios-globais',
                icon: BarChart3,
                roles: ['SUPER_ADMIN'],
            },
            {
                title: 'API Keys',
                href: '/dashboard/api-keys',
                icon: Key,
                roles: ['SUPER_ADMIN'],
            },
            {
                title: 'Auditoria',
                href: '/dashboard/auditoria',
                icon: Shield,
                roles: ['SUPER_ADMIN'],
            },
            {
                title: 'Health Check',
                href: '/dashboard/health',
                icon: Activity,
                roles: ['SUPER_ADMIN'],
            },
            {
                title: 'Super Admins',
                href: '/dashboard/super/admins',
                icon: Shield,
                roles: ['SUPER_ADMIN'],
            },
        ],
    },
]

// Helper to check if plan meets requirement
function planMeetsMinimum(currentPlan: PlanType, requiredPlan: PlanType): boolean {
    const planOrder: Record<PlanType, number> = {
        'BASICO': 1,
        'AVANCADO': 2,
        'PROFESSIONAL': 3,
        'ENTERPRISE': 4,
        'NETWORK': 5,
    }
    return (planOrder[currentPlan] || 0) >= (planOrder[requiredPlan] || 0)
}

import { VisualLock } from '@/components/sidebar/visual-lock'
import { ClinicLogoModal } from '@/components/sidebar/clinic-logo-modal'
import { getHelpAnchorForMenuHref } from '@/lib/help/help-access'
import { HelpCircle } from 'lucide-react'

function NavItemComponent({
    item,
    isActive,
    currentPlan,
    permissions,
    isMobile = false,
    isDark = false,
    onHoverItem,
}: {
    item: NavItem
    isActive: boolean
    currentPlan: PlanType
    permissions?: Record<string, { enabled: boolean; isCustom: boolean }>
    isMobile?: boolean
    isDark?: boolean
    onHoverItem?: (tooltip: HoveredNavTooltip | null) => void
}) {
    const pathname = usePathname()
    const hasChildren = Boolean(item.children && item.children.length > 0)
    const hasActiveChild = Boolean(
        item.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`))
    )
    const [isOpen, setIsOpen] = useState(isActive || hasActiveChild)
    const [showUpgrade, setShowUpgrade] = useState(false)

    useEffect(() => {
        if (isActive || hasActiveChild) {
            setIsOpen(true)
        }
    }, [isActive, hasActiveChild])

    // Touch-friendly minimum height (44px = min-h-11)
    const touchClass = isMobile ? 'min-h-[44px]' : ''

    if (hasChildren) {
        // Check if user has access to this item's required plan
        const PLAN_ORDER_PARENT: Record<string, number> = {
            'BASICO': 1, 'AVANCADO': 2, 'PROFESSIONAL': 3, 'ENTERPRISE': 4, 'NETWORK': 5
        }
        const parentCurrentLevel = PLAN_ORDER_PARENT[currentPlan] || 0
        const parentRequiredLevel = PLAN_ORDER_PARENT[item.minPlan || 'BASICO'] || 0
        const isParentCustomUnlocked = Boolean(item.featureKey && permissions?.[item.featureKey]?.enabled === true)
        const parentIsLocked = isParentCustomUnlocked ? false : (parentCurrentLevel < parentRequiredLevel)

        return (
            <div>
                <div className={cn(
                    'clinigo-nav-row flex items-center w-full rounded-md transition-all duration-150 group',
                    touchClass,
                    parentIsLocked
                        ? isDark
                            ? 'text-[#96AEA6]/40 hover:bg-white/5'
                            : 'text-muted-foreground/50 hover:bg-muted/50'
                        : (isActive || hasActiveChild)
                            ? isDark
                                ? 'bg-[#155E4B]/25 text-[#9ED3C2] font-semibold'
                                : 'bg-accent/70 text-accent-foreground font-semibold'
                            : isDark
                                ? 'text-[#B5C9C2] hover:bg-white/[0.06] hover:text-[#F2F5F3] active:bg-white/10'
                                : 'text-[#3F524C] hover:bg-muted/80 hover:text-foreground active:bg-muted'
                )}>
                    <button
                        type="button"
                        aria-label={item.title}
                        title={isMobile ? item.title : undefined}
                        onMouseEnter={(e) => {
                            if (isMobile || !onHoverItem) return
                            const rect = e.currentTarget.getBoundingClientRect()
                            onHoverItem({
                                label: item.title,
                                badge: parentIsLocked && item.minPlan ? `Plano ${item.minPlan}` : undefined,
                                top: rect.top + rect.height / 2,
                                left: rect.right + 12,
                            })
                        }}
                        onMouseLeave={() => onHoverItem?.(null)}
                        onClick={() => {
                            onHoverItem?.(null)
                            if (parentIsLocked) {
                                setShowUpgrade(true)
                            } else {
                                setIsOpen(!isOpen)
                            }
                        }}
                        className="flex items-center justify-between flex-1 min-w-0 gap-1.5 px-2.5 py-2 text-sm font-medium text-left"
                    >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <item.icon className={cn(
                                'w-4 h-4 transition-colors shrink-0',
                                isDark
                                    ? (isActive || hasActiveChild) ? 'text-[#2FA687]' : 'text-[#89A29A] group-hover:text-[#F2F5F3]'
                                    : (isActive || hasActiveChild) ? 'text-primary' : 'text-[#5A6C66] group-hover:text-foreground'
                            )} />
                            <span className="truncate">{item.title}</span>
                        </div>
                        {parentIsLocked ? (
                            <Lock className={cn('h-3.5 w-3.5 shrink-0', isDark ? 'text-[#96AEA6]/40' : 'text-muted-foreground/60')} />
                        ) : isOpen ? (
                            <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-150', isDark ? 'text-[#89A29A] group-hover:text-white' : 'text-muted-foreground group-hover:text-foreground')} />
                        ) : (
                            <ChevronRight className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-150', isDark ? 'text-[#89A29A] group-hover:text-white' : 'text-muted-foreground group-hover:text-foreground')} />
                        )}
                    </button>
                    {!parentIsLocked && (
                        <Link
                            href={`/dashboard/help#${getHelpAnchorForMenuHref(item.href, item.title)}`}
                            prefetch={false}
                            onClick={() => onHoverItem?.(null)}
                            className={cn(
                                'clinigo-help-btn hidden group-hover:inline-flex transition-opacity mr-1.5 p-1 rounded-md items-center justify-center cursor-help shrink-0',
                                isDark ? 'hover:bg-white/10 text-[#96AEA6] hover:text-white' : 'hover:bg-border/60 text-muted-foreground hover:text-foreground'
                            )}
                            title="Para que serve? Quando usar? Clique para abrir o guia de ajuda."
                            aria-label={`Ajuda sobre ${item.title}`}
                        >
                            <HelpCircle className="w-3.5 h-3.5" />
                        </Link>
                    )}
                </div>
                {isOpen && !parentIsLocked && (
                    <div className={cn(
                        'ml-3.5 pl-2.5 border-l space-y-0.5 mt-1 mb-1.5 transition-colors',
                        isDark ? 'border-[#243E36]' : 'border-border'
                    )}>
                        {item.children?.map((child) => {
                            const hasMoreSpecificSiblingActive = Boolean(item.children?.some(
                                sibling => sibling.href !== child.href &&
                                           sibling.href.startsWith(`${child.href}/`) &&
                                           (pathname === sibling.href || pathname.startsWith(`${sibling.href}/`))
                            ))
                            const isChildActive = !hasMoreSpecificSiblingActive && (pathname === child.href || pathname.startsWith(`${child.href}/`))
                            const isChildCustomUnlocked = Boolean(child.featureKey && permissions?.[child.featureKey]?.enabled === true)
                            const effectivePlan = isChildCustomUnlocked ? 'BASICO' : (child.minPlan || 'BASICO')
                            return (
                                <VisualLock
                                    key={child.href}
                                    requiredPlan={effectivePlan}
                                    currentPlan={currentPlan}
                                    featureName={child.title}
                                >
                                    <div className={cn(
                                        'clinigo-nav-row flex items-center rounded-md transition-all duration-150 group',
                                        touchClass,
                                        isDark
                                            ? isChildActive
                                                ? 'bg-[#155E4B]/30 text-[#9ED3C2] font-semibold'
                                                : 'text-[#96AEA6] hover:bg-white/[0.06] hover:text-[#F2F5F3] active:bg-white/10'
                                            : isChildActive
                                                ? 'bg-accent text-accent-foreground font-semibold'
                                                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground active:bg-muted'
                                    )}>
                                        <Link
                                            href={child.href}
                                            prefetch={false}
                                            aria-label={child.title}
                                            title={isMobile ? child.title : undefined}
                                            onMouseEnter={(e) => {
                                                if (isMobile || !onHoverItem) return
                                                const rect = e.currentTarget.getBoundingClientRect()
                                                onHoverItem({
                                                    label: child.title,
                                                    top: rect.top + rect.height / 2,
                                                    left: rect.right + 12,
                                                })
                                            }}
                                            onMouseLeave={() => onHoverItem?.(null)}
                                            onClick={() => onHoverItem?.(null)}
                                            className="flex items-center gap-2 flex-1 min-w-0 px-2 py-1.5 text-[13px] font-medium"
                                        >
                                            <child.icon className={cn(
                                                'w-3.5 h-3.5 transition-colors shrink-0',
                                                isDark
                                                    ? isChildActive ? 'text-[#2FA687]' : 'text-[#89A29A] group-hover:text-[#F2F5F3]'
                                                    : isChildActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                                            )} />
                                            <span className="truncate">{child.title}</span>
                                        </Link>
                                        <Link
                                            href={`/dashboard/help#${getHelpAnchorForMenuHref(child.href, child.title)}`}
                                            prefetch={false}
                                            onClick={() => onHoverItem?.(null)}
                                            className={cn(
                                                'clinigo-help-btn hidden group-hover:inline-flex transition-opacity mr-1 p-1 rounded-md items-center justify-center cursor-help shrink-0',
                                                isDark ? 'hover:bg-white/10 text-[#96AEA6] hover:text-white' : 'hover:bg-border/60 text-muted-foreground hover:text-foreground'
                                            )}
                                            title="Para que serve? Quando usar? Clique para abrir o guia de ajuda."
                                            aria-label={`Ajuda sobre ${child.title}`}
                                        >
                                            <HelpCircle className="w-3 h-3" />
                                        </Link>
                                    </div>
                                </VisualLock>
                            )
                        })}
                    </div>
                )}
                {/* UpgradeModal para itens bloqueados com children */}
                {parentIsLocked && (
                    <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-primary" />
                                    Recurso do Plano {item.minPlan}
                                </DialogTitle>
                                <DialogDescription>
                                    <strong>{item.title}</strong> requer o plano <strong>{item.minPlan}</strong> ou superior.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" className="flex-1" onClick={() => setShowUpgrade(false)}>Depois</Button>
                                <Button className="flex-1" onClick={() => { window.location.href = '/dashboard/configuracoes/assinatura' }}>Ver Planos</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        )
    }

    // Check if user has access to this item's required plan
    const PLAN_ORDER: Record<string, number> = {
        'BASICO': 1, 'AVANCADO': 2, 'PROFESSIONAL': 3, 'ENTERPRISE': 4, 'NETWORK': 5
    }
    const currentLevel = PLAN_ORDER[currentPlan] || 0
    const requiredLevel = PLAN_ORDER[item.minPlan || 'BASICO'] || 0
    const isItemCustomUnlocked = Boolean(item.featureKey && permissions?.[item.featureKey]?.enabled === true)
    const isLocked = isItemCustomUnlocked ? false : (currentLevel < requiredLevel)

    return (
        <div className={cn(
            'clinigo-nav-row flex items-center rounded-md transition-all duration-150 relative group',
            touchClass,
            isActive
                ? isDark
                    ? 'bg-[#155E4B]/30 text-[#9ED3C2] font-semibold'
                    : 'bg-accent text-accent-foreground font-semibold'
                : isLocked
                    ? isDark
                        ? 'text-[#96AEA6]/40 hover:bg-white/5'
                        : 'text-muted-foreground/50 hover:bg-muted/50'
                    : item.title === 'Checklist Inicial'
                        ? isDark
                            ? 'text-[#73C7AE] hover:bg-white/[0.06] font-semibold'
                            : 'text-primary hover:bg-accent/60 font-semibold'
                        : isDark
                            ? 'text-[#B5C9C2] hover:bg-white/[0.06] hover:text-[#F2F5F3] active:bg-white/10'
                            : 'text-[#3F524C] hover:bg-muted/80 hover:text-foreground active:bg-muted'
        )}>
            <Link
                href={item.href}
                prefetch={false}
                aria-label={item.title}
                title={isMobile ? item.title : undefined}
                onMouseEnter={(e) => {
                    if (isMobile || !onHoverItem) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    onHoverItem({
                        label: item.title,
                        badge: isLocked && item.minPlan ? `Plano ${item.minPlan}` : undefined,
                        top: rect.top + rect.height / 2,
                        left: rect.right + 12,
                    })
                }}
                onMouseLeave={() => onHoverItem?.(null)}
                onClick={() => onHoverItem?.(null)}
                className="flex items-center gap-2.5 flex-1 min-w-0 px-2.5 py-2 text-sm font-medium"
            >
                <item.icon className={cn(
                    'w-4 h-4 transition-colors shrink-0',
                    isActive
                        ? isDark ? 'text-[#2FA687]' : 'text-primary'
                        : isDark
                            ? item.title === 'Checklist Inicial' ? 'text-[#2FA687]' : 'text-[#89A29A] group-hover:text-[#F2F5F3]'
                            : item.title === 'Checklist Inicial' ? 'text-primary' : 'text-[#5A6C66] group-hover:text-foreground'
                )} />
                <span className="truncate">{item.title}</span>
            </Link>
            {!isLocked && (
                <Link
                    href={`/dashboard/help#${getHelpAnchorForMenuHref(item.href, item.title)}`}
                    prefetch={false}
                    onClick={() => onHoverItem?.(null)}
                    className={cn(
                        'clinigo-help-btn hidden group-hover:inline-flex transition-opacity mr-1.5 p-1 rounded-md items-center justify-center cursor-help shrink-0',
                        isDark ? 'hover:bg-white/10 text-[#96AEA6] hover:text-white' : 'hover:bg-border/60 text-muted-foreground hover:text-foreground'
                    )}
                    title="Para que serve? Quando usar? Clique para abrir o guia de ajuda."
                    aria-label={`Ajuda sobre ${item.title}`}
                >
                    <HelpCircle className="w-3.5 h-3.5" />
                </Link>
            )}
            {isLocked && (
                <Lock className={cn('h-3.5 w-3.5 mr-2.5 shrink-0', isDark ? 'text-[#96AEA6]/40' : 'text-muted-foreground/60')} />
            )}
        </div>
    )
}


export function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
    const pathname = usePathname()
    const { role, isCoordinator, clinicId, isSuperAdmin, isImpersonating } = useRole()
    const { user, profile } = useAuth()
    const { planType, isLoading, permissions } = usePlan()
    const profLabel = useProfessionalLabel()
    const { clinic, refreshClinic } = useClinic()
    const [logoModalOpen, setLogoModalOpen] = useState(false)

    const effectiveClinicId = clinicId || clinic?.id

    // Tema exclusivo do Menu Lateral (Claro Editorial padrão vs Escuro Floresta).
    // O sistema em si permanece sempre em Tema Claro.
    const { isDark, toggleTheme: handleToggleTheme } = useSidebarTheme()

    // Default to BASIC if loading
    const currentPlan: PlanType = planType || 'BASICO'

    const effectiveRole = (isSuperAdmin && !isImpersonating) ? 'SUPER_ADMIN' : role

    // Filter sections based on role + inject professional labels + respeitar Permissões Customizadas
    // Coordenadoras DOCTOR veem também o menu Documentos (solicitação Espaço Incluir)
    const filteredSections = navigationSections
        .map(section => ({
            ...section,
            items: section.items
                .filter((item) => {
                    // Módulo de Contratos e Assinaturas: Restrição estrita para World Sensory
                    if (item.href.startsWith('/dashboard/contratos')) {
                        if (!isClinicAuthorizedForContracts(effectiveClinicId)) {
                            return false
                        }
                    }

                    // Módulo de Teleconsulta: Autorizado para World Sensory e Conta Demo/Teste do Proprietário
                    if (item.href.startsWith('/dashboard/teleconsulta')) {
                        const authorized = isClinicAuthorizedForTeleconsulta(effectiveClinicId, {
                            isDemo: (clinic as any)?.is_demo === true,
                            slug: clinic?.slug,
                            clinicName: clinic?.name,
                            isSuperAdmin: isSuperAdmin || effectiveRole === 'SUPER_ADMIN',
                        })
                        if (!authorized) {
                            return false
                        }
                    }

                    if (!item.roles) return true
                    if (effectiveRole && item.roles.includes(effectiveRole)) {
                        // Permissões Customizadas da clínica: se foi explicitamente desativada no Master Hub, oculta
                        if (item.featureKey && permissions?.[item.featureKey]?.enabled === false) {
                            return false
                        }
                        return true
                    }
                    // Coordenadoras DOCTOR também veem Agenda Geral da clínica e Indicadores de Evolução
                    if (
                        effectiveRole === 'DOCTOR' &&
                        isCoordinator &&
                        (item.href === '/dashboard/agenda' ||
                            item.href === '/dashboard/terapia/conformidade-evolucao')
                    ) {
                        if (item.featureKey && permissions?.[item.featureKey]?.enabled === false) {
                            return false
                        }
                        return true
                    }
                    // Exclusivo Espaço Incluir: Comercial e Recepção autorizados a visualizar e acessar o menu Terapeutas
                    const ESPACO_INCLUIR_CLINIC_ID = '5163c916-8b82-4d80-8a71-01726836ee46'
                    if (effectiveClinicId === ESPACO_INCLUIR_CLINIC_ID && role === 'RECEPTIONIST' && item.href === '/dashboard/medicos') {
                        if (item.featureKey && permissions?.[item.featureKey]?.enabled === false) {
                            return false
                        }
                        return true
                    }
                    // Exclusivo World Sensory: Jéssica (Recepção) autorizada cirurgicamente a acessar Horários e Agenda da clínica
                    const WORLDSENSORY_CLINIC_ID = '4c13e586-5390-4393-a180-2c9dd7ed81c7'
                    const JESSICA_USER_ID = 'd9c6ac75-bc7c-431a-ba76-73ecb268fef8'
                    const isJessicaWorldSensory = (user?.id === JESSICA_USER_ID || user?.email?.toLowerCase() === 'wsadm.jessica@gmail.com' || profile?.email?.toLowerCase() === 'wsadm.jessica@gmail.com') && effectiveClinicId === WORLDSENSORY_CLINIC_ID
                    if (isJessicaWorldSensory && ['/dashboard/horarios', '/dashboard/agenda'].includes(item.href)) {
                        return true
                    }
                    return false
                })
                .map(item => {
                    let children = item.children
                    if (children && children.length > 0) {
                        children = children.filter(child => {
                            if (child.featureKey && permissions?.[child.featureKey]?.enabled === false) {
                                return false
                            }
                            return true
                        })
                    }

                    return {
                        ...item,
                        children,
                        title: item.title
                            .replace('__PROFESSIONAL_PLURAL__', profLabel.plural)
                            .replace('__REPASSE_LABEL__', profLabel.repasse),
                    }
                })
                .filter(item => {
                    // Se o item tinha filhos e todos foram desativados, oculta o item pai agrupador
                    if (item.children && item.children.length === 0) {
                        return false
                    }
                    return true
                }),
        }))
        .filter(section => {
            // STRICT BLOCK: Remove 'Financeiro' entirely for Receptionists/Staff and Super Admin
            if (section.title === 'Financeiro' && (['RECEPTIONIST', 'STAFF', 'SUPER_ADMIN'] as string[]).includes(role as string)) return false;
            
            return section.items.length > 0;
        })

    // State for collapsible sections + pure-React hover tooltip (zero Radix composeRefs loop in React 19)
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
    const [hoveredItem, setHoveredItem] = useState<HoveredNavTooltip | null>(null)
    const handleHoverItem = useCallback((next: HoveredNavTooltip | null) => {
        setHoveredItem(next)
    }, [])

    useEffect(() => {
        setHoveredItem(null)
    }, [pathname])

    // Auto-expand active section on navigation + load from localStorage
    useEffect(() => {
        setOpenSections(prev => {
            let base = { ...prev }
            // On first render, load from localStorage
            if (Object.keys(base).length === 0) {
                try {
                    const saved = localStorage.getItem('clinigo-sidebar-sections')
                    if (saved) base = JSON.parse(saved)
                } catch {
                    // Ignora erro de acesso ao localStorage em modo privado
                }
            }
            // Always auto-expand section containing active route
            const activeSection = filteredSections.find(section =>
                section.items.some(item =>
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                )
            )
            if (activeSection && activeSection.title !== 'Principal') {
                base[activeSection.title] = true
            }
            return base
        })
    }, [pathname])

    const toggleSection = (title: string) => {
        setOpenSections(prev => {
            const next = { ...prev, [title]: !prev[title] }
            try {
                localStorage.setItem('clinigo-sidebar-sections', JSON.stringify(next))
            } catch {
                // Ignora erro de escrita no localStorage
            }
            return next
        })
    }

    return (
        <aside className={cn(
            'flex flex-col transition-colors duration-200 ease-in-out select-none',
            isDark
                ? 'bg-[#0D1E19] border-r border-[#1F3A32] text-[#F2F5F3]'
                : 'bg-card border-r border-border text-foreground',
            isMobile
                ? 'clinigo-mobile-sidebar w-full h-full'
                : 'clinigo-desktop-sidebar hidden lg:flex lg:w-72 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:overflow-hidden lg:z-30'
        )}>
            {/* Logo Co-branding (CliniGo Imutavel + Espaco/Logo da Clinica) */}
            <div className={cn(
                'flex items-center justify-between h-16 px-4 border-b shrink-0 transition-colors duration-200 gap-2',
                isDark ? 'border-[#1F3A32]' : 'border-border'
            )}>
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Logo CliniGo Imutavel */}
                    <Link
                        href="/dashboard"
                        prefetch={false}
                        className="shrink-0 flex items-center overflow-hidden"
                        style={{ height: '32px', maxHeight: '32px', maxWidth: '100px' }}
                        title="CliniGo"
                    >
                        <Image
                            src={isDark ? '/logo_white.svg' : '/logo_black.svg'}
                            alt="CliniGo"
                            width={99}
                            height={32}
                            style={{ height: '32px', width: 'auto', maxHeight: '32px', maxWidth: '100px' }}
                            className="object-contain"
                            priority
                            unoptimized
                        />
                    </Link>

                    {/* Divisor vertical */}
                    <div className={cn(
                        'w-[1px] h-5 shrink-0',
                        isDark ? 'bg-[#243E36]' : 'bg-border'
                    )} />

                    {/* Logo da Clinica ou Espaco para Adicionar (clique abre upload direto para admins) */}
                    {clinic?.logo_url ? (
                        ['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(effectiveRole || '') ? (
                            <button
                                type="button"
                                onClick={() => setLogoModalOpen(true)}
                                className="flex items-center min-w-0 py-0.5 px-1 rounded-md transition-opacity hover:opacity-80 shrink-0 overflow-hidden cursor-pointer"
                                style={{ height: '26px', maxHeight: '26px' }}
                                title={`${clinic.name || 'Clínica'} — Clique para alterar ou remover o logotipo`}
                                aria-label="Alterar logotipo da clínica"
                            >
                                <img
                                    src={clinic.logo_url}
                                    alt={clinic.name || 'Logo da Clínica'}
                                    style={{ height: '26px', width: 'auto', maxHeight: '26px', maxWidth: '90px' }}
                                    className="object-contain rounded-xs"
                                />
                            </button>
                        ) : (
                            <Link
                                href="/dashboard"
                                prefetch={false}
                                className="flex items-center min-w-0 py-0.5 px-1 rounded-md transition-opacity hover:opacity-80 shrink-0 overflow-hidden"
                                style={{ height: '26px', maxHeight: '26px' }}
                                title={clinic.name || 'Clínica'}
                            >
                                <img
                                    src={clinic.logo_url}
                                    alt={clinic.name || 'Logo da Clínica'}
                                    style={{ height: '26px', width: 'auto', maxHeight: '26px', maxWidth: '90px' }}
                                    className="object-contain rounded-xs"
                                />
                            </Link>
                        )
                    ) : ['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(effectiveRole || '') ? (
                        <button
                            type="button"
                            onClick={() => setLogoModalOpen(true)}
                            className={cn(
                                'flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed text-[11px] font-medium transition-all group shrink-0 h-[26px] cursor-pointer',
                                isDark
                                    ? 'border-[#2D4F45] text-[#96AEA6] hover:text-white hover:border-[#2FA687] hover:bg-white/5'
                                    : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-accent/50'
                            )}
                            style={{ height: '26px', maxHeight: '26px' }}
                            title="Clique para enviar o logotipo da sua clínica"
                            aria-label="Adicionar logotipo da clínica"
                        >
                            <Plus className="w-3 h-3 text-primary group-hover:scale-110 transition-transform" />
                            <span className="truncate max-w-[68px]">Sua Logo</span>
                        </button>
                    ) : null}
                </div>
            </div>

            {/* Navigation */}
            <nav
                onScroll={() => {
                    if (hoveredItem) setHoveredItem(null)
                }}
                onMouseLeave={() => setHoveredItem(null)}
                className="clinigo-sidebar-nav flex-1 min-h-0 px-2.5 py-4 space-y-4 overflow-y-auto overscroll-contain"
            >
                {filteredSections.map((section) => {
                    const isPrincipal = section.title === 'Principal'
                    const isOpen = isPrincipal || (openSections[section.title] ?? (isSuperAdmin && !isImpersonating && section.title === 'Administração'))

                    const sectionIcons: Record<string, any> = {
                        'Agendamento': Calendar,
                        'Equipe': Users2,
                        'Prontuário': HeartPulse,
                        'Terapia': Brain,
                        'Financeiro': DollarSign,
                        'Comunicação': MessageCircle,
                        'Gestão': BarChart3,
                        'Configurações': Settings,
                        'Administração': Shield,
                    }
                    const SectionIcon = sectionIcons[section.title] || Layers

                    return (
                        <div key={section.title} className="space-y-1">
                            {isPrincipal ? (
                                <div className="space-y-0.5">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href
                                        return (
                                            <NavItemComponent
                                                key={item.href}
                                                item={item}
                                                isActive={isActive}
                                                currentPlan={currentPlan}
                                                permissions={permissions}
                                                isMobile={isMobile}
                                                isDark={isDark}
                                                onHoverItem={handleHoverItem}
                                            />
                                        )
                                    })}
                                </div>
                            ) : (
                                <div>
                                    <button
                                        type="button"
                                        onClick={() => toggleSection(section.title)}
                                        className={cn(
                                            'flex items-center justify-between w-full px-2.5 py-1.5 rounded-md group cursor-pointer transition-all duration-150',
                                            isDark
                                                ? 'hover:bg-white/[0.05] text-[#89A29A] hover:text-[#F2F5F3]'
                                                : 'hover:bg-muted/70 text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {SectionIcon && (
                                                <SectionIcon className={cn(
                                                    'w-3.5 h-3.5 transition-colors duration-150',
                                                    isDark
                                                        ? isOpen ? 'text-[#2FA687]' : 'text-[#89A29A]/80 group-hover:text-[#F2F5F3]'
                                                        : isOpen ? 'text-primary' : 'text-muted-foreground/80 group-hover:text-foreground'
                                                )} />
                                            )}
                                            <span className={cn(
                                                'text-xs font-semibold uppercase tracking-wider transition-colors duration-150',
                                                isDark
                                                    ? isOpen ? 'text-[#F2F5F3]' : 'text-[#89A29A] group-hover:text-[#F2F5F3]'
                                                    : isOpen ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                                            )}>
                                                {section.title}
                                            </span>
                                        </div>
                                        <ChevronDown className={cn(
                                            'w-3.5 h-3.5 transition-transform duration-150 opacity-70',
                                            !isOpen && '-rotate-90'
                                        )} />
                                    </button>
                                    <div
                                        className={cn(
                                            'overflow-hidden transition-all duration-200 ease-in-out',
                                            isOpen ? 'max-h-[2000px] opacity-100 py-1' : 'max-h-0 opacity-0'
                                        )}
                                    >
                                        <div className="space-y-0.5">
                                            {section.items.map((item) => {
                                                const exactMatchRoutes = ['/dashboard', '/dashboard/configuracoes']
                                                const isActive = exactMatchRoutes.includes(item.href)
                                                    ? pathname === item.href
                                                    : pathname === item.href || pathname.startsWith(`${item.href}/`)
                                                return (
                                                    <NavItemComponent
                                                        key={item.href}
                                                        item={item}
                                                        isActive={isActive}
                                                        currentPlan={currentPlan}
                                                        permissions={permissions}
                                                        isMobile={isMobile}
                                                        isDark={isDark}
                                                        onHoverItem={handleHoverItem}
                                                    />
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* Botão Help — última posição fixa do menu do sistema para todos os perfis */}
                <div className={cn(
                    'pt-3 border-t',
                    isDark ? 'border-[#1F3A32]' : 'border-border'
                )}>
                    <Link
                        href="/dashboard/help"
                        prefetch={false}
                        onClick={() => setHoveredItem(null)}
                        className={cn(
                            'flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 group',
                            isMobile ? 'min-h-[44px]' : '',
                            pathname === '/dashboard/help' || pathname.startsWith('/dashboard/help/')
                                ? isDark
                                    ? 'bg-[#155E4B]/30 text-[#9ED3C2] font-semibold'
                                    : 'bg-accent text-accent-foreground font-semibold'
                                : isDark
                                    ? 'text-[#B5C9C2] hover:bg-white/[0.06] hover:text-[#F2F5F3] active:bg-white/10'
                                    : 'text-[#3F524C] hover:bg-muted/80 hover:text-foreground active:bg-muted'
                        )}
                        title="Central de Ajuda e Manual Passo a Passo"
                    >
                        <HelpCircle className={cn(
                            'w-4 h-4 transition-colors shrink-0',
                            pathname === '/dashboard/help' || pathname.startsWith('/dashboard/help/')
                                ? isDark ? 'text-[#2FA687]' : 'text-primary'
                                : isDark ? 'text-[#89A29A] group-hover:text-[#F2F5F3]' : 'text-[#5A6C66] group-hover:text-foreground'
                        )} />
                        <span>Help</span>
                    </Link>
                </div>
            </nav>

            {/* Balão flutuante de nome completo ao passar o mouse (puro React, sem Radix Slot/Portal) */}
            {!isMobile && hoveredItem && (
                <div
                    role="tooltip"
                    style={{
                        position: 'fixed',
                        top: `${hoveredItem.top}px`,
                        left: `${hoveredItem.left}px`,
                        transform: 'translateY(-50%)',
                        backgroundColor: '#0F1F1B',
                        color: '#F2F5F3',
                        border: '1px solid #243E36',
                        zIndex: 9999,
                        pointerEvents: 'none',
                    }}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium shadow-lg whitespace-nowrap"
                >
                    <span>{hoveredItem.label}</span>
                    {hoveredItem.badge && (
                        <span className="ml-1.5 text-[#9ED3C2]">· {hoveredItem.badge}</span>
                    )}
                </div>
            )}

            {/* Alternador de Tema EXCLUSIVO do Menu Lateral (Menu Claro vs Menu Escuro) */}
            <div className={cn(
                'px-3 py-2.5 border-t transition-colors duration-200 shrink-0',
                isDark ? 'border-[#1F3A32] bg-[#0B1714]' : 'border-border bg-muted/40'
            )}>
                <button
                    type="button"
                    onClick={handleToggleTheme}
                    className={cn(
                        'flex items-center justify-between w-full px-3 py-2 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer',
                        isDark
                            ? 'bg-[#13241F] hover:bg-[#172B25] text-[#F2F5F3] border border-[#243E36]'
                            : 'bg-card hover:bg-muted text-foreground border border-border'
                    )}
                    title={isDark ? 'Mudar o menu lateral para o tema claro' : 'Mudar o menu lateral para o tema escuro'}
                >
                    <div className="flex items-center gap-2">
                        {isDark ? (
                            <>
                                <Moon className="w-3.5 h-3.5 text-[#2FA687]" />
                                <span>Menu Escuro</span>
                            </>
                        ) : (
                            <>
                                <Sun className="w-3.5 h-3.5 text-primary" />
                                <span>Menu Claro</span>
                            </>
                        )}
                    </div>
                    <span className={cn(
                        'text-[11px] px-2 py-0.5 rounded font-medium',
                        isDark ? 'bg-[#155E4B]/30 text-[#9ED3C2]' : 'bg-accent text-accent-foreground'
                    )}>
                        Alternar
                    </span>
                </button>
            </div>

            {/* Role indicator */}
            <div className={cn(
                'px-3 py-2.5 border-t text-xs shrink-0 transition-colors duration-200',
                isDark ? 'border-[#1F3A32] bg-[#091310] text-[#96AEA6]' : 'border-border bg-card text-muted-foreground'
            )}>
                {role === 'SUPER_ADMIN' && (
                    <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border',
                        isDark ? 'bg-red-500/10 text-red-300 border-red-500/25' : 'bg-red-50 text-red-700 border-red-200'
                    )}>
                        <Shield className="w-3 h-3" /> Super Admin
                    </span>
                )}
                {role === 'CLINIC_ADMIN' && (
                    <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border',
                        isDark ? 'bg-[#155E4B]/25 text-[#9ED3C2] border-[#243E36]' : 'bg-accent text-accent-foreground border-primary/20'
                    )}>
                        <Building2 className="w-3 h-3" /> Admin da Clínica
                    </span>
                )}
                {role === 'DOCTOR' && (
                    <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border',
                        isDark ? 'bg-[#155E4B]/25 text-[#9ED3C2] border-[#243E36]' : 'bg-accent text-accent-foreground border-primary/20'
                    )}>
                        <Stethoscope className="w-3 h-3" /> {profLabel.singular}
                    </span>
                )}
                {role === 'RECEPTIONIST' && (
                    <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border',
                        isDark ? 'bg-[#155E4B]/25 text-[#9ED3C2] border-[#243E36]' : 'bg-muted text-foreground border-border'
                    )}>
                        <Clipboard className="w-3 h-3" /> Recepção
                    </span>
                )}
                {role === 'FINANCIAL' && (
                    <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border',
                        isDark ? 'bg-[#155E4B]/25 text-[#9ED3C2] border-[#243E36]' : 'bg-muted text-foreground border-border'
                    )}>
                        <Wallet className="w-3 h-3" /> Financeiro
                    </span>
                )}
            </div>
            {/* Modal direto para envio/alteração/remoção do logotipo da clínica (montado sob demanda) */}
            {logoModalOpen && ['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(effectiveRole || '') && (
                <ClinicLogoModal
                    open={logoModalOpen}
                    onOpenChange={setLogoModalOpen}
                    clinicId={effectiveClinicId}
                    clinicName={clinic?.name}
                    currentLogoUrl={clinic?.logo_url}
                    onLogoUpdated={refreshClinic}
                />
            )}
        </aside>
    )
}

