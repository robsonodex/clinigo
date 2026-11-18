'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Clock, FileCode2, FileText, Paperclip, RefreshCw, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface AttachmentItem {
    key: string;
    label: string;
    present: boolean;
    url: string | null;
    timestamp: string | null;
    meta?: string | null;
}

export function BatchAnsAttachmentsPanel({
    batchId,
    onUploaded,
}: {
    batchId: string;
    onUploaded?: () => void;
}) {
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [kind, setKind] = useState<string>('demonstrativo_analise');
    const [file, setFile] = useState<File | null>(null);

    const loadAttachments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tiss/batches/${batchId}/attachments`);
            const json = await res.json();
            if (res.ok && json.success) {
                setAttachments(json.data?.attachments || []);
            }
        } catch {
            // Falha silenciosa preservada
        } finally {
            setLoading(false);
        }
    }, [batchId]);

    useEffect(() => {
        loadAttachments();
    }, [loadAttachments]);

    const handleUpload = async () => {
        if (!file) {
            toast.error('Selecione um arquivo XML ou PDF para anexar.');
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('kind', kind);
            fd.append('file', file);
            const res = await fetch(`/api/tiss/batches/${batchId}/attachments`, {
                method: 'POST',
                body: fd,
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Erro ao anexar arquivo');
            }
            toast.success(json.message || 'Anexo registrado.');
            setFile(null);
            await loadAttachments();
            onUploaded?.();
        } catch (err: any) {
            toast.error(err?.message || 'Erro ao anexar arquivo TISS-ANS');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card className="border border-border shadow-none">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-slate-600" />
                    <CardTitle className="text-sm font-semibold">Anexos TISS-ANS da Remessa</CardTitle>
                </div>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={loadAttachments}
                    disabled={loading}
                    className="min-h-[44px] gap-1.5 text-xs"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {attachments.map((att) => (
                        <div
                            key={att.key}
                            className="rounded-md border border-border p-3 flex items-start justify-between gap-2 bg-muted/20"
                        >
                            <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                                    {att.key.includes('xml') || att.key.includes('demonstrativo') ? (
                                        <FileCode2 className="w-4 h-4 text-slate-600 shrink-0" />
                                    ) : (
                                        <FileText className="w-4 h-4 text-slate-600 shrink-0" />
                                    )}
                                    <span className="truncate">{att.label}</span>
                                </div>
                                {att.timestamp && (
                                    <p className="text-[11px] text-muted-foreground">
                                        {new Date(att.timestamp).toLocaleString('pt-BR')}
                                    </p>
                                )}
                                {att.meta && (
                                    <p className="text-[11px] font-mono text-slate-600 truncate">{att.meta}</p>
                                )}
                            </div>
                            <Badge
                                variant="outline"
                                className={
                                    att.present
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 shrink-0'
                                        : 'bg-slate-50 text-slate-500 border-slate-200 gap-1 shrink-0'
                                }
                            >
                                {att.present ? (
                                    <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        Anexado
                                    </>
                                ) : (
                                    <>
                                        <Clock className="w-3 h-3" />
                                        Pendente
                                    </>
                                )}
                            </Badge>
                        </div>
                    ))}
                </div>

                <div className="rounded-md border border-dashed border-border p-3.5 flex flex-col sm:flex-row sm:items-end gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <Label className="text-xs text-muted-foreground">Tipo do Documento TISS-ANS</Label>
                        <Select value={kind} onValueChange={setKind}>
                            <SelectTrigger className="min-h-[44px] mt-1 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="demonstrativo_analise">XML Demonstrativo de Análise</SelectItem>
                                <SelectItem value="demonstrativo_pagamento">XML Demonstrativo de Pagamento</SelectItem>
                                <SelectItem value="recibo_protocolo">Recibo / Protocolo de Envio</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1 min-w-[220px]">
                        <Label className="text-xs text-muted-foreground">Selecionar Arquivo (.xml / .pdf)</Label>
                        <Input
                            type="file"
                            accept=".xml,.pdf,.png,.jpg,.jpeg"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="min-h-[44px] mt-1 text-xs pt-2.5"
                        />
                    </div>
                    <Button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploading || !file}
                        className="min-h-[44px] gap-1.5 text-xs shrink-0"
                    >
                        <Upload className="w-4 h-4" />
                        {uploading ? 'Anexando...' : 'Anexar Documento'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

