import './intake.css'

export const metadata = {
    title: 'Pre-cadastro | CliniGo',
    description: 'Preencha sua ficha de cadastro para a clínica',
    robots: 'noindex, nofollow',
}

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
