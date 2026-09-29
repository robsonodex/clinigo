'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
    headers?: string[];
}

export function TableSkeleton({ rows = 5, columns = 5, headers }: TableSkeletonProps) {
    const colCount = headers?.length || columns;

    return (
        <div className="rounded-md border border-border bg-card">
            <Table>
                {headers && (
                    <TableHeader>
                        <TableRow>
                            {headers.map((h, i) => (
                                <TableHead key={i}>{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                )}
                <TableBody>
                    {[...Array(rows)].map((_, rIdx) => (
                        <TableRow key={rIdx}>
                            {[...Array(colCount)].map((_, cIdx) => (
                                <TableCell key={cIdx} className="py-3">
                                    <Skeleton className={`h-4 ${cIdx === 0 ? 'w-24' : cIdx === 1 ? 'w-48' : 'w-20'}`} />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
