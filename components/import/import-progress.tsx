'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ImportProgressProps {
    jobId: string;
}

// Sub-component for detecting stuck jobs in 'validating' state
function StuckJobRetry({ jobId, onRetry }: { jobId: string; onRetry: () => void }) {
    const [showRetry, setShowRetry] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        // After 90 seconds in validating, offer retry
        const timer = setTimeout(() => {
            setShowRetry(true);
        }, 90000);
        return () => clearTimeout(timer);
    }, []);

    async function handleRetry() {
        await supabase
            .from('import_jobs')
            .update({ status: 'pending' } as any)
            .eq('id', jobId);
        setShowRetry(false);
        onRetry();
    }

    if (!showRetry) return null;

    return (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-600 mb-2">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium text-sm">A validação parece estar demorando mais que o esperado.</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRetry}>
                Tentar novamente
            </Button>
        </div>
    );
}

export function ImportProgress({ jobId }: ImportProgressProps) {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('loading');
    const [stats, setStats] = useState({
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0
    });

    const supabase = createClient();
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        fetchStatus();

        const channel = supabase
            .channel(`import-${jobId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'import_jobs',
                    filter: `id=eq.${jobId}`
                },
                (payload) => {
                    const job = payload.new;
                    updateState(job);
                }
            )
            .subscribe();

        // Polling fallback every 5s for status that should be progressing
        pollingRef.current = setInterval(() => {
            fetchStatus();
        }, 5000);

        return () => {
            supabase.removeChannel(channel);
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, [jobId]);

    function updateState(job: any) {
        const total = job.total_rows || 1;
        const pct = Math.round(((job.processed_rows || 0) / total) * 100);

        setStatus(job.status);
        setStats({
            total: job.total_rows || 0,
            processed: job.processed_rows || 0,
            successful: job.successful_rows || 0,
            failed: job.failed_rows || 0
        });
        setProgress(pct);

        // Stop polling when in a final state
        const finalStatuses = ['completed', 'partial', 'failed'];
        if (finalStatuses.includes(job.status) && pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }

    async function fetchStatus() {
        const { data } = await supabase
            .from('import_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (data) updateState(data);
    }

    // ── STATE: Completed / Partial ──
    if (status === 'completed' || status === 'partial') {
        const isCompleted = status === 'completed';
        const Icon = isCompleted ? CheckCircle2 : AlertTriangle;
        return (
            <div className={`space-y-4 p-6 ${isCompleted ? 'bg-green-50 dark:bg-green-900/20 border-green-100' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100'} rounded-lg border`}>
                <div className={`flex items-center gap-2 ${isCompleted ? 'text-green-600' : 'text-yellow-600'}`}>
                    <Icon className="h-6 w-6" />
                    <span className="font-semibold text-lg">
                        {isCompleted ? 'Importação concluída!' : 'Importação concluída com algumas falhas'}
                    </span>
                </div>
                <div className="text-sm text-foreground space-y-1">
                    <p>Foram processados <b>{stats.processed}</b> registros no total.</p>
                    <p>
                        <span className="text-green-600 font-medium">{stats.successful} importados com sucesso</span>
                        {stats.failed > 0 && <span className="text-red-500 font-medium ml-3">({stats.failed} falhas)</span>}
                    </p>
                    {stats.failed > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                            Acesse o Histórico para verificar os detalhes das falhas.
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // ── STATE: Failed ──
    if (status === 'failed') {
        return (
            <div className="space-y-4 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100">
                <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-6 w-6" />
                    <span className="font-semibold text-lg">Falha na importação</span>
                </div>
                <div className="text-sm text-foreground">
                    Ocorreu um erro crítico que impediu o processo. Por favor, tente enviar o arquivo novamente.
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/importacao/novo">Nova Importação</Link>
                </Button>
            </div>
        );
    }

    // ── STATE: Pending ──
    if (status === 'pending') {
        return (
            <div className="space-y-4 p-6 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-6 w-6" />
                    <span className="font-semibold text-lg">Aguardando processamento</span>
                </div>
                <div className="text-sm text-muted-foreground">
                    O arquivo foi enviado e está aguardando validação.
                </div>
                <div className="text-xs text-muted-foreground">
                    {stats.total} registros encontrados
                </div>
                <Button variant="default" size="sm" asChild>
                    <Link href="/dashboard/importacao/novo">Iniciar Nova Importação</Link>
                </Button>
            </div>
        );
    }

    // ── STATE: Validating (with stuck detection) ──
    if (status === 'validating') {
        return (
            <div className="space-y-6 text-center py-8">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                    <h3 className="text-xl font-semibold">Validando dados...</h3>
                    <p className="text-muted-foreground m-0">Verificando a integridade dos registros do arquivo.</p>
                </div>
                <div className="text-sm text-muted-foreground">
                    {stats.total} registros para validar
                </div>
                <StuckJobRetry jobId={jobId} onRetry={fetchStatus} />
            </div>
        );
    }

    // ── STATE: Validated (ready to execute) ──
    if (status === 'validated') {
        return (
            <div className="space-y-4 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-600">
                    <ShieldCheck className="h-6 w-6" />
                    <span className="font-semibold text-lg">Dados validados</span>
                </div>
                <div className="text-sm text-foreground">
                    Os dados foram validados com sucesso. Retorne ao assistente de importação para iniciar o processo.
                </div>
                <div className="text-xs text-muted-foreground">
                    {stats.total} registros prontos para importação
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/importacao/novo">Ir para Importação</Link>
                </Button>
            </div>
        );
    }

    // ── STATE: Loading (initial) ──
    if (status === 'loading') {
        return (
            <div className="space-y-6 text-center py-8">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                    <h3 className="text-xl font-semibold">Carregando informações...</h3>
                </div>
            </div>
        );
    }

    // ── STATE: Processing (default active state) ──
    return (
        <div className="space-y-6 text-center py-8">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <h3 className="text-xl font-semibold">Processando importação...</h3>
                <p className="text-muted-foreground m-0">Você pode sair desta tela, o processo continuará em segundo plano.</p>
            </div>

            <div className="max-w-md mx-auto space-y-2">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{stats.processed} processados</span>
                    <span>{progress}%</span>
                    <span>{stats.total} total</span>
                </div>
            </div>
        </div>
    );
}
