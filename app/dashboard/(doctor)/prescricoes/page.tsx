'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import {
    Clipboard,
    Plus,
    Search,
    Download,
    Printer,
    FileText,
    Pill,
    Calendar,
    User,
    CheckCircle2,
    Send,
    Eye,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'

interface Prescription {
    id: string
    patient_name: string
    patient_email: string
    date: string
    medications: {
        name: string
        dosage: string
        frequency: string
        duration: string
    }[]
    notes?: string
    is_sent: boolean
}

export default function PrescricoesPage() {
    const { toast } = useToast()
    const [showNewDialog, setShowNewDialog] = useState(false)
    const [search, setSearch] = useState('')

    // Mock prescriptions data
    const prescriptions: Prescription[] = [
        {
            id: '1',
            patient_name: 'Maria Silva',
            patient_email: 'maria@email.com',
            date: '2024-01-03',
            medications: [
                {
                    name: 'Dipirona 500mg',
                    dosage: '1 comprimido',
                    frequency: '6/6 horas',
                    duration: '5 dias',
                },
                {
                    name: 'Amoxicilina 500mg',
                    dosage: '1 cápsula',
                    frequency: '8/8 horas',
                    duration: '7 dias',
                },
            ],
            notes: 'Tomar após as refeições. Retorno em 7 dias.',
            is_sent: true,
        },
        {
            id: '2',
            patient_name: 'João Souza',
            patient_email: 'joao@email.com',
            date: '2024-01-02',
            medications: [
                {
                    name: 'Losartana 50mg',
                    dosage: '1 comprimido',
                    frequency: '1x ao dia',
                    duration: 'Uso contínuo',
                },
            ],
            is_sent: false,
        },
    ]

    const filteredPrescriptions = prescriptions.filter((p) =>
        p.patient_name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Clipboard className="w-7 h-7" />
                        Prescrições
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            PRO
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground">
                        Crie e envie prescrições médicas digitais
                    </p>
                </div>
                <Button onClick={() => setShowNewDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Prescrição
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Clipboard className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{prescriptions.length}</div>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">
                                    {prescriptions.filter((p) => p.is_sent).length}
                                </div>
                                <p className="text-xs text-muted-foreground">Enviadas</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Pill className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {prescriptions.reduce((acc, p) => acc + p.medications.length, 0)}
                                </div>
                                <p className="text-xs text-muted-foreground">Medicamentos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">
                                    {prescriptions.filter((p) => p.date === new Date().toISOString().split('T')[0]).length}
                                </div>
                                <p className="text-xs text-muted-foreground">Hoje</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por paciente..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Prescriptions List */}
            <div className="space-y-4">
                {filteredPrescriptions.length > 0 ? (
                    filteredPrescriptions.map((prescription) => (
                        <Card key={prescription.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-full">
                                                <User className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{prescription.patient_name}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatDate(prescription.date)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Medications */}
                                        <div className="pl-11 space-y-2 mt-3">
                                            {prescription.medications.map((med, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-2 text-sm bg-muted/50 p-2 rounded"
                                                >
                                                    <Pill className="w-4 h-4 text-primary" />
                                                    <span className="font-medium">{med.name}</span>
                                                    <span className="text-muted-foreground">•</span>
                                                    <span className="text-muted-foreground">
                                                        {med.dosage} - {med.frequency} - {med.duration}
                                                    </span>
                                                </div>
                                            ))}
                                            {prescription.notes && (
                                                <p className="text-sm text-muted-foreground italic">
                                                    Obs: {prescription.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge variant={prescription.is_sent ? 'success' : 'secondary'}>
                                            {prescription.is_sent ? (
                                                <>
                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                    Enviada
                                                </>
                                            ) : (
                                                'Rascunho'
                                            )}
                                        </Badge>
                                        <Button variant="outline" size="sm">
                                            <Eye className="w-4 h-4 mr-1" />
                                            Ver
                                        </Button>
                                        <Button variant="outline" size="sm">
                                            <Printer className="w-4 h-4" />
                                        </Button>
                                        <Button variant="outline" size="sm">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                        {!prescription.is_sent && (
                                            <Button size="sm">
                                                <Send className="w-4 h-4 mr-1" />
                                                Enviar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="pt-12 pb-12 text-center">
                            <Clipboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="font-medium">Nenhuma prescrição encontrada</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Clique em "Nova Prescrição" para criar
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* New Prescription Dialog */}
            <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Nova Prescrição</DialogTitle>
                        <DialogDescription>
                            Crie uma nova prescrição para enviar ao paciente
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Paciente</Label>
                            <Input placeholder="Selecione ou busque o paciente..." />
                        </div>

                        <div className="space-y-2">
                            <Label>Medicamentos</Label>
                            <Card className="p-4">
                                <div className="grid gap-3 md:grid-cols-4">
                                    <Input placeholder="Nome do medicamento" />
                                    <Input placeholder="Dosagem" />
                                    <Input placeholder="Frequência" />
                                    <Input placeholder="Duração" />
                                </div>
                                <Button variant="outline" size="sm" className="mt-3">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Adicionar medicamento
                                </Button>
                            </Card>
                        </div>

                        <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea placeholder="Instruções adicionais para o paciente..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                            Cancelar
                        </Button>
                        <Button variant="outline">
                            Salvar Rascunho
                        </Button>
                        <Button onClick={() => {
                            toast({ title: 'Prescrição criada!' })
                            setShowNewDialog(false)
                        }}>
                            <Send className="w-4 h-4 mr-2" />
                            Criar e Enviar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
