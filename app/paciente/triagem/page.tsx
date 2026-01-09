'use client'

/**
 * Triagem AiA - Portal do Paciente
 * Página de triagem médica com chat interativo
 */

import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TriageChat } from '@/components/aia'
import type { TriageResult } from '@/lib/aia/triage-types'

export default function TriagemPacientePage() {
    const router = useRouter()

    const handleComplete = (result: TriageResult) => {
        // Could redirect to scheduling or show summary
        console.log('Triage complete:', result)
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
            {/* Header */}
            <header className="border-b bg-white/80 dark:bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <div className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-emerald-600" />
                        <span className="font-semibold">CliniGo</span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8 max-w-2xl">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        Triagem Inteligente
                    </h1>
                    <p className="text-muted-foreground">
                        Converse com a AiA para entender seus sintomas e receber orientação médica inicial
                    </p>
                </div>

                {/* Chat */}
                <TriageChat
                    onComplete={handleComplete}
                    className="shadow-xl"
                />

                {/* Safety Notice */}
                <div className="mt-6 flex items-start gap-3 text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                    <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-foreground">Sua segurança é prioridade</p>
                        <p className="mt-1">
                            Este serviço não substitui atendimento médico. Em emergências, ligue <strong>192 (SAMU)</strong>.
                            Seus dados são protegidos conforme a LGPD.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
