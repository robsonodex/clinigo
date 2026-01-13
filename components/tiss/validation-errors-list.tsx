// components/tiss/validation-errors-list.tsx
'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TissValidationError } from '@/types/tiss';

interface ValidationErrorsListProps {
    errors: TissValidationError[];
    batchId: string;
}

export function ValidationErrorsList({ errors, batchId }: ValidationErrorsListProps) {
    const errorCount = errors.filter(e => e.severity === 'ERROR').length;
    const warningCount = errors.filter(e => e.severity === 'WARNING').length;

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">
                        Erros de Validação ({errors.length})
                    </h3>
                    <div className="flex gap-2">
                        {errorCount > 0 && (
                            <Badge variant="destructive">{errorCount} erros</Badge>
                        )}
                        {warningCount > 0 && (
                            <Badge variant="default">{warningCount} avisos</Badge>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    {errors.map((error) => (
                        <div
                            key={error.id}
                            className={`flex gap-3 p-3 rounded-lg border ${error.severity === 'ERROR'
                                    ? 'border-destructive bg-destructive/5'
                                    : 'border-yellow-500 bg-yellow-50'
                                }`}
                        >
                            {error.severity === 'ERROR' ? (
                                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            )}

                            <div className="flex-1">
                                <div className="font-medium text-sm">
                                    {error.error_message}
                                </div>

                                {error.error_field && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Campo: <code className="bg-muted px-1 py-0.5 rounded">{error.error_field}</code>
                                    </div>
                                )}

                                {error.suggested_value && (
                                    <div className="text-xs mt-2 text-green-700">
                                        Sugestão: {error.suggested_value}
                                    </div>
                                )}
                            </div>

                            <Badge variant="outline" className="h-fit">
                                {error.error_code}
                            </Badge>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
