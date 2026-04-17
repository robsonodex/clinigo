// app/components/tiss/contest-glosa-dialog.tsx
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ContestGlosaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    glosaId: string | null;
    glosaValue: number;
    glosaCode: string;
    onSuccess: () => void;
}

export function ContestGlosaDialog({
    open,
    onOpenChange,
    glosaId,
    glosaValue,
    glosaCode,
    onSuccess,
}: ContestGlosaDialogProps) {
    const [reason, setReason] = useState('');
    const [deadlineDays, setDeadlineDays] = useState(30);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!glosaId) return;
        if (reason.length < 10) {
            toast.error('A justificativa deve ter ao menos 10 caracteres');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch(`/api/tiss/glosas/${glosaId}/contest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contest_reason: reason,
                    deadline_days: deadlineDays,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success('Recurso de glosa aberto com sucesso!');
                onSuccess();
                onOpenChange(false);
                setReason('');
            } else {
                toast.error(data.error || 'Erro ao criar recurso');
            }
        } catch (error) {
            toast.error('Erro de conexão ao criar recurso');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Abrir Recurso de Glosa</DialogTitle>
                    <DialogDescription>
                        Conteste a glosa {glosaCode || '-'} (R$ {new Intl.NumberFormat('pt-BR').format(glosaValue)}) junto à operadora enviando a justificativa.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Prazo de Resposta (Dias)</Label>
                        <Input
                            type="number"
                            min={1}
                            max={90}
                            value={deadlineDays}
                            onChange={(e) => setDeadlineDays(Number(e.target.value))}
                        />
                        <p className="text-xs text-muted-foreground">
                            Prazo SLA esperado para retorno da operadora.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Justificativa do Recurso</Label>
                        <Textarea
                            placeholder="Descreva detalhadamente o porquê da glosa ser indevida (ex: exame autorizado previamente, guia assinada em anexo...)"
                            className="min-h-[120px]"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading || reason.length < 10}>
                        {isLoading ? 'Enviando...' : 'Enviar Recurso'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
