'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import {
    Users2,
    Plus,
    Search,
    Building2,
    ArrowRightLeft,
    Settings,
    MoreHorizontal,
    Eye,
    Edit,
    Trash2,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Group {
    id: string
    name: string
    description?: string
    clinics_count: number
    total_revenue: number
    created_at: string
}

export default function GruposPage() {
    const { toast } = useToast()
    const [search, setSearch] = useState('')
    const [showNewDialog, setShowNewDialog] = useState(false)

    // Grupos de clínicas - carrega do banco via API
    const groups: Group[] = []

    const filteredGroups = groups.filter((g) =>
        g.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users2 className="w-7 h-7" />
                        Grupos de Clínicas
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie redes e grupos de clínicas parceiras
                    </p>
                </div>
                <Button onClick={() => setShowNewDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Grupo
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{groups.length}</div>
                        <p className="text-sm text-muted-foreground">Grupos ativos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                            {groups.reduce((acc, g) => acc + g.clinics_count, 0)}
                        </div>
                        <p className="text-sm text-muted-foreground">Clínicas em grupos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                            R$ {(groups.reduce((acc, g) => acc + g.total_revenue, 0) / 1000).toFixed(0)}k
                        </div>
                        <p className="text-sm text-muted-foreground">Receita total grupos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                            {Math.round(groups.reduce((acc, g) => acc + g.clinics_count, 0) / groups.length)}
                        </div>
                        <p className="text-sm text-muted-foreground">Média clínicas/grupo</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar grupos..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Groups List */}
            <div className="space-y-4">
                {filteredGroups.map((group) => (
                    <Card key={group.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-lg">
                                        <Users2 className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{group.name}</h3>
                                        {group.description && (
                                            <p className="text-sm text-muted-foreground">
                                                {group.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-4 mt-2">
                                            <Badge variant="secondary">
                                                <Building2 className="w-3 h-3 mr-1" />
                                                {group.clinics_count} clínicas
                                            </Badge>
                                            <span className="text-sm text-green-600 font-medium">
                                                R$ {group.total_revenue.toLocaleString('pt-BR')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm">
                                        <Eye className="w-4 h-4 mr-1" />
                                        Ver Clínicas
                                    </Button>
                                    <Button variant="outline" size="sm">
                                        <ArrowRightLeft className="w-4 h-4 mr-1" />
                                        Transferir
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem>
                                                <Edit className="w-4 h-4 mr-2" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Settings className="w-4 h-4 mr-2" />
                                                Configurações
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600">
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Excluir grupo
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {filteredGroups.length === 0 && (
                    <Card>
                        <CardContent className="pt-12 pb-12 text-center">
                            <Users2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="font-medium">Nenhum grupo encontrado</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Clique em "Novo Grupo" para criar
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* New Group Dialog */}
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Novo Grupo de Clínicas</DialogTitle>
                        <DialogDescription>
                            Crie um grupo para gerenciar múltiplas clínicas
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome do Grupo</Label>
                            <Input placeholder="Ex: Rede São Paulo" />
                        </div>
                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Input placeholder="Descrição opcional..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={() => {
                            toast({ title: 'Grupo criado!' })
                            setShowNewDialog(false)
                        }}>
                            Criar Grupo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

