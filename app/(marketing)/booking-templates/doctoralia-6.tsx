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
    address: 'Av. Paulista, 1000 - Sala 801',
    city: 'São Paulo - SP',
    education: ['Medicina - USP', 'Residência - HC-FMUSP'],
    insurances: ['Unimed', 'Bradesco', 'SulAmérica', 'Amil']
}

const mockDays = [
    { weekday: 'Dom', day: '08/02', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
    { weekday: 'Seg', day: '09/02', slots: ['08:00', '09:00', '10:00', '11:00', '14:00'] },
    { weekday: 'Ter', day: '10/02', slots: ['09:00', '10:00', '14:00'] },
    { weekday: 'Qua', day: '11/02', slots: ['08:00', '09:00', '10:00'] }
]

/**
 * Template 6: Minimalista Puro
 * Máxima simplicidade, layout horizontal, sem bordas arredondadas, preto e branco
 */
export function DoctoraliaTpl6() {
    const [selectedDay, setSelectedDay] = useState(0)
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="h-10 border-b">
                <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
                    <span className="text-xs font-medium">{mockClinic.name}</span>
                    <span className="text-xs text-gray-400">Agendamento</span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Perfil Horizontal */}
                <div className="border-b pb-5 mb-5">
                    <div className="flex gap-4 items-start">
                        <div className="w-16 h-16 bg-gray-100 flex items-center justify-center text-sm font-medium">MP</div>
                        <div className="flex-1">
                            <h1 className="font-medium">{mockDoctor.name}</h1>
                            <p className="text-sm text-gray-500">{mockDoctor.specialty} - {mockDoctor.crm}</p>
                            <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                <span>Nota {mockDoctor.rating} ({mockDoctor.reviews} opiniões)</span>
                                <span>|</span>
                                <span>{mockDoctor.address}, {mockDoctor.city}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-medium">R$ {mockDoctor.fee}</p>
                            <p className="text-xs text-gray-500">por consulta</p>
                            {mockDoctor.tele && <p className="text-xs text-gray-400 mt-1">Teleconsulta disponível</p>}
                        </div>
                    </div>
                </div>

                {/* Info em linha */}
                <div className="flex gap-8 text-xs border-b pb-5 mb-5">
                    <div>
                        <p className="text-gray-400 mb-1">Especialidades</p>
                        <p>{mockDoctor.subspecialties.join(', ')}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 mb-1">Formação</p>
                        <p>{mockDoctor.education.join(' | ')}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 mb-1">Convênios</p>
                        <p>{mockDoctor.insurances.join(', ')}</p>
                    </div>
                </div>

                {/* Agenda */}
                <div>
                    <p className="text-sm font-medium mb-4">Horários Disponíveis</p>

                    {/* Dias em abas */}
                    <div className="flex border-b mb-4">
                        {mockDays.map((d, i) => (
                            <button
                                key={i}
                                onClick={() => { setSelectedDay(i); setSelectedSlot(null) }}
                                className={`px-4 py-2 text-xs border-b-2 ${selectedDay === i
                                        ? 'border-black font-medium'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {d.weekday} {d.day}
                            </button>
                        ))}
                    </div>

                    {/* Horários em linha */}
                    <div className="flex flex-wrap gap-2">
                        {mockDays[selectedDay].slots.map(slot => (
                            <button
                                key={slot}
                                onClick={() => setSelectedSlot(slot)}
                                className={`px-4 py-2 text-sm border ${selectedSlot === slot
                                        ? 'bg-black text-white border-black'
                                        : 'hover:border-black'
                                    }`}
                            >
                                {slot}
                            </button>
                        ))}
                    </div>

                    {/* Confirmar */}
                    {selectedSlot && (
                        <div className="mt-6 pt-4 border-t flex items-center justify-between">
                            <div className="text-sm">
                                <span className="text-gray-500">Agendamento: </span>
                                <span>{mockDays[selectedDay].weekday} {mockDays[selectedDay].day} às {selectedSlot}</span>
                            </div>
                            <button className="px-6 py-2 bg-black text-white text-sm">
                                Confirmar - R$ {mockDoctor.fee}
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default DoctoraliaTpl6
