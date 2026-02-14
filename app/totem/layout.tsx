import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Totem de Auto Atendimento | CliniGo',
    description: 'Auto atendimento para pacientes - Check-in e registro',
}

export default function TotemLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div
            className="min-h-screen overflow-hidden select-none"
            style={{
                touchAction: 'manipulation',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
            }}
        >
            {children}
        </div>
    )
}
