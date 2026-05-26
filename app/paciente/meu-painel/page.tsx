'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Calendar,
    Clock,
    User,
    History,
    Plus,
    LogOut,
    Stethoscope,
    ChevronRight,
    Loader2,
    Heart,
    FileText,
    Download,
    Sparkles,
    BookOpen,
    Printer,
    FileSpreadsheet,
    Shield
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface Patient {
    id: string
    full_name: string
    email: string
    health_score?: number
}

interface Appointment {
    id: string
    date: string
    time: string
    status: string
    doctor: { name: string; specialty: string }
    clinic: { name: string }
}

interface Evolution {
    id: string
    date: string
    template_type: string
    subjective?: string
    objective?: string
    assessment?: string
    plan_notes?: string
    content?: string // Orientações aos Responsáveis
    data_description?: string
    signed_at?: string
    finalized_at?: string
    signed_pdf_url?: string
    doctor: { name: string; specialty: string }
    clinic: { name: string }
}

interface Document {
    id: string
    name: string
    file_url: string
    file_size: number
    file_type: string
    category: string
    description?: string
    created_at: string
    uploaded_by: string
}

export default function PatientDashboardPage() {
    const router = useRouter()
    const [patient, setPatient] = useState<Patient | null>(null)
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [evolutions, setEvolutions] = useState<Evolution[]>([])
    const [documents, setDocuments] = useState<Document[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'evolutions' | 'documents'>('overview')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            // Buscar perfil
            const profileRes = await fetch('/api/patient/profile')
            if (!profileRes.ok) {
                router.push('/paciente/entrar')
                return
            }
            const profileData = await profileRes.json()
            setPatient(profileData.patient)

            // Buscar próximas consultas
            const appointmentsRes = await fetch('/api/patient/appointments?status=upcoming&limit=5')
            if (appointmentsRes.ok) {
                const appointmentsData = await appointmentsRes.json()
                setAppointments(appointmentsData.appointments)
            }

            // Buscar evoluções/orientações
            const evolutionsRes = await fetch('/api/patient/evolutions')
            if (evolutionsRes.ok) {
                const evolutionsData = await evolutionsRes.json()
                setEvolutions(evolutionsData.evolutions || [])
            }

            // Buscar receitas/documentos
            const documentsRes = await fetch('/api/patient/documents')
            if (documentsRes.ok) {
                const documentsData = await documentsRes.json()
                setDocuments(documentsData.documents || [])
            }

        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            router.push('/paciente/entrar')
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        document.cookie = 'patient_token=; path=/paciente; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        router.push('/paciente/entrar')
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
            SCHEDULED: { variant: 'secondary', label: 'Agendada' },
            CONFIRMED: { variant: 'default', label: 'Confirmada' },
            CANCELLED: { variant: 'destructive', label: 'Cancelada' },
        }
        const config = variants[status] || { variant: 'outline', label: status }
        return <Badge variant={config.variant}>{config.label}</Badge>
    }

    const formatBytes = (bytes: number) => {
        if (!bytes) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const getDocCategoryLabel = (category: string) => {
        const categories: Record<string, { label: string; bg: string; text: string }> = {
            prescription: { label: '💊 Receita Médica', bg: 'bg-emerald-50', text: 'text-emerald-700' },
            receita: { label: '💊 Receita Médica', bg: 'bg-emerald-50', text: 'text-emerald-700' },
            report: { label: '📄 Laudo / Parecer', bg: 'bg-blue-50', text: 'text-blue-700' },
            laudo: { label: '📄 Laudo / Parecer', bg: 'bg-blue-50', text: 'text-blue-700' },
            atestado: { label: '📄 Atestado', bg: 'bg-amber-50', text: 'text-amber-700' },
            exam: { label: '🔬 Exame', bg: 'bg-sky-50', text: 'text-sky-700' },
            exame: { label: '🔬 Exame', bg: 'bg-sky-50', text: 'text-sky-700' },
        }
        const config = categories[category.toLowerCase()] || { label: '📂 Documento', bg: 'bg-slate-50', text: 'text-slate-700' }
        return <span className={`px-2 py-1 rounded text-xs font-semibold ${config.bg} ${config.text}`}>{config.label}</span>
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 p-4">
                <div className="max-w-4xl mx-auto space-y-6">
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50/50 pb-12">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-blue-500 flex items-center justify-center shadow-sm">
                            <Stethoscope className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-bold text-lg text-slate-800">Portal do Paciente</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-destructive transition-colors">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sair
                    </Button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Welcome Card */}
                <Card className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 border-none shadow-xl text-white relative overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-400 via-blue-500 to-transparent"></div>
                    <CardContent className="pt-6 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-xs py-0.5 px-2.5 rounded-full font-medium">
                                        Espaço da Família
                                    </Badge>
                                </div>
                                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{patient?.full_name}</h1>
                                <p className="text-slate-400 text-sm mt-1">{patient?.email}</p>
                            </div>
                            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 self-start md:self-auto">
                                <div className="text-left">
                                    <p className="text-xs text-slate-400 font-medium">Evoluções Clínicas</p>
                                    <p className="text-lg font-bold text-emerald-400">{evolutions.length} anotadas</p>
                                </div>
                                <div className="w-px h-8 bg-white/10"></div>
                                <div className="text-left">
                                    <p className="text-xs text-slate-400 font-medium">Documentos / Receitas</p>
                                    <p className="text-lg font-bold text-blue-400">{documents.length} disponíveis</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 ${
                            activeTab === 'overview'
                                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/20'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <Calendar className="w-4 h-4" />
                        Visão Geral e Consultas
                    </button>
                    <button
                        onClick={() => setActiveTab('evolutions')}
                        className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 relative ${
                            activeTab === 'evolutions'
                                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/20'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                        Orientações e Evoluções
                        {evolutions.length > 0 && (
                            <Badge className="absolute -top-1 right-2 bg-emerald-500 text-white border-none w-5 h-5 flex items-center justify-center p-0 rounded-full text-[10px]">
                                {evolutions.length}
                            </Badge>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all flex items-center justify-center gap-2 relative ${
                            activeTab === 'documents'
                                ? 'border-emerald-500 text-emerald-700 bg-emerald-50/20'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <FileText className="w-4 h-4 text-blue-600" />
                        Receitas e Pareceres
                        {documents.length > 0 && (
                            <Badge className="absolute -top-1 right-2 bg-blue-500 text-white border-none w-5 h-5 flex items-center justify-center p-0 rounded-full text-[10px]">
                                {documents.length}
                            </Badge>
                        )}
                    </button>
                </div>

                {/* Tab: Overview */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-4">
                            <Link href="/paciente/agendar">
                                <Card className="hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer h-full group bg-white border border-slate-100 rounded-2xl">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                            <Plus className="h-6 w-6 text-emerald-600" />
                                        </div>
                                        <p className="font-bold text-slate-800">Agendar Consulta</p>
                                        <p className="text-xs text-slate-400 mt-1">Marque um novo horário na clínica</p>
                                    </CardContent>
                                </Card>
                            </Link>

                            <Link href="/paciente/historico">
                                <Card className="hover:shadow-md hover:border-blue-200 transition-all cursor-pointer h-full group bg-white border border-slate-100 rounded-2xl">
                                    <CardContent className="pt-6 text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                            <History className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <p className="font-bold text-slate-800">Meu Histórico</p>
                                        <p className="text-xs text-slate-400 mt-1">Veja consultas já finalizadas</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        </div>

                        {/* Próximas Consultas */}
                        <Card className="border border-slate-100 rounded-2xl bg-white shadow-sm">
                            <CardHeader className="pb-3 border-b border-slate-50">
                                <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                    <Calendar className="h-5 w-5 text-emerald-600" />
                                    Próximas Consultas
                                </CardTitle>
                                <CardDescription>
                                    Seus agendamentos confirmados e horários marcados
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4">
                                {appointments.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40 text-slate-300" />
                                        <p className="font-medium">Nenhum atendimento agendado para os próximos dias</p>
                                        <Link href="/paciente/agendar">
                                            <Button variant="outline" size="sm" className="mt-3 border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                                                Agendar agora
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {appointments.map((apt) => (
                                            <div
                                                key={apt.id}
                                                className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center bg-white shadow-sm border border-slate-100 px-3 py-2 rounded-xl min-w-[65px]">
                                                        <p className="text-xl font-extrabold text-emerald-600">
                                                            {format(new Date(apt.date), 'd')}
                                                        </p>
                                                        <p className="text-[10px] font-bold uppercase text-slate-400">
                                                            {format(new Date(apt.date), 'MMM', { locale: ptBR })}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{apt.doctor.name}</p>
                                                        <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                                                            {apt.doctor.specialty}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1.5 text-slate-500">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            <span className="text-xs font-medium">{apt.time}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {getStatusBadge(apt.status)}
                                                    <p className="text-xs font-medium text-slate-400 mt-2">
                                                        {apt.clinic.name}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tab: Evolutions & Orientations */}
                {activeTab === 'evolutions' && (
                    <Card className="border border-slate-100 rounded-2xl bg-white shadow-sm">
                        <CardHeader className="pb-3 border-b border-slate-50">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                <Sparkles className="h-5 w-5 text-emerald-600" />
                                Orientações e Acompanhamento Clínico
                            </CardTitle>
                            <CardDescription>
                                Veja as anotações, dicas de atividades para casa e orientações elaboradas pelos terapeutas
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {evolutions.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40 text-slate-300" />
                                    <p className="font-medium">Nenhuma evolução ou orientação clínica cadastrada ainda</p>
                                    <p className="text-xs text-slate-400 mt-1">Elas estarão visíveis aqui assim que o profissional assinar a evolução da sessão.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {evolutions.map((ev) => (
                                        <Card key={ev.id} className="border border-slate-100 shadow-none bg-slate-50/50 hover:bg-slate-50 transition-colors rounded-2xl overflow-hidden">
                                            {/* Evolution Header */}
                                            <div className="bg-slate-100/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-emerald-600" />
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {format(new Date(ev.date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {ev.signed_at ? (
                                                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none rounded-md text-xs font-semibold py-0.5 px-2 flex items-center gap-1">
                                                            <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                                            Assinado ICP-Brasil
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="rounded-md text-xs font-semibold py-0.5 px-2">
                                                            Assinatura Simples
                                                        </Badge>
                                                    )}

                                                    <Link href={`/api/patient/evolutions/pdf?id=${ev.id}`} target="_blank">
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                                                            <Printer className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>

                                            <CardContent className="p-4 space-y-4">
                                                {/* Doctor Profile */}
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                                                        {ev.doctor.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{ev.doctor.name}</p>
                                                        <p className="text-xs text-slate-400 font-medium">{ev.doctor.specialty} • {ev.clinic.name}</p>
                                                    </div>
                                                </div>

                                                {/* PROMINENT PARENT ORIENTATIONS (Orientações aos Responsáveis) */}
                                                {ev.content && (
                                                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 space-y-2">
                                                        <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                                                            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                                                            Orientações aos Responsáveis (Atividades para Casa)
                                                        </div>
                                                        <p className="text-slate-700 text-sm whitespace-pre-line leading-relaxed font-medium">
                                                            {ev.content}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Objective of the Session / Goals (Sessão Multidisciplinar) */}
                                                {ev.template_type === 'multidisciplinar' && ev.subjective && (
                                                    <div className="space-y-1 pl-1">
                                                        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Objetivo Terapêutico Trabalhado</p>
                                                        <p className="text-slate-600 text-sm font-medium leading-relaxed">
                                                            {ev.subjective}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Subjective/Objective Goals if SOAP */}
                                                {ev.template_type === 'soap' && ev.subjective && (
                                                    <div className="space-y-1 pl-1">
                                                        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Objetivos e Demandas Relatadas</p>
                                                        <p className="text-slate-600 text-sm leading-relaxed">
                                                            {ev.subjective}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* CIF Goals */}
                                                {ev.template_type === 'cif' && ev.body_functions && (
                                                    <div className="space-y-1 pl-1">
                                                        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Atividades Realizadas</p>
                                                        <p className="text-slate-600 text-sm leading-relaxed">
                                                            {ev.body_functions}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* DAP Demand */}
                                                {ev.template_type === 'dap' && ev.data_description && (
                                                    <div className="space-y-1 pl-1">
                                                        <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Atividades Realizadas</p>
                                                        <p className="text-slate-600 text-sm leading-relaxed">
                                                            {ev.data_description}
                                                        </p>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Tab: Documents & Prescriptions */}
                {activeTab === 'documents' && (
                    <Card className="border border-slate-100 rounded-2xl bg-white shadow-sm">
                        <CardHeader className="pb-3 border-b border-slate-50">
                            <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
                                <FileText className="h-5 w-5 text-blue-600" />
                                Receitas, Atestados e Laudos Digitais
                            </CardTitle>
                            <CardDescription>
                                Acesse e faça o download de receitas de medicamentos, laudos multidisciplinares e atestados
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {documents.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-40 text-slate-300" />
                                    <p className="font-medium">Nenhum documento ou receita disponível para download ainda</p>
                                    <p className="text-xs text-slate-400 mt-1">Quando o seu profissional anexar ou emitir receitas no prontuário, elas aparecerão aqui.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {documents.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors gap-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 leading-tight">{doc.name}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                        {getDocCategoryLabel(doc.category)}
                                                        <span className="text-[11px] text-slate-400">•</span>
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            Emitido em {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">•</span>
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            Tamanho: {formatBytes(doc.file_size)}
                                                        </span>
                                                    </div>
                                                    {doc.description && (
                                                        <p className="text-xs text-slate-500 mt-2 bg-white border border-slate-100 rounded-lg p-2 font-medium">
                                                            {doc.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5">
                                                        <Download className="w-3.5 h-3.5" />
                                                        Baixar
                                                    </Button>
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    )
}
