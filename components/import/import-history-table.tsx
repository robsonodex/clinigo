'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, ArrowRight, Loader2, Trash2 } from 'lucide-react';

export function ImportHistoryTable() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [supabase] = useState(() => createClient());

    useEffect(() => {
        fetchJobs();
    }, []);

    async function fetchJobs() {
        const { data } = await supabase
            .from('import_jobs')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setJobs(data);
        setLoading(false);
    }

    if (loading) return <div>Carregando...</div>;

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progresso</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {jobs.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                Nenhuma importação realizada
                            </TableCell>
                        </TableRow>
                    ) : (
                        jobs.map((job) => (
                            <TableRow key={job.id}>
                                <TableCell>
                                    {format(new Date(job.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </TableCell>
                                <TableCell className="capitalize">
                                    {job.import_type === 'patients' && 'Pacientes'}
                                    {job.import_type === 'doctors' && 'Médicos'}
                                    {job.import_type === 'financial' && 'Financeiro'}
                                    {job.import_type === 'insurances' && 'Convênios'}
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={job.status} />
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">
                                        {job.processed_rows} / {job.total_rows}
                                        {job.status === 'completed' && <span className="ml-1 text-green-600">({job.successful_rows} ok)</span>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/dashboard/importacao/${job.id}`}>
                                                Detalhes <ArrowRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={async () => {
                                                if (confirm('Tem certeza que deseja excluir esta importação? Todos os dados importados vinculados a ela serão removidos.')) {
                                                    try {
                                                        const res = await fetch(`/api/import/jobs/${job.id}`, { method: 'DELETE' });
                                                        if (!res.ok) throw new Error('Erro ao excluir importação');
                                                        fetchJobs();
                                                    } catch (err) {
                                                        alert('Erro ao excluir a importação.');
                                                    }
                                                }
                                            }}
                                            title="Excluir Importação e Desfazer"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        pending: 'bg-yellow-100 text-yellow-800',
        validating: 'bg-blue-100 text-blue-800',
        processed: 'bg-blue-100 text-blue-800',
        processing: 'bg-blue-100 text-blue-800 animate-pulse',
        completed: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800',
        validated: 'bg-purple-100 text-purple-800'
    };

    const labels: any = {
        pending: 'Aguardando',
        validating: 'Validando',
        validated: 'Pronto',
        processing: 'Processando',
        completed: 'Concluído',
        failed: 'Falhou',
        partial: 'Parcial'
    };

    return (
        <Badge variant="secondary" className={styles[status] || ''}>
            {labels[status] || status}
        </Badge>
    );
}
