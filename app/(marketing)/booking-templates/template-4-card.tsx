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
 * Template 4: Card Focus
 * Cards grandes centralizados, um por vez, navegação simples
 */
export function BookingTemplate4() {
    const [search, setSearch] = useState('')
    const [selectedSpec, setSelectedSpec] = useState('')

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="h-16 bg-white border-b">
                <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
                    <span className="font-semibold">{mockClinic.name}</span>
                    <input
                        type="text"
                        placeholder="Buscar médico..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-64 h-9 px-4 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button className="text-sm font-medium text-teal-600">Entrar</button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">Agende sua Consulta</h1>
                    <p className="text-gray-500">Escolha o profissional ideal para você</p>
                </div>

                {/* Filtros Centralizados */}
                <div className="flex justify-center gap-2 mb-10">
                    {specialties.map(spec => (
                        <button
                            key={spec}
                            onClick={() => setSelectedSpec(spec === 'Todas' ? '' : spec)}
                            className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${(selectedSpec === spec || (!selectedSpec && spec === 'Todas'))
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-white border text-gray-700 hover:border-teal-600'
                                }`}
                        >
                            {spec}
                        </button>
                    ))}
                </div>

                {/* Cards Grandes */}
                <div className="space-y-6">
                    {mockDoctors.map(doc => (
                        <div key={doc.id} className="bg-white rounded-2xl p-8 shadow-sm">
                            <div className="flex gap-8 items-start">
                                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-3xl font-semibold text-gray-400">
                                    {doc.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-2xl font-semibold">Dr. {doc.name}</h2>
                                            <p className="text-lg text-gray-500">{doc.specialty}</p>
                                            <p className="text-sm text-gray-400 mt-1">CRM {doc.crm}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-bold text-teal-600">R$ {doc.fee}</p>
                                            <p className="text-sm text-gray-500">por consulta</p>
                                            {doc.tele && (
                                                <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-600 text-sm rounded-full">
                                                    📹 Teleconsulta
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-4">
                                        <div className="flex items-center gap-1">
                                            <span className="text-yellow-500 text-lg">★</span>
                                            <span className="font-semibold">{doc.rating}</span>
                                        </div>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-gray-500">{doc.reviews} avaliações</span>
                                    </div>

                                    <div className="mt-6 pt-6 border-t">
                                        <p className="text-sm text-gray-500 mb-3">Próximos horários disponíveis:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {mockSlots.map(slot => (
                                                <button key={slot} className="px-6 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
                                                    {slot}
                                                </button>
                                            ))}
                                            <button className="px-6 py-2.5 border border-teal-600 text-teal-600 rounded-lg text-sm font-medium hover:bg-teal-50">
                                                Ver todos
                                            </button>
                                        </div>
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

export default BookingTemplate4
