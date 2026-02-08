'use client'

import { useState } from 'react'

// Mock Data
const mockClinic = { name: 'Clínica Saúde Total' }
const mockDoctor = {
    name: 'Dr. Mauricio Pereira Lopes',
    specialty: 'Psiquiatria',
    subspecialties: ['Ansiedade', 'Depressão', 'TDAH'],
    crm: 'CRM/SP 000000',
    rating: 5.0,
    reviews: 12,
    fee: 450,
    tele: true,
    bio: 'Especialista em Psiquiatria pela USP com 15 anos de experiência.',
    address: 'Av. Paulista, 1000 - Sala 801',
    city: 'São Paulo - SP',
    education: ['Medicina - USP', 'Residência - HC-FMUSP'],
    insurances: ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil']
}

const mockDays = [
    { weekday: 'Dom', day: 8, month: 'fev', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
    { weekday: 'Seg', day: 9, month: 'fev', slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00'] },
    { weekday: 'Ter', day: 10, month: 'fev', slots: ['09:00', '10:00', '14:00'] },
    { weekday: 'Qua', day: 11, month: 'fev', slots: ['08:00', '09:00', '10:00'] },
    { weekday: 'Qui', day: 12, month: 'fev', slots: ['14:00', '15:00', '16:00'] }
]

/**
 * Template 4: Ultra Simples
 * Sem emojis, sem gradientes, layout direto e funcional
 */
export function DoctoraliaTpl4() {
    const [selectedDay, setSelectedDay] = useState(0)
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="h-12 border-b">
                <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
                    <span className="text-sm font-medium">{mockClinic.name}</span>
                    <button className="text-sm text-gray-600">Entrar</button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-6">
                <div className="flex gap-6">
                    {/* LEFT: Perfil */}
                    <div className="w-80 flex-shrink-0">
                        <div className="border rounded-lg sticky top-16">
                            {/* Info básica */}
                            <div className="p-4 border-b">
                                <div className="flex gap-3">
                                    <div className="w-14 h-14 rounded bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500">
                                        MP
                                    </div>
                                    <div>
                                        <h1 className="font-medium">{mockDoctor.name}</h1>
                                        <p className="text-sm text-gray-500">{mockDoctor.specialty}</p>
                                        <p className="text-xs text-gray-400">{mockDoctor.crm}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Avaliação e Preço */}
                            <div className="p-4 border-b flex justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Avaliação</p>
                                    <p className="text-sm">{mockDoctor.rating} ({mockDoctor.reviews} opiniões)</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Valor</p>
                                    <p className="text-sm font-medium">R$ {mockDoctor.fee}</p>
                                </div>
                            </div>

                            {/* Sobre */}
                            <div className="p-4 border-b">
                                <p className="text-xs font-medium text-gray-500 mb-1">Sobre</p>
                                <p className="text-sm text-gray-600">{mockDoctor.bio}</p>
                            </div>

                            {/* Especialidades */}
                            <div className="p-4 border-b">
                                <p className="text-xs font-medium text-gray-500 mb-2">Áreas de atuação</p>
                                <div className="flex flex-wrap gap-1">
                                    {mockDoctor.subspecialties.map(s => (
                                        <span key={s} className="px-2 py-0.5 bg-gray-100 text-xs rounded">{s}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Formação */}
                            <div className="p-4 border-b">
                                <p className="text-xs font-medium text-gray-500 mb-1">Formação</p>
                                {mockDoctor.education.map((e, i) => (
                                    <p key={i} className="text-sm text-gray-600">- {e}</p>
                                ))}
                            </div>

                            {/* Convênios */}
                            <div className="p-4 border-b">
                                <p className="text-xs font-medium text-gray-500 mb-2">Convênios</p>
                                <p className="text-sm text-gray-600">{mockDoctor.insurances.join(', ')}</p>
                            </div>

                            {/* Endereço */}
                            <div className="p-4">
                                <p className="text-xs font-medium text-gray-500 mb-1">Endereço</p>
                                <p className="text-sm text-gray-600">{mockDoctor.address}</p>
                                <p className="text-sm text-gray-500">{mockDoctor.city}</p>
                            </div>

                            {/* Teleconsulta */}
                            {mockDoctor.tele && (
                                <div className="p-4 border-t bg-gray-50">
                                    <p className="text-sm text-gray-600">Teleconsulta disponível</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: Agenda */}
                    <div className="flex-1">
                        <div className="border rounded-lg p-5">
                            <h2 className="font-medium mb-4">Agendar Consulta</h2>

                            {/* Dias */}
                            <p className="text-xs text-gray-500 mb-2">Escolha o dia</p>
                            <div className="flex gap-2 mb-5">
                                {mockDays.map((d, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setSelectedDay(i); setSelectedSlot(null) }}
                                        className={`flex-1 py-2 border rounded text-center ${selectedDay === i
                                                ? 'bg-gray-900 text-white border-gray-900'
                                                : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        <p className="text-xs">{d.weekday}</p>
                                        <p className="text-sm font-medium">{d.day}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Horários */}
                            <p className="text-xs text-gray-500 mb-2">Horários disponíveis ({mockDays[selectedDay].slots.length})</p>
                            <div className="grid grid-cols-4 gap-2">
                                {mockDays[selectedDay].slots.map(slot => (
                                    <button
                                        key={slot}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`py-2 border rounded text-sm ${selectedSlot === slot
                                                ? 'bg-gray-900 text-white border-gray-900'
                                                : 'hover:bg-gray-50'
                                            }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>

                            {/* Confirmar */}
                            {selectedSlot && (
                                <div className="mt-6 pt-4 border-t">
                                    <div className="flex justify-between mb-4">
                                        <div>
                                            <p className="text-xs text-gray-500">Agendamento</p>
                                            <p className="text-sm">{mockDays[selectedDay].weekday}, {mockDays[selectedDay].day} {mockDays[selectedDay].month} - {selectedSlot}</p>
                                        </div>
                                        <p className="text-lg font-medium">R$ {mockDoctor.fee}</p>
                                    </div>
                                    <button className="w-full py-2.5 bg-gray-900 text-white rounded text-sm">
                                        Confirmar Agendamento
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

export default DoctoraliaTpl4
