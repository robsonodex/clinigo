/**
 * Responsive Table Component
 * Table on desktop, stacked cards on mobile
 */
'use client'

import * as React from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Card } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

export interface Column<T> {
    key: keyof T
    header: string
    render?: (value: any, row: T) => React.ReactNode
}

interface ResponsiveTableProps<T> {
    data: T[]
    columns: Column<T>[]
    getRowKey: (row: T) => string | number
    onRowClick?: (row: T) => void
    className?: string
}

export function ResponsiveTable<T extends Record<string, any>>({
    data,
    columns,
    getRowKey,
    onRowClick,
    className,
}: ResponsiveTableProps<T>) {
    const isMobile = useMediaQuery('(max-width: 767px)')

    if (isMobile) {
        return (
            <div className={`space-y-2 ${className || ''}`}>
                {data.map((row) => (
                    <Card
                        key={getRowKey(row)}
                        className={`p-4 ${onRowClick ? 'cursor-pointer hover:bg-accent' : ''}`}
                        onClick={() => onRowClick?.(row)}
                    >
                        {columns.map((col) => (
                            <div key={String(col.key)} className="flex justify-between mb-2 last:mb-0">
                                <span className="font-medium text-sm text-muted-foreground">
                                    {col.header}
                                </span>
                                <span className="text-sm text-right">
                                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                                </span>
                            </div>
                        ))}
                    </Card>
                ))}
                {data.length === 0 && (
                    <Card className="p-8 text-center text-muted-foreground">
                        Nenhum item encontrado
                    </Card>
                )}
            </div>
        )
    }

    return (
        <Table className={className}>
            <TableHeader>
                <TableRow>
                    {columns.map((col) => (
                        <TableHead key={String(col.key)}>{col.header}</TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((row) => (
                    <TableRow
                        key={getRowKey(row)}
                        className={onRowClick ? 'cursor-pointer' : ''}
                        onClick={() => onRowClick?.(row)}
                    >
                        {columns.map((col) => (
                            <TableCell key={String(col.key)}>
                                {col.render ? col.render(row[col.key], row) : row[col.key]}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
                {data.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                            Nenhum item encontrado
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}
