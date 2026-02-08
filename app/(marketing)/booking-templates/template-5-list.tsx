'use client'

import { useState } from 'react'

// Mock Data
const mockClinic = { name: 'Clínica Saúde Total' }
const mockDoctors = [
    { id: '1', name: 'Mauricio Pereira Lopes', specialty: 'Psiquiatria', crm: 'DR000000', rating: 5.0, reviews: 12, fee: 450, tele: true },
    { id: '2', name: 'Ana Carolina Santos', specialty: 'Cardiologia', crm: 'DR111111', rating: 4.8, reviews: 28, fee: 380, tele: true },
    { id: '3', name: 'Roberto Mendes', specialty: 'Ortopedia', crm: 'DR222222', rating: 4.9, reviews: 45, fee: 320, tele: false }
]
const mockSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']
const specialties = ['Psiquiatria', 'Cardiologia', 'Ortopedia']

/**
 * Template 5: List Minimal
 * Lista limpa estilo tabela, ultra-minimalista, alta densidade de informação
 */
export function BookingTemplate5() {
    const [search, setSearch] = useState('')

    return (
        <div className="min-h-screen bg-white">
            {/* Header Ultra-minimal */}
            <header className="h-12 border-b">
                <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
                    <span className="text-sm font-medium">{mockClinic.name}</span>
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-48 h-7 px-2 text-xs border-b border-gray-300 bg-transparent focus:outline-none focus:border-black"
                    />
                    <button className="text-xs font-medium">Entrar</button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-8">
                <h1 className="text-lg font-semibold mb-6">
                    Profissionais Disponíveis
                    <span className="ml-2 text-sm font-normal text-gray-400">
                        {mockDoctors.length}
                    </span>
                </h1>

                {/* Table-like List */}
                <div className="border rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gray-50 border-b px-4 py-3 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase">
                        <div className="col-span-4">Profissional</div>
                        <div className="col-span-2">Especialidade</div>
                        <div className="col-span-1 text-center">Avaliação</div>
                        <div className="col-span-1 text-right">Valor</div>
                        <div className="col-span-4 text-center">Horários</div>
                    </div>

                    {/* Rows */}
                    {mockDoctors.map((doc, i) => (
                        <div
                            key={doc.id}
                            className={`px-4 py-4 grid grid-cols-12 gap-4 items-center ${i < mockDoctors.length - 1 ? 'border-b' : ''
                                } hover:bg-gray-50`}
                        >
                            <div className="col-span-4 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold">
                                    {doc.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Dr. {doc.name}</p>
                                    <p className="text-xs text-gray-400">CRM {doc.crm}</p>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <span className="text-sm">{doc.specialty}</span>
                                {doc.tele && <span className="ml-1 text-blue-500 text-xs">📹</span>}
                            </div>
                            <div className="col-span-1 text-center">
                                <span className="text-yellow-500">★</span>
                                <span className="text-sm font-medium ml-1">{doc.rating}</span>
                            </div>
                            <div className="col-span-1 text-right">
                                <span className="font-medium">R$ {doc.fee}</span>
                            </div>
                            <div className="col-span-4 flex flex-wrap gap-1 justify-center">
                                {mockSlots.slice(0, 4).map(slot => (
                                    <button key={slot} className="px-2 py-1 text-xs bg-black text-white rounded hover:bg-gray-800">
                                        {slot}
                                    </button>
                                ))}
                                <button className="px-2 py-1 text-xs text-gray-500 hover:text-black">+{mockSlots.length - 4}</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Info */}
                <div className="mt-6 flex justify-between items-center text-xs text-gray-400">
                    <p>Mostrando {mockDoctors.length} resultados</p>
                    <p>Atualizado há 5 min</p>
                </div>
            </main>
        </div>
    )
}

export default BookingTemplate5
