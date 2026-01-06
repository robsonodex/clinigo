'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
    Key,
    Plus,
    Search,
    Copy,
    Eye,
    EyeOff,
    Trash2,
    MoreHorizontal,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Shield,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'

interface ApiKey {
    id: string
    name: string
    key_prefix: string
    permissions: string[]
    rate_limit: number
    last_used_at?: string
    expires_at?: string
    is_active: boolean
    created_at: string
}

export default function ApiKeysPage() {
    const { toast } = useToast()
    const [search, setSearch] = useState('')
    const [showNewDialog, setShowNewDialog] = useState(false)
    const [showKeyDialog, setShowKeyDialog] = useState(false)
    const [generatedKey, setGeneratedKey] = useState('')
    const [showKey, setShowKey] = useState(false)

    // Mock API keys
    const apiKeys: ApiKey[] = [
        {
            id: '1',
            name: 'Integração ERP',
            key_prefix: 'clg_live_xxxx',
            permissions: ['read', 'write'],
            rate_limit: 100,
            last_used_at: '2024-01-03T15:30:00',
            is_active: true,
            created_at: '2024-01-01',
        },
        {
            id: '2',
            name: 'Mobile App',
            key_prefix: 'clg_live_yyyy',
            permissions: ['read'],
            rate_limit: 60,
            last_used_at: '2024-01-03T14:00:00',
            is_active: true,
            created_at: '2024-01-10',
        },
        {
            id: '3',
            name: 'Teste Desenvolvimento',
            key_prefix: 'clg_test_zzzz',
            permissions: ['read', 'write', 'delete'],
            rate_limit: 30,
            expires_at: '2024-02-01',
            is_active: false,
            created_at: '2024-01-15',
        },
    ]

    const handleCreateKey = () => {
        // Generate a mock key
        const newKey = `clg_live_${Math.random().toString(36).substring(2, 15)}`
        setGeneratedKey(newKey)
        setShowNewDialog(false)
        setShowKeyDialog(true)
    }

    const copyKey = () => {
        navigator.clipboard.writeText(generatedKey)
        toast({
            title: 'Copiado!',
            description: 'Chave copiada para a área de transferência.',
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Key className="w-7 h-7" />
                        Chaves de API
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            Enterprise
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie chaves de acesso à API REST
                    </p>
                </div>
                <Button onClick={() => setShowNewDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Chave
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{apiKeys.length}</div>
                        <p className="text-sm text-muted-foreground">Total de chaves</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                            {apiKeys.filter((k) => k.is_active).length}
                        </div>
                        <p className="text-sm text-muted-foreground">Ativas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">12.5k</div>
                        <p className="text-sm text-muted-foreground">Requisições hoje</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-amber-600">0</div>
                        <p className="text-sm text-muted-foreground">Rate limits hit</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar chaves..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* API Keys Table */}
            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Chave</TableHead>
                                <TableHead>Permissões</TableHead>
                                <TableHead>Rate Limit</TableHead>
                                <TableHead>Último Uso</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {apiKeys.map((apiKey) => (
                                <TableRow key={apiKey.id}>
                                    <TableCell className="font-medium">{apiKey.name}</TableCell>
                                    <TableCell>
                                        <code className="text-sm bg-muted px-2 py-1 rounded">
                                            {apiKey.key_prefix}...
                                        </code>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {apiKey.permissions.map((perm) => (
                                                <Badge key={perm} variant="secondary" className="text-xs">
                                                    {perm}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>{apiKey.rate_limit}/min</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {apiKey.last_used_at
                                            ? new Date(apiKey.last_used_at).toLocaleString('pt-BR')
                                            : 'Nunca'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={apiKey.is_active ? 'success' : 'secondary'}>
                                            {apiKey.is_active ? (
                                                <>
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Ativa
                                                </>
                                            ) : (
                                                <>
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Inativa
                                                </>
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Ver detalhes
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copiar chave
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-red-600">
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Revogar
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-amber-900">Segurança</h4>
                            <p className="text-sm text-amber-800 mt-1">
                                As chaves de API são hash-adas e não podem ser recuperadas após a criação.
                                Nunca compartilhe suas chaves publicamente ou em repositórios de código.
                                Todas as requisições são logadas para auditoria.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* New Key Dialog */}
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Criar Nova Chave de API</DialogTitle>
                        <DialogDescription>
                            Configure as permissões e limites da nova chave
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome da Chave</Label>
                            <Input placeholder="Ex: Integração ERP" />
                        </div>
                        <div className="space-y-2">
                            <Label>Permissões</Label>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Checkbox id="read" defaultChecked />
                                    <Label htmlFor="read" className="font-normal">Leitura (read)</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox id="write" />
                                    <Label htmlFor="write" className="font-normal">Escrita (write)</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox id="delete" />
                                    <Label htmlFor="delete" className="font-normal">Exclusão (delete)</Label>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Rate Limit (req/minuto)</Label>
                            <Input type="number" defaultValue={60} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCreateKey}>Criar Chave</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Show Generated Key Dialog */}
            <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Chave Criada com Sucesso!</DialogTitle>
                        <DialogDescription>
                            Copie a chave abaixo. Ela não será exibida novamente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center justify-between">
                                <code className="text-sm break-all">
                                    {showKey ? generatedKey : '•'.repeat(40)}
                                </code>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => setShowKey(!showKey)}>
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={copyKey}>
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-red-50 rounded-lg">
                            <p className="text-sm text-red-800 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Esta chave não poderá ser visualizada novamente. Guarde-a em local seguro.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => {
                            setShowKeyDialog(false)
                            toast({ title: 'Chave criada com sucesso!' })
                        }}>
                            Entendi, fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
