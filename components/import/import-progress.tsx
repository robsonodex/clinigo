'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ImportProgressProps {
    jobId: string;
}

export function ImportProgress({ jobId }: ImportProgressProps) {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('processing');
    const [stats, setStats] = useState({
        total: 0,
        processed: 0,
        successful: 0,
        failed: 0
    });

    const supabase = createClient();

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

        return () => {
            supabase.removeChannel(channel);
        };
    }, [jobId]);

    function updateState(job: any) {
        // Avoid division by zero
        const total = job.total_rows || 1;
        const pct = Math.round((job.processed_rows / total) * 100);

        setStatus(job.status);
        setStats({
            total: job.total_rows,
            processed: job.processed_rows,
            successful: job.successful_rows,
            failed: job.failed_rows
        });
        setProgress(pct);
    }

    async function fetchStatus() {
        const { data } = await supabase
            .from('import_jobs')
            .select('*')
            .eq('id', jobId)
            .single();

        if (data) updateState(data);
    }

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
            </div>
        );
    }

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
