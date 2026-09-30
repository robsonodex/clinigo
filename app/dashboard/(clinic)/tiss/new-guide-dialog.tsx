'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Clock,
    FileText,
    Loader2,
    Plus,
    Save,
    Search,
    ShieldCheck,
    Stethoscope,
    UserCheck,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useFaturamentoPremium } from '@/lib/tiss/use-faturamento-premium';

export interface NewGuideDialogProps {
    onSuccess: () => void;
    overridePremium?: boolean;
}

// =============================================================================
// COMPONENTE LEGADO (Renderizado quando faturamento_premium = false)
// =============================================================================

const legacyGuideSchema = z.object({
    patient_id: z.string().min(1, 'Selecione um paciente'),
    guide_type: z.enum(['consulta', 'sadt', 'internacao']),
    operator_id: z.string().min(1, 'Selecione uma operadora'),
    procedure_code: z.string().min(1, 'Código do procedimento obrigatório'),
    full_name: z.string().optional(),
});

type LegacyGuideFormValues = z.infer<typeof legacyGuideSchema>;

function LegacyNewGuideDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<LegacyGuideFormValues>({
        resolver: zodResolver(legacyGuideSchema),
        defaultValues: {
            guide_type: 'consulta',
        },
    });

    async function onSubmit(data: LegacyGuideFormValues) {
        setIsLoading(true);
        try {
            const response = await fetch('/api/tiss/guides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guide_type: data.guide_type,
                    patient_id: data.patient_id,
                    procedures: [
                        {
                            code: data.procedure_code,
                            description: 'Procedimento TISS',
                            quantity: 1,
                            unit_price: 150.0,
                        },
                    ],
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao criar guia');
            }

            toast.success('Guia TISS criada com sucesso!');
            setOpen(false);
            form.reset();
            onSuccess();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao criar guia');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Guia
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nova Guia TISS</DialogTitle>
                    <DialogDescription>
                        Preencha os dados para gerar uma nova guia de faturamento.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="guide_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Guia</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o tipo" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="consulta">Consulta</SelectItem>
                                            <SelectItem value="sadt">SADT (Exames)</SelectItem>
                                            <SelectItem value="internacao">Internação</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="patient_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ID do Paciente (Temporário)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Cole o UUID do paciente..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="procedure_code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Código do Procedimento (TUSS)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: 10101012" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Criando...
                                    </>
                                ) : (
                                    'Criar Guia'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// =============================================================================
// COMPONENTE PREMIUM (Renderizado exclusivamente quando faturamento_premium = true)
// =============================================================================

interface PatientItem {
    id: string;
    full_name: string;
    cpf?: string;
}

interface InsuranceItem {
    id: string;
    card_number: string;
    valid_until?: string;
    operator?: {
        id: string;
        name: string;
        ans_code: string;
    };
}

function PremiumNewGuideDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingEligibility, setIsCheckingEligibility] = useState(false);
    const [eligibilityResult, setEligibilityResult] = useState<{
        checked: boolean;
        eligible: boolean;
        message: string;
    } | null>(null);

    // Indicador visual de salvamento de rascunho com debounce (G2)
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Passo 1: Beneficiário
    const [patientSearch, setPatientSearch] = useState('');
    const [patientList, setPatientList] = useState<PatientItem[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);
    const [patientInsurances, setPatientInsurances] = useState<InsuranceItem[]>([]);
    const [selectedInsuranceId, setSelectedInsuranceId] = useState<string>('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardValidity, setCardValidity] = useState('');

    // Passo 2: Procedimento e Dados Clínicos
    const [guideType, setGuideType] = useState<'consulta' | 'sadt'>('consulta');
    const [procedureCode, setProcedureCode] = useState('10101012');
    const [procedureName, setProcedureName] = useState('Consulta em consultório');
    const [procedureQuantity, setProcedureQuantity] = useState(1);
    const [unitValue, setUnitValue] = useState(150.0);
    const [cid10, setCid10] = useState('Z00.0');
    const [authorizationCode, setAuthorizationCode] = useState('');

    // Busca de pacientes com debounce
    useEffect(() => {
        if (!patientSearch.trim()) {
            setPatientList([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}&limit=5`);
                if (res.ok) {
                    const data = await res.json();
                    setPatientList(data.patients || data.data || []);
                }
            } catch (err) {
                console.error('Erro ao buscar pacientes:', err);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [patientSearch]);

    // Carregar convênios do paciente selecionado
    useEffect(() => {
        if (!selectedPatient) {
            setPatientInsurances([]);
            setSelectedInsuranceId('');
            setCardNumber('');
            setCardValidity('');
            setEligibilityResult(null);
            return;
        }

        const fetchInsurances = async () => {
            try {
                const res = await fetch(`/api/tiss/patient-insurance?patient_id=${selectedPatient.id}`);
                if (res.ok) {
                    const data = await res.json();
                    const list: InsuranceItem[] = data.data || [];
                    setPatientInsurances(list);
                    if (list.length > 0) {
                        setSelectedInsuranceId(list[0].id);
                        setCardNumber(list[0].card_number || '');
                        setCardValidity(list[0].valid_until || '');
                    }
                }
            } catch (err) {
                console.error('Erro ao buscar convênios:', err);
            }
        };

        fetchInsurances();
    }, [selectedPatient]);

    // Conferência cadastral interna (antiga checagem de elegibilidade online)
    const handleCheckEligibility = async () => {
        if (!selectedPatient || !cardNumber) {
            toast.error('Selecione o paciente e informe o número da carteirinha.');
            return;
        }

        setIsCheckingEligibility(true);
        try {
            const ins = patientInsurances.find((i) => i.id === selectedInsuranceId);
            const res = await fetch('/api/insurance/check-eligibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: selectedPatient.id,
                    operator_id: ins?.operator?.id,
                    card_number: cardNumber,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setEligibilityResult({
                    checked: true,
                    eligible: data.eligible ?? true,
                    message: data.message || 'Dados cadastrais do beneficiário conferidos internamente com sucesso.',
                });
                toast.success('Conferência cadastral interna realizada.');
            } else {
                setEligibilityResult({
                    checked: true,
                    eligible: false,
                    message: 'Pendência cadastral identificada internamente (validade ou formato).',
                });
                toast.warning('Atenção: verificação cadastral interna apontou pendência.');
            }
        } catch {
            setEligibilityResult({
                checked: true,
                eligible: true,
                message: 'Conferência cadastral concluída em modo contingência.',
            });
            toast.info('Conferência cadastral em contingência.');
        } finally {
            setIsCheckingEligibility(false);
        }
    };

    // Salvar Rascunho com suporte a salvamento silencioso via debounce (G2)
    const handleSaveDraft = async (silent = false) => {
        if (!selectedPatient) {
            if (!silent) toast.error('Selecione ao menos um paciente para salvar rascunho.');
            return;
        }

        if (!silent) setIsLoading(true);
        try {
            const url = currentDraftId
                ? `/api/tiss/guides/${currentDraftId}`
                : '/api/tiss/guides';
            const method = currentDraftId ? 'PUT' : 'POST';

            const payload: any = {
                guide_type: guideType,
                patient_id: selectedPatient.id,
                patient_insurance_id: selectedInsuranceId || undefined,
                patient_card_number: cardNumber,
                patient_card_validity: cardValidity,
                cid_primary: cid10,
                authorization_number: authorizationCode || undefined,
                procedures: [
                    {
                        code: procedureCode,
                        description: procedureName,
                        quantity: procedureQuantity,
                        unit_price: unitValue,
                    },
                ],
                status: 'DRAFT',
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || data.message || 'Erro ao salvar rascunho';
                throw new Error(errorMsg);
            }

            if (data.data?.id && !currentDraftId) {
                setCurrentDraftId(data.data.id);
            }

            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            setLastSavedAt(timeStr);

            if (!silent) {
                toast.success(`Rascunho gravado com sucesso às ${timeStr}.`);
                onSuccess();
            }
        } catch (err: any) {
            if (!silent) toast.error(err.message || 'Falha ao salvar rascunho');
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    // G2 - Debounce Automático de Salvamento de Rascunho (Autosave após 2 segundos de inatividade)
    useEffect(() => {
        if (!selectedPatient || !open) return;

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            handleSaveDraft(true);
        }, 2000);

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [selectedPatient, cardNumber, cardValidity, guideType, procedureCode, procedureQuantity, unitValue, cid10, authorizationCode, open]);

    // Emitir Guia TISS Oficial
    const handleEmitGuide = async () => {
        if (!selectedPatient) {
            toast.error('Beneficiário obrigatório.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch('/api/tiss/guides', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    guide_type: guideType,
                    patient_id: selectedPatient.id,
                    patient_insurance_id: selectedInsuranceId || undefined,
                    patient_card_number: cardNumber,
                    patient_card_validity: cardValidity,
                    cid_primary: cid10,
                    authorization_number: authorizationCode || undefined,
                    procedures: [
                        {
                            code: procedureCode,
                            description: procedureName,
                            quantity: procedureQuantity,
                            unit_price: unitValue,
                        },
                    ],
                    status: 'PENDING',
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || data.message || 'Erro ao emitir guia TISS';
                throw new Error(errorMsg);
            }

            toast.success(`Guia ${data.data?.guide_number || ''} emitida com sucesso!`);
            setOpen(false);
            onSuccess();
        } catch (err: any) {
            toast.error(err.message || 'Falha ao emitir guia TISS');
        } finally {
            setIsLoading(false);
        }
    };

    const totalCalculated = procedureQuantity * unitValue;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Nova Guia
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-4">
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Assistente de Emissão TISS (Faturamento Premium)
                        </DialogTitle>
                        <Badge variant="outline" className="text-xs font-mono">
                            Passo {step} de 3
                        </Badge>
                    </div>
                    <DialogDescription className="text-xs">
                        Emissão de guia segundo as normas TISS com auditoria preventiva e integridade cadastral.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    {/* PASSO 1: Beneficiário & Convênio */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Buscar Paciente</Label>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Digite o nome do paciente..."
                                        value={patientSearch}
                                        onChange={(e) => setPatientSearch(e.target.value)}
                                        className="pl-9 text-xs"
                                    />
                                </div>

                                {patientList.length > 0 && !selectedPatient && (
                                    <div className="border rounded divide-y mt-1 max-h-40 overflow-y-auto bg-popover shadow-sm">
                                        {patientList.map((p) => (
                                            <div
                                                key={p.id}
                                                onClick={() => {
                                                    setSelectedPatient(p);
                                                    setPatientSearch(p.full_name);
                                                    setPatientList([]);
                                                }}
                                                className="p-2 text-xs hover:bg-accent cursor-pointer flex items-center justify-between"
                                            >
                                                <span className="font-medium">{p.full_name}</span>
                                                {p.cpf && <span className="text-muted-foreground font-mono text-[10px]">{p.cpf}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedPatient && (
                                <Card className="border bg-muted/20">
                                    <CardContent className="pt-3 pb-3 space-y-3">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <div className="flex items-center gap-2">
                                                <UserCheck className="w-4 h-4 text-emerald-600" />
                                                <span className="font-semibold text-xs text-foreground">{selectedPatient.full_name}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedPatient(null);
                                                    setPatientSearch('');
                                                }}
                                                className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
                                            >
                                                Trocar
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[11px]">Número da Carteirinha</Label>
                                                <Input
                                                    placeholder="0000000000000"
                                                    value={cardNumber}
                                                    onChange={(e) => setCardNumber(e.target.value)}
                                                    className="font-mono text-xs h-8"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-[11px]">Validade da Carteirinha</Label>
                                                <Input
                                                    type="date"
                                                    value={cardValidity}
                                                    onChange={(e) => setCardValidity(e.target.value)}
                                                    className="text-xs h-8"
                                                />
                                            </div>
                                        </div>

                                        {/* Ação: Conferir cadastro do convênio (sem "online") */}
                                        <div className="border-t pt-2 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    type="button"
                                                    onClick={handleCheckEligibility}
                                                    disabled={isCheckingEligibility || !cardNumber}
                                                    className="text-xs gap-1.5 h-7"
                                                >
                                                    {isCheckingEligibility ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                                    )}
                                                    Conferir cadastro do convenio
                                                </Button>

                                                {eligibilityResult && (
                                                    <Badge
                                                        variant={eligibilityResult.eligible ? 'default' : 'destructive'}
                                                        className="text-[10px]"
                                                    >
                                                        {eligibilityResult.eligible ? 'Cadastro Conforme' : 'Pendência Cadastral'}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                Conferencia cadastral interna. Nao consulta a operadora.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* PASSO 2: Procedimento & Dados Clínicos */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Tipo de Guia</Label>
                                    <Select
                                        value={guideType}
                                        onValueChange={(val: 'consulta' | 'sadt') => setGuideType(val)}
                                    >
                                        <SelectTrigger className="text-xs h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="consulta">Consulta Médica</SelectItem>
                                            <SelectItem value="sadt">SP / SADT (Procedimento)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">CID-10 Principal</Label>
                                    <Input
                                        placeholder="Ex: Z00.0"
                                        value={cid10}
                                        onChange={(e) => setCid10(e.target.value.toUpperCase())}
                                        className="font-mono text-xs h-8"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Número de Autorização (Opcional)</Label>
                                <Input
                                    placeholder="Número da guia de autorização prévia"
                                    value={authorizationCode}
                                    onChange={(e) => setAuthorizationCode(e.target.value)}
                                    className="font-mono text-xs h-8"
                                />
                            </div>

                            <div className="grid grid-cols-4 gap-2 pt-2 border-t">
                                <div className="col-span-2 space-y-1">
                                    <Label className="text-[11px]">Procedimento TUSS</Label>
                                    <Input
                                        value={`${procedureCode} - ${procedureName}`}
                                        readOnly
                                        className="text-xs h-8 bg-muted font-medium"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px]">Qtd</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={procedureQuantity}
                                        onChange={(e) => setProcedureQuantity(parseInt(e.target.value) || 1)}
                                        className="text-xs h-8 font-mono text-right"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px]">Valor (R$)</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={unitValue}
                                        onChange={(e) => setUnitValue(parseFloat(e.target.value) || 0)}
                                        className="text-xs h-8 font-mono text-right"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASSO 3: Revisão & Emissão */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <Card className="border">
                                <CardContent className="pt-4 pb-4 space-y-3">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                                                Tipo de Atendimento
                                            </span>
                                            <span className="font-bold text-xs uppercase">
                                                {guideType === 'consulta' ? 'Consulta Médica' : 'SP / SADT'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                                                Valor Total da Guia
                                            </span>
                                            <span className="font-extrabold text-sm text-primary font-mono">
                                                {totalCalculated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block">Beneficiário</span>
                                            <span className="font-medium text-foreground">{selectedPatient?.full_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block">Carteirinha</span>
                                            <span className="font-mono">{cardNumber || 'Não informada'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block">Procedimento TUSS</span>
                                            <span className="font-mono font-medium">{procedureCode} - {procedureName}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] text-muted-foreground block">CID-10 Principal</span>
                                            <span className="font-mono font-medium">{cid10}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Indicador visual de salvamento de rascunho com debounce (G2) */}
                            {lastSavedAt && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground justify-end">
                                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Salvo às {lastSavedAt}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-2">
                        {step > 1 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                                disabled={isLoading}
                                className="gap-1.5 text-xs"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Anterior
                            </Button>
                        )}

                        {/* Botão de Salvar Rascunho (G2) */}
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleSaveDraft(false)}
                            disabled={isLoading || !selectedPatient}
                            className="gap-1.5 text-xs"
                        >
                            <Save className="w-3.5 h-3.5" />
                            Salvar Rascunho
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        {step < 3 ? (
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    if (step === 1 && !selectedPatient) {
                                        toast.error('Selecione um paciente para continuar.');
                                        return;
                                    }
                                    setStep((s) => (s + 1) as 2 | 3);
                                }}
                                className="gap-1.5 text-xs"
                            >
                                Próximo
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleEmitGuide}
                                disabled={isLoading}
                                className="gap-1.5 text-xs"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Check className="w-3.5 h-3.5" />
                                )}
                                Emitir Guia TISS
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// =============================================================================
// EXPORTAÇÃO CONDICIONAL POR FEATURE FLAG (Parte 1.1)
// =============================================================================

export function NewGuideDialog(props: NewGuideDialogProps) {
    const { isPremium } = useFaturamentoPremium();
    const effectivePremium = props.overridePremium !== undefined ? props.overridePremium : isPremium;

    if (!effectivePremium) {
        return <LegacyNewGuideDialog onSuccess={props.onSuccess} />;
    }

    return <PremiumNewGuideDialog onSuccess={props.onSuccess} />;
}
