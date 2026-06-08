import { ReactNode } from 'react'

export const metadata = {
    title: 'Encontrar clínicas | CliniGo',
    description: 'Busque clínicas médicas e terapêuticas na sua cidade e agende sua consulta online.',
}

export default function BuscarLayout({ children }: { children: ReactNode }) {
    return <>{children}</>
}
