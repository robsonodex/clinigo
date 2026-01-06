import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
            <div className="text-center space-y-6 max-w-lg">
                <h1 className="text-4xl font-bold text-gray-900">Clinigo SaaS</h1>
                <p className="text-gray-600">
                    Sistema completo de teleconsultoria para clínicas médicas.
                </p>

                <div className="flex flex-col gap-4 sm:flex-row justify-center">
                    <Link href="/login">
                        <Button size="lg" className="w-full sm:w-auto">
                            Acesso Clínicas (Login)
                        </Button>
                    </Link>

                    <Link href="/clinica-teste">
                        <Button variant="outline" size="lg" className="w-full sm:w-auto">
                            Ver Clínica Demo (Agendamento)
                        </Button>
                    </Link>
                </div>

                <div className="mt-8 p-4 bg-white rounded-lg border shadow-sm text-sm text-left">
                    <p className="font-semibold mb-2">Para testar:</p>
                    <ul className="list-disc pl-4 space-y-1 text-gray-600">
                        <li>Crie uma conta/clínica via Login ou use seeds.</li>
                        <li>Acesse <code>/clinica-teste</code> (substitua pelo slug da sua clínica).</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
