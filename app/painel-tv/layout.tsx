import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Painel de Atendimento | CliniGo',
    description: 'Painel de chamada de pacientes para TV',
}

export default function PainelTVLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen">
            {children}
        </div>
    )
}
