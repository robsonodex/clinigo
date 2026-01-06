'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { DoctorCard, DoctorCardSkeleton } from '@/components/doctors/doctor-card'
import { api, type Doctor } from '@/lib/api-client'
import { Stethoscope, Search, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const SPECIALTIES = [
    'Cardiologia',
    'Dermatologia',
    'Endocrinologia',
    'Gastroenterologia',
    'Ginecologia',
    'Neurologia',
    'Oftalmologia',
    'Ortopedia',
    'Pediatria',
    'Psiquiatria',
    'Urologia',
    'Clínica Geral',
]

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

export default function BookingPage({ params }: PageProps) {
    const router = useRouter()
    const [clinicSlug, setClinicSlug] = useState<string | null>(null)
    const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>()

    // Resolve params
    params.then((p) => {
        if (clinicSlug !== p.clinic_slug) {
            setClinicSlug(p.clinic_slug)
        }
    })

    const { data: doctors, isLoading, error } = useQuery({
        queryKey: ['public-doctors', clinicSlug, selectedSpecialty],
        queryFn: () =>
            api.get<Doctor[]>('/doctors', {
                clinic_slug: clinicSlug!,
                ...(selectedSpecialty ? { specialty: selectedSpecialty } : {}),
                is_accepting: 'true',
            }),
        enabled: !!clinicSlug,
    })

    const handleSelectDoctor = (doctorId: string) => {
        router.push(`/${clinicSlug}/agendar/${doctorId}`)
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link
                        href={`/${clinicSlug}`}
                        className="flex items-center gap-2 text-primary font-semibold"
                    >
                        <Stethoscope className="w-6 h-6" />
                        <span className="hidden sm:inline">CliniGo</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button variant="ghost" size="sm">
                                Entrar
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                            Agende sua consulta online
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Escolha um de nossos especialistas
                        </p>
                    </div>

                    {/* Filter */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <div className="flex-1">
                            <Select
                                value={selectedSpecialty}
                                onValueChange={(value) =>
                                    setSelectedSpecialty(value === 'all' ? undefined : value)
                                }
                            >
                                <SelectTrigger>
                                    <Search className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Filtrar por especialidade" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas as especialidades</SelectItem>
                                    {SPECIALTIES.map((specialty) => (
                                        <SelectItem key={specialty} value={specialty}>
                                            {specialty}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Doctors Grid */}
                    {isLoading ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <DoctorCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-destructive">
                                Erro ao carregar médicos. Tente novamente.
                            </p>
                        </div>
                    ) : doctors && doctors.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-6">
                            {doctors.map((doctor) => (
                                <DoctorCard
                                    key={doctor.id}
                                    doctor={doctor}
                                    onSelect={() => handleSelectDoctor(doctor.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-muted/30 rounded-lg">
                            <Stethoscope className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-medium">
                                Nenhum médico disponível
                            </h3>
                            <p className="text-muted-foreground mt-2">
                                {selectedSpecialty
                                    ? `Não há médicos de ${selectedSpecialty} no momento.`
                                    : 'Não há médicos aceitando agendamentos.'}
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t bg-white mt-auto py-6">
                <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                    © 2025 CliniGo. Teleconsultoria médica.
                </div>
            </footer>
        </div>
    )
}
