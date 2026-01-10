'use client'

/**
 * Triagem AiA - Página Pública
 * Triagem médica com chat interativo da AiA para pacientes
 */

import { use, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Heart, Shield, Bot, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TriageChat } from '@/components/aia'
import { fetchClinicBySlug } from '@/lib/api-client'
import type { TriageResult } from '@/lib/aia/triage-types'
import Image from 'next/image'

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

function TriagemContent({ params }: PageProps) {
    const { clinic_slug } = use(params)
    const router = useRouter()

    // Fetch clinic data for branding
    const { data: clinic, isLoading } = useQuery({
        queryKey: ['clinic', clinic_slug],
        queryFn: () => fetchClinicBySlug(clinic_slug),
        enabled: !!clinic_slug,
    })

    const handleComplete = (result: TriageResult) => {
        // Redirect to scheduling page with context
        if (result.recommended_specialty) {
            router.push(`/${clinic_slug}/agendar?specialty=${encodeURIComponent(result.recommended_specialty)}`)
        } else {
            router.push(`/${clinic_slug}/agendar`)
        }
    }

    const primaryColor = clinic?.primary_color || 'hsl(var(--primary))'

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
            {/* Header with Clinic Branding */}
            <header className="border-b bg-white/80 dark:bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/${clinic_slug}/agendar`)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>

                    <div className="flex items-center gap-3">
                        {clinic?.logo_url ? (
                            <Image
                                src={clinic.logo_url}
                                alt={clinic.name}
                                width={32}
                                height={32}
                                className="h-8 w-auto object-contain"
                            />
                        ) : (
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: primaryColor }}
                            >
                                {clinic?.name?.charAt(0) || 'C'}
                            </div>
                        )}
                        <span className="font-semibold" style={{ color: primaryColor }}>
                            {clinic?.name || 'CliniGo'}
                        </span>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-8 max-w-2xl">
                {/* Hero */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 mb-4 shadow-lg shadow-emerald-500/30">
                        <Bot className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">
                        Triagem Inteligente
                    </h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Converse com a <strong className="text-emerald-600">AiA</strong> para
                        entender seus sintomas e descobrir qual especialista procurar.
                    </p>
                </div>

                {/* Chat */}
                <TriageChat
                    onComplete={handleComplete}
                    className="shadow-xl rounded-2xl border"
                />

                {/* Safety Notice */}
                <div className="mt-6 flex items-start gap-3 text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                    <Shield className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                    <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">Atenção</p>
                        <p className="mt-1 text-amber-700 dark:text-amber-300">
                            Este serviço não substitui atendimento médico. Em emergências, ligue <strong>192 (SAMU)</strong> ou <strong>193 (Bombeiros)</strong>.
                            Seus dados são protegidos conforme a LGPD.
                        </p>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t py-6 mt-8 bg-white/50">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-rose-500" />
                        <span>Sua saúde em primeiro lugar</span>
                    </div>
                    <p>© 2026 {clinic?.name || 'CliniGo'}. Teleconsultoria médica.</p>
                </div>
            </footer>
        </div>
    )
}

export default function TriagemPage({ params }: PageProps) {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        }>
            <TriagemContent params={params} />
        </Suspense>
    )
}
