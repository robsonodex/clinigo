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
 * Template 3: Sidebar Compact
 * Sidebar estreita fixa, lista compacta de médicos, foco em densidade
 */
export function BookingTemplate3() {
    const [search, setSearch] = useState('')
    const [selectedSpec, setSelectedSpec] = useState('')
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null)

    return (
        <div className="min-h-screen bg-white flex">
            {/* Sidebar Fixa */}
            <aside className="w-56 border-r bg-gray-50 flex-shrink-0 h-screen sticky top-0">
                <div className="p-4 border-b">
                    <span className="font-semibold text-sm">{mockClinic.name}</span>
                </div>
                <div className="p-4">
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full h-9 px-3 text-sm bg-white border rounded-lg focus:outline-none focus:ring-1 focus:ring-black"
                    />
                </div>
                <div className="px-4 pb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Especialidade</p>
                    <div className="space-y-1">
                        {specialties.map(spec => (
                            <button
                                key={spec}
                                onClick={() => setSelectedSpec(spec === 'Todas' ? '' : spec)}
                                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${(selectedSpec === spec || (!selectedSpec && spec === 'Todas'))
                                        ? 'bg-black text-white'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {spec}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="px-4 pt-4 border-t">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Disponibilidade</p>
                    <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <input type="checkbox" className="w-4 h-4 rounded" /> Hoje
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input type="checkbox" className="w-4 h-4 rounded" /> Esta semana
                    </label>
                </div>
            </aside>

            {/* Lista + Detalhe */}
            <main className="flex-1 flex">
                {/* Lista de Médicos */}
                <div className="w-96 border-r overflow-y-auto">
                    <div className="p-4 border-b sticky top-0 bg-white">
                        <h1 className="font-semibold">Médicos ({mockDoctors.length})</h1>
                    </div>
                    <div className="divide-y">
                        {mockDoctors.map(doc => (
                            <button
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc.id)}
                                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${selectedDoc === doc.id ? 'bg-gray-50 border-l-2 border-black' : ''
                                    }`}
                            >
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                                        {doc.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">Dr. {doc.name}</p>
                                        <p className="text-xs text-gray-500">{doc.specialty}</p>
                                        <p className="text-xs text-gray-400">★ {doc.rating} • R$ {doc.fee}</p>
                                    </div>
                                    {doc.tele && <span className="text-xs text-blue-600">📹</span>}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Painel de Detalhes */}
                <div className="flex-1 p-8">
                    {selectedDoc ? (
                        (() => {
                            const doc = mockDoctors.find(d => d.id === selectedDoc)!
                            return (
                                <div>
                                    <div className="flex gap-6 mb-8">
                                        <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center text-2xl font-semibold text-gray-400">
                                            {doc.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-semibold">Dr. {doc.name}</h2>
                                            <p className="text-gray-500">{doc.specialty} • CRM {doc.crm}</p>
                                            <p className="flex items-center gap-2 mt-2">
                                                <span className="text-yellow-500">★</span>
                                                <span className="font-medium">{doc.rating}</span>
                                                <span className="text-gray-400">({doc.reviews} avaliações)</span>
                                            </p>
                                        </div>
                                        <div className="ml-auto text-right">
                                            <p className="text-2xl font-semibold">R$ {doc.fee}</p>
                                            <p className="text-sm text-gray-500">por consulta</p>
                                        </div>
                                    </div>

                                    <div className="border-t pt-6">
                                        <h3 className="font-semibold mb-4">Horários Disponíveis</h3>
                                        <p className="text-sm text-gray-500 mb-4">Domingo, 8 de Fevereiro</p>
                                        <div className="flex flex-wrap gap-2">
                                            {mockSlots.map(slot => (
                                                <button key={slot} className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium">
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })()
                    ) : (
                        <div className="h-full flex items-center justify-center text-gray-400">
                            <p>Selecione um médico para ver detalhes</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default BookingTemplate3
