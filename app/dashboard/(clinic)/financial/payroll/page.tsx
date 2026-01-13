// app/dashboard/(clinic)/financial/payroll/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    DollarSign,
    Users,
    Clock,
    CheckCircle2,
    XCircle,
    Calculator,
    FileText,
    ChevronRight,
    Loader2,
    Lock,
    CreditCard,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface Payroll {
    id: string;
    reference_month: string;
    status: string;
    net_payroll: number;
    gross_payroll: number;
    total_appointments: number;
    inss_retention: number;
    irrf_retention: number;
    iss_retention: number;
    approved_at: string | null;
    paid_at: string | null;
    doctor: {
        id: string;
        name: string;
        crm: string;
        specialty: string;
        user: {
            email: string;
            avatar_url: string | null;
        };
    };
}

interface Summary {
    total_payroll: number;
    total_doctors: number;
    pending_count: number;
    approved_count: number;
    paid_count: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    OPEN: { label: 'Aberto', color: 'bg-gray-100 text-gray-800', icon: <Clock className="w-3 h-3" /> },
    PENDING_APPROVAL: { label: 'Aguardando Aprovação', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
    APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="w-3 h-3" /> },
    PAID: { label: 'Pago', color: 'bg-blue-100 text-blue-800', icon: <CreditCard className="w-3 h-3" /> },
    CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
};

function getMonthOptions() {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        months.push({ value, label });
    }
    return months;
}

export default function PayrollPage() {
    const queryClient = useQueryClient();
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const [showApproveAllDialog, setShowApproveAllDialog] = useState(false);

    // Buscar folhas do mês
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['payroll', selectedMonth],
        queryFn: async () => {
            const res = await fetch(`/api/payroll?month=${selectedMonth}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json as { data: Payroll[]; summary: Summary };
        },
    });

    // Calcular repasses
    const calculateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/payroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month: selectedMonth }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            refetch();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Fechar mês
    const closeMonthMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/payroll/close-month', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month: selectedMonth }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            setShowCloseDialog(false);
            refetch();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Aprovar folha individual
    const approveMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/payroll/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve' }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json;
        },
        onSuccess: () => {
            toast.success('Folha aprovada!');
            refetch();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    // Marcar como pago
    const payMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/payroll/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'pay', payment_method: 'PIX' }),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json;
        },
        onSuccess: () => {
            toast.success('Pagamento registrado!');
            refetch();
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const payrolls = data?.data || [];
    const summary = data?.summary;
    const monthOptions = getMonthOptions();

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Repasse Médico</h1>
                    <p className="text-muted-foreground">
                        Gestão de repasses e folha de pagamento dos médicos
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {monthOptions.map((m) => (
                                <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        onClick={() => calculateMutation.mutate()}
                        disabled={calculateMutation.isPending}
                    >
                        {calculateMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Calculator className="w-4 h-4 mr-2" />
                        )}
                        Calcular
                    </Button>
                    <Button onClick={() => setShowCloseDialog(true)}>
                        <Lock className="w-4 h-4 mr-2" />
                        Fechar Mês
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Total a Pagar</CardDescription>
                            <CardTitle className="text-2xl text-green-600">
                                {formatCurrency(summary?.total_payroll || 0)}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Médicos</CardDescription>
                            <CardTitle className="text-2xl flex items-center gap-2">
                                <Users className="w-5 h-5 text-muted-foreground" />
                                {summary?.total_doctors || 0}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Aguardando</CardDescription>
                            <CardTitle className="text-2xl text-yellow-600">
                                {summary?.pending_count || 0}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Aprovados</CardDescription>
                            <CardTitle className="text-2xl text-green-600">
                                {summary?.approved_count || 0}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardDescription>Pagos</CardDescription>
                            <CardTitle className="text-2xl text-blue-600">
                                {summary?.paid_count || 0}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>
            )}

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Folhas de Pagamento</CardTitle>
                    <CardDescription>
                        Repasses do mês de {monthOptions.find(m => m.value === selectedMonth)?.label}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-12" />
                            ))}
                        </div>
                    ) : payrolls.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhum repasse encontrado para este período</p>
                            <p className="text-sm">Clique em &quot;Calcular&quot; para processar os agendamentos</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Médico</TableHead>
                                    <TableHead className="text-center">Atendimentos</TableHead>
                                    <TableHead className="text-right">Bruto</TableHead>
                                    <TableHead className="text-right">Impostos</TableHead>
                                    <TableHead className="text-right">Líquido</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payrolls.map((payroll) => {
                                    const status = STATUS_MAP[payroll.status] || STATUS_MAP.OPEN;
                                    const totalTax = (payroll.inss_retention || 0) + (payroll.irrf_retention || 0) + (payroll.iss_retention || 0);

                                    return (
                                        <TableRow key={payroll.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{payroll.doctor?.name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        CRM {payroll.doctor?.crm} • {payroll.doctor?.specialty}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {payroll.total_appointments}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(payroll.gross_payroll || 0)}
                                            </TableCell>
                                            <TableCell className="text-right text-red-600">
                                                -{formatCurrency(totalTax)}
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-600">
                                                {formatCurrency(payroll.net_payroll || 0)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={status.color}>
                                                    {status.icon}
                                                    <span className="ml-1">{status.label}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {payroll.status === 'PENDING_APPROVAL' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => approveMutation.mutate(payroll.id)}
                                                            disabled={approveMutation.isPending}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                                            Aprovar
                                                        </Button>
                                                    )}
                                                    {payroll.status === 'APPROVED' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => payMutation.mutate(payroll.id)}
                                                            disabled={payMutation.isPending}
                                                        >
                                                            <CreditCard className="w-4 h-4 mr-1" />
                                                            Pagar
                                                        </Button>
                                                    )}
                                                    <Link href={`/dashboard/financial/payroll/${payroll.id}`}>
                                                        <Button size="sm" variant="ghost">
                                                            <ChevronRight className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Dialog: Fechar Mês */}
            <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Fechar Mês</DialogTitle>
                        <DialogDescription>
                            Isso vai marcar todas as folhas abertas como &quot;Aguardando Aprovação&quot;.
                            Novos lançamentos não serão incluídos automaticamente.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => closeMonthMutation.mutate()}
                            disabled={closeMonthMutation.isPending}
                        >
                            {closeMonthMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Lock className="w-4 h-4 mr-2" />
                            )}
                            Confirmar Fechamento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
