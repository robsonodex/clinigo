'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { api } from '@/lib/api-client'
import { formatDate, formatCPF, formatPhone } from '@/lib/utils'
import {
    UserPlus,
    Search,
    Phone,
    Mail,
    Calendar,
    MoreHorizontal,
    FileText,
    MessageCircle,
    History,
    User,
    Download,
    Trash2,
    Eye,
    AlertTriangle,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Patient {
    id: string
    cpf: string
    full_name: string
    email: string
    phone: string
    date_of_birth?: string
    gender?: string
    created_at: string
    appointments_count?: number
    last_appointment_date?: string
}

export default function PacientesPage() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)

    // Fetch patients
    const { data: patients, isLoading } = useQuery({
        queryKey: ['patients', search],
        queryFn: async () => {
            // In a real app, this would be an API call with search parameter
            const response = await fetch(`/api/patients?search=${encodeURIComponent(search)}`)
            if (!response.ok) {
                if (response.status === 404) return []
                throw new Error('Failed to fetch patients')
            }
            return response.json()
        },
    })

    // Delete mutation (LGPD - soft delete)
    const deleteMutation = useMutation({
        mutationFn: async (patientId: string) => {
            const response = await fetch(`/api/patients/${patientId}`, {
                method: 'DELETE',
            })
            if (!response.ok) throw new Error('Failed to delete patient')
            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['patients'] })
            toast({
                title: 'Paciente removido',
                description: 'Os dados foram anonimizados conforme LGPD.',
            })
            setShowDeleteDialog(false)
            setSelectedPatient(null)
        },
        onError: () => {
            toast({
                title: 'Erro',
                description: 'Não foi possível remover o paciente.',
                variant: 'destructive',
            })
        },
    })

    // Open WhatsApp
    const openWhatsApp = (phone: string, name: string) => {
        const cleanPhone = phone.replace(/\D/g, '')
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`
        const message = `Olá ${name.split(' ')[0]}! Aqui é da clínica.`
        window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <UserPlus className="w-7 h-7" />
                        Pacientes
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie os pacientes da sua clínica
                    </p>
                </div>
                <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{patients?.length || 0}</div>
                        <p className="text-sm text-muted-foreground">Total de pacientes</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-sm text-muted-foreground">Novos este mês</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-sm text-muted-foreground">Consultas agendadas</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">-</div>
                        <p className="text-sm text-muted-foreground">Taxa de retorno</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, CPF ou telefone..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Carregando...
                        </div>
                    ) : patients && patients.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>CPF</TableHead>
                                    <TableHead>Contato</TableHead>
                                    <TableHead>Cadastro</TableHead>
                                    <TableHead>Última Consulta</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {patients.map((patient: Patient) => (
                                    <TableRow key={patient.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{patient.full_name}</p>
                                                    {patient.gender && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {patient.gender === 'M' ? 'Masculino' : 'Feminino'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-sm">{formatCPF(patient.cpf)}</code>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Phone className="w-3 h-3" />
                                                    {formatPhone(patient.phone)}
                                                </div>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Mail className="w-3 h-3" />
                                                    {patient.email}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(patient.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            {patient.last_appointment_date
                                                ? formatDate(patient.last_appointment_date)
                                                : '-'}
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
                                                        <FileText className="w-4 h-4 mr-2" />
                                                        Prontuários
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <History className="w-4 h-4 mr-2" />
                                                        Histórico
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => openWhatsApp(patient.phone, patient.full_name)}
                                                    >
                                                        <MessageCircle className="w-4 h-4 mr-2 text-green-600" />
                                                        WhatsApp
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => window.open(`mailto:${patient.email}`)}
                                                    >
                                                        <Mail className="w-4 h-4 mr-2" />
                                                        Enviar email
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600"
                                                        onClick={() => {
                                                            setSelectedPatient(patient)
                                                            setShowDeleteDialog(true)
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Excluir (LGPD)
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">Nenhum paciente encontrado</p>
                            <p className="text-sm">Os pacientes aparecem aqui após agendarem consultas.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* LGPD Info */}
            <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-amber-900">Conformidade LGPD</h4>
                            <p className="text-sm text-amber-800 mt-1">
                                Os dados dos pacientes são protegidos conforme a Lei Geral de Proteção de Dados.
                                A exclusão de pacientes realiza um <strong>soft delete</strong> que anonimiza os dados
                                mas preserva o histórico de consultas para fins de auditoria médica.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Paciente (LGPD)</DialogTitle>
                        <DialogDescription>
                            Esta ação irá anonimizar os dados do paciente conforme a LGPD.
                            O histórico de consultas será mantido, mas os dados pessoais serão removidos.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPatient && (
                        <div className="py-4">
                            <div className="p-4 bg-red-50 rounded-lg">
                                <p className="font-medium text-red-900">{selectedPatient.full_name}</p>
                                <p className="text-sm text-red-700">{selectedPatient.email}</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedPatient && deleteMutation.mutate(selectedPatient.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Dados'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
