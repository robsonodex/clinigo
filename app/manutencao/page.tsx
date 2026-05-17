import { Wrench } from 'lucide-react'

export default function ManutencaoPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <div className="mb-8 flex justify-center">
                    <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
                        <Wrench className="w-12 h-12 text-amber-400" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">
                    Sistema em Manutenção
                </h1>
                <p className="text-gray-400 text-lg mb-6">
                    O CliniGo está passando por uma manutenção programada para melhorar sua experiência.
                </p>
                <p className="text-gray-500 text-sm mb-8">
                    Previsão de retorno em breve. Pedimos desculpas pelo inconveniente.
                </p>
                <div className="flex justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '200ms' }} />
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>
                <p className="text-gray-600 text-xs mt-8">
                    © {new Date().getFullYear()} CliniGo — Gestão Inteligente de Clínicas
                </p>
            </div>
        </div>
    )
}
