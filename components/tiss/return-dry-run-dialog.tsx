// components/tiss/return-dry-run-dialog.tsx
'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ReturnDryRunDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    batchId: string;
    batchNumber: string;
    onSuccess: () => void;
}

export function ReturnDryRunDialog({
    open,
    onOpenChange,
    batchId,
    batchNumber,
    onSuccess,
}: ReturnDryRunDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<'CSV' | 'XML'>('CSV');
    const [isLoadingDryRun, setIsLoadingDryRun] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [dryRunData, setDryRunData] = useState<any>(null);
    const [manualLinks, setManualLinks] = useState<Record<string, string>>({});

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setFileType(selectedFile.name.endsWith('.xml') ? 'XML' : 'CSV');
            setDryRunData(null);
            setManualLinks({});
        }
    };

    const handleExecuteDryRun = async () => {
        if (!file) {
            toast.error('Selecione um arquivo de retorno para processar');
            return;
        }

        setIsLoadingDryRun(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target?.result as string;

                const res = await fetch('/api/tiss/returns/dry-run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        batch_id: batchId,
                        file_name: file.name,
                        file_type: fileType,
                        file_content: content,
                    }),
                });

                const json = await res.json();
                if (res.ok && json.success) {
                    setDryRunData(json.data);
                    toast.success('Prévia processada com sucesso. Nenhuma alteração foi gravada no banco de dados.');
                } else {
                    toast.error(json.error || 'Erro ao gerar prévia do retorno');
                }
                setIsLoadingDryRun(false);
            };

            reader.readAsText(file);
        } catch {
            toast.error('Erro ao ler arquivo de retorno');
            setIsLoadingDryRun(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!dryRunData) return;

        setIsConfirming(true);
        try {
            const formattedManualLinks = Object.entries(manualLinks)
                .filter(([_, guideId]) => !!guideId)
                .map(([fileNum, guideId]) => ({
                    file_guide_number: fileNum,
                    guide_id: guideId,
                }));

            const allRecords = [
                ...(dryRunData.items?.reconhecidas || []),
                ...(dryRunData.items?.nao_reconhecidas || []),
            ];

            const res = await fetch('/api/tiss/returns/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batch_id: batchId,
                    dry_run_token: dryRunData.dry_run_token,
                    file_hash: dryRunData.file_hash,
                    file_name: file?.name || 'retorno.csv',
                    file_type: fileType,
                    records: allRecords,
                    manual_links: formattedManualLinks,
                }),
            });

            const json = await res.json();
            if (res.ok && json.success) {
                toast.success(json.message || 'Retorno confirmado e conciliado com sucesso');
                onSuccess();
                onOpenChange(false);
            } else {
                toast.error(json.error || 'Erro ao confirmar retorno');
            }
        } catch {
            toast.error('Erro de conexão ao confirmar conciliação');
        } finally {
            setIsConfirming(false);
        }
    };

    const counts = dryRunData?.counts;
    const totals = dryRunData?.totals;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        Conciliação de Retorno (Prévia Dry-Run): Lote {batchNumber}
                    </DialogTitle>
                    <DialogDescription>
                        Simule a importação antes de gravar. Identifique divergências, glosas e vincule guias não reconhecidas.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden space-y-4 py-2">
                    {/* Seção 1: Seleção de Arquivo */}
                    {!dryRunData && (
                        <div className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center space-y-3 bg-muted/20">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                            <div className="text-center">
                                <span className="font-semibold text-sm text-foreground block">
                                    {file ? file.name : 'Selecione o arquivo de retorno (.csv ou .xml)'}
                                </span>
                                <span className="text-xs text-muted-foreground block mt-1">
                                    O arquivo será verificado contra duplicidade de hash SHA-256
                                </span>
                            </div>
                            <input
                                type="file"
                                accept=".csv,.xml,.txt"
                                onChange={handleFileChange}
                                className="text-xs cursor-pointer"
                            />
                            {file && (
                                <Button
                                    onClick={handleExecuteDryRun}
                                    disabled={isLoadingDryRun}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white mt-2"
                                >
                                    {isLoadingDryRun ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Processando Prévia Sem Gravar...
                                        </>
                                    ) : (
                                        'Gerar Prévia do Retorno'
                                    )}
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Seção 2: Resultados da Prévia Dry-Run */}
                    {dryRunData && (
                        <div className="space-y-4">
                            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900 py-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                                <AlertTitle className="text-xs font-semibold text-emerald-800">
                                    Prévia Concluída (Dry-Run Ativo)
                                </AlertTitle>
                                <AlertDescription className="text-xs text-emerald-700">
                                    Arquivo auditado. Nenhuma guia ou registro financeiro foi gravado no banco até sua confirmação.
                                </AlertDescription>
                            </Alert>

                            {/* Cards de Resumo */}
                            <div className="grid grid-cols-4 gap-2 text-xs">
                                <div className="p-2.5 rounded bg-muted/40 border border-border">
                                    <span className="text-muted-foreground block">Reconhecidas</span>
                                    <span className="text-base font-bold text-foreground">{counts?.reconhecidas || 0}</span>
                                </div>
                                <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
                                    <span className="text-emerald-700 block">Pagas Integral</span>
                                    <span className="text-base font-bold">{counts?.pagas || 0}</span>
                                    <span className="text-[10px] block font-semibold">R$ {totals?.valor_pago?.toFixed(2)}</span>
                                </div>
                                <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900">
                                    <span className="text-amber-700 block">Glosadas</span>
                                    <span className="text-base font-bold">{counts?.glosadas || 0}</span>
                                    <span className="text-[10px] block font-semibold text-destructive">R$ {totals?.valor_glosado?.toFixed(2)}</span>
                                </div>
                                <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-900">
                                    <span className="text-rose-700 block">Não Reconhecidas</span>
                                    <span className="text-base font-bold">{counts?.nao_reconhecidas || 0}</span>
                                </div>
                            </div>

                            {/* Divergências se houver */}
                            {counts?.divergencias > 0 && (
                                <div className="space-y-1.5">
                                    <div className="text-xs font-semibold uppercase text-amber-800 flex items-center gap-1.5">
                                        <AlertTriangle className="h-3.5 w-3.5" />
                                        Divergências de Valor Detectadas ({counts.divergencias})
                                    </div>
                                    <ScrollArea className="h-24 border border-border rounded p-2 text-xs bg-muted/20">
                                        {dryRunData.items.divergencias.map((div: any, i: number) => (
                                            <div key={i} className="py-1 border-b border-border/40 last:border-0">
                                                <span className="font-semibold">Guia {div.numero_guia}:</span> {div.message}
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            )}

                            {/* Guias Não Reconhecidas: Permitir Vínculo Manual */}
                            {counts?.nao_reconhecidas > 0 && (
                                <div className="space-y-1.5">
                                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                                        Guias Não Reconhecidas no Lote (Vincular Manualmente)
                                    </div>
                                    <ScrollArea className="h-32 border border-border rounded p-2 text-xs bg-muted/20 space-y-2">
                                        {dryRunData.items.nao_reconhecidas.map((un: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between gap-3 p-1.5 rounded bg-background border border-border/60">
                                                <div className="min-w-0 flex-1">
                                                    <span className="font-semibold">Arquivo: Guia {un.numero_guia}</span>
                                                    <span className="text-muted-foreground block text-[11px]">
                                                        Valor Retornado: R$ {Number(un.valor_pago || un.valor_apresentado).toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="w-56">
                                                    <Select
                                                        value={manualLinks[un.numero_guia] || ''}
                                                        onValueChange={(val) => setManualLinks({ ...manualLinks, [un.numero_guia]: val })}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder="Vincular a guia..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {dryRunData.items.reconhecidas.map((rec: any) => (
                                                                <SelectItem key={rec.guide_id} value={rec.guide_id}>
                                                                    {rec.system_guide_number} - {rec.patient_name || 'Paciente'}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-3 border-t border-border">
                    {dryRunData ? (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setDryRunData(null)}
                                disabled={isConfirming}
                            >
                                Carregar Outro Arquivo
                            </Button>
                            <Button
                                onClick={handleConfirmImport}
                                disabled={isConfirming}
                                className="bg-emerald-700 hover:bg-emerald-800 text-white"
                            >
                                {isConfirming ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Confirmando Conciliação...
                                    </>
                                ) : (
                                    'Confirmar Conciliação Atômica'
                                )}
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
