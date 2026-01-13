// app/dashboard/(clinic)/financial/payroll/[id]/page.tsx
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
    ArrowLeft,
    User,
    Calendar,
    DollarSign,
    CheckCircle2,
    CreditCard,
    FileText,
    Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface PayrollItem {
    id: string;
    appointment_date: string;
    patient_name: string;
    payment_type: string;
    insurance_company: string | null;
    procedure_value: number;
    applied_percentage: number;
    calculated_gross: number;
    calculated_net: number;
    inss_value: number;
    irrf_value: number;
    iss_value: number;
    status: string;
}

interface PayrollDetails {
    id: string;
    reference_month: string;
    status: string;
    total_appointments: number;
    gross_revenue: number;
    gross_payroll: number;
    net_payroll: number;
    inss_retention: number;
    irrf_retention: number;
    iss_retention: number;
    approved_at: string | null;
    paid_at: string | null;
    payment_method: string | null;
    doctor: {
        id: string;
        name: string;
        crm: string;
        specialty: string;
        user: { email: string };
    };
    items: PayrollItem[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    OPEN: { label: 'Aberto', color: 'bg-gray-100 text-gray-800' },
    PENDING_APPROVAL: { label: 'Aguardando Aprovação', color: 'bg-yellow-100 text-yellow-800' },
    APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-800' },
    PAID: { label: 'Pago', color: 'bg-blue-100 text-blue-800' },
};

export default function PayrollDetailPage() {
    const params = useParams();
    const router = useRouter();
    const payrollId = params.id as string;

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['payroll-detail', payrollId],
        queryFn: async () => {
            const res = await fetch(`/api/payroll/${payrollId}`);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data as PayrollDetails;
        },
    });

    const approveMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/payroll/${payrollId}`, {
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
        onError: (error: Error) => toast.error(error.message),
    });

    const payMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/payroll/${payrollId}`, {
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
        onError: (error: Error) => toast.error(error.message),
    });

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="p-6">
                <p>Folha não encontrada</p>
                <Link href="/dashboard/financial/payroll">
                    <Button variant="outline" className="mt-4">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                </Link>
            </div>
        );
    }

    const status = STATUS_MAP[data.status] || STATUS_MAP.OPEN;
    const monthLabel = new Date(data.reference_month).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
    });
    const totalTax = (data.inss_retention || 0) + (data.irrf_retention || 0) + (data.iss_retention || 0);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/financial/payroll">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <User className="w-6 h-6" />
                            {data.doctor?.name || 'Médico'}
                            <Badge className={status.color}>{status.label}</Badge>
                        </h1>
                        <p className="text-muted-foreground">
                            CRM {data.doctor?.crm} • {data.doctor?.specialty} • {monthLabel}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    {data.status === 'PENDING_APPROVAL' && (
                        <Button onClick={() => approveMutation.mutate()} disabled={approveMutation.isPending}>
                            {approveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                            Aprovar
                        </Button>
                    )}
                    {data.status === 'APPROVED' && (
                        <Button onClick={() => payMutation.mutate()} disabled={payMutation.isPending}>
                            {payMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                            Registrar Pagamento
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Atendimentos</CardDescription>
                        <CardTitle className="text-2xl">{data.total_appointments}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Receita Bruta</CardDescription>
                        <CardTitle className="text-xl">{formatCurrency(data.gross_revenue || 0)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Repasse Bruto</CardDescription>
                        <CardTitle className="text-xl">{formatCurrency(data.gross_payroll || 0)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Impostos</CardDescription>
                        <CardTitle className="text-xl text-red-600">-{formatCurrency(totalTax)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-green-700">Líquido a Pagar</CardDescription>
                        <CardTitle className="text-2xl text-green-700">{formatCurrency(data.net_payroll || 0)}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* Tax Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Detalhamento de Impostos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">INSS (11%)</p>
                            <p className="text-lg font-medium text-red-600">-{formatCurrency(data.inss_retention || 0)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">IRRF</p>
                            <p className="text-lg font-medium text-red-600">-{formatCurrency(data.irrf_retention || 0)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">ISS (5%)</p>
                            <p className="text-lg font-medium text-red-600">-{formatCurrency(data.iss_retention || 0)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Atendimentos do Período
                    </CardTitle>
                    <CardDescription>
                        Detalhamento de todos os atendimentos incluídos nesta folha
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!data.items || data.items.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhum atendimento encontrado
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead className="text-center">Tipo</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                    <TableHead className="text-center">%</TableHead>
                                    <TableHead className="text-right">Repasse</TableHead>
                                    <TableHead className="text-right">Líquido</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.items.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            {new Date(item.appointment_date).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                        <TableCell>{item.patient_name || 'Não informado'}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={item.payment_type === 'PRIVATE' ? 'default' : 'secondary'}>
                                                {item.payment_type === 'PRIVATE' ? 'Particular' : item.insurance_company || 'Convênio'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(item.procedure_value || 0)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {item.applied_percentage}%
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(item.calculated_gross || 0)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-green-600">
                                            {formatCurrency(item.calculated_net || 0)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Payment Info (if paid) */}
            {data.status === 'PAID' && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                        <CardTitle className="text-blue-700 flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Informações do Pagamento
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-blue-800">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm opacity-70">Método</p>
                                <p className="font-medium">{data.payment_method || 'PIX'}</p>
                            </div>
                            <div>
                                <p className="text-sm opacity-70">Data</p>
                                <p className="font-medium">
                                    {data.paid_at ? new Date(data.paid_at).toLocaleDateString('pt-BR') : '-'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
