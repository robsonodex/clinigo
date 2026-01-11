'use client'

import { use, Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
    CheckCircle,
    Calendar,
    Video,
    Mail,
    ArrowRight,
    Copy,
    Clock,
    User,
    Phone,
    Banknote,
    QrCode,
    Loader2,
    ArrowLeft
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'

interface PaymentInstructions {
    amount: number
    doctor_name: string
    clinic_name: string
    clinic_phone: string | null
    clinic_email: string | null
    pix_key: string | null
    bank_account: string | null
    instructions: string
}

interface AppointmentDetails {
    id: string
    appointment_date: string
    appointment_time: string
    status: string
    payment_instructions?: PaymentInstructions
    doctor?: {
        user: { full_name: string }
        specialty: string
    }
}

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

function SuccessContent({ clinicSlug }: { clinicSlug: string }) {
    const searchParams = useSearchParams()
    const appointmentId = searchParams.get('appointmentId') || searchParams.get('appointment_id')
    const [copied, setCopied] = useState(false)

    // Tentar obter payment_instructions da URL (passado após criação)
    const [paymentInfo, setPaymentInfo] = useState<PaymentInstructions | null>(null)

    useEffect(() => {
        // Tentar ler do sessionStorage (salvo pela página de confirmação)
        const stored = sessionStorage.getItem(`payment_${appointmentId}`)
        if (stored) {
            try {
                setPaymentInfo(JSON.parse(stored))
            } catch (e) {
                console.error('Failed to parse payment info', e)
            }
        }
    }, [appointmentId])

    // Fetch appointment details
    const { data: appointment, isLoading } = useQuery({
        queryKey: ['appointment-success', appointmentId],
        queryFn: () => api.get<AppointmentDetails>(`/appointments/${appointmentId}`),
        enabled: !!appointmentId,
    })

    // Mark as paid mutation
    const { mutate: markAsPaid, isPending } = useMutation({
        mutationFn: () =>
            api.patch(`/appointments/${appointmentId}`, {
                status: 'PAYMENT_PENDING'
            }),
        onSuccess: () => {
            toast.success('Notificação enviada! A clínica irá confirmar seu pagamento em breve.')
        },
        onError: () => {
            toast.error('Erro ao enviar notificação')
        }
    })

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        toast.success('Copiado para a área de transferência!')
        setTimeout(() => setCopied(false), 2000)
    }

    // Determinar status
    const status = appointment?.status || 'PENDING_PAYMENT'
    const needsPayment = status === 'PENDING_PAYMENT'
    const waitingConfirmation = status === 'PAYMENT_PENDING'
    const isConfirmed = status === 'CONFIRMED'

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur">
                <div className="container mx-auto px-4 h-14 flex items-center">
                    <Link
                        href={`/${clinicSlug}/agendar`}
                        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </Link>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-lg">
                {/* Status Card */}
                <Card className="mb-6">
                    <CardContent className="pt-8 pb-6 text-center">
                        {/* Success Icon */}
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isConfirmed ? 'bg-green-100' : needsPayment ? 'bg-yellow-100' : 'bg-blue-100'
                            }`}>
                            {isConfirmed ? (
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            ) : needsPayment ? (
                                <Banknote className="w-12 h-12 text-yellow-600" />
                            ) : (
                                <Clock className="w-12 h-12 text-blue-600" />
                            )}
                        </div>

                        {/* Title */}
                        <h1 className={`text-2xl font-bold mb-2 ${isConfirmed ? 'text-green-700' : needsPayment ? 'text-yellow-700' : 'text-blue-700'
                            }`}>
                            {isConfirmed
                                ? 'Consulta Confirmada! 🎉'
                                : needsPayment
                                    ? 'Complete o Pagamento'
                                    : 'Aguardando Confirmação'
                            }
                        </h1>
                        <p className="text-muted-foreground mb-4">
                            {isConfirmed
                                ? 'Você receberá o link da videochamada por email.'
                                : needsPayment
                                    ? 'Seu horário está reservado por 24h. Pague para confirmar.'
                                    : 'A clínica está verificando seu pagamento.'
                            }
                        </p>

                        {/* Appointment Info */}
                        {appointment && (
                            <div className="text-left space-y-2 p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    <span className="capitalize">
                                        {format(
                                            parse(appointment.appointment_date, 'yyyy-MM-dd', new Date()),
                                            "EEEE, d 'de' MMMM",
                                            { locale: ptBR }
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span>{appointment.appointment_time}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Payment Instructions (only if needs payment) */}
                {needsPayment && paymentInfo && (
                    <Card className="mb-6 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Banknote className="h-5 w-5 text-yellow-600" />
                                Como Pagar - {formatCurrency(paymentInfo.amount)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* PIX */}
                            {paymentInfo.pix_key && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2 text-sm">
                                        <QrCode className="h-4 w-4 text-green-600" />
                                        Chave PIX
                                    </h4>
                                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border">
                                        <code className="flex-1 text-xs break-all">
                                            {paymentInfo.pix_key}
                                        </code>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => copyToClipboard(paymentInfo.pix_key!)}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Dados Bancários */}
                            {paymentInfo.bank_account && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">🏦 Transferência</h4>
                                    <pre className="p-3 bg-white rounded-lg border text-xs whitespace-pre-wrap">
                                        {paymentInfo.bank_account}
                                    </pre>
                                </div>
                            )}

                            {/* Instruções */}
                            {paymentInfo.instructions && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">📋 Instruções</h4>
                                    <p className="text-gray-700 text-sm">
                                        {paymentInfo.instructions}
                                    </p>
                                </div>
                            )}

                            {/* Contato */}
                            {(paymentInfo.clinic_phone || paymentInfo.clinic_email) && (
                                <div className="p-3 bg-gray-100 rounded-lg space-y-1">
                                    <p className="font-semibold text-xs">Dúvidas?</p>
                                    {paymentInfo.clinic_phone && (
                                        <p className="flex items-center gap-2 text-xs">
                                            <Phone className="h-3 w-3" />
                                            {paymentInfo.clinic_phone}
                                        </p>
                                    )}
                                    {paymentInfo.clinic_email && (
                                        <p className="flex items-center gap-2 text-xs">
                                            <Mail className="h-3 w-3" />
                                            {paymentInfo.clinic_email}
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button
                                onClick={() => markAsPaid()}
                                disabled={isPending}
                                className="w-full"
                                size="lg"
                            >
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Já realizei o pagamento
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Info cards (for confirmed) */}
                {isConfirmed && (
                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                            <Mail className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-sm font-medium">Confirmação por email</p>
                                <p className="text-xs text-muted-foreground">
                                    Enviamos os detalhes para seu email
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                            <Video className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-sm font-medium">Videochamada</p>
                                <p className="text-xs text-muted-foreground">
                                    O link estará disponível no email
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Appointment ID */}
                {appointmentId && (
                    <p className="text-xs text-center text-muted-foreground mb-4">
                        ID: {appointmentId}
                    </p>
                )}

                {/* Actions */}
                <Link href={`/${clinicSlug}/agendar`} className="block">
                    <Button variant="outline" className="w-full" size="lg">
                        Agendar outra consulta
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </Link>
            </main>
        </div>
    )
}

export default function SuccessPage({ params }: PageProps) {
    const { clinic_slug } = use(params)

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-green-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <SuccessContent clinicSlug={clinic_slug} />
        </Suspense>
    )
}
