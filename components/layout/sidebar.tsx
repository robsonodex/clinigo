'use client'

import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useRole } from '@/lib/hooks/use-auth'
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
    Crown,
    Brain,
    CheckCircle2,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import type { PlanType } from '@/lib/constants/plans'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface NavItem {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    roles?: ('SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'NURSE' | 'STAFF')[]
    badge?: string
    minPlan?: 'BASICO' | 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE'
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
            },
            {
                title: 'Minha Agenda',
                href: '/dashboard/minha-agenda',
                icon: Calendar,
                roles: ['DOCTOR'],
            },
            {
                title: 'Consultas',
                href: '/dashboard/consultas',
                icon: Video,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
            },
            {
                title: 'Recepção',
                href: '/dashboard/recepcao',
                icon: Clipboard,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF'],
            },
            {
                title: 'Horários',
                href: '/dashboard/horarios',
                icon: Clock,
                roles: ['CLINIC_ADMIN'],
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
            },
            {
                title: 'Pacientes',
                href: '/dashboard/pacientes',
                icon: UserPlus,
                roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE', 'STAFF'],
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
                // Acessível a todos os planos (BASICO+)
            },
            {
                title: 'Prescrições',
                href: '/dashboard/prescricoes',
                icon: Clipboard,
                roles: ['DOCTOR'],
                badge: 'PRO',
                minPlan: 'PROFESSIONAL',
            },
            {
                title: 'Documentos',
                href: '/dashboard/documentos',
                icon: FileArchive,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
                // Apenas ADM e Recepção podem acessar documentos (solicitação Jeferson - Espaço Incluir)
            },
            {
                title: 'Templates Prontuário',
                href: '/dashboard/configuracoes/templates-prontuario',
                icon: FileText,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
            },
            {
                title: 'Planos Terapêuticos',
                href: '/dashboard/planos-terapeuticos',
                icon: ClipboardList,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
            },
            {
                title: 'Evoluções',
                href: '/dashboard/evolucoes',
                icon: TrendingUp,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
            },
            {
                title: 'Controle de Faltas',
                href: '/dashboard/controle-faltas',
                icon: UserX,
                roles: ['CLINIC_ADMIN'],
            },
        ],
    },
    {
        title: 'Terapia',
        items: [
            {
                title: 'Fila de Espera',
                href: '/dashboard/terapia/fila-espera',
                icon: Clock,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
            },
            {
                title: 'Encaminhamentos',
                href: '/dashboard/terapia/encaminhamentos',
                icon: Send,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'Supervisão',
                href: '/dashboard/terapia/supervisao',
                icon: Stethoscope,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'Retenção',
                href: '/dashboard/terapia/retencao',
                icon: Users,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'Risco de Evasão',
                href: '/dashboard/terapia/risco-evasao',
                icon: UserX,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'Aderência',
                href: '/dashboard/terapia/aderencia',
                icon: Activity,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'Desfechos',
                href: '/dashboard/terapia/desfechos',
                icon: Target,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'Carga de Trabalho',
                href: '/dashboard/terapia/carga-trabalho',
                icon: BarChart3,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'Demográfico',
                href: '/dashboard/terapia/demografico',
                icon: Users2,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'Receita por Modalidade',
                href: '/dashboard/terapia/receita-modalidade',
                icon: DollarSign,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'Sazonalidade',
                href: '/dashboard/terapia/sazonalidade',
                icon: TrendingUp,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'NPS / Satisfação',
                href: '/dashboard/terapia/nps',
                icon: HeartPulse,
                roles: ['CLINIC_ADMIN'],
                badge: 'PRO',
                minPlan: 'PROFESSIONAL',
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
                roles: ['CLINIC_ADMIN'],
                children: [
                    {
                        title: 'Lançamentos',
                        href: '/dashboard/financeiro',
                        icon: DollarSign,
                    },
                    {
                        title: 'Pagamentos',
                        href: '/dashboard/pagamentos',
                        icon: CreditCard,
                    },
                    {
                        title: 'Fechamentos de Caixa',
                        href: '/dashboard/financeiro/fechamento',
                        icon: FileText,
                    },
                    {
                        title: 'Créditos de Pacientes',
                        href: '/dashboard/financial/credits',
                        icon: Wallet,
                        minPlan: 'PROFESSIONAL',
                    },
                ]
            },
            {
                title: 'Repasses & Produção',
                href: '/dashboard/financial/payroll',
                icon: Users,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
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
                ]
            },
            {
                title: 'Controladoria & BI',
                href: '/dashboard/financial/dre',
                icon: BarChart3,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
                children: [
                    {
                        title: 'DRE Consolidada',
                        href: '/dashboard/financial/dre',
                        icon: TrendingUp,
                    },
                    {
                        title: 'DRE Centro de Custos',
                        href: '/dashboard/financial/dre-costcenter',
                        icon: TrendingDown,
                    },
                    {
                        title: 'Análise de LTV',
                        href: '/dashboard/financial/ltv',
                        icon: Target,
                        minPlan: 'PROFESSIONAL',
                    },
                    {
                        title: 'Mix de Receita',
                        href: '/dashboard/financeiro/mix',
                        icon: BarChart3,
                        minPlan: 'PROFESSIONAL',
                    },
                    {
                        title: 'Projeção de Caixa',
                        href: '/dashboard/financeiro/projecao',
                        icon: Calendar,
                        minPlan: 'PROFESSIONAL',
                    },
                    {
                        title: 'Projeção de Faturamento',
                        href: '/dashboard/financial/goals',
                        icon: Target,
                        minPlan: 'PROFESSIONAL',
                    },
                    {
                        title: 'Gestão de Inadimplência',
                        href: '/dashboard/financeiro/inadimplencia',
                        icon: UserX,
                    },
                    {
                        title: 'Auditoria de Lançamentos',
                        href: '/dashboard/financial/audit',
                        icon: ShieldAlert,
                    },
                ]
            },
            {
                title: 'Faturamento TISS',
                href: '/dashboard/tiss',
                icon: Receipt,
                roles: ['CLINIC_ADMIN'],
                badge: 'PRO',
                minPlan: 'PROFESSIONAL',
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
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
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
                    }
                ]
            },
            {
                title: 'Convênios e Reembolsos',
                href: '/dashboard/convenios',
                icon: Shield,
                roles: ['CLINIC_ADMIN'],
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
                roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'WhatsApp',
                href: '/dashboard/whatsapp',
                icon: MessageCircle,
                roles: ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'STAFF'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'Notificações',
                href: '/dashboard/notificacoes',
                icon: Send,
                roles: ['CLINIC_ADMIN'],
                // Acessível a todos os planos (BASICO+)
            },
            {
                title: 'FluxoMed',
                href: '/dashboard/crm',
                icon: Megaphone,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
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
                // Acessível a todos os planos (BASICO+)
            },
            {
                title: 'Relatórios',
                href: '/dashboard/relatorios',
                icon: BarChart3,
                roles: ['CLINIC_ADMIN'],
                // Acessível a todos os planos (BASICO+)
            },
            {
                title: 'Termos Legais',
                href: '/dashboard/termos',
                icon: Scale,
                roles: ['CLINIC_ADMIN'],
                // Acessível a todos os planos (BASICO+)
            },
            {
                title: 'Importação',
                href: '/dashboard/importacao',
                icon: Upload,
                roles: ['CLINIC_ADMIN', 'RECEPTIONIST'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
            },
            {
                title: 'Automação',
                href: '/dashboard/automacao',
                icon: Bot,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
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
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'Página Pública',
                href: '/dashboard/configuracoes/pagina-publica',
                icon: Globe,
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'Teleconsulta',
                href: '/dashboard/configuracoes/teleconsulta',
                icon: Video,
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'Usuários',
                href: '/dashboard/configuracoes/usuarios',
                icon: Users,
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'Terapias',
                href: '/dashboard/configuracoes/terapias',
                icon: Stethoscope,
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'Assinatura',
                href: '/dashboard/configuracoes/assinatura',
                icon: CreditCard,
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'Segurança',
                href: '/dashboard/seguranca',
                icon: Lock,
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'Integrações',
                href: '/dashboard/integracoes',
                icon: Globe,
                roles: ['CLINIC_ADMIN'],
                badge: 'AVÇ',
                minPlan: 'AVANCADO',
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
                badge: 'ADMIN',
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

// Helper function to normalize titles for anchors (matches sidebars)
function getHelpAnchor(title: string) {
    return title.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^a-z0-9]+/g, '-') // substitui caracteres nao alfa por hifen
        .replace(/(^-|-$)+/g, '') // limpa hifens no inicio/fim
}

import { HelpCircle } from 'lucide-react'

function NavItemComponent({
    item,
    isActive,
    currentPlan,
    isMobile = false
}: {
    item: NavItem
    isActive: boolean
    currentPlan: PlanType
    isMobile?: boolean
}) {
    const [isOpen, setIsOpen] = useState(false)
    const hasChildren = item.children && item.children.length > 0

    // Touch-friendly minimum height (44px = min-h-11)
    const touchClass = isMobile ? 'min-h-[44px]' : ''

    if (hasChildren) {
        // Check if user has access to this item's required plan
        const PLAN_ORDER_PARENT: Record<string, number> = {
            'BASICO': 1, 'AVANCADO': 2, 'PROFESSIONAL': 3, 'ENTERPRISE': 4, 'NETWORK': 5
        }
        const parentCurrentLevel = PLAN_ORDER_PARENT[currentPlan] || 0
        const parentRequiredLevel = PLAN_ORDER_PARENT[item.minPlan || 'BASICO'] || 0
        const parentIsLocked = parentCurrentLevel < parentRequiredLevel

        const [showUpgrade, setShowUpgrade] = useState(false)

        return (
            <div>
                <button
                    onClick={() => {
                        if (parentIsLocked) {
                            setShowUpgrade(true)
                        } else {
                            setIsOpen(!isOpen)
                        }
                    }}
                    className={cn(
                        'flex items-center justify-between w-full gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors group',
                        touchClass,
                        parentIsLocked
                            ? 'text-muted-foreground/50 hover:bg-muted/50'
                            : isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'
                    )}
                >
                    <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="flex items-center">
                            {item.title}
                            {!parentIsLocked && (
                                <Link
                                    href={`/dashboard/help#${getHelpAnchor(item.title)}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 p-0.5 rounded-full hover:bg-white/20 text-muted-foreground hover:text-foreground inline-flex items-center justify-center cursor-help"
                                    title="Para que serve? Quando usar? Clique para abrir o guia de ajuda."
                                >
                                    <HelpCircle className="w-3.5 h-3.5" />
                                </Link>
                            )}
                        </span>
                        {item.badge && !parentIsLocked && (
                            <span className={cn(
                                "px-1.5 py-0.5 text-[10px] font-bold rounded",
                                item.badge === 'PRO' ? "bg-blue-100 text-blue-700" :
                                    item.badge === 'ENT' ? "bg-purple-100 text-purple-700" :
                                        item.badge === 'AVÇ' ? "bg-emerald-100 text-emerald-700" :
                                            "bg-gray-100 text-gray-700"
                            )}>
                                {item.badge}
                            </span>
                        )}
                    </div>
                    {parentIsLocked ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </button>
                {isOpen && !parentIsLocked && (
                    <div className="ml-4 pl-4 border-l mt-1 space-y-1">
                        {item.children?.map((child) => (
                            <VisualLock
                                key={child.href}
                                requiredPlan={child.minPlan || 'BASICO'}
                                currentPlan={currentPlan}
                                featureName={child.title}
                            >
                                <Link
                                    href={child.href}
                                    className={cn(
                                        'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors group',
                                        touchClass,
                                        'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'
                                    )}
                                >
                                    <span className="flex items-center gap-3">
                                        <child.icon className="w-4 h-4" />
                                        {child.title}
                                        <Link
                                            href={`/dashboard/help#${getHelpAnchor(child.title)}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 p-0.5 rounded-full hover:bg-slate-200/50 text-muted-foreground hover:text-foreground inline-flex items-center justify-center cursor-help"
                                            title="Para que serve? Quando usar? Clique para abrir o guia de ajuda."
                                        >
                                            <HelpCircle className="w-3 h-3" />
                                        </Link>
                                    </span>
                                </Link>
                            </VisualLock>
                        ))}
                    </div>
                )}
                {/* UpgradeModal para itens bloqueados com children */}
                {parentIsLocked && (
                    <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Crown className="h-5 w-5 text-amber-500" />
                                    Recurso Premium
                                </DialogTitle>
                                <DialogDescription>
                                    <strong>{item.title}</strong> requer o plano <strong>{item.minPlan}</strong> ou superior.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" className="flex-1" onClick={() => setShowUpgrade(false)}>Depois</Button>
                                <Button className="flex-1" onClick={() => { window.location.href = '/dashboard/configuracoes/plano' }}>Ver Planos</Button>
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
    const isLocked = currentLevel < requiredLevel

    return (
        <Link
            href={item.href}
            className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group',
                touchClass,
                isActive
                    ? 'bg-primary text-primary-foreground'
                    : isLocked
                        ? 'text-muted-foreground/50 hover:bg-muted/50'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'
            )}
        >
            <item.icon className="w-5 h-5" />
            <span className="flex-1 flex items-center">
                {item.title}
                {!isLocked && (
                    <Link
                        href={`/dashboard/help#${getHelpAnchor(item.title)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-60 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity ml-1.5 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 inline-flex items-center justify-center cursor-help"
                        title="Para que serve? Quando usar? Clique para abrir o guia de ajuda."
                    >
                        <HelpCircle className="w-3.5 h-3.5" />
                    </Link>
                )}
            </span>
            {isLocked && (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {item.badge && !isLocked && (
                <span className={cn(
                    "px-1.5 py-0.5 text-[10px] font-bold rounded",
                    item.badge === 'AVÇ' ? "bg-emerald-100 text-emerald-700" :
                        item.badge === 'PRO' ? "bg-blue-100 text-blue-700" :
                            item.badge === 'ENT' ? "bg-purple-100 text-purple-700" :
                                "bg-gray-100 text-gray-700"
                )}>
                    {item.badge}
                </span>
            )}
        </Link>
    )
}


export function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
    const pathname = usePathname()
    const { role, isCoordinator } = useRole()
    const { planType, isLoading } = usePlan()
    const profLabel = useProfessionalLabel()

    // Default to BASIC if loading
    const currentPlan: PlanType = planType || 'BASICO'

    // Filter sections based on role + inject professional labels
    // Coordenadoras DOCTOR veem também o menu Documentos (solicitação Espaço Incluir)
    const filteredSections = navigationSections
        .map(section => ({
            ...section,
            items: section.items
                .filter((item) => {
                    if (!item.roles) return true
                    if (role && item.roles.includes(role)) {
                        // Remove 'Planos', 'Grupos' e 'Cobrança' para SUPER_ADMIN — não pertinentes ao contexto operacional
                        if (role === 'SUPER_ADMIN' && ['/dashboard/planos', '/dashboard/grupos', '/dashboard/cobranca'].includes(item.href)) return false
                        return true
                    }
                    // Coordenadoras DOCTOR também veem Documentos e Agenda Geral
                    if (role === 'DOCTOR' && isCoordinator && ['/dashboard/documentos', '/dashboard/agenda'].includes(item.href)) return true
                    return false
                })
                .map(item => ({
                    ...item,
                    title: item.title
                        .replace('__PROFESSIONAL_PLURAL__', profLabel.plural)
                        .replace('__REPASSE_LABEL__', profLabel.repasse),
                })),
        }))
        .filter(section => {
            // STRICT BLOCK: Remove 'Financeiro' entirely for Receptionists/Staff and Super Admin
            if (section.title === 'Financeiro' && (['RECEPTIONIST', 'STAFF', 'SUPER_ADMIN'] as string[]).includes(role as string)) return false;
            
            return section.items.length > 0;
        })

    // State for collapsible sections
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({})

    // Auto-expand active section on navigation + load from localStorage
    useEffect(() => {
        setOpenSections(prev => {
            let base = { ...prev }
            // On first render, load from localStorage
            if (Object.keys(base).length === 0) {
                try {
                    const saved = localStorage.getItem('clinigo-sidebar-sections')
                    if (saved) base = JSON.parse(saved)
                } catch {}
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname])

    const toggleSection = (title: string) => {
        setOpenSections(prev => {
            const next = { ...prev, [title]: !prev[title] }
            try {
                localStorage.setItem('clinigo-sidebar-sections', JSON.stringify(next))
            } catch {}
            return next
        })
    }

    return (
        <aside className={cn(
            "flex flex-col bg-white border-r h-full",
            isMobile
                ? "w-full"
                : "hidden lg:flex lg:w-64 lg:fixed lg:inset-y-0"
        )}>
            {/* Logo */}
            <div className="flex items-center h-16 px-6 border-b shrink-0">
                <Link href="/dashboard" className="flex items-center gap-2">
                    <Image
                        src="/logo_black.svg"
                        alt="CliniGo"
                        width={130}
                        height={34}
                        className="h-8 w-auto"
                    />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
                {filteredSections.map((section) => {
                    const isPrincipal = section.title === 'Principal'
                    const isOpen = isPrincipal || (openSections[section.title] ?? false)

                    // Section theme config: icon + color
                    const sectionTheme: Record<string, { icon: React.ComponentType<{className?: string}>, bg: string, text: string, border: string, headerBg: string }> = {
                        'Agendamento': { icon: Calendar, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-400', headerBg: 'hover:bg-blue-50/60' },
                        'Equipe': { icon: Users2, bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-400', headerBg: 'hover:bg-teal-50/60' },
                        'Prontuário': { icon: HeartPulse, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-400', headerBg: 'hover:bg-amber-50/60' },
                        'Terapia': { icon: Brain, bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-400', headerBg: 'hover:bg-indigo-50/60' },
                        'Financeiro': { icon: DollarSign, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-400', headerBg: 'hover:bg-emerald-50/60' },
                        'Comunicação': { icon: MessageCircle, bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-400', headerBg: 'hover:bg-sky-50/60' },
                        'Gestão': { icon: BarChart3, bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-400', headerBg: 'hover:bg-orange-50/60' },
                        'Configurações': { icon: Settings, bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-400', headerBg: 'hover:bg-slate-50/60' },
                        'Administração': { icon: Shield, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-400', headerBg: 'hover:bg-red-50/60' },
                    }
                    const theme = sectionTheme[section.title]
                    const SectionIcon = theme?.icon

                    return (
                        <div key={section.title}>
                            {isPrincipal ? (
                                <div className="space-y-1">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href
                                        return (
                                            <NavItemComponent
                                                key={item.href}
                                                item={item}
                                                isActive={isActive}
                                                currentPlan={currentPlan}
                                                isMobile={isMobile}
                                            />
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className={cn(
                                    "rounded-lg transition-all duration-200",
                                    isOpen && theme ? `${theme.bg} border ${theme.border}/20` : ""
                                )}>
                                    <button
                                        onClick={() => toggleSection(section.title)}
                                        className={cn(
                                            "flex items-center justify-between w-full px-3 py-2 rounded-lg group cursor-pointer transition-all duration-200",
                                            theme?.headerBg || 'hover:bg-muted/50',
                                            isOpen && theme ? theme.text : ''
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            {SectionIcon && (
                                                <SectionIcon className={cn(
                                                    "w-4 h-4 transition-colors duration-200",
                                                    isOpen && theme ? theme.text : "text-muted-foreground group-hover:text-foreground"
                                                )} />
                                            )}
                                            <span className={cn(
                                                "text-xs font-semibold uppercase tracking-wider transition-colors duration-200",
                                                isOpen && theme ? theme.text : "text-muted-foreground group-hover:text-foreground"
                                            )}>
                                                {section.title}
                                            </span>
                                        </div>
                                        <ChevronDown className={cn(
                                            "w-3.5 h-3.5 transition-all duration-200",
                                            isOpen && theme ? theme.text : "text-muted-foreground group-hover:text-foreground",
                                            !isOpen && "-rotate-90"
                                        )} />
                                    </button>
                                    <div
                                        className={cn(
                                            "overflow-hidden transition-all duration-200 ease-in-out",
                                            isOpen ? "max-h-[2000px] opacity-100 pb-1.5 px-1" : "max-h-0 opacity-0"
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
                                                        isMobile={isMobile}
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
            </nav>

            {/* Role indicator */}
            <div className="px-4 py-3 border-t text-xs text-muted-foreground shrink-0">
                {role === 'SUPER_ADMIN' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full">
                        <Shield className="w-3 h-3" /> Super Admin
                    </span>
                )}
                {role === 'CLINIC_ADMIN' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        <Building2 className="w-3 h-3" /> Admin da Clínica
                    </span>
                )}
                {role === 'DOCTOR' && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        <Stethoscope className="w-3 h-3" /> {profLabel.singular}
                    </span>
                )}
            </div>
        </aside>
    )
}

