'use client'

import { useState } from 'react'

// Mock Data
const mockClinic = { name: 'Clínica Saúde Total' }
const mockDoctor = {
    name: 'Dr. Mauricio Pereira Lopes',
    specialty: 'Psiquiatria',
    subspecialties: ['Ansiedade', 'Depressão', 'TDAH', 'Bipolaridade'],
    crm: 'CRM/SP 000000',
    rating: 5.0,
    reviews: 12,
    fee: 450,
    tele: true,
    bio: 'Especialista em Psiquiatria pela USP com 15 anos de experiência. Atendimento humanizado.',
    address: 'Av. Paulista, 1000 - Sala 801, Bela Vista',
    city: 'São Paulo - SP',
    education: ['Medicina - USP', 'Residência Psiquiatria - HC-FMUSP'],
    insurances: ['Unimed', 'Bradesco', 'SulAmérica', 'Amil', 'Porto Seguro']
}

const mockDays = [
    { label: 'Hoje', day: 8, slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
    { label: 'Amanhã', day: 9, slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00'] },
    { label: 'Ter 10', day: 10, slots: ['09:00', '10:00', '14:00', '15:00'] },
    { label: 'Qua 11', day: 11, slots: ['08:00', '09:00', '10:00', '11:00'] },
    { label: 'Qui 12', day: 12, slots: ['14:00', '15:00', '16:00', '17:00'] }
]

/**
 * Template 5: Compacto Profissional
 * Duas colunas balanceadas, sem firulas, tipografia limpa
 */
export function DoctoraliaTpl5() {
    const [selectedDay, setSelectedDay] = useState(0)
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
    const [consultType, setConsultType] = useState<'presencial' | 'online'>('presencial')

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="h-11 bg-white border-b">
                <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
                    <span className="text-sm">{mockClinic.name}</span>
                    <span className="text-xs text-gray-500">Agendamento Online</span>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-5">
                <div className="flex gap-5">
                    {/* LEFT */}
                    <div className="w-[340px] flex-shrink-0 space-y-4">
                        {/* Card Principal */}
                        <div className="bg-white border rounded p-4">
                            <div className="flex gap-3 mb-3">
                                <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-xs font-medium">MP</div>
                                <div>
                                    <p className="font-medium text-sm">{mockDoctor.name}</p>
                                    <p className="text-xs text-gray-500">{mockDoctor.specialty} | {mockDoctor.crm}</p>
                                </div>
                            </div>
                            <div className="flex gap-4 text-xs border-t pt-3">
                                <span>Nota: {mockDoctor.rating}</span>
                                <span>{mockDoctor.reviews} opiniões</span>
                                <span className="ml-auto font-medium">R$ {mockDoctor.fee}</span>
                            </div>
                        </div>

                        {/* Especialidades */}
                        <div className="bg-white border rounded p-4">
                            <p className="text-xs font-medium text-gray-500 mb-2">Áreas de atuação</p>
                            <div className="flex flex-wrap gap-1">
                                {mockDoctor.subspecialties.map(s => (
                                    <span key={s} className="px-2 py-0.5 bg-gray-100 text-xs">{s}</span>
                                ))}
                            </div>
                        </div>

                        {/* Formação */}
                        <div className="bg-white border rounded p-4">
                            <p className="text-xs font-medium text-gray-500 mb-2">Formação</p>
                            {mockDoctor.education.map((e, i) => (
                                <p key={i} className="text-xs text-gray-600">- {e}</p>
                            ))}
                        </div>

                        {/* Convênios */}
                        <div className="bg-white border rounded p-4">
                            <p className="text-xs font-medium text-gray-500 mb-2">Convênios aceitos</p>
                            <p className="text-xs text-gray-600">{mockDoctor.insurances.join(' | ')}</p>
                        </div>

                        {/* Endereço */}
                        <div className="bg-white border rounded p-4">
                            <p className="text-xs font-medium text-gray-500 mb-1">Local de atendimento</p>
                            <p className="text-xs text-gray-600">{mockDoctor.address}</p>
                            <p className="text-xs text-gray-500">{mockDoctor.city}</p>
                        </div>

                        {/* Sobre */}
                        <div className="bg-white border rounded p-4">
                            <p className="text-xs font-medium text-gray-500 mb-1">Sobre</p>
                            <p className="text-xs text-gray-600">{mockDoctor.bio}</p>
                        </div>
                    </div>

                    {/* RIGHT */}
                    <div className="flex-1">
                        <div className="bg-white border rounded p-5">
                            {/* Tipo de consulta */}
                            <div className="flex border-b mb-4">
                                <button
                                    onClick={() => setConsultType('presencial')}
                                    className={`flex-1 py-2 text-xs border-b-2 ${consultType === 'presencial' ? 'border-gray-900 font-medium' : 'border-transparent text-gray-500'
                                        }`}
                                >
                                    Presencial
                                </button>
                                <button
                                    onClick={() => setConsultType('online')}
                                    className={`flex-1 py-2 text-xs border-b-2 ${consultType === 'online' ? 'border-gray-900 font-medium' : 'border-transparent text-gray-500'
                                        }`}
                                >
                                    Teleconsulta
                                </button>
                            </div>

                            {/* Dias */}
                            <p className="text-xs text-gray-500 mb-2">Selecione o dia</p>
                            <div className="flex gap-1 mb-4">
                                {mockDays.map((d, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setSelectedDay(i); setSelectedSlot(null) }}
                                        className={`flex-1 py-2 text-xs border rounded ${selectedDay === i ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>

                            {/* Horários */}
                            <p className="text-xs text-gray-500 mb-2">{mockDays[selectedDay].slots.length} horários</p>
                            <div className="grid grid-cols-4 gap-1">
                                {mockDays[selectedDay].slots.map(slot => (
                                    <button
                                        key={slot}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`py-2 text-xs border rounded ${selectedSlot === slot ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>

                            {/* Confirmar */}
                            {selectedSlot && (
                                <div className="mt-5 pt-4 border-t">
                                    <div className="flex justify-between text-sm mb-3">
                                        <span>{mockDays[selectedDay].label} às {selectedSlot}</span>
                                        <span className="font-medium">R$ {mockDoctor.fee}</span>
                                    </div>
                                    <button className="w-full py-2 bg-gray-900 text-white text-sm rounded">
                                        Confirmar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default DoctoraliaTpl5
