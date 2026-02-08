'use client'

import { useState } from 'react'

// Mock Data
const mockClinic = { name: 'Clínica Saúde Total' }
const mockDoctors = [
    { id: '1', name: 'Mauricio Pereira Lopes', specialty: 'Psiquiatria', crm: 'DR000000', rating: 5.0, reviews: 12, fee: 450, tele: true },
    { id: '2', name: 'Ana Carolina Santos', specialty: 'Cardiologia', crm: 'DR111111', rating: 4.8, reviews: 28, fee: 380, tele: true },
    { id: '3', name: 'Roberto Mendes', specialty: 'Ortopedia', crm: 'DR222222', rating: 4.9, reviews: 45, fee: 320, tele: false }
]
const mockSlots = ['09:00', '10:00', '11:00', '14:00']
const specialties = ['Todas', 'Psiquiatria', 'Cardiologia', 'Ortopedia']

/**
 * Template 2: Modern Grid
 * Layout em grid 2 colunas, cards com foto grande, tipografia moderna
 */
export function BookingTemplate2() {
    const [search, setSearch] = useState('')
    const [selectedSpec, setSelectedSpec] = useState('')

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Minimalista */}
            <header className="h-14 bg-white border-b">
                <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
                    <span className="text-sm font-semibold tracking-wide uppercase">{mockClinic.name}</span>
                    <div className="flex items-center gap-6">
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-64 h-8 px-3 text-sm border-b border-gray-300 bg-transparent focus:outline-none focus:border-black"
                        />
                        <button className="text-sm font-medium">Entrar →</button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-10">
                {/* Título + Filtros Inline */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Agendar Consulta</h1>
                    <p className="text-gray-500 mt-1">{mockDoctors.length} profissionais disponíveis</p>
                </div>

                <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
                    {specialties.map(spec => (
                        <button
                            key={spec}
                            onClick={() => setSelectedSpec(spec === 'Todas' ? '' : spec)}
                            className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${(selectedSpec === spec || (!selectedSpec && spec === 'Todas'))
                                    ? 'bg-black text-white'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:border-black'
                                }`}
                        >
                            {spec}
                        </button>
                    ))}
                </div>

                {/* Grid de Médicos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {mockDoctors.map(doc => (
                        <div key={doc.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow">
                            <div className="p-6">
                                <div className="flex gap-4">
                                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-semibold text-gray-400">
                                        {doc.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">Dr. {doc.name}</h3>
                                        <p className="text-sm text-gray-500">{doc.specialty}</p>
                                        <p className="text-sm text-gray-400 font-mono">CRM {doc.crm}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-yellow-500">★</span>
                                            <span className="text-sm font-medium">{doc.rating}</span>
                                            <span className="text-sm text-gray-400">({doc.reviews})</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-semibold">R$ {doc.fee}</p>
                                        {doc.tele && <span className="text-xs text-blue-600">📹 Vídeo</span>}
                                    </div>
                                </div>

                                <div className="mt-5 pt-5 border-t">
                                    <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Horários Disponíveis</p>
                                    <div className="flex flex-wrap gap-2">
                                        {mockSlots.map(slot => (
                                            <button key={slot} className="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800">
                                                {slot}
                                            </button>
                                        ))}
                                        <button className="px-4 py-2 text-sm text-gray-500 hover:text-black">
                                            +8 mais
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}

export default BookingTemplate2
