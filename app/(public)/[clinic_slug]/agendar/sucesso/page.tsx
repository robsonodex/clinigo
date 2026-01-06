'use client'

import { use, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Calendar, Video, Mail, ArrowRight } from 'lucide-react'

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

function SuccessContent({ clinicSlug }: { clinicSlug: string }) {
    const searchParams = useSearchParams()
    const appointmentId = searchParams.get('appointment_id')

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
            <Card className="max-w-lg w-full">
                <CardContent className="pt-8 pb-6 text-center">
                    {/* Success Icon */}
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-green-700 mb-2">
                        Agendamento Confirmado!
                    </h1>
                    <p className="text-muted-foreground mb-6">
                        Seu pagamento foi aprovado e sua consulta está confirmada.
                    </p>

                    {/* Info cards */}
                    <div className="space-y-3 text-left mb-8">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Mail className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-sm font-medium">Confirmação por email</p>
                                <p className="text-xs text-muted-foreground">
                                    Enviamos os detalhes para seu email
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Calendar className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-sm font-medium">Lembrete</p>
                                <p className="text-xs text-muted-foreground">
                                    Você receberá um lembrete 1h antes
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <Video className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-sm font-medium">Videochamada</p>
                                <p className="text-xs text-muted-foreground">
                                    O link estará disponível no email
                                </p>
                            </div>
                        </div>
                    </div>

                    {appointmentId && (
                        <p className="text-xs text-muted-foreground mb-4">
                            ID do agendamento: {appointmentId}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                        <Link href={`/${clinicSlug}/agendar`} className="block">
                            <Button className="w-full" size="lg">
                                Agendar outra consulta
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function SuccessPage({ params }: PageProps) {
    const { clinic_slug } = use(params)

    return (
        <Suspense fallback={<div className="min-h-screen bg-green-50" />}>
            <SuccessContent clinicSlug={clinic_slug} />
        </Suspense>
    )
}
