'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface PageSkeletonProps {
    /** Page title skeleton width */
    titleWidth?: string
    /** Layout variant */
    variant?: 'table' | 'cards' | 'form' | 'calendar' | 'detail'
    /** Number of rows/cards to show */
    rows?: number
    /** Show stats bar */
    showStats?: boolean
    /** Show filter/search bar */
    showFilters?: boolean
}

function StatsBar() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardContent className="p-4">
                        <Skeleton className="h-3 w-20 mb-2" />
                        <Skeleton className="h-7 w-16" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function FilterBar() {
    return (
        <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 flex-1 max-w-sm" />
            <div className="flex gap-2">
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-28" />
                <Skeleton className="h-10 w-10" />
            </div>
        </div>
    )
}

function TableSkeleton({ rows = 8 }: { rows: number }) {
    return (
        <Card>
            <CardContent className="p-0">
                <div className="border-b px-4 py-3 flex gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-4 flex-1" />
                    ))}
                </div>
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="border-b last:border-0 px-4 py-3 flex gap-4 items-center">
                        <Skeleton className="h-4 w-4 rounded" />
                        {Array.from({ length: 4 }).map((_, j) => (
                            <Skeleton key={j} className="h-4 flex-1" />
                        ))}
                        <Skeleton className="h-8 w-8" />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

function CardsSkeleton({ rows = 6 }: { rows: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: rows }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="flex gap-2 pt-2">
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function FormSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
                <Skeleton className="h-32 w-full" />
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </CardContent>
        </Card>
    )
}

function CalendarSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-10 w-10" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <Skeleton key={i} className="h-4 w-full" />
                        ))}
                    </div>
                    <div className="space-y-1">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <Skeleton className="h-4 w-12 shrink-0" />
                                <Skeleton className="h-12 flex-1 rounded" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function DetailSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-5 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex justify-between">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-40" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-4 space-y-3">
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default function PageSkeleton({
    titleWidth = 'w-48',
    variant = 'table',
    rows = 8,
    showStats = false,
    showFilters = true,
}: PageSkeletonProps) {
    return (
        <div className="space-y-6 p-4 md:p-6 animate-pulse">
            {/* Page header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <Skeleton className={`h-8 ${titleWidth}`} />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-36" />
            </div>

            {showStats && <StatsBar />}
            {showFilters && <FilterBar />}

            {variant === 'table' && <TableSkeleton rows={rows} />}
            {variant === 'cards' && <CardsSkeleton rows={rows} />}
            {variant === 'form' && <FormSkeleton />}
            {variant === 'calendar' && <CalendarSkeleton />}
            {variant === 'detail' && <DetailSkeleton />}
        </div>
    )
}
