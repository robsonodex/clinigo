'use client'

import Link from 'next/link'
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
} from 'lucide-react'
import { useState } from 'react'
import type { PlanType } from '@/lib/constants/plans'

interface NavItem {
    title: string
    href: string
    icon: React.ComponentType<{ className?: string }>
    roles?: ('SUPER_ADMIN' | 'CLINIC_ADMIN' | 'DOCTOR')[]
    badge?: string
    minPlan?: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE'
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
        ],
    },
    {
        title: 'Agendamento',
        items: [
            {
                title: 'Agenda',
                href: '/dashboard/agenda',
                icon: Calendar,
                roles: ['CLINIC_ADMIN'],
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
                title: 'Triagem AiA',
                href: '/dashboard/triagem',
                icon: HeartPulse,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
                badge: 'PRO',
                minPlan: 'PROFESSIONAL',
            },
            {
                title: 'Recepção',
                href: '/dashboard/recepcao',
                icon: Clipboard,
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'Horários',
                href: '/dashboard/horarios',
                icon: Clock,
                roles: ['CLINIC_ADMIN'],
            },
        ],
    },
    {
        title: 'Equipe',
        items: [
            {
                title: 'Médicos',
                href: '/dashboard/medicos',
                icon: Users,
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'Pacientes',
                href: '/dashboard/pacientes',
                icon: UserPlus,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
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
                badge: 'PRO',
                minPlan: 'PROFESSIONAL',
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
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
                badge: 'PRO',
                minPlan: 'PROFESSIONAL',
            },
        ],
    },
    {
        title: 'Financeiro',
        items: [
            {
                title: 'Pagamentos',
                href: '/dashboard/pagamentos',
                icon: CreditCard,
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'Financeiro',
                href: '/dashboard/financeiro',
                icon: DollarSign,
                roles: ['CLINIC_ADMIN'],
                badge: 'PRO',
                minPlan: 'PROFESSIONAL',
            },
            {
                title: 'Faturamento TISS',
                href: '/dashboard/tiss',
                icon: Receipt,
                roles: ['CLINIC_ADMIN'],
                badge: 'PRO',
                minPlan: 'PROFESSIONAL',
            },
            {
                title: 'Convênios',
                href: '/dashboard/convenios',
                icon: Shield,
                roles: ['CLINIC_ADMIN'],
            },
        ],
    },
    {
        title: 'Comunicação',
        items: [
            {
                title: 'WhatsApp',
                href: '/dashboard/whatsapp',
                icon: MessageCircle,
                roles: ['CLINIC_ADMIN', 'DOCTOR'],
                badge: 'PRO',
                minPlan: 'PROFESSIONAL',
            },
            {
                title: 'Notificações',
                href: '/dashboard/notificacoes',
                icon: Send,
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'CRM',
                href: '/dashboard/crm',
                icon: Megaphone,
                roles: ['CLINIC_ADMIN'],
                badge: 'PRO',
                minPlan: 'PROFESSIONAL',
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
                roles: ['CLINIC_ADMIN'],
                badge: 'PRO',
                minPlan: 'PROFESSIONAL',
            },
            {
                title: 'Relatórios',
                href: '/dashboard/relatorios',
                icon: BarChart3,
                roles: ['CLINIC_ADMIN'],
            },
            {
                title: 'Termos Legais',
                href: '/dashboard/termos',
                icon: Scale,
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
                badge: 'ENT',
                minPlan: 'ENTERPRISE',
            },
        ],
    },
    // Admin da Plataforma (Super Admin)
    {
        title: 'Administração',
        items: [
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
                title: 'Marketplace',
                href: '/dashboard/marketplace',
                icon: Store,
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
                title: 'Sistema',
                href: '/dashboard/sistema',
                icon: Settings,
                roles: ['SUPER_ADMIN'],
            },
            {
                title: 'Health Check',
                href: '/dashboard/health',
                icon: Activity,
                roles: ['SUPER_ADMIN'],
            },
        ],
    },
]

// Helper to check if plan meets requirement
function planMeetsMinimum(currentPlan: PlanType, requiredPlan: PlanType): boolean {
    const planOrder: Record<PlanType, number> = {
        'STARTER': 0,
        'BASIC': 1,
        'PROFESSIONAL': 2,
        'ENTERPRISE': 3,
        'NETWORK': 4,
    }
    return (planOrder[currentPlan] || 0) >= (planOrder[requiredPlan] || 0)
}

import { VisualLock } from '@/components/sidebar/visual-lock'

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
        return (
            <div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        'flex items-center justify-between w-full gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        touchClass,
                        isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'
                    )}
                >
                    <div className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        {item.title}
                        {item.badge && (
                            <span className={cn(
                                "px-1.5 py-0.5 text-[10px] font-bold rounded",
                                item.badge === 'PRO' ? "bg-blue-100 text-blue-700" :
                                    item.badge === 'ENT' ? "bg-purple-100 text-purple-700" :
                                        "bg-gray-100 text-gray-700"
                            )}>
                                {item.badge}
                            </span>
                        )}
                    </div>
                    {isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </button>
                {isOpen && (
                    <div className="ml-4 pl-4 border-l mt-1 space-y-1">
                        {item.children?.map((child) => (
                            <VisualLock
                                key={child.href}
                                requiredPlan={child.minPlan || 'BASIC'}
                                currentPlan={currentPlan}
                                featureName={child.title}
                            >
                                <Link
                                    href={child.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                        touchClass,
                                        'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'
                                    )}
                                >
                                    <child.icon className="w-4 h-4" />
                                    {child.title}
                                </Link>
                            </VisualLock>
                        ))}
                    </div>
                )}
            </div>
        )
    }

    return (
        <VisualLock
            requiredPlan={item.minPlan || 'BASIC'}
            currentPlan={currentPlan}
            featureName={item.title}
        >
            <Link
                href={item.href}
                className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    touchClass,
                    isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'
                )}
            >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                    <span className={cn(
                        "px-1.5 py-0.5 text-[10px] font-bold rounded",
                        item.badge === 'PRO' ? "bg-blue-100 text-blue-700" :
                            item.badge === 'ENT' ? "bg-purple-100 text-purple-700" :
                                "bg-gray-100 text-gray-700"
                    )}>
                        {item.badge}
                    </span>
                )}
            </Link>
        </VisualLock>
    )
}


export function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
    const pathname = usePathname()
    const { role } = useRole()
    const { planType, isLoading } = usePlan()

    // Default to BASIC if loading
    const currentPlan: PlanType = planType || 'BASIC'

    // Filter sections based on role
    const filteredSections = navigationSections
        .map(section => ({
            ...section,
            items: section.items.filter(
                (item) => !item.roles || (role && item.roles.includes(role))
            ),
        }))
        .filter(section => section.items.length > 0)

    return (
        <aside className={cn(
            "flex flex-col bg-white border-r h-full",
            isMobile
                ? "w-full"
                : "hidden lg:flex lg:w-64 lg:fixed lg:inset-y-0"
        )}>
            {/* Logo */}
            <div className="flex items-center h-16 px-6 border-b shrink-0">
                <Link href="/dashboard" className="flex items-center gap-2 font-bold text-primary">
                    <Stethoscope className="w-6 h-6" />
                    <span>CliniGo</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
                {filteredSections.map((section) => (
                    <div key={section.title}>
                        <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {section.title}
                        </h3>
                        <div className="space-y-1">
                            {section.items.map((item) => {
                                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
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
                ))}
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
                        <Stethoscope className="w-3 h-3" /> Médico
                    </span>
                )}
            </div>
        </aside>
    )
}

