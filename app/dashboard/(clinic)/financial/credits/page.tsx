// app/dashboard/(clinic)/financial/credits/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { 
    Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
    FileSpreadsheet, 
    RefreshCw, 
    Download, 
    Filter, 
    XCircle,
    Plus,
    Pencil,
    Trash2,
    Copy,
    Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import { CreditDialog } from './components/CreditDialog';

export default function CreditsPage() {
    const queryClient = useQueryClient();
    
    // Filtros
    const [patientIdFilter, setPatientIdFilter] = useState('');
    const [filterApplied, setFilterApplied] = useState({ patientId: '' });
    
    // UI states
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    
    // Modal states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCredit, setSelectedCredit] = useState<any>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: creditsData, isLoading, refetch } = useQuery({
        queryKey: ['patient-credits', filterApplied],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filterApplied.patientId) params.append('patientId', filterApplied.patientId);
            
            const url = `/api/financial/credits?${params.toString()}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Erro ao buscar créditos');
            const json = await res.json();
            return json.data || [];
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/financial/credits/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Erro ao excluir');
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patient-credits'] });
            toast.success('Crédito removido com sucesso!');
            setDeleteId(null);
        },
        onError: () => toast.error('Falha ao excluir crédito')
    });

    const hasActiveFilter = !!filterApplied.patientId;

    const handleApplyFilter = () => {
        setFilterApplied({ patientId: patientIdFilter });
        toast.success('Filtros aplicados!');
    };

    const handleClearFilter = () => {
        setPatientIdFilter('');
        setFilterApplied({ patientId: '' });
        toast.info('Filtros removidos!');
    };

    const handleOpenCreate = () => {
        setSelectedCredit(null);
        setDialogOpen(true);
    };

    const handleOpenEdit = (credit: any) => {
        setSelectedCredit(credit);
        setDialogOpen(true);
    };

    const handleDuplicate = (credit: any) => {
        const duplicated = { ...credit };
        delete duplicated.id; // remove id to create new
        setSelectedCredit(duplicated);
        setDialogOpen(true);
        toast.info('Crédito duplicado. Salve para confirmar.');
    };

    const handleExportExcel = async () => {
        if (!creditsData || creditsData.length === 0) return;
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Créditos');
            
            worksheet.columns = [
                { header: 'Paciente', key: 'patient', width: 30 },
                { header: 'Motivo', key: 'reason', width: 15 },
                { header: 'Valor (R$)', key: 'amount', width: 15 },
                { header: 'Data Criação', key: 'date', width: 15 },
                { header: 'Validade', key: 'expires', width: 15 },
                { header: 'Status', key: 'status', width: 15 },
            ];
            
            creditsData.forEach((c: any) => {
                const isExpired = c.expires_at && isPast(new Date(c.expires_at));
                worksheet.addRow({
                    patient: c.patient?.full_name || 'Desconhecido',
                    reason: c.reason,
                    amount: c.amount,
                    date: format(new Date(c.created_at), 'dd/MM/yyyy'),
                    expires: c.expires_at ? format(new Date(c.expires_at), 'dd/MM/yyyy') : 'Sem validade',
                    status: c.used_at ? 'Utilizado' : (isExpired ? 'Expirado' : 'Disponível')
                });
            });
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `creditos-pacientes.xlsx`;
            a.click();
            toast.success('Excel exportado!');
        } catch (error) {
            toast.error('Erro ao gerar Excel');
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleExportPDF = async () => {
        if (!creditsData || creditsData.length === 0) return;
        setIsExportingPDF(true);
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            
            const doc = new jsPDF();
            doc.text(`Relatório de Créditos - Pacientes`, 14, 15);
            
            const tableData = creditsData.map((c: any) => {
                const isExpired = c.expires_at && isPast(new Date(c.expires_at));
                return [
                    c.patient?.full_name || 'Desconhecido',
                    c.reason,
                    formatCurrency(c.amount),
                    format(new Date(c.created_at), 'dd/MM/yyyy'),
                    c.used_at ? 'Utilizado' : (isExpired ? 'Expirado' : 'Disponível')
                ];
            });
            
            (doc as any).autoTable({
                head: [['Paciente', 'Motivo', 'Valor', 'Data Criação', 'Status']],
                body: tableData,
                startY: 25,
            });
            
            doc.save(`creditos-pacientes.pdf`);
            toast.success('PDF exportado!');
        } catch (error) {
            toast.error('Erro ao gerar PDF');
        } finally {
            setIsExportingPDF(false);
        }
    };

    const totalAvailable = (creditsData || []).filter((c: any) => !c.used_at && (!c.expires_at || !isPast(new Date(c.expires_at)))).reduce((acc: number, c: any) => acc + Number(c.amount), 0);

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-primary" />
                        Créditos de Pacientes
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie pacotes pré-pagos, devoluções e cortesias
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={handleOpenCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        Incluir Novo
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => { refetch(); toast.success('Dados atualizados!'); }}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportExcel}
                        disabled={!creditsData || creditsData.length === 0 || isExportingExcel}
                    >
                        <FileSpreadsheet className={`w-4 h-4 mr-2 ${isExportingExcel ? 'animate-pulse' : ''}`} />
                        Exportar Excel
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={handleExportPDF}
                        disabled={!creditsData || creditsData.length === 0 || isExportingPDF}
                    >
                        <Download className={`w-4 h-4 mr-2 ${isExportingPDF ? 'animate-bounce' : ''}`} />
                        Exportar PDF
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4 flex flex-col md:flex-row items-end gap-4">
                    <div className="w-full md:w-auto flex-1 max-w-sm">
                        <label className="text-sm font-medium mb-1 block">Filtrar por UUID do Paciente (ou deixe vazio para todos)</label>
                        <Input 
                            placeholder="ID do Paciente..." 
                            value={patientIdFilter} 
                            onChange={(e) => setPatientIdFilter(e.target.value)} 
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button onClick={handleApplyFilter} disabled={isLoading}>
                            <Filter className="w-4 h-4 mr-2" />
                            Aplicar filtro
                        </Button>
                        {hasActiveFilter && (
                            <Button variant="ghost" onClick={handleClearFilter}>
                                <XCircle className="w-4 h-4 mr-2" />
                                Limpar filtros
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                        <span>Listagem de Créditos</span>
                        <Badge variant="secondary" className="text-lg px-4 py-1">
                            Saldo Total Disponível: <span className="text-green-600 ml-2">{formatCurrency(totalAvailable)}</span>
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : !creditsData || creditsData.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Nenhum crédito encontrado.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Paciente</TableHead>
                                        <TableHead>Motivo</TableHead>
                                        <TableHead>Data Criação</TableHead>
                                        <TableHead>Validade</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Valor</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {creditsData.map((credit: any) => {
                                        const isExpired = credit.expires_at && isPast(new Date(credit.expires_at));
                                        return (
                                            <TableRow key={credit.id}>
                                                <TableCell className="font-medium">
                                                    {credit.patient?.full_name || 'Desconhecido'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {credit.reason}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{format(new Date(credit.created_at), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>
                                                    {credit.expires_at ? format(new Date(credit.expires_at), 'dd/MM/yyyy') : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {credit.used_at ? (
                                                        <Badge variant="secondary">Utilizado</Badge>
                                                    ) : isExpired ? (
                                                        <Badge variant="destructive">Expirado</Badge>
                                                    ) : (
                                                        <Badge className="bg-green-600">Disponível</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {formatCurrency(credit.amount)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => handleOpenEdit(credit)}
                                                            disabled={!!credit.used_at}
                                                        >
                                                            <Pencil className="w-4 h-4 text-blue-600" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => handleDuplicate(credit)}
                                                        >
                                                            <Copy className="w-4 h-4 text-emerald-600" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => setDeleteId(credit.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <CreditDialog 
                open={dialogOpen} 
                onOpenChange={setDialogOpen} 
                credit={selectedCredit} 
            />

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isso excluirá permanentemente o crédito do paciente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteMutation.isPending ? 'Excluindo...' : 'Sim, excluir crédito'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
