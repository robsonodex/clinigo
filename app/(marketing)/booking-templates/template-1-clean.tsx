'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

// Mock Data
const mockClinic = {
    name: 'Clínica Saúde Total',
    logo_url: null,
    primary_color: '#14b8a6'
}

const mockDoctors = [
    {
        id: '1',
        user: { full_name: 'Mauricio Pereira Lopes', avatar: null },
        specialty: 'Psiquiatria',
        crm: 'DR000000',
        average_rating: 5.0,
        total_reviews: 12,
        consultation_fee: 450,
        accepts_teleconsulta: true,
        location: 'Consultório • Online'
    },
    {
        id: '2',
        user: { full_name: 'Ana Carolina Santos', avatar: null },
        specialty: 'Cardiologia',
        crm: 'DR111111',
        average_rating: 4.8,
        total_reviews: 28,
        consultation_fee: 380,
        accepts_teleconsulta: true,
        location: 'Consultório • Online'
    },
    {
        id: '3',
        user: { full_name: 'Roberto Mendes', avatar: null },
        specialty: 'Ortopedia',
        crm: 'DR222222',
        average_rating: 4.9,
        total_reviews: 45,
        consultation_fee: 320,
        accepts_teleconsulta: false,
        location: 'Consultório'
    }
]

const mockSlots = ['09:00', '10:00', '11:00', '11:30']
const specialties = ['Todas as especialidades', 'Psiquiatria', 'Cardiologia', 'Ortopedia']

/**
 * Template 1: Clean Professional
 * Fundo branco puro, header fixo compacto, filtros laterais, cards limpos
 */
export function BookingTemplate1() {
    const [search, setSearch] = useState('')
    const [selectedSpec, setSelectedSpec] = useState('')

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="h-16 border-b bg-white sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    <span className="font-semibold text-lg">{mockClinic.name}</span>
                    <div className="hidden md:flex flex-1 max-w-md mx-8">
                        <input
                            type="text"
                            placeholder="Buscar médico, especialidade..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-10 px-4 rounded-full bg-gray-100 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600 hidden sm:block">Ajuda</span>
                        <button className="h-9 px-4 bg-teal-600 text-white rounded-full text-sm font-medium">
                            Entrar
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex gap-8">
                    {/* Sidebar Filtros */}
                    <aside className="w-64 flex-shrink-0 hidden lg:block">
                        <div className="bg-white border rounded-lg p-5 sticky top-24">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <span>☰</span> Filtros
                            </h3>
                            <div className="space-y-3">
                                <p className="text-sm font-medium text-gray-700">Especialidade</p>
                                {specialties.map(spec => (
                                    <label key={spec} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="spec"
                                            checked={selectedSpec === spec || (!selectedSpec && spec === 'Todas as especialidades')}
                                            onChange={() => setSelectedSpec(spec === 'Todas as especialidades' ? '' : spec)}
                                            className="w-4 h-4 text-teal-600"
                                        />
                                        {spec}
                                    </label>
                                ))}
                            </div>
                            <div className="border-t mt-4 pt-4">
                                <p className="text-sm font-medium text-gray-700 mb-3">Disponibilidade</p>
                                <label className="flex items-center gap-2 text-sm text-gray-600">
                                    <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" />
                                    Hoje
                                </label>
                                <label className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                                    <input type="checkbox" className="w-4 h-4 text-teal-600 rounded" />
                                    Próximos 3 dias
                                </label>
                            </div>
                        </div>
                    </aside>

                    {/* Lista de Médicos */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-xl font-semibold">
                                Médicos e Especialistas
                                <span className="ml-2 text-sm font-normal text-gray-500">
                                    ({mockDoctors.length} resultados)
                                </span>
                            </h1>
                            <button className="text-sm text-gray-600 flex items-center gap-1">
                                Ordenar por: <span className="font-medium">Relevância</span> ▼
                            </button>
                        </div>

                        <div className="space-y-4">
                            {mockDoctors.map(doc => (
                                <div key={doc.id} className="bg-white border rounded-xl p-6 flex gap-6">
                                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-lg font-semibold text-gray-500">
                                        {doc.user.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">Dr {doc.user.full_name} ✓</h3>
                                                <p className="text-sm text-gray-600">{doc.specialty} • CRM {doc.crm}</p>
                                                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                    ★★★★★ {doc.average_rating} ({doc.total_reviews} avaliações)
                                                </p>
                                                <p className="text-sm text-gray-500 mt-1">📍 {doc.location}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-teal-600 font-semibold">R$ {doc.consultation_fee.toFixed(2).replace('.', ',')}</p>
                                                {doc.accepts_teleconsulta && (
                                                    <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded">📹 Vídeo</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-48 flex-shrink-0">
                                        <div className="border rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs text-gray-500">📅 Próximos horários</span>
                                                <span className="text-xs text-teal-600">Ver mais</span>
                                            </div>
                                            <p className="text-xs text-center text-gray-700 font-medium mb-2">DOMINGO<br />8 fev</p>
                                            <div className="space-y-1">
                                                {mockSlots.map(slot => (
                                                    <button key={slot} className="w-full py-1.5 text-sm bg-teal-600 text-white rounded hover:bg-teal-700">
                                                        {slot}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-center text-teal-600 mt-2">mais 12</p>
                                        </div>
                                        <button className="w-full mt-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                                            Ver perfil completo
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default BookingTemplate1
