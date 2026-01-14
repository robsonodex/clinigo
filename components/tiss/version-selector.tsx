/**
 * TISS Version Selector Component
 * 
 * Allows users to select which TISS version to use for a specific insurance provider.
 * Displays transition information and key differences between versions.
 * 
 * Used in:
 * - Insurance configuration pages
 * - Batch generation dialogs
 * - Clinic settings
 */

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Info, AlertCircle, CheckCircle2, Calendar, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import type { TissVersion } from '@/lib/types/tiss-versions';
import { TISS_TRANSITION_DATE, getRecommendedVersion } from '@/lib/types/tiss-versions';

// ============================================================================
// Type Definitions
// ============================================================================

export interface TissVersionSelectorProps {
    /** Currently selected TISS version */
    currentVersion: TissVersion;

    /** Insurance provider name (for display) */
    insuranceName: string;

    /** Callback when user changes version */
    onVersionChange: (version: TissVersion) => void;

    /** Whether the selector is in a loading state */
    isLoading?: boolean;

    /** Whether to show detailed differences */
    showDetails?: boolean;

    /** Custom class name */
    className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function TissVersionSelector({
    currentVersion,
    insuranceName,
    onVersionChange,
    isLoading = false,
    showDetails = true,
    className,
}: TissVersionSelectorProps) {
    const [selectedVersion, setSelectedVersion] = useState<TissVersion>(currentVersion);

    const currentDate = new Date();
    const isAfterTransition = currentDate >= TISS_TRANSITION_DATE;
    const recommendedVersion = getRecommendedVersion();

    const daysUntilTransition = Math.ceil(
        (TISS_TRANSITION_DATE.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    /**
     * Handle version change with validation
     */
    const handleVersionChange = (value: string) => {
        const version = value as TissVersion;
        setSelectedVersion(version);
        onVersionChange(version);
    };

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5 text-blue-500" />
                            Versão TISS - {insuranceName}
                        </CardTitle>
                        <CardDescription>
                            Selecione a versão do padrão TISS para geração de arquivos XML
                        </CardDescription>
                    </div>
                    {selectedVersion === recommendedVersion && (
                        <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Recomendado
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="space-y-5">

                {/* Transition Alert */}
                {!isAfterTransition && daysUntilTransition <= 365 && (
                    <Alert>
                        <Calendar className="h-4 w-4" />
                        <AlertDescription>
                            {daysUntilTransition > 0 ? (
                                <>
                                    A versão <strong>TISS 4.02.00</strong> será obrigatória a partir de{' '}
                                    <strong>01/12/2025</strong> (em {daysUntilTransition} dias).
                                    Atualmente, use <strong>4.01.00</strong> para garantir aceitação.
                                </>
                            ) : (
                                <>
                                    A <strong>transição para TISS 4.02.00</strong> já ocorreu.
                                    Recomendamos atualizar para a nova versão.
                                </>
                            )}
                        </AlertDescription>
                    </Alert>
                )}

                {isAfterTransition && selectedVersion === '4.01.00' && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Atenção:</strong> A versão 4.01.00 está obsoleta desde 01/12/2025.
                            Operadoras podem rejeitar arquivos neste formato.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Version Radio Group */}
                <RadioGroup
                    value={selectedVersion}
                    onValueChange={handleVersionChange}
                    disabled={isLoading}
                >

                    {/* Option: TISS 4.01.00 */}
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="4.01.00" id="v4.01" className="mt-1" />
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="v4.01" className="flex items-center gap-2 cursor-pointer font-semibold">
                                TISS 4.01.00
                                {!isAfterTransition && (
                                    <Badge variant="default" className="ml-1">Atual</Badge>
                                )}
                                {isAfterTransition && (
                                    <Badge variant="outline" className="ml-1">Legado</Badge>
                                )}
                            </Label>

                            <p className="text-sm text-muted-foreground">
                                Versão vigente até <strong>30/11/2025</strong>. Inclui nome completo do beneficiário
                                e códigos TUSS de 8 dígitos.
                            </p>

                            {showDetails && (
                                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Nome completo do paciente
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Códigos TUSS: 8 dígitos
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Namespace: v4_01_00
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Option: TISS 4.02.00 */}
                    <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="4.02.00" id="v4.02" className="mt-1" />
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="v4.02" className="flex items-center gap-2 cursor-pointer font-semibold">
                                TISS 4.02.00
                                {isAfterTransition && (
                                    <Badge variant="default" className="ml-1">Obrigatória</Badge>
                                )}
                                {!isAfterTransition && (
                                    <Badge variant="secondary" className="ml-1">Preview</Badge>
                                )}
                                <Badge variant="outline" className="ml-1 gap-1">
                                    <Shield className="h-3 w-3" />
                                    LGPD
                                </Badge>
                            </Label>

                            <p className="text-sm text-muted-foreground">
                                Versão obrigatória a partir de <strong>01/12/2025</strong>. Conformidade LGPD
                                com apenas iniciais do beneficiário e códigos TUSS expandidos.
                            </p>

                            {showDetails && (
                                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        <span className="text-green-700 dark:text-green-400">
                                            Apenas iniciais do paciente (ex: J.S.)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        <span className="text-green-700 dark:text-green-400">
                                            Códigos TUSS: 10 dígitos
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        <span className="text-green-700 dark:text-green-400">
                                            Conformidade LGPD obrigatória
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </RadioGroup>

                {/* Key Differences Summary */}
                {showDetails && (
                    <>
                        <Separator />

                        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                                <Info className="h-4 w-4" />
                                Principais Diferenças entre Versões
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {/* Privacy Difference */}
                                <div className="space-y-1">
                                    <div className="font-medium text-muted-foreground">
                                        👤 Privacidade do Paciente
                                    </div>
                                    <div className="text-muted-foreground">
                                        <strong>4.01.00:</strong> Nome completo<br />
                                        <strong>4.02.00:</strong> Apenas iniciais (LGPD)
                                    </div>
                                </div>

                                {/* TUSS Code Difference */}
                                <div className="space-y-1">
                                    <div className="font-medium text-muted-foreground">
                                        🔢 Códigos TUSS
                                    </div>
                                    <div className="text-muted-foreground">
                                        <strong>4.01.00:</strong> 8 dígitos<br />
                                        <strong>4.02.00:</strong> 10 dígitos (expandido)
                                    </div>
                                </div>

                                {/* Validation Difference */}
                                <div className="space-y-1">
                                    <div className="font-medium text-muted-foreground">
                                        ✓ Validações
                                    </div>
                                    <div className="text-muted-foreground">
                                        <strong>4.01.00:</strong> 10 regras básicas<br />
                                        <strong>4.02.00:</strong> 14 regras + LGPD
                                    </div>
                                </div>

                                {/* Namespace Difference */}
                                <div className="space-y-1">
                                    <div className="font-medium text-muted-foreground">
                                        📦 XML Schema
                                    </div>
                                    <div className="text-muted-foreground">
                                        <strong>4.01.00:</strong> v4_01_00<br />
                                        <strong>4.02.00:</strong> v4_02_00 (novo)
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                        Processando alteração...
                    </div>
                )}

            </CardContent>
        </Card>
    );
}

// ============================================================================
// Compact Variant (for dialogs)
// ============================================================================

export interface TissVersionSelectorCompactProps {
    currentVersion: TissVersion;
    onVersionChange: (version: TissVersion) => void;
    disabled?: boolean;
}

export function TissVersionSelectorCompact({
    currentVersion,
    onVersionChange,
    disabled = false,
}: TissVersionSelectorCompactProps) {
    return (
        <div className="space-y-3">
            <Label className="text-sm font-medium">Versão TISS</Label>

            <RadioGroup
                value={currentVersion}
                onValueChange={(v) => onVersionChange(v as TissVersion)}
                disabled={disabled}
                className="grid grid-cols-2 gap-3"
            >
                <Label
                    htmlFor="compact-v4.01"
                    className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent/50"
                >
                    <RadioGroupItem value="4.01.00" id="compact-v4.01" />
                    <div className="flex-1">
                        <div className="font-medium">4.01.00</div>
                        <div className="text-xs text-muted-foreground">Nome completo</div>
                    </div>
                </Label>

                <Label
                    htmlFor="compact-v4.02"
                    className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-accent/50"
                >
                    <RadioGroupItem value="4.02.00" id="compact-v4.02" />
                    <div className="flex-1">
                        <div className="font-medium">4.02.00</div>
                        <div className="text-xs text-muted-foreground">LGPD</div>
                    </div>
                </Label>
            </RadioGroup>
        </div>
    );
}
