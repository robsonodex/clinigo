'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ValidationReportProps {
    jobId: string;
    onValidationComplete: (errors: any[]) => void;
}

export function ValidationReport({ jobId, onValidationComplete }: ValidationReportProps) {
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<any>(null);

    useEffect(() => {
        validate();
    }, []);

    async function validate() {
        const response = await fetch(`/api/import/validate/${jobId}`, {
            method: 'POST'
        });
        const data = await response.json();
        setReport(data);
        setLoading(false);

        // Auto-proceed if no critical errors? No, user must see result first.
    }

    if (loading) return <div className="p-8 text-center">Validando dados...</div>;

    if (!report) return <div>Erro ao validar</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
                <div className="border p-4 rounded-lg bg-slate-50 dark:bg-slate-900 text-center">
                    <div className="text-2xl font-bold">{report.totalRows}</div>
                    <div className="text-xs text-muted-foreground uppercase">Total Linhas</div>
                </div>
                <div className="border p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center border-green-200">
                    <div className="text-2xl font-bold text-green-600">{report.validRows}</div>
                    <div className="text-xs text-green-600 uppercase">Válidas</div>
                </div>
                <div className="border p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-center border-red-200">
                    <div className="text-2xl font-bold text-red-600">{report.criticalErrors}</div>
                    <div className="text-xs text-red-600 uppercase">Erros Críticos</div>
                </div>
            </div>

            {report.criticalErrors > 0 ? (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Atenção</AlertTitle>
                    <AlertDescription>
                        Foram encontrados {report.criticalErrors} erros que impedem a importação.
                        Corrija o arquivo e faça upload novamente.
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Tudo certo!</AlertTitle>
                    <AlertDescription className="text-green-700">
                        Seus dados estão prontos para serem importados.
                    </AlertDescription>
                </Alert>
            )}

            {report.errors.length > 0 && (
                <div className="border rounded-lg">
                    <div className="p-4 bg-muted/50 border-b font-medium flex justify-between items-center">
                        <span>Relatório de Problemas</span>
                        {/* Optional: Download errors */}
                    </div>
                    <ScrollArea className="h-[300px]">
                        <div className="p-4 space-y-2">
                            {report.errors.map((err: any, idx: number) => (
                                <div key={idx} className="text-sm p-2 border-b last:border-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono bg-muted px-1 rounded">Linha {err.row}</span>
                                        {err.errors.some((e: any) => e.severity === 'CRITICAL') ? (
                                            <span className="text-red-600 text-xs font-bold px-1.5 py-0.5 rounded border border-red-200 bg-red-50">CRÍTICO</span>
                                        ) : (
                                            <span className="text-yellow-600 text-xs font-bold px-1.5 py-0.5 rounded border border-yellow-200 bg-yellow-50">AVISO</span>
                                        )}
                                    </div>
                                    <ul className="list-disc list-inside text-muted-foreground pl-2">
                                        {err.errors.map((e: any, i: number) => (
                                            <li key={i}>
                                                <span className="font-medium text-foreground">{e.field}:</span> {e.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            <div className="flex justify-end gap-3">
                {report.criticalErrors > 0 ? (
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        Tentar Novamente
                    </Button>
                ) : (
                    <Button onClick={() => onValidationComplete(report.errors)}>
                        Continuar Importação
                    </Button>
                )}
            </div>
        </div>
    );
}
