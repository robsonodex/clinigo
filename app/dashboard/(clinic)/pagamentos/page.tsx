'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api, type Appointment } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Download, Filter, TrendingUp, DollarSign, CreditCard } from 'lucide-react'

export default function PaymentsPage() {
    // Fetch payments (appointments with payment info)
    const { data: payments, isLoading } = useQuery({
        queryKey: ['payments'],
        queryFn: () => api.get<Appointment[]>('/appointments', { status: 'CONFIRMED' }),
    })

    const totalRevenue = payments?.reduce((acc, curr) => acc + (curr.payment?.amount || 0), 0) || 0
    const averageTicket = payments?.length ? totalRevenue / payments.length : 0

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Pagamentos</h1>
                    <p className="text-muted-foreground">
                        Gestão financeira e histórico de transações
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Filter className="w-4 h-4 mr-2" />
                        Filtrar
                    </Button>
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">+20.1% em relação ao mês anterior</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(averageTicket)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transações</CardTitle>
                        <CreditCard className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{payments?.length || 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Histórico de Transações</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data</TableHead>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Médico</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments?.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{formatDate(payment.appointment_date)}</TableCell>
                                    <TableCell>{payment.patient.full_name}</TableCell>
                                    <TableCell>Dr. {payment.doctor.user.full_name}</TableCell>
                                    <TableCell>PIX</TableCell>
                                    <TableCell>
                                        <Badge variant="success">Aprovado</Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatCurrency(payment.payment?.amount || 0)}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && (!payments || payments.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">
                                        Nenhum pagamento encontrado
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
