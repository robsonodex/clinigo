/**
 * Mobile Bottom Navigation Component
 * Fixed bottom bar for mobile devices
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRole } from '@/lib/hooks/use-auth'

interface NavItem {
    href: string
    icon: React.ComponentType<{ className?: string }>
    label: string
}

const navItems: NavItem[] = [
    { href: '/dashboard', icon: Home, label: 'Início' },
    { href: '/dashboard/agenda', icon: Calendar, label: 'Agenda' },
    { href: '/dashboard/pacientes', icon: Users, label: 'Pacientes' },
    { href: '/dashboard/financeiro', icon: DollarSign, label: 'Financeiro' },
]

export function MobileBottomNav() {
    const pathname = usePathname()
    const { role, isCoordinator } = useRole()

    const filteredItems = navItems
        .map(item => {
            if (item.href === '/dashboard/agenda' && role === 'DOCTOR' && !isCoordinator) {
                return { ...item, href: '/dashboard/minha-agenda', label: 'Minha Agenda' }
            }
            return item
        })
        .filter(item => {
            if (!role) return item.href === '/dashboard'
            if (item.href === '/dashboard/agenda') {
                return ['CLINIC_ADMIN', 'RECEPTIONIST', 'STAFF', 'SUPER_ADMIN'].includes(role) || (role === 'DOCTOR' && isCoordinator)
            }
            if (item.href === '/dashboard/minha-agenda') {
                return role === 'DOCTOR'
            }
            if (item.href === '/dashboard/pacientes') {
                return ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE', 'STAFF', 'SUPER_ADMIN'].includes(role)
            }
            if (item.href === '/dashboard/financeiro') {
                return ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'].includes(role)
            }
            return true
        })

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 safe-area-bottom">
            <div className="flex justify-around items-center h-16 px-2">
                {filteredItems.map((item) => {
                    const Icon = item.icon
                    const isActive = item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname === item.href || pathname.startsWith(`${item.href}/`)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            className={cn(
                                'flex flex-col items-center justify-center',
                                'min-w-[60px] min-h-[48px]',
                                'px-2 py-1 rounded-md',
                                'transition-colors duration-200',
                                'active:scale-95',
                                isActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                            <span className={cn(
                                'text-[10px] mt-0.5 font-medium',
                                isActive && 'font-semibold'
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
