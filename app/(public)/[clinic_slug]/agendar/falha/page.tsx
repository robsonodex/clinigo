'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react'

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

export default function FailurePage({ params }: PageProps) {
    const { clinic_slug } = use(params)

    return (
        <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
            <Card className="max-w-lg w-full">
                <CardContent className="pt-8 pb-6 text-center">
                    {/* Error Icon */}
                    <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-12 h-12 text-red-600" />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-red-700 mb-2">
                        Pagamento não aprovado
                    </h1>
                    <p className="text-muted-foreground mb-6">
                        Infelizmente não foi possível processar seu pagamento.
                        Por favor, tente novamente ou use outro método de pagamento.
                    </p>

                    {/* Tips */}
                    <div className="text-left text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg mb-8">
                        <p className="font-medium mb-2">Possíveis causas:</p>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Saldo insuficiente</li>
                            <li>Dados do cartão incorretos</li>
                            <li>Limite de transações atingido</li>
                            <li>Cartão bloqueado pela operadora</li>
                        </ul>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Link href={`/${clinic_slug}/agendar`} className="block">
                            <Button className="w-full" size="lg">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Tentar novamente
                            </Button>
                        </Link>
                        <Link href={`/${clinic_slug}`} className="block">
                            <Button variant="ghost" className="w-full">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar ao início
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
