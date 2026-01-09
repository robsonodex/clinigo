'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    ArrowLeft,
    Search,
    MapPin,
    Stethoscope,
    Star,
    Calendar,
    Loader2
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

interface Clinic {
    id: string
    name: string
    slug: string
    address?: string
    city?: string
}

export default function PatientSchedulePage() {
    const router = useRouter()
    const [clinics, setClinics] = useState<Clinic[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')

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

    const filteredClinics = clinics.filter(clinic =>
        clinic.name.toLowerCase().includes(search.toLowerCase()) ||
        clinic.city?.toLowerCase().includes(search.toLowerCase())
    )

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

