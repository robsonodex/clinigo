'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';

interface EvolucaoGraficoProps {
    sessoes: any[];
    objetivos: any[];
}

export function EvolucaoGrafico({ sessoes, objetivos }: EvolucaoGraficoProps) {
    const [selectedObjetivoId, setSelectedObjetivoId] = useState<string>('all');

    const chartData = useMemo(() => {
        // Prepare data points per session
        // Filter out draft sessions for the chart
        const sessoesEncerradas = sessoes
            .filter(s => s.status_sessao === 'encerrada')
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        return sessoesEncerradas.map(sessao => {
            const dataPoint: any = {
                name: new Date(sessao.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                dataSessao: sessao.created_at
            };

            if (!sessao.sessao_objetivos) return dataPoint;

            // Map each objective percent to the data point
            sessao.sessao_objetivos.forEach((so: any) => {
                const pacObj = objetivos.find(o => o.id === so.paciente_objetivo_id);
                if (pacObj) {
                    const key = pacObj.biblioteca?.codigo || so.paciente_objetivo_id;
                    dataPoint[key] = so.percentual_acerto || 0;
                }
            });

            return dataPoint;
        });
    }, [sessoes, objetivos]);

    // Generate colors for lines
    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

    const activeLines = useMemo(() => {
        if (selectedObjetivoId === 'all') {
            return objetivos.map(o => o.biblioteca?.codigo || o.id);
        }
        const obj = objetivos.find(o => o.id === selectedObjetivoId);
        return [obj?.biblioteca?.codigo || selectedObjetivoId];
    }, [selectedObjetivoId, objetivos]);

    if (sessoes.length === 0 || objetivos.length === 0) {
        return null; // Don't render if no data
    }

    return (
        <Card className="col-span-full mt-6">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <LineChartIcon className="w-5 h-5 text-primary" />
                        Evolução Quantitativa
                    </CardTitle>
                    <CardDescription>
                        Desempenho por objetivo ao longo das sessões encerradas.
                    </CardDescription>
                </div>
                <div className="w-full md:w-[300px]">
                    <Select value={selectedObjetivoId} onValueChange={setSelectedObjetivoId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filtrar objetivo..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Objetivos</SelectItem>
                            {objetivos.map(obj => (
                                <SelectItem key={obj.id} value={obj.id}>
                                    {obj.biblioteca?.codigo} - {obj.biblioteca?.categoria}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full">
                    {chartData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                            Nenhuma sessão encerrada para gerar o gráfico.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                <XAxis dataKey="name" />
                                <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                                <Tooltip 
                                    formatter={(value: number) => [`${value}%`, 'Acerto']}
                                    labelStyle={{ color: 'black' }}
                                />
                                <Legend />
                                <ReferenceLine y={80} label="Linha de Aquisição (80%)" stroke="red" strokeDasharray="3 3" opacity={0.5} />
                                
                                {activeLines.map((dataKey, index) => (
                                    <Line 
                                        key={dataKey}
                                        type="monotone" 
                                        dataKey={dataKey} 
                                        name={`Obj ${dataKey}`}
                                        stroke={colors[index % colors.length]} 
                                        strokeWidth={2}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
