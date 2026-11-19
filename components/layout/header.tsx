'use client'

import { useEffect, useState } from 'react'
import { useAuth, useRole } from '@/lib/hooks/use-auth'
import { useClinic } from '@/lib/hooks/use-clinic'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils'
import { Menu, LogOut, User, Settings, HelpCircle } from 'lucide-react'
import { NotificationBell } from './notification-bell'
import Link from 'next/link'

interface HeaderProps {
    onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
    const { profile, signOut } = useAuth()
    const { isClinicAdmin, isSuperAdmin, isReceptionist } = useRole()
    const { clinic } = useClinic()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 sm:px-6">
            {/* Left: Mobile menu button + clinic context */}
            <div className="flex items-center gap-3 min-w-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden min-w-[40px] min-h-[40px]"
                    onClick={onMenuClick}
                    aria-label="Abrir menu"
                >
                    <Menu className="w-5 h-5" />
                </Button>

                {clinic?.name && (
                    <div className="hidden sm:flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <span className="text-sm font-semibold text-foreground truncate max-w-[280px]">
                            {clinic.name}
                        </span>
                    </div>
                )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Atalho discreto para Central de Ajuda */}
                <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="text-muted-foreground hover:text-foreground gap-1.5 px-2.5 h-9 text-sm font-medium"
                    title="Central de Ajuda e Manual Passo a Passo"
                >
                    <Link href="/dashboard/help" prefetch={false} aria-label="Central de Ajuda">
                        <HelpCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">Ajuda</span>
                    </Link>
                </Button>

                {/* Notifications */}
                <NotificationBell />

                {/* User menu (montado no cliente para evitar mismatch de useId Radix na hidratação) */}
                {mounted ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="flex items-center gap-2.5 pl-1.5 pr-2.5 h-9 rounded-md hover:bg-accent"
                            >
                                <div className="w-8 h-8 rounded-md bg-accent text-accent-foreground border border-primary/15 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-semibold">
                                        {profile ? getInitials(profile.full_name) : '?'}
                                    </span>
                                </div>
                                <span className="hidden md:inline-block text-sm font-medium text-foreground max-w-[180px] truncate">
                                    {profile?.full_name}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{profile?.full_name}</p>
                                    <p className="text-xs font-normal text-muted-foreground truncate">{profile?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/perfil" prefetch={false} className="w-full flex items-center cursor-pointer">
                                    <User className="w-4 h-4 mr-2 text-muted-foreground" />
                                    Meu Perfil
                                </Link>
                            </DropdownMenuItem>
                            {(isClinicAdmin || isSuperAdmin || isReceptionist) && (
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/configuracoes" prefetch={false} className="w-full flex items-center cursor-pointer">
                                        <Settings className="w-4 h-4 mr-2 text-muted-foreground" />
                                        Configurações
                                    </Link>
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer">
                                <LogOut className="w-4 h-4 mr-2" />
                                Sair
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button
                        variant="ghost"
                        className="flex items-center gap-2.5 pl-1.5 pr-2.5 h-9 rounded-md hover:bg-accent"
                        aria-label="Menu do usuário"
                    >
                        <div className="w-8 h-8 rounded-md bg-accent text-accent-foreground border border-primary/15 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold">?</span>
                        </div>
                    </Button>
                )}
            </div>
        </header>
    )
}
