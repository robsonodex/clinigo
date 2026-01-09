'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    Search,
    MapPin,
    Stethoscope,
    Star,
    Calendar,
    Loader2,
    AlertCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface Clinic {
    id: string
    name: string
    slug: string
    address?: string
    city?: string
    specialties?: string[]
}

// Urgency level display configuration
const URGENCY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    VERMELHO: { label: 'Emergência', color: 'text-red-700', bg: 'bg-red-100' },
    LARANJA: { label: 'Urgente', color: 'text-orange-700', bg: 'bg-orange-100' },
    AMARELO: { label: 'Prioritário', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    VERDE: { label: 'Rotina', color: 'text-green-700', bg: 'bg-green-100' },
}

// Wrapper component with Suspense for useSearchParams
export default function PatientSchedulePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <PatientScheduleContent />
        </Suspense>
    )
}

function PatientScheduleContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [clinics, setClinics] = useState<Clinic[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Get triage parameters from URL
    const triageEspecialidade = searchParams.get('especialidade')
    const triageUrgencia = searchParams.get('urgencia')
    const triagePrazo = searchParams.get('prazo')
    const triageSessionId = searchParams.get('triage_session')

    // Check if coming from triage
    const isFromTriage = !!(triageEspecialidade || triageUrgencia)
    const urgencyConfig = triageUrgencia ? URGENCY_CONFIG[triageUrgencia] : null

    useEffect(() => {
        loadClinics()
    }, [])

    const loadClinics = async () => {
        try {
            // Buscar clínicas públicas do marketplace
            const res = await fetch('/api/marketplace/clinics?limit=20')
            if (res.ok) {
                const data = await res.json()
                setClinics(data.clinics || [])
            }
        } catch (error) {
            console.error('Erro ao carregar clínicas:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Filter clinics - prioritize specialty if from triage
    const filteredClinics = clinics.filter(clinic => {
        const matchesSearch =
            clinic.name.toLowerCase().includes(search.toLowerCase()) ||
            clinic.city?.toLowerCase().includes(search.toLowerCase())

        // If from triage with specialty, prioritize matching clinics
        // (still show all, but could filter in future)
        return matchesSearch
    })

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/paciente/dashboard">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg">Agendar Consulta</h1>
                        <p className="text-sm text-muted-foreground">
                            Escolha uma clínica para agendar
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Search */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou cidade..."
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Triage Info Banner */}
                {isFromTriage && (
                    <Alert className="mb-6 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
                        <Stethoscope className="h-4 w-4 text-emerald-600" />
                        <AlertDescription>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium">Triagem AiA:</span>
                                {triageEspecialidade && (
                                    <Badge variant="secondary" className="bg-white">
                                        {triageEspecialidade}
                                    </Badge>
                                )}
                                {urgencyConfig && (
                                    <Badge className={`${urgencyConfig.bg} ${urgencyConfig.color}`}>
                                        {urgencyConfig.label}
                                    </Badge>
                                )}
                                {triagePrazo && (
                                    <span className="text-sm text-muted-foreground">
                                        • Prazo: {triagePrazo}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Busque clínicas com médicos da especialidade recomendada.
                            </p>
                        </AlertDescription>
                    </Alert>
                )}

                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </div>
                ) : filteredClinics.length === 0 ? (
                    <Card>
                        <CardContent className="pt-12 pb-12 text-center">
                            <Stethoscope className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h2 className="text-xl font-semibold mb-2">
                                {search ? 'Nenhuma clínica encontrada' : 'Nenhuma clínica disponível'}
                            </h2>
                            <p className="text-muted-foreground">
                                {search
                                    ? 'Tente buscar por outro nome ou cidade.'
                                    : 'Não há clínicas disponíveis para agendamento no momento.'
                                }
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {filteredClinics.map((clinic) => (
                            <Link
                                key={clinic.id}
                                href={`/${clinic.slug}/agendar`}
                            >
                                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                    <CardContent className="pt-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Stethoscope className="h-6 w-6 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{clinic.name}</h3>
                                                    {clinic.city && (
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            {clinic.city}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon">
                                                <Calendar className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}

                <p className="text-center text-sm text-muted-foreground mt-8">
                    Após selecionar a clínica, você escolherá o médico e horário disponível.
                </p>
            </main>
        </div>
    )
}

