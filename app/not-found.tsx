import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-center">
            <h1 className="mb-4 text-6xl font-bold text-emerald-600">404</h1>
            <h2 className="mb-6 text-2xl font-semibold text-gray-900">
                Página não encontrada
            </h2>
            <p className="mb-8 max-w-md text-gray-600">
                Desculpe, não conseguimos encontrar a página que você está procurando.
                Ela pode ter sido movida ou não existir mais.
            </p>
            <Link href="/">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                    Voltar para o Início
                </Button>
            </Link>
        </div>
    )
}
