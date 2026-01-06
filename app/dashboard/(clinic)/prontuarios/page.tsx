'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import {
    FileText,
    Search,
    Plus,
    Calendar,
    User,
    Clock,
    Download,
    Eye,
    Edit,
    Lock,
    Stethoscope,
    ClipboardList,
    Pill,
    FileCheck,
    AlertTriangle,
    History,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface MedicalRecord {
    id: string
    patient_name: string
    doctor_name: string
    specialty: string
    date: string
    chief_complaint?: string
    is_signed: boolean
    created_at: string
}

export default function ProntuariosPage() {
    const { toast } = useToast()
    const [search, setSearch] = useState('')

    // Mock data for demonstration
    const records: MedicalRecord[] = [
        {
            id: '1',
            patient_name: 'Maria Silva',
            doctor_name: 'Dr. João Santos',
            specialty: 'Clínica Geral',
            date: '2024-01-03',
            chief_complaint: 'Dor de cabeça persistente há 3 dias',
            is_signed: true,
            created_at: '2024-01-03T15:30:00',
        },
        {
            id: '2',
            patient_name: 'Carlos Oliveira',
            doctor_name: 'Dra. Ana Costa',
            specialty: 'Cardiologia',
            date: '2024-01-02',
            chief_complaint: 'Check-up cardiológico de rotina',
            is_signed: true,
            created_at: '2024-01-02T10:00:00',
        },
        {
            id: '3',
            patient_name: 'Fernanda Lima',
            doctor_name: 'Dr. João Santos',
            specialty: 'Clínica Geral',
            date: '2024-01-02',
            chief_complaint: 'Acompanhamento pós-tratamento',
            is_signed: false,
            created_at: '2024-01-02T14:00:00',
        },
    ]

    const filteredRecords = records.filter(
        (r) =>
            r.patient_name.toLowerCase().includes(search.toLowerCase()) ||
            r.doctor_name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="w-7 h-7" />
                        Prontuários Eletrônicos
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            PRO
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground">
                        Prontuário eletrônico completo e seguro
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{records.length}</div>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <FileCheck className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">
                                    {records.filter((r) => r.is_signed).length}
                                </div>
                                <p className="text-xs text-muted-foreground">Assinados</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Clock className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-amber-600">
                                    {records.filter((r) => !r.is_signed).length}
                                </div>
                                <p className="text-xs text-muted-foreground">Pendentes</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Pill className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">45</div>
                                <p className="text-xs text-muted-foreground">Prescrições</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <ClipboardList className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">12</div>
                                <p className="text-xs text-muted-foreground">Atestados</p>
                            </div>
                        </div>
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
                                placeholder="Buscar por paciente ou médico..."
                                className="pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Button variant="outline">
                            <Calendar className="w-4 h-4 mr-2" />
                            Filtrar por data
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Records List */}
            <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="pending">
                        Pendentes de Assinatura
                    </TabsTrigger>
                    <TabsTrigger value="signed">Assinados</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                    {filteredRecords.length > 0 ? (
                        filteredRecords.map((record) => (
                            <Card key={record.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-primary/10 rounded-full">
                                                <User className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{record.patient_name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {record.doctor_name} • {record.specialty}
                                                </p>
                                                {record.chief_complaint && (
                                                    <p className="text-sm mt-1">
                                                        <span className="text-muted-foreground">Queixa: </span>
                                                        {record.chief_complaint}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right mr-4">
                                                <p className="text-sm font-medium">
                                                    {formatDate(record.date)}
                                                </p>
                                                <Badge
                                                    variant={record.is_signed ? 'success' : 'warning'}
                                                    className="mt-1"
                                                >
                                                    {record.is_signed ? (
                                                        <>
                                                            <Lock className="w-3 h-3 mr-1" />
                                                            Assinado
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            Pendente
                                                        </>
                                                    )}
                                                </Badge>
                                            </div>
                                            <Button variant="outline" size="sm">
                                                <Eye className="w-4 h-4 mr-1" />
                                                Ver
                                            </Button>
                                            {!record.is_signed && (
                                                <Button variant="outline" size="sm">
                                                    <Edit className="w-4 h-4 mr-1" />
                                                    Editar
                                                </Button>
                                            )}
                                            <Button variant="outline" size="sm">
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card>
                            <CardContent className="pt-12 pb-12 text-center">
                                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="font-medium">Nenhum prontuário encontrado</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Os prontuários serão criados automaticamente após as consultas
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="pending" className="space-y-4">
                    {filteredRecords.filter((r) => !r.is_signed).map((record) => (
                        <Card key={record.id} className="hover:shadow-md transition-shadow border-amber-200">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-amber-100 rounded-full">
                                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{record.patient_name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {record.doctor_name} • {record.specialty}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button size="sm">
                                            <Edit className="w-4 h-4 mr-1" />
                                            Completar e Assinar
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                <TabsContent value="signed" className="space-y-4">
                    {filteredRecords.filter((r) => r.is_signed).map((record) => (
                        <Card key={record.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-green-100 rounded-full">
                                            <FileCheck className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{record.patient_name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {record.doctor_name} • {record.specialty}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm">{formatDate(record.date)}</p>
                                        <Badge variant="success">
                                            <Lock className="w-3 h-3 mr-1" />
                                            Assinado
                                        </Badge>
                                        <Button variant="outline" size="sm">
                                            <Eye className="w-4 h-4 mr-1" />
                                            Ver
                                        </Button>
                                        <Button variant="outline" size="sm">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>
            </Tabs>

            {/* Security Notice */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                        <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-medium text-blue-900">Segurança e Conformidade</h4>
                            <p className="text-sm text-blue-800 mt-1">
                                Os prontuários são armazenados com criptografia AES-256 e possuem
                                assinatura digital para garantir autenticidade. Todos os acessos
                                são registrados em log de auditoria conforme HIPAA e LGPD.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
