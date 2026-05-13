import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PatientSearchCombobox } from '@/components/appointments/PatientSearchCombobox';
import { toast } from 'sonner';

interface CreditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    credit?: any | null; // se tiver, é edição
}

export function CreditDialog({ open, onOpenChange, credit }: CreditDialogProps) {
    const queryClient = useQueryClient();
    
    const [patientId, setPatientId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [reason, setReason] = useState<string>('pre-pago');
    const [expiresAt, setExpiresAt] = useState<string>('');

    useEffect(() => {
        if (open) {
            if (credit) {
                setPatientId(credit.patient_id || '');
                setAmount(credit.amount?.toString() || '');
                setReason(credit.reason || 'pre-pago');
                setExpiresAt(credit.expires_at ? new Date(credit.expires_at).toISOString().split('T')[0] : '');
            } else {
                setPatientId('');
                setAmount('');
                setReason('pre-pago');
                setExpiresAt('');
            }
        }
    }, [open, credit]);

    const mutation = useMutation({
        mutationFn: async () => {
            if (!patientId || !amount) throw new Error('Preencha os campos obrigatórios');
            
            const payload = {
                patient_id: patientId,
                amount: parseFloat(amount),
                reason,
                expires_at: expiresAt ? new Date(expiresAt).toISOString() : null
            };

            const url = credit ? `/api/financial/credits/${credit.id}` : '/api/financial/credits';
            const method = credit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao salvar crédito');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patient-credits'] });
            toast.success(credit ? 'Crédito atualizado com sucesso!' : 'Crédito criado com sucesso!');
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao salvar');
        }
    });

    const handleSave = () => {
        mutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{credit ? 'Editar Crédito' : 'Novo Crédito'}</DialogTitle>
                    <DialogDescription>
                        Insira os dados do crédito para uso futuro (ex: pré-pago, devolução).
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Paciente *</Label>
                        {!credit ? (
                            <PatientSearchCombobox
                                value={patientId}
                                onSelect={(val) => setPatientId(val)}
                            />
                        ) : (
                            <Input disabled value={credit.patient?.full_name || 'Paciente vinculado'} />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Valor (R$) *</Label>
                            <Input 
                                type="number" 
                                step="0.01" 
                                placeholder="0,00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Motivo *</Label>
                            <Select value={reason} onValueChange={setReason}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pre-pago">Pré-pago (Pacote)</SelectItem>
                                    <SelectItem value="devolucao">Devolução</SelectItem>
                                    <SelectItem value="cortesia">Cortesia / Bônus</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Data de Validade (opcional)</Label>
                        <Input 
                            type="date" 
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={mutation.isPending}>
                        {mutation.isPending ? 'Salvando...' : 'Salvar Crédito'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
