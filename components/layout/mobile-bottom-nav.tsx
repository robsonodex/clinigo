/**
 * Mobile Bottom Navigation Component
 * Fixed bottom bar for mobile devices
 */
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Users, DollarSign, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'

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

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-50 safe-area-bottom">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center',
                                'min-w-[60px] min-h-[48px]', // Touch target
                                'px-2 py-1 rounded-lg',
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
