'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, type Doctor, fetchClinicBySlug } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import {
    Search,
    Shield,
    Users,
    ChevronDown,
    MapPin,
    Filter,
    Calendar,
    Star
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { DoctorListingCard } from '@/components/public/doctor-listing-card'

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

export default function BookingPage({ params }: PageProps) {
    const router = useRouter()
    const [clinicSlug, setClinicSlug] = useState<string | null>(null)
    const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>()
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        params.then((p) => setClinicSlug(p.clinic_slug))
    }, [params])

    const { data: clinic } = useQuery({
        queryKey: ['clinic', clinicSlug],
        queryFn: () => fetchClinicBySlug(clinicSlug!),
        enabled: !!clinicSlug,
    })

    const { data: doctors, isLoading } = useQuery({
        queryKey: ['public-doctors', clinicSlug, selectedSpecialty],
        queryFn: () =>
            api.get<Doctor[]>('/doctors', {
                clinic_slug: clinicSlug!,
                ...(selectedSpecialty ? { specialty: selectedSpecialty } : {}),
                is_accepting: 'true',
            }),
        enabled: !!clinicSlug,
    })

    const uniqueSpecialties = Array.from(new Set(doctors?.map(d => d.specialty) || []))

    const filteredDoctors = doctors?.filter(
        (doc) =>
            !searchTerm ||
            doc.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const primaryColor = clinic?.primary_color || '#0066FF' // Default blue

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Compacto */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {clinic?.logo_url ? (
                            <Image
                                src={clinic.logo_url}
                                alt={clinic.name}
                                width={120}
                                height={40}
                                className="h-8 w-auto object-contain"
                            />
                        ) : (
                            <span className="font-bold text-xl text-gray-800">{clinic?.name}</span>
                        )}
                    </div>
                    {/* Search Bar no Header para acesso rápido */}
                    <div className="hidden md:flex relative max-w-md w-full mx-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Buscar médico, especialidade..."
                            className="pl-10 h-10 bg-gray-100 border-transparent focus:bg-white transition-all rounded-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href={`/${clinicSlug}/triagem`} className="text-sm font-medium text-gray-600 hover:text-blue-600 hidden sm:block">
                            Ajuda
                        </Link>
                        <Button size="sm" className="hidden sm:flex rounded-full bg-blue-600 hover:bg-blue-700">
                            Entrar
                        </Button>
                    </div>
                </div>
            </header>

            {/* Mobile Search Bar */}
            <div className="md:hidden p-4 bg-white border-b">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Buscar médico..."
                        className="pl-10 h-10 bg-gray-100 border-transparent rounded-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* Left Filters - Sticky */}
                    <aside className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-24 space-y-6">
                        {/* Map Preview (Static for now) */}
                        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 h-40 relative group cursor-pointer hidden lg:block">
                            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                                <MapPin className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                                <span className="text-white text-xs font-semibold flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Ver no mapa
                                </span>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Filter className="w-4 h-4" /> Filtros
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Especialidade</label>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                                        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600">
                                            <input
                                                type="radio"
                                                name="specialty"
                                                checked={!selectedSpecialty}
                                                onChange={() => setSelectedSpecialty(undefined)}
                                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                            />
                                            Todas as especialidades
                                        </label>
                                        {uniqueSpecialties.map(spec => (
                                            <label key={spec} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-blue-600">
                                                <input
                                                    type="radio"
                                                    name="specialty"
                                                    checked={selectedSpecialty === spec}
                                                    onChange={() => setSelectedSpecialty(spec)}
                                                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                />
                                                {spec}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Disponibilidade</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm text-gray-600">
                                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                            Hoje
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-gray-600">
                                            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                            Próximos 3 dias
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Right Listing */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {selectedSpecialty ? `Especialistas em ${selectedSpecialty}` : 'Médicos e Especialistas'}
                                <span className="ml-2 text-sm font-normal text-gray-500">({filteredDoctors?.length || 0} resultados)</span>
                            </h1>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>Ordenar por:</span>
                                <button className="font-semibold flex items-center gap-1 hover:text-blue-600">
                                    Relevância <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {isLoading && (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white rounded-2xl h-64 animate-pulse shadow-sm border border-gray-100" />
                                ))}
                            </div>
                        )}

                        {!isLoading && (!filteredDoctors || filteredDoctors.length === 0) && (
                            <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum resultado encontrado</h3>
                                <p className="text-gray-500">Tente buscar por outro termo ou remova os filtros.</p>
                                <Button
                                    className="mt-4"
                                    variant="outline"
                                    onClick={() => {
                                        setSearchTerm('')
                                        setSelectedSpecialty(undefined)
                                    }}
                                >
                                    Limpar filtros
                                </Button>
                            </div>
                        )}

                        <div className="space-y-4">
                            {filteredDoctors?.map((doctor) => (
                                <DoctorListingCard
                                    key={doctor.id}
                                    doctor={doctor}
                                    clinicSlug={clinicSlug || ''}
                                    primaryColor={primaryColor}
                                />
                            ))}
                        </div>

                        {/* Footer info block */}
                        <div className="mt-12 bg-blue-50 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <h3 className="font-bold text-xl text-blue-900 mb-2">CliniGo Enterprise</h3>
                                <p className="text-blue-700 max-w-md">
                                    Tecnologia de ponta para cuidar da sua saúde. Agendamento simples, rápido e seguro.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex flex-col items-center">
                                    <Shield className="w-6 h-6 text-blue-600 mb-1" />
                                    <span className="text-xs font-semibold text-blue-800">100% Seguro</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <Star className="w-6 h-6 text-blue-600 mb-1" />
                                    <span className="text-xs font-semibold text-blue-800">Avaliações Reais</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
