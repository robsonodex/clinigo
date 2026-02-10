'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api-client'
import { PLANS } from '@/lib/constants/plans'
import type { PlanType } from '@/lib/constants/plans'

interface Clinic {
    id: string
    name: string
    slug: string
    email: string
    plan_type: PlanType
    is_active: boolean
    created_at: string
    logo_url?: string | null
}

interface ClinicsResponse {
    data: Clinic[]
    pagination: {
        total: number
        page: number
        limit: number
        totalPages: number
    }
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase()
}

function getPlanDisplayName(planType: PlanType): string {
    return PLANS[planType]?.name?.replace('CliniGo ', '') || planType
}

function getPlanPrice(planType: PlanType): number {
    return PLANS[planType]?.price || 0
}

export function BillingTable() {
    const [page, setPage] = useState(1)

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['admin-billing-clinics', page],
        queryFn: () =>
            api.getFull<Clinic[]>('/clinics', {
                page: page.toString(),
                pageSize: '20',
                is_active: 'all',
            }),
    })

    const clinics = response?.data || []

    if (isLoading) {
        return (
            <div className="rounded-md border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="w-[300px]">Clínica</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Cadastro</TableHead>
                            <TableHead className="text-right">Valor Mensal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-9 w-9 rounded-full" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-4 w-[150px]" />
                                            <Skeleton className="h-3 w-[100px]" />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-[90px]" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-4 w-[70px] ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-md border bg-white shadow-sm p-8 text-center text-destructive">
                {(error as Error).message || 'Erro ao carregar clínicas.'}
            </div>
        )
    }

    if (clinics.length === 0) {
        return (
            <div className="rounded-md border bg-white shadow-sm p-8 text-center text-muted-foreground">
                Nenhuma clínica cadastrada ainda.
            </div>
        )
    }

    return (
        <>
            <div className="rounded-md border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                            <TableHead className="w-[300px]">Clínica</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Cadastro</TableHead>
                            <TableHead className="text-right">Valor Mensal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clinics.map((clinic) => (
                            <TableRow key={clinic.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border">
                                            {clinic.logo_url ? (
                                                <AvatarImage src={clinic.logo_url} />
                                            ) : null}
                                            <AvatarFallback className="bg-slate-100 font-bold text-slate-700">
                                                {getInitials(clinic.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900 leading-tight">
                                                {clinic.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                /{clinic.slug}
                                            </span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="font-normal text-slate-600">
                                        {getPlanDisplayName(clinic.plan_type)}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge
                                        className={cn(
                                            "shadow-none",
                                            clinic.is_active
                                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                                                : "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
                                        )}
                                        variant="secondary"
                                    >
                                        {clinic.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-slate-600 tabular-nums">
                                    {new Date(clinic.created_at).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell className="text-right font-medium text-slate-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getPlanPrice(clinic.plan_type))}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {response?.pagination && response.pagination.totalPages > 1 && (
                <div className="flex justify-end gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        Anterior
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            setPage((p) =>
                                Math.min(response?.pagination?.totalPages || 1, p + 1)
                            )
                        }
                        disabled={page === (response?.pagination?.totalPages || 1)}
                    >
                        Próxima
                    </Button>
                </div>
            )}
        </>
    )
}
