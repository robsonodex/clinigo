'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
    Clock,
    Info,
    CheckCircle2,
    XCircle,
    Banknote,
    CreditCard,
    QrCode,
    Wallet,
    Building2,
    MoreHorizontal,
    Loader2,
    Calendar,
    User
} from 'lucide-react'
import { api } from '@/lib/api-client'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/utils'

interface PendingAppointment {
    id: string
    appointment_date: string
    appointment_time: string
    status: string
    created_at: string
    patient: {
        full_name: string
        email: string
        phone: string
    }
    doctor: {
        user: { full_name: string }
        specialty: string
        consultation_price: number
    }
    payment?: {
        amount: number
        status: string
    }
}

type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'BANK_TRANSFER' | 'OTHER'

const paymentMethods: { value: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: 'PIX', label: 'PIX', icon: <QrCode className="h-4 w-4" /> },
    { value: 'CREDIT_CARD', label: 'Cartão Crédito', icon: <CreditCard className="h-4 w-4" /> },
    { value: 'DEBIT_CARD', label: 'Cartão Débito', icon: <CreditCard className="h-4 w-4" /> },
    { value: 'CASH', label: 'Dinheiro', icon: <Wallet className="h-4 w-4" /> },
    { value: 'BANK_TRANSFER', label: 'Transferência', icon: <Building2 className="h-4 w-4" /> },
    { value: 'OTHER', label: 'Outro', icon: <MoreHorizontal className="h-4 w-4" /> },
]

export default function PendingPaymentsPage() {
    const queryClient = useQueryClient()
    const [confirmingId, setConfirmingId] = useState<string | null>(null)

    // Fetch pending appointments
    const { data: response, isLoading } = useQuery({
        queryKey: ['pending-payments'],
        queryFn: () => api.getFull<PendingAppointment[]>('/appointments', {
            status: 'PENDING_PAYMENT,PAYMENT_PENDING',
        }),
    })

    const appointments = response?.data || []

    // Confirm payment mutation
    const { mutate: confirmPayment, isPending } = useMutation({
        mutationFn: ({ appointmentId, payment_method }: { appointmentId: string; payment_method: PaymentMethod }) =>
            api.patch(`/appointments/${appointmentId}/confirm-payment`, { payment_method }),
        onSuccess: () => {
            toast.success('Pagamento confirmado! Paciente foi notificado.')
            queryClient.invalidateQueries({ queryKey: ['pending-payments'] })
            setConfirmingId(null)
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao confirmar pagamento')
        }
    })

    // Cancel appointment mutation
    const { mutate: cancelAppointment } = useMutation({
        mutationFn: (appointmentId: string) =>
            api.patch(`/appointments/${appointmentId}`, { status: 'CANCELLED' }),
        onSuccess: () => {
            toast.success('Agendamento cancelado')
            queryClient.invalidateQueries({ queryKey: ['pending-payments'] })
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao cancelar')
        }
    })

    const handleConfirm = (appointmentId: string, method: PaymentMethod) => {
        confirmPayment({ appointmentId, payment_method: method })
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Clock className="h-6 w-6" />
                    Pagamentos Pendentes
                </h1>
                <p className="text-muted-foreground">
                    Confirme os pagamentos recebidos para liberar as consultas
                </p>
            </div>

            {appointments.length === 0 ? (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        Nenhum pagamento pendente no momento. 🎉
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="grid gap-4">
                    {appointments.map((apt) => (
                        <Card key={apt.id} className={
                            apt.status === 'PAYMENT_PENDING'
                                ? 'border-yellow-200 bg-yellow-50/50'
                                : ''
                        }>
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            {apt.patient?.full_name || 'Paciente'}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-4 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {format(
                                                    parse(apt.appointment_date, 'yyyy-MM-dd', new Date()),
                                                    "dd/MM/yyyy",
                                                    { locale: ptBR }
                                                )} às {apt.appointment_time}
                                            </span>
                                            <span>
                                                Dr(a). {apt.doctor?.user?.full_name || 'Médico'}
                                            </span>
                                        </CardDescription>
                                    </div>
                                    <Badge variant={apt.status === 'PAYMENT_PENDING' ? 'default' : 'secondary'}>
                                        {apt.status === 'PAYMENT_PENDING' ? 'Paciente pagou' : 'Aguardando'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-muted-foreground">
                                        {apt.patient?.phone && <span>{apt.patient.phone}</span>}
                                        {apt.patient?.email && <span className="ml-4">{apt.patient.email}</span>}
                                    </div>
                                    <div className="text-lg font-bold text-primary">
                                        {formatCurrency(apt.payment?.amount || apt.doctor?.consultation_price || 0)}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex gap-2 pt-2">
                                <Dialog open={confirmingId === apt.id} onOpenChange={(open) => setConfirmingId(open ? apt.id : null)}>
                                    <DialogTrigger asChild>
                                        <Button className="flex-1">
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Confirmar Pagamento
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Confirmar Pagamento</DialogTitle>
                                            <DialogDescription>
                                                Selecione a forma de pagamento que o paciente utilizou:
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            {paymentMethods.map((method) => (
                                                <Button
                                                    key={method.value}
                                                    variant="outline"
                                                    className="h-auto py-3 flex-col gap-1"
                                                    disabled={isPending}
                                                    onClick={() => handleConfirm(apt.id, method.value)}
                                                >
                                                    {isPending ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        method.icon
                                                    )}
                                                    <span className="text-xs">{method.label}</span>
                                                </Button>
                                            ))}
                                        </div>
                                    </DialogContent>
                                </Dialog>

                                <Button
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => cancelAppointment(apt.id)}
                                >
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
