'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ChatNotificationPopup } from '@/components/chat/ChatNotificationPopup'

interface DashboardLayoutProps {
    children: React.ReactNode
}

const SHELL_LAYOUT_CSS = `
.clinigo-desktop-sidebar {
    display: none;
}
.clinigo-mobile-sidebar {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    max-height: 100%;
    overflow: hidden;
}
.clinigo-sidebar-nav {
    flex: 1 1 0%;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
}
.clinigo-sidebar-nav::-webkit-scrollbar {
    width: 6px;
}
.clinigo-sidebar-nav::-webkit-scrollbar-track {
    background: transparent;
}
.clinigo-sidebar-nav::-webkit-scrollbar-thumb {
    background-color: rgba(148, 163, 184, 0.45);
    border-radius: 9999px;
}
.clinigo-sidebar-nav::-webkit-scrollbar-thumb:hover {
    background-color: rgba(148, 163, 184, 0.72);
}
.clinigo-nav-row .clinigo-help-btn {
    display: none;
}
.clinigo-nav-row:hover .clinigo-help-btn {
    display: inline-flex;
}
@media (min-width: 1024px) {
    .clinigo-app-shell {
        display: flex !important;
        flex-direction: row !important;
        align-items: flex-start !important;
    }
    .clinigo-desktop-sidebar {
        display: flex !important;
        flex-direction: column !important;
        width: 280px !important;
        min-width: 280px !important;
        max-width: 280px !important;
        flex-shrink: 0 !important;
        position: sticky !important;
        top: 0 !important;
        left: 0 !important;
        height: 100vh !important;
        max-height: 100vh !important;
        overflow: hidden !important;
        z-index: 30 !important;
    }
    .clinigo-main-column {
        flex: 1 1 0% !important;
        min-width: 0 !important;
        width: auto !important;
        display: flex !important;
        flex-direction: column !important;
        min-height: 100vh !important;
    }
}
`

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Garante sistema sempre em Tema Claro Editorial e injeta CSS estrutural da casca no <head> sem alterar a árvore React
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('dark')
            document.documentElement.style.colorScheme = 'light'

            if (!document.getElementById('clinigo-shell-style')) {
                const styleEl = document.createElement('style')
                styleEl.id = 'clinigo-shell-style'
                styleEl.textContent = SHELL_LAYOUT_CSS
                document.head.appendChild(styleEl)
            }
        }
    }, [])

    return (
        <div className="clinigo-app-shell min-h-screen bg-background text-foreground lg:flex lg:items-start">
            {/* Desktop Sidebar — fluxo flex real (sticky 100vh com rolagem própria), nunca sobrepõe o conteúdo */}
            <Sidebar />

            {/* Mobile Sidebar - Sheet Drawer */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetContent side="left" className="p-0 w-72 border-r border-border">
                    <SheetHeader className="sr-only">
                        <SheetTitle>Menu de Navegação</SheetTitle>
                        <SheetDescription>Navegação principal dos módulos do CliniGo</SheetDescription>
                    </SheetHeader>
                    <Sidebar isMobile />
                </SheetContent>
            </Sheet>

            {/* Main content — sempre inicia exatamente à direita da sidebar no desktop (x = 280px) */}
            <div className="clinigo-main-column flex-1 min-w-0 flex flex-col min-h-screen">
                <Header onMenuClick={() => setMobileMenuOpen(true)} />
                <main className="flex-1 p-4 sm:p-6 lg:p-7 pb-24 md:pb-8">
                    <div className="max-w-[1600px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>

            {/* Chat Internal Notification Popup */}
            <ChatNotificationPopup />
        </div>
    )
}
