'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FieldMappingTableProps {
    sourceValues: string[];
    targetOptions: Array<{ id: string; name: string }>;
    entityType: string;
    onMappingComplete: (mapping: Record<string, string>) => void;
}

export function FieldMappingTable({ sourceValues, targetOptions, entityType, onMappingComplete }: FieldMappingTableProps) {
    const [mapping, setMapping] = useState<Record<string, string>>({});

    const handleMapField = (sourceValue: string, targetId: string) => {
        setMapping(prev => ({ ...prev, [sourceValue]: targetId }));
    };

    return (
        <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
                Valores não encontrados no sistema. Por favor, faça a correspondência:
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Valor no Arquivo</TableHead>
                            <TableHead>Corresponde a...</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sourceValues.map(sourceValue => (
                            <TableRow key={sourceValue}>
                                <TableCell className="font-medium">{sourceValue}</TableCell>
                                <TableCell>
                                    <Select onValueChange={(value) => handleMapField(sourceValue, value)}>
                                        <SelectTrigger className="w-[300px]">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {targetOptions.map(option => (
                                                <SelectItem key={option.id} value={option.id}>
                                                    {option.name}
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="__CREATE_NEW__">
                                                + Criar novo (Automático)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-end">
                <Button
                    onClick={() => onMappingComplete(mapping)}
                // disabled={Object.keys(mapping).length !== sourceValues.length} // Optional constraint
                >
                    Confirmar Mapeamento e Continuar
                </Button>
            </div>
        </div>
    );
}
