// components/tiss/upload-return-dialog-v2.tsx
'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface UploadReturnDialogV2Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    batchId: string;
    onSuccess: () => void;
}

type UploadStep = 'SELECT' | 'UPLOADING' | 'PROCESSING' | 'COMPLETE' | 'ERROR';

export function UploadReturnDialogV2({
    open,
    onOpenChange,
    batchId,
    onSuccess,
}: UploadReturnDialogV2Props) {
    const queryClient = useQueryClient();

    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [step, setStep] = useState<UploadStep>('SELECT');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [returnId, setReturnId] = useState<string | null>(null);

    // Drag & Drop handlers
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            validateAndSetFile(files[0]);
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            validateAndSetFile(files[0]);
        }
    };

    const validateAndSetFile = (selectedFile: File) => {
        // Validar tipo
        const extension = selectedFile.name.split('.').pop()?.toLowerCase();
        if (!extension || !['xml', 'txt', 'csv'].includes(extension)) {
            toast.error('Tipo de arquivo inválido', {
                description: 'Apenas arquivos XML, TXT ou CSV são aceitos',
            });
            return;
        }

        // Validar tamanho (max 100MB)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (selectedFile.size > maxSize) {
            toast.error('Arquivo muito grande', {
                description: 'Tamanho máximo: 100MB',
            });
            return;
        }

        setFile(selectedFile);
        setError(null);
    };

    const calculateChecksum = async (file: File): Promise<string> => {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleUpload = async () => {
        if (!file) return;

        try {
            setStep('UPLOADING');
            setUploadProgress(0);
            setError(null);

            // 1. Calcular checksum (opcional mas recomendado)
            setUploadProgress(5);
            const checksum = await calculateChecksum(file);

            // 2. Pedir URL assinada ao backend
            setUploadProgress(10);
            const extension = file.name.split('.').pop()?.toUpperCase() as 'XML' | 'TXT' | 'CSV';

            const urlResponse = await fetch('/api/tiss/returns/generate-upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batch_id: batchId,
                    file_name: file.name,
                    file_type: extension,
                    file_size: file.size,
                    checksum,
                }),
            });

            if (!urlResponse.ok) {
                const errorData = await urlResponse.json();
                throw new Error(errorData.error || 'Erro ao gerar URL de upload');
            }

            const { data: urlData } = await urlResponse.json();
            setReturnId(urlData.return_id);

            setUploadProgress(20);

            // 3. Upload DIRETO para Supabase Storage (não passa pelo servidor)
            const uploadResponse = await fetch(urlData.upload_url, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type || 'application/octet-stream',
                    'x-upsert': 'false', // Não sobrescrever
                },
            });

            if (!uploadResponse.ok) {
                throw new Error(`Erro no upload: ${uploadResponse.statusText}`);
            }

            setUploadProgress(80);

            // 4. Notificar backend que upload foi concluído
            const notifyResponse = await fetch('/api/tiss/returns/notify-upload-complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    return_id: urlData.return_id,
                    storage_path: urlData.storage_path,
                    actual_file_size: file.size,
                }),
            });

            if (!notifyResponse.ok) {
                const errorData = await notifyResponse.json();
                throw new Error(errorData.error || 'Erro ao notificar conclusão');
            }

            setUploadProgress(100);
            setStep('PROCESSING');

            // 5. Polling para verificar status do processamento
            await pollProcessingStatus(urlData.return_id);

        } catch (error: any) {
            console.error('[Upload] Erro:', error);
            setStep('ERROR');
            setError(error.message);
            toast.error('Erro no upload', { description: error.message });
        }
    };

    const pollProcessingStatus = async (returnIdToCheck: string) => {
        const maxAttempts = 60; // 5 minutos (5s * 60)
        let attempts = 0;

        const interval = setInterval(async () => {
            attempts++;

            try {
                const response = await fetch(`/api/tiss/returns/${returnIdToCheck}/status`);

                if (!response.ok) {
                    clearInterval(interval);
                    setStep('ERROR');
                    setError('Erro ao verificar status');
                    return;
                }

                const { data } = await response.json();

                if (data.processing_status === 'COMPLETED') {
                    clearInterval(interval);
                    setStep('COMPLETE');
                    toast.success('Retorno processado com sucesso!', {
                        description: `${data.total_guides_processed} guias processadas`,
                    });

                    // Invalidar cache
                    queryClient.invalidateQueries({ queryKey: ['tiss-batch', batchId] });
                    queryClient.invalidateQueries({ queryKey: ['tiss-batches'] });

                    setTimeout(() => {
                        onSuccess();
                    }, 2000);
                } else if (data.processing_status === 'ERROR') {
                    clearInterval(interval);
                    setStep('ERROR');
                    setError(data.processing_error || 'Erro no processamento');
                    toast.error('Erro ao processar retorno', {
                        description: data.processing_error,
                    });
                }

                // Timeout
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    toast.warning('Processamento em andamento', {
                        description: 'O processamento está demorando mais que o esperado. Verifique em alguns minutos.',
                    });
                    onSuccess(); // Fechar modal mesmo assim
                }

            } catch (err) {
                console.error('[Polling] Erro:', err);
            }
        }, 5000); // Poll a cada 5 segundos
    };

    const resetDialog = () => {
        setFile(null);
        setStep('SELECT');
        setUploadProgress(0);
        setError(null);
        setReturnId(null);
    };

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            if (!newOpen) resetDialog();
            onOpenChange(newOpen);
        }}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Upload de Retorno da Operadora</DialogTitle>
                    <DialogDescription>
                        Envie o arquivo de retorno (XML, TXT ou CSV) recebido da operadora
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* SELECT FILE */}
                    {step === 'SELECT' && !file && (
                        <div
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragging
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted-foreground/25 hover:border-primary/50'
                                }
              `}
                        >
                            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-sm font-medium mb-1">
                                Arraste o arquivo aqui ou clique para selecionar
                            </p>
                            <p className="text-xs text-muted-foreground mb-4">
                                Formatos: XML, TXT, CSV • Tamanho máx: 100MB
                            </p>
                            <input
                                type="file"
                                accept=".xml,.txt,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload-v2"
                            />
                            <label htmlFor="file-upload-v2">
                                <Button variant="outline" asChild>
                                    <span>Selecionar Arquivo</span>
                                </Button>
                            </label>
                        </div>
                    )}

                    {/* FILE SELECTED */}
                    {step === 'SELECT' && file && (
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-primary" />
                                    <div>
                                        <p className="font-medium text-sm">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* UPLOADING */}
                    {step === 'UPLOADING' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <span className="text-sm font-medium">Fazendo upload...</span>
                            </div>
                            <Progress value={uploadProgress} />
                            <p className="text-xs text-muted-foreground text-center">
                                {uploadProgress < 20 && 'Preparando upload...'}
                                {uploadProgress >= 20 && uploadProgress < 80 && 'Enviando arquivo...'}
                                {uploadProgress >= 80 && 'Finalizando...'}
                            </p>
                        </div>
                    )}

                    {/* PROCESSING */}
                    {step === 'PROCESSING' && (
                        <Alert>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <AlertDescription>
                                <div className="font-medium">Processando retorno...</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    O arquivo está sendo analisado. Isso pode levar alguns minutos.
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* COMPLETE */}
                    {step === 'COMPLETE' && (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription>
                                <div className="font-medium text-green-600">Concluído com sucesso!</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    O retorno foi processado e as guias foram atualizadas.
                                </p>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* ERROR */}
                    {step === 'ERROR' && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <div className="font-medium">Erro no processamento</div>
                                <p className="text-sm mt-1">{error}</p>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>

                <DialogFooter>
                    {step === 'SELECT' && (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleUpload} disabled={!file}>
                                Fazer Upload
                            </Button>
                        </>
                    )}

                    {(step === 'COMPLETE' || step === 'ERROR') && (
                        <Button onClick={() => {
                            resetDialog();
                            onOpenChange(false);
                        }}>
                            Fechar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
