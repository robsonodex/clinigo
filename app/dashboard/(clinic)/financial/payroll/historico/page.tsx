'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, ArrowUpRight, ArrowDownRight, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PayrollHistoryPage() {
    const profLabel = useProfessionalLabel();
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [doctorId, setDoctorId] = useState<string>('all');

    // Buscar lista de profissionais
    const { data: doctors } = useQuery({
        queryKey: ['doctors-list'],
        queryFn: async () => {
            const res = await fetch('/api/doctors?is_active=true');
            const json = await res.json();
            return json.data || [];
        }
    });

    // Buscar histórico
    const { data: historyRes, isLoading } = useQuery({
        queryKey: ['payroll-history', year, doctorId],
        queryFn: async () => {
            const url = `/api/payroll/history?year=${year}${doctorId !== 'all' ? `&doctor_id=${doctorId}` : ''}`;
            const res = await fetch(url);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json;
        }
    });

    const history = historyRes?.data || [];
    const summary = historyRes?.summary || { total_ano: 0, maior_mes: 0, menor_mes: 0 };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'APPROVED': return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
            case 'PAID': return <Badge className="bg-blue-100 text-blue-800">Pago</Badge>;
            case 'PENDING_APPROVAL': return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <History className="w-6 h-6" />
                        Histórico de Repasses
                    </h1>
                    <p className="text-muted-foreground">
                        Acompanhe os fechamentos mensais ao longo do tempo.
                    </p>
                </div>
                
                <div className="flex gap-3">
                    <Select value={doctorId} onValueChange={setDoctorId}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder={`Filtrar ${profLabel.singular.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {doctors?.map((d: any) => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                            {[...Array(5)].map((_, i) => {
                                const y = (new Date().getFullYear() - i).toString();
                                return <SelectItem key={y} value={y}>{y}</SelectItem>;
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Sumário */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total do Ano ({year})</p>
                            <h3 className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_ano)}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-full">
                            <DollarSign className="w-6 h-6 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Maior Repasse no Ano</p>
                            <h3 className="text-2xl font-bold text-green-600">{formatCurrency(summary.maior_mes)}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-full">
                            <ArrowUpRight className="w-6 h-6 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Menor Repasse no Ano</p>
                            <h3 className="text-2xl font-bold text-red-600">{formatCurrency(summary.menor_mes)}</h3>
                        </div>
                        <div className="p-3 bg-red-50 rounded-full">
                            <ArrowDownRight className="w-6 h-6 text-red-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Linha do Tempo / Timeline */}
            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2">Fechamentos Registrados</h3>
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                    </div>
                ) : history.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed">
                        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Nenhum fechamento registrado no período selecionado.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-blue-100 ml-4 pl-6 space-y-6">
                        {history.map((h: any) => (
                            <div key={h.id} className="relative">
                                {/* Timeline Node */}
                                <div className="absolute -left-[31px] top-4 w-4 h-4 rounded-full bg-blue-500 border-4 border-white shadow-sm" />
                                
                                <Card>
                                    <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-bold text-lg">{h.month}</h4>
                                                {getStatusBadge(h.status)}
                                            </div>
                                            <p className="text-sm font-medium text-gray-700">{h.doctor_name}</p>
                                        </div>

                                        <div className="grid grid-cols-3 gap-6 text-right">
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase">Bruto</p>
                                                <p className="font-semibold">{formatCurrency(h.gross_production || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase">Deduções</p>
                                                <p className="font-semibold text-red-500">-{formatCurrency(h.deductions || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground uppercase">Repasse (Líquido)</p>
                                                <p className="font-bold text-green-600">{formatCurrency(h.net_payroll || 0)}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
