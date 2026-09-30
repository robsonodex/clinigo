'use client';

import { useState } from 'react';
import {
    Copy,
    FileText,
    MoreHorizontal,
    Printer,
    ShieldAlert,
    Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { TissGuide } from '@/types/tiss';
import { GuideValidationPanel } from './guide-validation-panel';
import { CancelGuideDialog } from './cancel-guide-dialog';
import { GuidePrintModal } from './guide-print-modal';
import { useFaturamentoPremium } from '@/lib/tiss/use-faturamento-premium';

export interface GuideListTableProps {
    guides: TissGuide[];
    batchId?: string;
    onRefresh?: () => void;
    overridePremium?: boolean;
}

// =============================================================================
// COMPONENTE LEGADO (Renderizado exclusivamente quando faturamento_premium = false)
// =============================================================================

function LegacyGuideListTable({ guides }: { guides: TissGuide[] }) {
    if (guides.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                Nenhuma guia neste lote
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Procedimento</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {guides.map((guide) => (
                    <TableRow key={guide.id}>
                        <TableCell className="font-mono text-sm">{guide.guide_number}</TableCell>
                        <TableCell>{guide.patient_name}</TableCell>
                        <TableCell>
                            <div className="font-medium">{guide.procedure_name}</div>
                            <div className="text-xs text-muted-foreground">{guide.procedure_code}</div>
                        </TableCell>
                        <TableCell className="text-right">{guide.procedure_quantity}</TableCell>
                        <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            }).format(guide.total_value)}
                            {guide.glosa_value > 0 && (
                                <div className="text-xs text-destructive">
                                    -R$ {new Intl.NumberFormat('pt-BR').format(guide.glosa_value)}
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                            <Badge variant={guide.validation_status === 'VALID' ? 'default' : 'destructive'}>
                                {guide.validation_status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

// =============================================================================
// COMPONENTE PREMIUM (Renderizado exclusivamente quando faturamento_premium = true)
// =============================================================================

function PremiumGuideListTable({
    guides,
    batchId,
    onRefresh,
}: {
    guides: TissGuide[];
    batchId?: string;
    onRefresh?: () => void;
}) {
    const [selectedGuideForValidation, setSelectedGuideForValidation] = useState<TissGuide | null>(null);
    const [selectedGuideForCancel, setSelectedGuideForCancel] = useState<TissGuide | null>(null);
    const [selectedGuideForPrint, setSelectedGuideForPrint] = useState<TissGuide | null>(null);
    const [selectedGuideIds, setSelectedGuideIds] = useState<string[]>([]);
    const [isBulkPrintOpen, setIsBulkPrintOpen] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

    // Duplicar Guia (G5)
    const handleDuplicate = async (guide: TissGuide) => {
        setIsDuplicating(guide.id);
        try {
            const res = await fetch(`/api/tiss/guides/${guide.id}/duplicate`, {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok) {
                const errorMsg = typeof data.error === 'string' ? data.error : data.error?.message || data.message || 'Erro ao duplicar guia';
                throw new Error(errorMsg);
            }

            toast.success(data.message || 'Guia duplicada com sucesso!');
            if (onRefresh) onRefresh();
        } catch (err: any) {
            toast.error(err.message || 'Falha ao duplicar guia');
        } finally {
            setIsDuplicating(null);
        }
    };

    // Alternar seleção de guia para impressão em lote
    const toggleSelectGuide = (id: string) => {
        setSelectedGuideIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedGuideIds.length === guides.length) {
            setSelectedGuideIds([]);
        } else {
            setSelectedGuideIds(guides.map((g) => g.id));
        }
    };

    if (guides.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                Nenhuma guia cadastrada neste lote ou visualização
            </div>
        );
    }

    const selectedGuidesList = guides.filter((g) => selectedGuideIds.includes(g.id));

    return (
        <div className="space-y-3">
            {/* Barra de Ações em Massa (Impressão de Múltiplas Guias) */}
            {selectedGuideIds.length > 0 && (
                <div className="flex items-center justify-between p-2.5 bg-muted/60 border rounded text-xs">
                    <span className="font-medium text-foreground">
                        {selectedGuideIds.length} {selectedGuideIds.length === 1 ? 'guia selecionada' : 'guias selecionadas'}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsBulkPrintOpen(true)}
                            className="h-7 text-xs gap-1.5"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir Selecionadas
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedGuideIds([])}
                            className="h-7 text-xs"
                        >
                            Limpar Seleção
                        </Button>
                    </div>
                </div>
            )}

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <input
                                type="checkbox"
                                checked={selectedGuideIds.length === guides.length && guides.length > 0}
                                onChange={toggleSelectAll}
                                className="rounded border-zinc-300"
                                aria-label="Selecionar todas as guias"
                            />
                        </TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Procedimento</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {guides.map((guide) => {
                        const isSelected = selectedGuideIds.includes(guide.id);
                        return (
                            <TableRow key={guide.id} className={isSelected ? 'bg-muted/40' : undefined}>
                                <TableCell>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleSelectGuide(guide.id)}
                                        className="rounded border-zinc-300"
                                        aria-label={`Selecionar guia ${guide.guide_number}`}
                                    />
                                </TableCell>
                                <TableCell className="font-mono text-xs font-semibold">{guide.guide_number}</TableCell>
                                <TableCell>
                                    <div className="font-medium text-xs">{guide.patient_name}</div>
                                    {guide.patient_cpf && (
                                        <div className="text-[10px] text-muted-foreground font-mono">{guide.patient_cpf}</div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="font-medium text-xs">{guide.procedure_name}</div>
                                    <div className="text-[10px] text-muted-foreground font-mono">{guide.procedure_code}</div>
                                </TableCell>
                                <TableCell className="text-right text-xs font-mono">{guide.procedure_quantity}</TableCell>
                                <TableCell className="text-right">
                                    <div className="font-mono text-xs font-semibold">
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        }).format(guide.total_value)}
                                    </div>
                                    {guide.glosa_value > 0 && (
                                        <div className="text-[10px] text-destructive font-mono">
                                            -R$ {new Intl.NumberFormat('pt-BR').format(guide.glosa_value)}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-1.5">
                                        <Badge
                                            variant={guide.validation_status === 'VALID' ? 'default' : 'secondary'}
                                            className="text-[10px]"
                                        >
                                            {guide.validation_status === 'VALID' ? 'Válida' : 'Pendente'}
                                        </Badge>
                                        {guide.status === 'CANCELLED' && (
                                            <Badge variant="outline" className="text-[10px] text-zinc-500 line-through">
                                                Cancelada
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 text-xs">
                                            <DropdownMenuLabel>Ações da Guia</DropdownMenuLabel>
                                            <DropdownMenuSeparator />

                                            {/* G3: Validar / Checar Erros */}
                                            <DropdownMenuItem
                                                onClick={() => setSelectedGuideForValidation(guide)}
                                                className="gap-2 cursor-pointer"
                                            >
                                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                                                Checar Validação
                                            </DropdownMenuItem>

                                            {/* G5: Duplicar Guia */}
                                            <DropdownMenuItem
                                                onClick={() => handleDuplicate(guide)}
                                                disabled={isDuplicating === guide.id}
                                                className="gap-2 cursor-pointer"
                                            >
                                                <Copy className="w-3.5 h-3.5 text-blue-600" />
                                                Duplicar Guia
                                            </DropdownMenuItem>

                                            {/* G6: Imprimir Espelho da Guia */}
                                            <DropdownMenuItem
                                                onClick={() => setSelectedGuideForPrint(guide)}
                                                className="gap-2 cursor-pointer"
                                            >
                                                <Printer className="w-3.5 h-3.5 text-zinc-700" />
                                                Imprimir Espelho
                                            </DropdownMenuItem>

                                            <DropdownMenuSeparator />

                                            {/* G4: Cancelar Guia ou Excluir Rascunho */}
                                            <DropdownMenuItem
                                                onClick={() => setSelectedGuideForCancel(guide)}
                                                className="gap-2 text-destructive cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                {guide.status === 'PENDING' && !guide.batch_id && guide.validation_status !== 'VALID'
                                                    ? 'Excluir Rascunho'
                                                    : 'Cancelar Guia'
                                                }
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>

            {/* Painel de Validação G3 */}
            {selectedGuideForValidation && (
                <GuideValidationPanel
                    open={Boolean(selectedGuideForValidation)}
                    onOpenChange={(open) => !open && setSelectedGuideForValidation(null)}
                    guide={selectedGuideForValidation}
                    onValidationComplete={() => {
                        if (onRefresh) onRefresh();
                    }}
                />
            )}

            {/* Diálogo de Cancelamento / Exclusão G4 */}
            {selectedGuideForCancel && (
                <CancelGuideDialog
                    open={Boolean(selectedGuideForCancel)}
                    onOpenChange={(open) => !open && setSelectedGuideForCancel(null)}
                    guide={selectedGuideForCancel}
                    onCancelled={() => {
                        setSelectedGuideForCancel(null);
                        if (onRefresh) onRefresh();
                    }}
                />
            )}

            {/* Modal de Impressão Individual G6 */}
            {selectedGuideForPrint && (
                <GuidePrintModal
                    open={Boolean(selectedGuideForPrint)}
                    onOpenChange={(open) => !open && setSelectedGuideForPrint(null)}
                    guide={selectedGuideForPrint as any}
                />
            )}

            {/* Modal de Impressão em Lote */}
            {isBulkPrintOpen && selectedGuidesList.length > 0 && (
                <GuidePrintModal
                    open={isBulkPrintOpen}
                    onOpenChange={setIsBulkPrintOpen}
                    guides={selectedGuidesList as any}
                />
            )}
        </div>
    );
}

// =============================================================================
// EXPORTAÇÃO CONDICIONAL POR FEATURE FLAG (Parte 1.1)
// =============================================================================

export function GuideListTable(props: GuideListTableProps) {
    const { isPremium } = useFaturamentoPremium();
    const effectivePremium = props.overridePremium !== undefined ? props.overridePremium : isPremium;

    if (!effectivePremium) {
        return <LegacyGuideListTable guides={props.guides} />;
    }

    return (
        <PremiumGuideListTable
            guides={props.guides}
            batchId={props.batchId}
            onRefresh={props.onRefresh}
        />
    );
}
