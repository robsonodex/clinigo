import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Seja Parceiro CliniGo - Ganhe 30% de Comissão',
    description: 'Indique clínicas para o CliniGo e ganhe 30% da primeira mensalidade de cada venda fechada. Pagamento via Pix todo dia 5.',
    openGraph: {
        title: 'Seja Parceiro CliniGo',
        description: 'Ganhe 30% de comissão por cada clínica que você vender. Pagamento via Pix todo dia 5.',
        images: ['/logo-clinigo.png'],
        type: 'website',
    },
    twitter: {
        card: 'summary',
        title: 'Seja Parceiro CliniGo',
        description: 'Ganhe 30% de comissão por cada clínica que você vender.',
        images: ['/logo-clinigo.png'],
    },
}

export default function PartnersLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
