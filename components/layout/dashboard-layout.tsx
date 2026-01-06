'use client'

import { useState } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { SupportChatWrapper } from '@/components/support/support-chat-wrapper'

interface DashboardLayoutProps {
    children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Mobile Sidebar */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetContent side="left" className="p-0 w-64">
                    <Sidebar />
                </SheetContent>
            </Sheet>

            {/* Main content */}
            <div className="lg:pl-64">
                <Header onMenuClick={() => setMobileMenuOpen(true)} />
                <main className="p-4 lg:p-6">{children}</main>
            </div>

            {/* Support Chat Widget (PRO/Enterprise only) */}
            <SupportChatWrapper />
        </div>
    )
}
