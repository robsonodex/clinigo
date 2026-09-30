'use client';

import { useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    Info,
    RefreshCw,
    ShieldAlert,
    Wrench,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export interface ValidationIssue {
    code: string;
    field?: string;
    message: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    suggested_value?: string;
}

interface GuideValidationPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    guideId: string;
    guideNumber: string;
    onFixField?: (field: string) => void;
    onValidationComplete?: (isValid: boolean) => void;
}

export function GuideValidationPanel({
    open,
    onOpenChange,
    guideId,
    guideNumber,
    onFixField,
    onValidationComplete,
}: GuideValidationPanelProps) {
    const [isValidating, setIsValidating] = useState(false);
    const [issues, setIssues] = useState<ValidationIssue[]>([]);
    const [hasValidated, setHasValidated] = useState(false);

    const runValidation = async () => {
        setIsValidating(true);
        try {
            const res = await fetch('/api/tiss/guides/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guide_ids: [guideId] }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao validar guia');
            }

            const rawErrors = data.data?.errors || [];
            const mappedIssues: ValidationIssue[] = rawErrors.map((err: any) => ({
                code: err.error_code || 'V000',
                field: err.error_field,
                message: err.error_message || 'Inconsistência identificada',
                severity: (err.severity as 'ERROR' | 'WARNING' | 'INFO') || 'ERROR',
                suggested_value: err.suggested_value,
            }));

            setIssues(mappedIssues);
            setHasValidated(true);

            const hasBlockers = mappedIssues.some((i) => i.severity === 'ERROR');
            if (onValidationComplete) {
                onValidationComplete(!hasBlockers);
            }

            if (mappedIssues.length === 0) {
                toast.success('Guia validada com sucesso! Sem erros detectados.');
            } else if (hasBlockers) {
                toast.error(`Foram encontrados erros bloqueantes na guia ${guideNumber}.`);
            } else {
                toast.warning(`Validação concluída com alertas na guia ${guideNumber}.`);
            }
        } catch (err: any) {
            toast.error(err.message || 'Falha ao executar validação TISS');
        } finally {
            setIsValidating(false);
        }
    };

    const blockers = issues.filter((i) => i.severity === 'ERROR');
    const warnings = issues.filter((i) => i.severity === 'WARNING');
    const suggestions = issues.filter((i) => i.severity === 'INFO');

    const getGlosaRisk = () => {
        if (!hasValidated) return { label: 'Não avaliado', variant: 'secondary' as const };
        if (blockers.length > 0) return { label: 'Risco Alto de Glosa', variant: 'destructive' as const };
        if (warnings.length > 0) return { label: 'Risco Médio de Glosa', variant: 'outline' as const };
        return { label: 'Risco Baixo de Glosa', variant: 'default' as const };
    };

    const glosaRisk = getGlosaRisk();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between pr-4">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <ShieldAlert className="w-5 h-5 text-primary" />
                            Painel de Validação TISS - Guia {guideNumber}
                        </DialogTitle>
                        <Badge variant={glosaRisk.variant}>{glosaRisk.label}</Badge>
                    </div>
                    <DialogDescription>
                        Auditoria de conformidade com o padrão TISS e regras de faturamento da ANS.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Botão de disparo ou revalidação */}
                    <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                        <span className="text-sm text-muted-foreground">
                            {hasValidated
                                ? `Total de apontamentos: ${issues.length} (${blockers.length} bloqueantes, ${warnings.length} avisos)`
                                : 'Clique abaixo para executar a checagem detalhada.'}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={runValidation}
                            disabled={isValidating}
                            className="gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
                            {isValidating ? 'Auditando...' : 'Checar Inconsistências'}
                        </Button>
                    </div>

                    {/* Estado sem inconsistências */}
                    {hasValidated && issues.length === 0 && (
                        <Card className="border-emerald-200 bg-emerald-50/50">
                            <CardContent className="pt-6 flex items-center gap-3">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-emerald-950">Guia 100% em conformidade</p>
                                    <p className="text-xs text-emerald-800">
                                        Nenhum erro bloqueante ou aviso impeditivo detectado. A guia está pronta para vinculação ao lote.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Erros Bloqueantes */}
                    {blockers.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4" />
                                Erros Bloqueantes ({blockers.length}) - Impedem Faturamento
                            </h4>
                            <div className="space-y-1.5">
                                {blockers.map((issue, idx) => (
                                    <div
                                        key={`err-${idx}`}
                                        className="p-3 rounded-md border border-destructive/30 bg-destructive/5 text-sm flex items-start justify-between gap-3"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-destructive border-destructive text-[10px]">
                                                    {issue.code}
                                                </Badge>
                                                {issue.field && (
                                                    <span className="text-xs font-mono font-medium text-muted-foreground">
                                                        campo: {issue.field}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 font-medium text-foreground">{issue.message}</p>
                                            {issue.suggested_value && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Sugestão: {issue.suggested_value}
                                                </p>
                                            )}
                                        </div>
                                        {onFixField && issue.field && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7 gap-1"
                                                onClick={() => {
                                                    onFixField(issue.field!);
                                                    onOpenChange(false);
                                                }}
                                            >
                                                <Wrench className="w-3 h-3" />
                                                Corrigir
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Avisos */}
                    {warnings.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" />
                                Avisos Administrativos ({warnings.length}) - Risco de Glosa
                            </h4>
                            <div className="space-y-1.5">
                                {warnings.map((issue, idx) => (
                                    <div
                                        key={`warn-${idx}`}
                                        className="p-3 rounded-md border border-amber-200 bg-amber-50/50 text-sm flex items-start justify-between gap-3"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-amber-800 border-amber-300 text-[10px]">
                                                    {issue.code}
                                                </Badge>
                                                {issue.field && (
                                                    <span className="text-xs font-mono font-medium text-muted-foreground">
                                                        campo: {issue.field}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 font-medium text-foreground">{issue.message}</p>
                                        </div>
                                        {onFixField && issue.field && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-7 gap-1"
                                                onClick={() => {
                                                    onFixField(issue.field!);
                                                    onOpenChange(false);
                                                }}
                                            >
                                                <Wrench className="w-3 h-3" />
                                                Verificar
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sugestões */}
                    {suggestions.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Info className="w-4 h-4" />
                                Sugestões de Preenchimento ({suggestions.length})
                            </h4>
                            <div className="space-y-1.5">
                                {suggestions.map((issue, idx) => (
                                    <div
                                        key={`sug-${idx}`}
                                        className="p-2.5 rounded-md border bg-muted/30 text-xs flex items-center justify-between"
                                    >
                                        <span>{issue.message}</span>
                                        <Badge variant="secondary" className="text-[10px]">
                                            Opcional
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
