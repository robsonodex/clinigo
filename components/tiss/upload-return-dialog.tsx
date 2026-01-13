// components/tiss/upload-return-dialog.tsx
'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
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
import { toast } from 'sonner';

interface UploadReturnDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    batchId: string;
    onSuccess: () => void;
}

export function UploadReturnDialog({
    open,
    onOpenChange,
    batchId,
    onSuccess,
}: UploadReturnDialogProps) {
    const queryClient = useQueryClient();
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Handle drag events
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
            const droppedFile = files[0];

            // Validar tipo de arquivo
            const validTypes = ['text/xml', 'application/xml', 'text/plain', 'text/csv'];
            const extension = droppedFile.name.split('.').pop()?.toLowerCase();

            if (extension && ['xml', 'txt', 'csv'].includes(extension)) {
                setFile(droppedFile);
            } else {
                toast.error('Tipo de arquivo inválido', {
                    description: 'Apenas arquivos XML, TXT ou CSV são aceitos',
                });
            }
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFile(files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Ler arquivo como base64
            const reader = new FileReader();

            reader.onprogress = (e) => {
                if (e.lengthComputable) {
                    setUploadProgress(Math.round((e.loaded / e.total) * 50)); // 50% para leitura
                }
            };

            reader.onload = async (e) => {
                const base64Content = e.target?.result as string;
                const base64Data = base64Content.split(',')[1]; // Remover prefixo data:...;base64,

                setUploadProgress(50);

                // Determinar tipo
                const extension = file.name.split('.').pop()?.toUpperCase() || 'XML';
                const fileType = ['XML', 'TXT', 'CSV'].includes(extension) ? extension : 'XML';

                // Upload
                const response = await fetch('/api/tiss/returns/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        batch_id: batchId,
                        file_name: file.name,
                        file_type: fileType,
                        file_content: base64Data,
                    }),
                });

                setUploadProgress(75);

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Erro ao fazer upload');
                }

                const result = await response.json();
                const returnId = result.data.id;

                setUploadProgress(80);

                // Processar automaticamente
                const parseResponse = await fetch(`/api/tiss/returns/${returnId}/parse`, {
                    method: 'POST',
                });

                if (!parseResponse.ok) {
                    const error = await parseResponse.json();
                    throw new Error(error.error || 'Erro ao processar retorno');
                }

                setUploadProgress(100);

                toast.success('Retorno processado com sucesso!', {
                    description: 'Status das guias foi atualizado',
                });

                // Invalidar queries
                queryClient.invalidateQueries({ queryKey: ['tiss-batch', batchId] });
                queryClient.invalidateQueries({ queryKey: ['tiss-batches'] });

                // Resetar e fechar
                setFile(null);
                setUploadProgress(0);
                onSuccess();
            };

            reader.onerror = () => {
                throw new Error('Erro ao ler arquivo');
            };

            reader.readAsDataURL(file);

        } catch (error: any) {
            toast.error('Erro ao processar retorno', {
                description: error.message,
            });
            setUploadProgress(0);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Upload de Retorno da Operadora</DialogTitle>
                    <DialogDescription>
                        Envie o arquivo de retorno (XML, TXT ou CSV) recebido da operadora
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Drag & Drop Area */}
                    {!file ? (
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
                                Formatos aceitos: XML, TXT, CSV
                            </p>
                            <input
                                type="file"
                                accept=".xml,.txt,.csv"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                                disabled={isUploading}
                            />
                            <label htmlFor="file-upload">
                                <Button variant="outline" asChild>
                                    <span>Selecionar Arquivo</span>
                                </Button>
                            </label>
                        </div>
                    ) : (
                        <div className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-primary" />
                                    <div>
                                        <p className="font-medium text-sm">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {(file.size / 1024).toFixed(2)} KB
                                        </p>
                                    </div>
                                </div>
                                {!isUploading && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setFile(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            {isUploading && (
                                <div className="mt-4 space-y-2">
                                    <Progress value={uploadProgress} />
                                    <p className="text-xs text-center text-muted-foreground">
                                        {uploadProgress < 50 && 'Lendo arquivo...'}
                                        {uploadProgress >= 50 && uploadProgress < 80 && 'Fazendo upload...'}
                                        {uploadProgress >= 80 && 'Processando retorno...'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isUploading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpload}
                        disabled={!file || isUploading}
                    >
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUploading ? 'Processando...' : 'Upload e Processar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
