'use client'

import { useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { BellRing, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Mock Data
const MOCK_INVOICES = [
    {
        id: '1',
        clinic: {
            name: 'Clínica Saúde Vida',
            slug: 'saude-vida',
            initials: 'SV',
            avatar: null
        },
        plan: 'Profissional',
        status: 'overdue',
        amount: 549.00,
        dueDate: '2026-01-10', // Past date
    },
    {
        id: '2',
        clinic: {
            name: 'Dr. João Cardio',
            slug: 'dr-joao',
            initials: 'JC',
            avatar: null
        },
        plan: 'Essencial',
        status: 'overdue',
        amount: 299.00,
        dueDate: '2026-01-12', // Past date
    },
    {
        id: '3',
        clinic: {
            name: 'Clínica Bem Estar',
            slug: 'bem-estar',
            initials: 'BE',
            avatar: null
        },
        plan: 'Clínica',
        status: 'paid',
        amount: 299.00,
        dueDate: '2026-01-20',
    },
    {
        id: '4',
        clinic: {
            name: 'Consultório Dra. Ana',
            slug: 'dra-ana',
            initials: 'DA',
            avatar: null
        },
        plan: 'Essencial',
        status: 'paid',
        amount: 149.00,
        dueDate: '2026-01-25',
    },
    {
        id: '5',
        clinic: {
            name: 'Centro Médico Central',
            slug: 'centro-medico',
            initials: 'CM',
            avatar: null
        },
        plan: 'Enterprise',
        status: 'pending',
        amount: 899.00,
        dueDate: '2026-01-16', // Today
    },
]

export function BillingTable() {
    const [selectedInvoice, setSelectedInvoice] = useState<typeof MOCK_INVOICES[0] | null>(null)
    const [isNotifying, setIsNotifying] = useState(false)
    const [open, setOpen] = useState(false)

    const handleNotifyClick = (invoice: typeof MOCK_INVOICES[0]) => {
        setSelectedInvoice(invoice)
        setOpen(true)
    }

    const handleConfirmNotify = async () => {
        if (!selectedInvoice) return

        setIsNotifying(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))

        setIsNotifying(false)
        setOpen(false)

        toast.success(`Notificação enviada para ${selectedInvoice.clinic.name}`, {
            description: "A clínica receberá o alerta via Push e WhatsApp.",
            icon: <CheckCircle className="text-emerald-500 w-5 h-5" />
        })
    }

    return (
        <>
            <div className="rounded-md border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="w-[300px]">Clínica</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead>Status Financeiro</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="w-[100px] text-center">Ação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {MOCK_INVOICES.map((invoice) => {
                            const isOverdue = invoice.status === 'overdue'
                            const isToday = invoice.status === 'pending' // Just for demo logic

                            return (
                                <TableRow key={invoice.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9 border">
                                                <AvatarImage src={invoice.clinic.avatar || ''} />
                                                <AvatarFallback className="bg-slate-100 font-bold text-slate-700">
                                                    {invoice.clinic.initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900 leading-tight">
                                                    {invoice.clinic.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    /{invoice.clinic.slug}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-normal text-slate-600">
                                            {invoice.plan}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn(
                                            "font-medium tabular-nums",
                                            isOverdue ? "text-red-600 font-bold flex items-center gap-1.5" : "text-slate-600"
                                        )}>
                                            {isOverdue && <AlertCircle className="w-4 h-4" />}
                                            {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={cn(
                                                "capitalize shadow-none",
                                                invoice.status === 'overdue' && "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
                                                invoice.status === 'paid' && "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
                                                invoice.status === 'pending' && "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200",
                                            )}
                                            variant="secondary"
                                        >
                                            {invoice.status === 'overdue' ? 'Atrasado' :
                                                invoice.status === 'paid' ? 'Em dia' : 'Pendente'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-slate-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {isOverdue && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                onClick={() => handleNotifyClick(invoice)}
                                            >
                                                <BellRing className="h-4 w-4" />
                                                <span className="sr-only">Notificar</span>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enviar Notificação de Cobrança</DialogTitle>
                        <DialogDescription>
                            Deseja enviar notificação de cobrança via Push/WhatsApp para <span className="font-bold text-slate-900">{selectedInvoice?.clinic.name}</span>?
                        </DialogDescription>
                    </DialogHeader>

                    {selectedInvoice && (
                        <div className="bg-slate-50 p-4 rounded-md border text-sm text-slate-600 my-2">
                            <div className="flex justify-between mb-1">
                                <span>Valor em aberto:</span>
                                <span className="font-bold text-red-600">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedInvoice.amount)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Vencimento:</span>
                                <span>{new Date(selectedInvoice.dueDate).toLocaleDateString('pt-BR')}</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirmNotify}
                            disabled={isNotifying}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isNotifying ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <BellRing className="w-4 h-4 mr-2" />
                                    Enviar Notificação
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
