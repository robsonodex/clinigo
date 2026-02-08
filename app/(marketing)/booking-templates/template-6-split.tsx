'use client'

import { useState } from 'react'

// Mock Data
const mockClinic = { name: 'Clínica Saúde Total' }
const mockDoctors = [
    { id: '1', name: 'Mauricio Pereira Lopes', specialty: 'Psiquiatria', crm: 'DR000000', rating: 5.0, reviews: 12, fee: 450, tele: true },
    { id: '2', name: 'Ana Carolina Santos', specialty: 'Cardiologia', crm: 'DR111111', rating: 4.8, reviews: 28, fee: 380, tele: true },
    { id: '3', name: 'Roberto Mendes', specialty: 'Ortopedia', crm: 'DR222222', rating: 4.9, reviews: 45, fee: 320, tele: false }
]
const mockSlots = ['09:00', '10:00', '11:00', '14:00', '15:00']
const specialties = ['Todas', 'Psiquiatria', 'Cardiologia', 'Ortopedia']

/**
 * Template 6: Split View
 * Duas colunas iguais: lista à esquerda, calendário de horários à direita
 */
export function BookingTemplate6() {
    const [search, setSearch] = useState('')
    const [selectedSpec, setSelectedSpec] = useState('')
    const [selectedDoc, setSelectedDoc] = useState(mockDoctors[0])

    const days = [
        { day: 'Dom', date: '8', month: 'fev' },
        { day: 'Seg', date: '9', month: 'fev' },
        { day: 'Ter', date: '10', month: 'fev' },
        { day: 'Qua', date: '11', month: 'fev' },
        { day: 'Qui', date: '12', month: 'fev' }
    ]
    const [selectedDay, setSelectedDay] = useState(0)

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="h-14 border-b bg-white">
                <div className="h-full px-6 flex items-center justify-between">
                    <span className="font-semibold">{mockClinic.name}</span>
                    <div className="flex items-center gap-4">
                        <button className="text-sm text-gray-600">Ajuda</button>
                        <button className="h-8 px-4 bg-black text-white text-sm rounded-full">Entrar</button>
                    </div>
                </div>
            </header>

            <main className="flex h-[calc(100vh-56px)]">
                {/* Left: Lista de Médicos */}
                <div className="w-1/2 border-r overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b p-4">
                        <input
                            type="text"
                            placeholder="Buscar médico, especialidade..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-10 px-4 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <div className="flex gap-2 mt-3 overflow-x-auto">
                            {specialties.map(spec => (
                                <button
                                    key={spec}
                                    onClick={() => setSelectedSpec(spec === 'Todas' ? '' : spec)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap ${(selectedSpec === spec || (!selectedSpec && spec === 'Todas'))
                                            ? 'bg-black text-white'
                                            : 'bg-gray-100 text-gray-700'
                                        }`}
                                >
                                    {spec}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="divide-y">
                        {mockDoctors.map(doc => (
                            <button
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc)}
                                className={`w-full p-5 text-left hover:bg-gray-50 transition-colors ${selectedDoc.id === doc.id ? 'bg-gray-50' : ''
                                    }`}
                            >
                                <div className="flex gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center font-medium text-gray-500">
                                        {doc.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">Dr. {doc.name}</p>
                                                <p className="text-sm text-gray-500">{doc.specialty}</p>
                                            </div>
                                            <p className="font-semibold">R$ {doc.fee}</p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                                            <span>★ {doc.rating}</span>
                                            <span>•</span>
                                            <span>{doc.reviews} avaliações</span>
                                            {doc.tele && <span className="text-blue-600">📹</span>}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Calendário de Horários */}
                <div className="w-1/2 bg-gray-50 p-8 overflow-y-auto">
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        {/* Médico Selecionado Header */}
                        <div className="flex items-center gap-4 pb-6 border-b">
                            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-semibold text-gray-400">
                                {selectedDoc.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold">Dr. {selectedDoc.name}</h2>
                                <p className="text-gray-500">{selectedDoc.specialty}</p>
                            </div>
                        </div>

                        {/* Seletor de Dias */}
                        <div className="py-6">
                            <p className="text-sm text-gray-500 mb-4">Selecione o dia:</p>
                            <div className="flex gap-2">
                                {days.map((d, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedDay(i)}
                                        className={`flex-1 py-3 rounded-xl text-center transition-colors ${selectedDay === i
                                                ? 'bg-black text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <p className="text-xs uppercase">{d.day}</p>
                                        <p className="text-lg font-semibold">{d.date}</p>
                                        <p className="text-xs">{d.month}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Grade de Horários */}
                        <div className="pt-6 border-t">
                            <p className="text-sm text-gray-500 mb-4">Horários disponíveis:</p>
                            <div className="grid grid-cols-3 gap-3">
                                {mockSlots.map(slot => (
                                    <button key={slot} className="py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800">
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Valor */}
                        <div className="mt-8 pt-6 border-t flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Valor da consulta</p>
                                <p className="text-2xl font-bold">R$ {selectedDoc.fee}</p>
                            </div>
                            <button className="h-12 px-8 bg-black text-white rounded-xl font-medium hover:bg-gray-800">
                                Confirmar Agendamento
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default BookingTemplate6
