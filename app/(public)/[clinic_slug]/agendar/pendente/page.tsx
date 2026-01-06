'use client'

import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Mail, RefreshCw } from 'lucide-react'

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

export default function PendingPage({ params }: PageProps) {
    const { clinic_slug } = use(params)

    return (
        <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white flex items-center justify-center p-4">
            <Card className="max-w-lg w-full">
                <CardContent className="pt-8 pb-6 text-center">
                    {/* Pending Icon */}
                    <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
                        <Clock className="w-12 h-12 text-yellow-600" />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-yellow-700 mb-2">
                        Pagamento Pendente
                    </h1>
                    <p className="text-muted-foreground mb-6">
                        Seu pagamento está sendo processado. Assim que for confirmado, você
                        receberá um email com os detalhes.
                    </p>

                    {/* Info */}
                    <div className="space-y-3 text-left mb-8">
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <RefreshCw className="w-5 h-5 text-yellow-600" />
                            <div>
                                <p className="text-sm font-medium">Aguardando confirmação</p>
                                <p className="text-xs text-muted-foreground">
                                    O pagamento pode levar alguns minutos para ser processado
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Mail className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-sm font-medium">Notificação por email</p>
                                <p className="text-xs text-muted-foreground">
                                    Enviaremos uma confirmação quando o pagamento for aprovado
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Link href={`/${clinic_slug}/agendar`} className="block">
                            <Button variant="outline" className="w-full" size="lg">
                                Voltar para agendamentos
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
