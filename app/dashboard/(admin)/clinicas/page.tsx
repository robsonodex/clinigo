'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { api } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import { Plus, Search, Building2, ExternalLink, MoreHorizontal, ShieldAlert, ShieldCheck, Trash2, FileText, Copy, Download } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Clinic {
    id: string
    name: string
    slug: string
    email: string
    plan_type: 'BASICO' | 'AVANCADO' | 'PROFESSIONAL' | 'ENTERPRISE'
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

export default function ClinicsPage() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [planFilter, setPlanFilter] = useState<string>('all')
    const [statusFilter, setStatusFilter] = useState<string>('true')
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const [boletoModalOpen, setBoletoModalOpen] = useState(false)
    const [selectedClinicForBoleto, setSelectedClinicForBoleto] = useState<Clinic | null>(null)
    const [generatedBoleto, setGeneratedBoleto] = useState<any>(null)

    const { data: response, isLoading, error } = useQuery({
        queryKey: ['admin-clinics', page, search, planFilter, statusFilter],
        queryFn: () =>
            api.getFull<Clinic[]>('/clinics', {
                page: page.toString(),
                pageSize: '10',
                search: search || undefined,
                plan_type: planFilter !== 'all' ? planFilter : undefined,
                is_active: statusFilter !== 'all' ? statusFilter : undefined,
            }),
    })

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
            api.patch(`/clinics-detail?id=${id}`, { is_active }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-clinics'] })
            toast.success('Status da clínica atualizado')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao atualizar status')
        }
    })

    const bulkUpdateMutation = useMutation({
        mutationFn: ({ ids, is_active }: { ids: string[]; is_active: boolean }) =>
            api.patch('/admin/clinics/bulk', { ids, is_active }),
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['admin-clinics'] })
            setSelectedIds([])
            toast.success(data.message || 'Clínicas atualizadas com sucesso')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao atualizar clínicas')
        }
    })

    const bulkDeleteMutation = useMutation({
        mutationFn: (ids: string[]) =>
            api.delete('/admin/clinics/bulk', { ids }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-clinics'] })
            setSelectedIds([])
            toast.success('Clínicas removidas com sucesso')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao remover clínicas')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) =>
            api.delete(`/clinics-detail?id=${id}&hard=true`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-clinics'] })
            toast.success('Clínica excluída permanentemente')
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao remover clínica')
        }
    })

    const generateBoletoMutation = useMutation({
        mutationFn: async (clinic: Clinic) => {
            const res = await fetch('/api/billing/generate-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinic_id: clinic.id, plan_type: clinic.plan_type })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || data.details || 'Falha ao gerar boleto')
            return data
        },
        onSuccess: (data: any) => {
            if (data.success && data.boleto) {
                setGeneratedBoleto(data.boleto)
                toast.success('Boleto gerado! Abrindo PDF em nova aba...')
                // Auto open the PDF immediately
                window.open(`/api/billing/boleto-pdf?nossoNumero=${data.boleto.nosso_numero}`, '_blank')
            } else {
                toast.error(data.error || 'Erro ao gerar boleto')
            }
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao gerar boleto')
        }
    })

    const handleOpenBoletoModal = (clinic: Clinic) => {
        setSelectedClinicForBoleto(clinic)
        setGeneratedBoleto(null)
        setBoletoModalOpen(true)
    }

    const handleCopyLinha = () => {
        if (generatedBoleto?.linha_digitavel) {
            navigator.clipboard.writeText(generatedBoleto.linha_digitavel)
            toast.success('Linha digitável copiada!')
        }
    }

    const handleDownloadBoleto = () => {
        if (generatedBoleto?.nosso_numero) {
            window.open(`/api/billing/boleto-pdf?nossoNumero=${generatedBoleto.nosso_numero}`, '_blank')
        }
    }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
        setPage(1)
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === (response?.data?.length || 0)) {
            setSelectedIds([])
        } else {
            setSelectedIds(response?.data?.map(c => c.id) || [])
        }
    }

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const getPlanBadgeVariant = (plan: string) => {
        switch (plan) {
            case 'BASICO':
                return 'outline'
            case 'AVANCADO':
                return 'default'
            case 'PROFESSIONAL':
                return 'secondary'
            case 'ENTERPRISE':
                return 'destructive'
            default:
                return 'outline'
        }
    }

    const getPlanDisplayName = (plan: string) => {
        switch (plan) {
            case 'BASICO':
                return 'Básico'
            case 'AVANCADO':
                return 'Avançado'
            case 'PROFESSIONAL':
                return 'Professional'
            case 'ENTERPRISE':
                return 'Enterprise'
            default:
                return plan
        }
    }

    const clinics = response?.data || []

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clínicas</h1>
                    <p className="text-muted-foreground">
                        Gerencie todas as clínicas cadastradas na plataforma.
                    </p>
                </div>
                <Link href="/dashboard/clinicas/nova">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Clínica
                    </Button>
                </Link>
            </div>

            {selectedIds.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-3 flex items-center justify-between">
                        <span className="text-sm font-medium">
                            {selectedIds.length} selecionadas
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, is_active: true })}
                                disabled={bulkUpdateMutation.isPending}
                            >
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Reativar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => bulkUpdateMutation.mutate({ ids: selectedIds, is_active: false })}
                                disabled={bulkUpdateMutation.isPending}
                                className="text-destructive hover:bg-destructive/10"
                            >
                                <ShieldAlert className="h-4 w-4 mr-2" />
                                Bloquear
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                    if (confirm('Deseja realmente excluir as clínicas selecionadas?')) {
                                        bulkDeleteMutation.mutate(selectedIds)
                                    }
                                }}
                                disabled={bulkDeleteMutation.isPending}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Listagem</CardTitle>
                    <CardDescription>
                        Visualize e gerencie as contas das clínicas.
                    </CardDescription>
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, email ou slug..."
                                className="pl-8"
                                value={search}
                                onChange={handleSearch}
                            />
                        </div>
                        <Select
                            value={planFilter}
                            onValueChange={(value) => {
                                setPlanFilter(value)
                                setPage(1)
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filtrar por plano" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Planos</SelectItem>
                                <SelectItem value="BASICO">Básico</SelectItem>
                                <SelectItem value="AVANCADO">Avançado</SelectItem>
                                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            value={statusFilter}
                            onValueChange={(value) => {
                                setStatusFilter(value)
                                setPage(1)
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="true">Ativos</SelectItem>
                                <SelectItem value="false">Inativos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40px]">
                                        <Checkbox
                                            checked={clinics.length > 0 && selectedIds.length === clinics.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Clínica</TableHead>
                                    <TableHead>Plano</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Cadastro</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell />
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="space-y-1">
                                                        <Skeleton className="h-4 w-[150px]" />
                                                        <Skeleton className="h-3 w-[100px]" />
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-5 w-[60px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-5 w-[50px]" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-[100px]" />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Skeleton className="h-8 w-8 ml-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : error ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-24 text-center text-destructive"
                                        >
                                            {(error as Error).message || 'Erro ao carregar clínicas.'}
                                        </TableCell>
                                    </TableRow>
                                ) : clinics.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="h-24 text-center text-muted-foreground"
                                        >
                                            Nenhuma clínica encontrada.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    clinics.map((clinic) => (
                                        <TableRow key={clinic.id} className={selectedIds.includes(clinic.id) ? 'bg-muted/50' : ''}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(clinic.id)}
                                                    onCheckedChange={() => toggleSelect(clinic.id)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {clinic.logo_url ? (
                                                        <img
                                                            src={clinic.logo_url}
                                                            alt={`Logo ${clinic.name}`}
                                                            className="h-10 w-10 rounded-full object-cover"
                                                            onError={(e) => {
                                                                // Fallback to icon if image fails to load
                                                                e.currentTarget.style.display = 'none'
                                                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 ${clinic.logo_url ? 'hidden' : ''}`}>
                                                        <Building2 className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">
                                                            {clinic.name}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            /{clinic.slug}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={getPlanBadgeVariant(
                                                        clinic.plan_type
                                                    ) as any}
                                                >
                                                    {getPlanDisplayName(clinic.plan_type)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        clinic.is_active
                                                            ? 'success'
                                                            : 'destructive'
                                                    }
                                                >
                                                    {clinic.is_active ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {formatDate(clinic.created_at)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <span className="sr-only">
                                                                Abrir menu
                                                            </span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>
                                                            Ações
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            onClick={() => handleOpenBoletoModal(clinic)}
                                                        >
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            Gerar Boleto
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                window.open(
                                                                    `/${clinic.slug}`,
                                                                    '_blank'
                                                                )
                                                            }
                                                        >
                                                            <ExternalLink className="mr-2 h-4 w-4" />
                                                            Ver página pública
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                router.push(
                                                                    `/dashboard/clinicas/${clinic.id}`
                                                                )
                                                            }
                                                        >
                                                            Editar detalhes
                                                        </DropdownMenuItem>
                                                        {clinic.is_active ? (
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => updateStatusMutation.mutate({ id: clinic.id, is_active: false })}
                                                            >
                                                                <ShieldAlert className="mr-2 h-4 w-4" />
                                                                Bloquear acesso
                                                            </DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem
                                                                className="text-success"
                                                                onClick={() => updateStatusMutation.mutate({ id: clinic.id, is_active: true })}
                                                            >
                                                                <ShieldCheck className="mr-2 h-4 w-4" />
                                                                Reativar acesso
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => {
                                                                if (confirm(`Deseja realmente excluir a clínica ${clinic.name}?`)) {
                                                                    deleteMutation.mutate(clinic.id)
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Excluir Clínica
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
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
                                        Math.min(
                                            response?.pagination?.totalPages || 1,
                                            p + 1
                                        )
                                    )
                                }
                                disabled={page === (response?.pagination?.totalPages || 1)}
                            >
                                Próxima
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={boletoModalOpen} onOpenChange={setBoletoModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gerar Boleto - {selectedClinicForBoleto?.name}</DialogTitle>
                        <DialogDescription>
                            Gere um boleto avulso para esta clínica. A cobrança será baseada no plano atual: {selectedClinicForBoleto?.plan_type}.
                        </DialogDescription>
                    </DialogHeader>

                    {!generatedBoleto ? (
                        <div className="py-4">
                            <p className="text-sm text-muted-foreground mb-4">
                                Clique em "Gerar Boleto" para processar a cobrança via Banco Inter e obter a linha digitável e o PDF. O cliente também receberá uma notificação no painel de faturamento.
                            </p>
                        </div>
                    ) : (
                        <div className="py-4 space-y-4">
                            <div className="p-3 bg-muted/50 rounded-md border text-center">
                                <p className="text-sm font-medium mb-2">Linha Digitável:</p>
                                <p className="text-sm break-all font-mono bg-background p-2 rounded border">
                                    {generatedBoleto.linha_digitavel}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="w-full" onClick={handleCopyLinha}>
                                    <Copy className="h-4 w-4 mr-2" /> Copiar Linha
                                </Button>
                                <Button className="w-full" onClick={handleDownloadBoleto}>
                                    <Download className="h-4 w-4 mr-2" /> Baixar PDF
                                </Button>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {!generatedBoleto ? (
                            <Button 
                                onClick={() => selectedClinicForBoleto && generateBoletoMutation.mutate(selectedClinicForBoleto)} 
                                disabled={generateBoletoMutation.isPending}
                            >
                                {generateBoletoMutation.isPending ? 'Gerando...' : 'Gerar Boleto'}
                            </Button>
                        ) : (
                            <Button variant="secondary" onClick={() => setBoletoModalOpen(false)}>
                                Fechar
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
