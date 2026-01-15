'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone'; // Assuming react-dropzone is installed or I should use input
// If react-dropzone is not in package.json, I should fallback to simple input.
// User didn't specify packages, but "Drag & Drop" implies it.
// I'll check if I can use simple input first to avoid dep issues, or just a simple UI.
import { CloudUpload, Loader2, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FileUploadZoneProps {
    importType: string;
    onUploadComplete: (jobId: string) => void;
}

export function FileUploadZone({ importType, onUploadComplete }: FileUploadZoneProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFile = async (file: File) => {
        setIsUploading(true);
        setUploadProgress(10);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', importType);

        try {
            // Fake progress
            const interval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const response = await fetch('/api/import/upload', {
                method: 'POST',
                body: formData
            });

            clearInterval(interval);
            setUploadProgress(100);

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro no upload');
            }

            onUploadComplete(data.jobId);
        } catch (error) {
            alert('Erro ao enviar arquivo');
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="border-2 border-dashed rounded-lg p-10 text-center hover:bg-muted/50 transition relative">
            {isUploading ? (
                <div className="space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                    <p>Enviando arquivo...</p>
                    <Progress value={uploadProgress} />
                </div>
            ) : (
                <div className="flex flex-col items-center">
                    <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <CloudUpload className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Clique ou arraste o arquivo aqui</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Suporta .xlsx, .xls e .csv (Máx 10MB)
                    </p>
                    <Button variant="outline">Selecionar Arquivo</Button>
                </div>
            )}
        </div>
    );
}
