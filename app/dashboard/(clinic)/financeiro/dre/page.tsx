"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Table as TableIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

// Utils format
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export default function DrePage() {
    const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
    const [dreData, setDreData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    // Fetch DRE Data
    const fetchDre = async (selectedMonth: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/financial/dre", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ month: selectedMonth })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setDreData(data.data);
        } catch (error: any) {
            toast({
                title: "Erro ao gerar DRE",
                description: error.message,
                variant: "destructive"
            });
            setDreData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDre(month);
    }, [month]);

    const handleExportExcel = () => {
        toast({ title: "Exportação Iniciada", description: "O arquivo XLSX está sendo gerado (Simulado)." });
    };

    const handleExportPdf = () => {
        toast({ title: "Exportação Iniciada", description: "O arquivo PDF está sendo gerado (Simulado)." });
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <PageHeader 
                    heading="DRE Consolidada" 
                    text="Demonstração de Resultados do Exercício gerencial da sua clínica."
                />

                <div className="flex gap-2 mt-4 sm:mt-0">
                    <Select value={month} onValueChange={(val) => setMonth(val)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Selecione o Mês" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={format(new Date(), "yyyy-MM")}>Mês Atual</SelectItem>
                            <SelectItem value={format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "yyyy-MM")}>Mês Anterior</SelectItem>
                            <SelectItem value={format(new Date(new Date().setMonth(new Date().getMonth() - 2)), "yyyy-MM")}>
                                {format(new Date(new Date().setMonth(new Date().getMonth() - 2)), "MMMM / yyyy", { locale: ptBR })}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex gap-2 justify-end mb-4">
                <Button variant="outline" onClick={handleExportExcel} disabled={loading || !dreData}>
                    <TableIcon className="h-4 w-4 mr-2" />
                    Excel
                </Button>
                <Button variant="outline" onClick={handleExportPdf} disabled={loading || !dreData}>
                    <Download className="h-4 w-4 mr-2" />
                    PDF
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : dreData ? (
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="col-span-1 border-t-4 border-t-green-500">
                        <CardHeader>
                            <CardTitle>Composição das Receitas</CardTitle>
                            <CardDescription>
                                Período: {format(new Date(`${dreData.period.start}T00:00:00`), "dd/MMM/yyyy", { locale: ptBR })} a {format(new Date(`${dreData.period.end}T00:00:00`), "dd/MMM/yyyy", { locale: ptBR })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span>(+) Receita Bruta Consultas (Particular)</span>
                                <span className="font-medium text-green-600">{formatCurrency(dreData.revenue.private)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span>(+) Receita Operadoras (Planos TISS)</span>
                                <span className="font-medium text-green-600">{formatCurrency(dreData.revenue.insurance)}</span>
                            </div>
                            <div className="w-full border-t my-2" />
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>(=) Receita Total</span>
                                <span>{formatCurrency(dreData.revenue.total)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="col-span-1 border-t-4 border-t-red-500">
                        <CardHeader>
                            <CardTitle>Custos e Despesas</CardTitle>
                            <CardDescription>Despesas operacionais e folha médica consolidadas.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-sm">
                                <span>(-) Repasse Médico (Honorários)</span>
                                <span className="font-medium text-red-600">{formatCurrency(dreData.expenses.payroll)}</span>
                            </div>
                            {Object.entries(dreData.expenses.by_category).map(([cat, amount]) => (
                                <div key={cat} className="flex justify-between items-center text-sm">
                                    <span>(-) Custo Operacional: {cat}</span>
                                    <span className="font-medium text-red-600">{formatCurrency(amount as number)}</span>
                                </div>
                            ))}
                            <div className="w-full border-t my-2" />
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>(=) Custos e Despesas Totais</span>
                                <span>{formatCurrency(dreData.expenses.total)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-2 border-t-4 border-t-blue-500">
                         <CardContent className="pt-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold">Resultado do Exercício</h3>
                                    <p className="text-sm text-muted-foreground">Margem de Lucro: {dreData.result.profit_margin.toFixed(2)}%</p>
                                </div>
                                <div className={`text-3xl font-bold ${dreData.result.net_profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {formatCurrency(dreData.result.net_profit)}
                                </div>
                            </div>
                         </CardContent>
                    </Card>

                    <Card className="md:col-span-2 bg-muted/20">
                         <CardContent className="pt-6">
                            <div className="flex items-center justify-around text-center">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Atendimentos no Período</p>
                                    <p className="text-2xl font-bold">{dreData.kpis.total_appointments}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">Ticket Médio Geral</p>
                                    <p className="text-2xl font-bold">{formatCurrency(dreData.kpis.average_ticket)}</p>
                                </div>
                            </div>
                         </CardContent>
                    </Card>
                </div>
            ) : null}
        </div>
    );
}
