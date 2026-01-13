// components/tiss/guide-list-table.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TissGuide } from '@/types/tiss';

interface GuideListTableProps {
    guides: TissGuide[];
    batchId: string;
}

export function GuideListTable({ guides, batchId }: GuideListTableProps) {
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
