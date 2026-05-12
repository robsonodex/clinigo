'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Download, Users, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { toast } from 'sonner';

export default function ProducaoProfissionalPage() {
    const profLabel = useProfessionalLabel();
    
    // Default: current month
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    
    const [periodStart, setPeriodStart] = useState(firstDay);
    const [periodEnd, setPeriodEnd] = useState(lastDay);
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

    // Buscar produção
    const { data: prodRes, isLoading } = useQuery({
        queryKey: ['financial-producao', periodStart, periodEnd, doctorId],
        queryFn: async () => {
            const url = `/api/financial/producao?period_start=${periodStart}&period_end=${periodEnd}${doctorId !== 'all' ? `&doctor_id=${doctorId}` : ''}`;
            const res = await fetch(url);
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json;
        }
    });

    const data = prodRes?.data || [];
    const summary = prodRes?.summary || { total_atendimentos: 0, receita_total: 0, ticket_medio_geral: 0 };

    const handleExport = () => {
        toast.info("A exportação será gerada em instantes...");
        // Integation with ExcelJS would go here (similar to other reports)
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-6 h-6" />
                        Produção por {profLabel.singular}
                    </h1>
                    <p className="text-muted-foreground">
                        Análise de atendimentos, faturamento e taxas de no-show.
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-3 items-center">
                    <Input 
                        type="date" 
                        value={periodStart} 
                        onChange={(e) => setPeriodStart(e.target.value)} 
                        className="w-auto"
                    />
                    <span className="text-muted-foreground">até</span>
                    <Input 
                        type="date" 
                        value={periodEnd} 
                        onChange={(e) => setPeriodEnd(e.target.value)} 
                        className="w-auto"
                    />

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

                    <Button variant="outline" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" /> Exportar
                    </Button>
                </div>
            </div>

            {/* Sumário */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6 flex items-center gap-4">
                            <div className="p-3 bg-blue-50 rounded-full">
                                <Users className="w-6 h-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total de Atendimentos</p>
                                <h3 className="text-2xl font-bold">{summary.total_atendimentos}</h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 flex items-center gap-4">
                            <div className="p-3 bg-green-50 rounded-full">
                                <DollarSign className="w-6 h-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
                                <h3 className="text-2xl font-bold text-green-600">{formatCurrency(summary.receita_total)}</h3>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 flex items-center gap-4">
                            <div className="p-3 bg-purple-50 rounded-full">
                                <Activity className="w-6 h-6 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Ticket Médio Geral</p>
                                <h3 className="text-2xl font-bold text-purple-600">{formatCurrency(summary.ticket_medio_geral)}</h3>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabela de Produção */}
            <Card>
                <CardHeader>
                    <CardTitle>Desempenho Detalhado</CardTitle>
                    <CardDescription>
                        Compare as métricas entre os profissionais da clínica.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : data.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Nenhum dado encontrado para o período selecionado.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{profLabel.singular}</TableHead>
                                        <TableHead className="text-center">Atendimentos</TableHead>
                                        <TableHead className="text-center">Faltas</TableHead>
                                        <TableHead className="text-center">Taxa No-show</TableHead>
                                        <TableHead className="text-right">Receita Total</TableHead>
                                        <TableHead className="text-right">Ticket Médio</TableHead>
                                        <TableHead className="text-right">Repasse Estimado</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((row: any) => (
                                        <TableRow key={row.doctor_id}>
                                            <TableCell>
                                                <div className="font-medium">{row.doctor_name}</div>
                                                <div className="text-xs text-muted-foreground">{row.specialty}</div>
                                            </TableCell>
                                            <TableCell className="text-center font-medium">{row.total_atendimentos}</TableCell>
                                            <TableCell className="text-center text-red-500">{row.total_faltas}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={row.taxa_noshow > 15 ? 'destructive' : 'secondary'}>
                                                    {row.taxa_noshow.toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-green-600">
                                                {formatCurrency(row.receita_total)}
                                            </TableCell>
                                            <TableCell className="text-right text-gray-600">
                                                {formatCurrency(row.ticket_medio)}
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(row.repasse_calculado)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
