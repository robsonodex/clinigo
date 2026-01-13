// app/dashboard/(clinic)/financial/payroll/contracts/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, FileText, Percent, DollarSign, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Contract {
    id: string;
    doctor_id: string;
    contract_type: string;
    percentage_private: number;
    percentage_insurance: number;
    fixed_value_private: number;
    fixed_value_insurance: number;
    apply_tax_retention: boolean;
    inss_rate: number;
    is_active: boolean;
    valid_from: string;
    doctor: {
        id: string;
        name: string;
        crm: string;
        specialty: string;
    };
}

interface Doctor {
    id: string;
    name: string;
    crm: string;
    specialty: string;
}

const CONTRACT_TYPES = [
    { value: 'PERCENTAGE_GROSS', label: '% sobre Valor Bruto' },
    { value: 'PERCENTAGE_NET', label: '% sobre Valor Líquido' },
    { value: 'FIXED_VALUE', label: 'Valor Fixo por Consulta' },
    { value: 'HYBRID', label: 'Híbrido (% + Piso Mínimo)' },
];

export default function ContractsPage() {
    const [showDialog, setShowDialog] = useState(false);
    const [formData, setFormData] = useState({
        doctor_id: '',
        contract_type: 'PERCENTAGE_GROSS',
        percentage_private: 70,
        percentage_insurance: 60,
        fixed_value_private: 0,
        fixed_value_insurance: 0,
        apply_tax_retention: true,
        inss_rate: 11,
        irrf_rate: 0,
        iss_rate: 5,
    });

    // Buscar contratos
    const { data: contracts, isLoading, refetch } = useQuery({
        queryKey: ['contracts'],
        queryFn: async () => {
            const res = await fetch('/api/payroll/contracts');
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json.data as Contract[];
        },
    });

    // Buscar médicos
    const { data: doctors } = useQuery({
        queryKey: ['doctors-list'],
        queryFn: async () => {
            const res = await fetch('/api/doctors');
            const json = await res.json();
            return (json.data || json) as Doctor[];
        },
    });

    // Criar contrato
    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const res = await fetch('/api/payroll/contracts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!json.success) throw new Error(json.error);
            return json;
        },
        onSuccess: () => {
            toast.success('Contrato criado com sucesso!');
            setShowDialog(false);
            refetch();
            setFormData({
                doctor_id: '',
                contract_type: 'PERCENTAGE_GROSS',
                percentage_private: 70,
                percentage_insurance: 60,
                fixed_value_private: 0,
                fixed_value_insurance: 0,
                apply_tax_retention: true,
                inss_rate: 11,
                irrf_rate: 0,
                iss_rate: 5,
            });
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Contratos de Repasse</h1>
                    <p className="text-muted-foreground">
                        Configure as regras de repasse para cada médico
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/financial/payroll">
                        <Button variant="outline">← Voltar</Button>
                    </Link>
                    <Dialog open={showDialog} onOpenChange={setShowDialog}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Novo Contrato
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Novo Contrato de Repasse</DialogTitle>
                                <DialogDescription>
                                    Configure as regras de cálculo do repasse do médico
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                                {/* Médico */}
                                <div className="space-y-2">
                                    <Label>Médico</Label>
                                    <Select
                                        value={formData.doctor_id}
                                        onValueChange={(v) => setFormData(prev => ({ ...prev, doctor_id: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o médico" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {doctors?.map((doc) => (
                                                <SelectItem key={doc.id} value={doc.id}>
                                                    {doc.name} - CRM {doc.crm}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Tipo de contrato */}
                                <div className="space-y-2">
                                    <Label>Tipo de Contrato</Label>
                                    <Select
                                        value={formData.contract_type}
                                        onValueChange={(v) => setFormData(prev => ({ ...prev, contract_type: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CONTRACT_TYPES.map((type) => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Percentuais */}
                                {formData.contract_type.includes('PERCENTAGE') && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>% Particular</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={formData.percentage_private}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        percentage_private: Number(e.target.value)
                                                    }))}
                                                />
                                                <Percent className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>% Convênio</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={formData.percentage_insurance}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        percentage_insurance: Number(e.target.value)
                                                    }))}
                                                />
                                                <Percent className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Valores fixos */}
                                {formData.contract_type === 'FIXED_VALUE' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Valor Particular</Label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    className="pl-8"
                                                    value={formData.fixed_value_private}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        fixed_value_private: Number(e.target.value)
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Valor Convênio</Label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    className="pl-8"
                                                    value={formData.fixed_value_insurance}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        fixed_value_insurance: Number(e.target.value)
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Impostos */}
                                <div className="space-y-4 pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                        <Label>Reter Impostos</Label>
                                        <Switch
                                            checked={formData.apply_tax_retention}
                                            onCheckedChange={(v) => setFormData(prev => ({
                                                ...prev,
                                                apply_tax_retention: v
                                            }))}
                                        />
                                    </div>

                                    {formData.apply_tax_retention && (
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm">INSS (%)</Label>
                                                <Input
                                                    type="number"
                                                    value={formData.inss_rate}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        inss_rate: Number(e.target.value)
                                                    }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm">IRRF (%)</Label>
                                                <Input
                                                    type="number"
                                                    value={formData.irrf_rate}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        irrf_rate: Number(e.target.value)
                                                    }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm">ISS (%)</Label>
                                                <Input
                                                    type="number"
                                                    value={formData.iss_rate}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        iss_rate: Number(e.target.value)
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setShowDialog(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={() => createMutation.mutate(formData)}
                                    disabled={!formData.doctor_id || createMutation.isPending}
                                >
                                    {createMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : null}
                                    Criar Contrato
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Contratos Ativos</CardTitle>
                    <CardDescription>
                        Contratos de repasse configurados para cada médico
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-12" />
                            ))}
                        </div>
                    ) : !contracts || contracts.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhum contrato cadastrado</p>
                            <p className="text-sm">Clique em &quot;Novo Contrato&quot; para configurar um médico</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Médico</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-center">Particular</TableHead>
                                    <TableHead className="text-center">Convênio</TableHead>
                                    <TableHead className="text-center">Impostos</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {contracts.map((contract) => (
                                    <TableRow key={contract.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{contract.doctor?.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    CRM {contract.doctor?.crm}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {CONTRACT_TYPES.find(t => t.value === contract.contract_type)?.label}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {contract.contract_type.includes('PERCENTAGE')
                                                ? `${contract.percentage_private}%`
                                                : `R$ ${contract.fixed_value_private}`
                                            }
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {contract.contract_type.includes('PERCENTAGE')
                                                ? `${contract.percentage_insurance}%`
                                                : `R$ ${contract.fixed_value_insurance}`
                                            }
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {contract.apply_tax_retention ? (
                                                <span className="text-sm text-muted-foreground">
                                                    INSS {contract.inss_rate}%
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">Não retém</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant={contract.is_active ? 'default' : 'secondary'}>
                                                {contract.is_active ? 'Ativo' : 'Inativo'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
