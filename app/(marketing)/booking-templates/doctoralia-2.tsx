'use client'

import { useState } from 'react'

// Mock Data
const mockClinic = { name: 'Clínica Saúde Total' }
const mockDoctor = {
    id: '1',
    name: 'Dr. Mauricio Pereira Lopes',
    specialty: 'Psiquiatria',
    subspecialties: ['Transtornos de Ansiedade', 'Depressão', 'TDAH'],
    crm: 'CRM/SP 000000',
    rating: 5.0,
    reviews: 12,
    fee: 450,
    telePrice: 400,
    tele: true,
    bio: 'Especialista em Psiquiatria pela USP com mais de 15 anos de experiência.',
    address: 'Av. Paulista, 1000 - Sala 801',
    city: 'São Paulo - SP',
    education: ['Medicina - USP', 'Residência - HC-FMUSP'],
    insurances: ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'Porto Seguro']
}

const mockDays = [
    { weekday: 'Hoje', day: 8, month: 'fev', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
    { weekday: 'Amanhã', day: 9, month: 'fev', slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00'] },
    { weekday: 'Ter', day: 10, month: 'fev', slots: ['09:00', '10:00', '14:00'] },
    { weekday: 'Qua', day: 11, month: 'fev', slots: ['08:00', '09:00', '10:00'] },
    { weekday: 'Qui', day: 12, month: 'fev', slots: ['14:00', '15:00', '16:00'] }
]

/**
 * Template Doctoralia Style 2
 * Layout mais compacto, tabs para presencial/online, visual mais denso
 */
export function DoctoraliaTpl2() {
    const [selectedDay, setSelectedDay] = useState(0)
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
    const [appointmentType, setAppointmentType] = useState<'presencial' | 'online'>('presencial')

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="h-12 border-b bg-white sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
                    <span className="text-sm font-medium">{mockClinic.name}</span>
                    <div className="flex items-center gap-3">
                        <button className="text-xs text-gray-500">Ajuda</button>
                        <button className="text-xs font-medium text-teal-600">Entrar</button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 py-5">
                <div className="flex gap-5">
                    {/* LEFT: Perfil Compacto */}
                    <div className="w-80 flex-shrink-0">
                        <div className="border rounded-lg overflow-hidden sticky top-16">
                            {/* Header */}
                            <div className="p-4 bg-gray-50 border-b">
                                <div className="flex gap-3">
                                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-500">
                                        MP
                                    </div>
                                    <div>
                                        <h1 className="font-semibold text-sm">{mockDoctor.name}</h1>
                                        <p className="text-xs text-gray-500">{mockDoctor.specialty}</p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <span className="text-yellow-500 text-xs">★</span>
                                            <span className="text-xs font-medium">{mockDoctor.rating}</span>
                                            <span className="text-xs text-gray-400">({mockDoctor.reviews})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Especialidades */}
                            <div className="p-3 border-b">
                                <p className="text-xs font-medium text-gray-500 mb-1.5">Especialidades</p>
                                <div className="flex flex-wrap gap-1">
                                    {mockDoctor.subspecialties.map(s => (
                                        <span key={s} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-xs rounded">{s}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Registro */}
                            <div className="p-3 border-b">
                                <p className="text-xs font-medium text-gray-500 mb-1">Registro</p>
                                <p className="text-xs text-gray-700">{mockDoctor.crm}</p>
                            </div>

                            {/* Formação */}
                            <div className="p-3 border-b">
                                <p className="text-xs font-medium text-gray-500 mb-1">Formação</p>
                                {mockDoctor.education.map((e, i) => (
                                    <p key={i} className="text-xs text-gray-700">• {e}</p>
                                ))}
                            </div>

                            {/* Convênios */}
                            <div className="p-3 border-b">
                                <p className="text-xs font-medium text-gray-500 mb-1.5">Convênios aceitos</p>
                                <div className="flex flex-wrap gap-1">
                                    {mockDoctor.insurances.slice(0, 4).map(ins => (
                                        <span key={ins} className="px-1.5 py-0.5 bg-gray-100 text-xs rounded">{ins}</span>
                                    ))}
                                    {mockDoctor.insurances.length > 4 && (
                                        <span className="px-1.5 py-0.5 text-xs text-teal-600">+{mockDoctor.insurances.length - 4}</span>
                                    )}
                                </div>
                            </div>

                            {/* Endereço */}
                            <div className="p-3">
                                <p className="text-xs font-medium text-gray-500 mb-1">Endereço</p>
                                <p className="text-xs text-gray-700">{mockDoctor.address}</p>
                                <p className="text-xs text-gray-500">{mockDoctor.city}</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Agenda */}
                    <div className="flex-1">
                        {/* Tabs: Presencial / Online */}
                        <div className="flex border-b mb-4">
                            <button
                                onClick={() => setAppointmentType('presencial')}
                                className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${appointmentType === 'presencial'
                                        ? 'border-teal-600 text-teal-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                📍 Presencial - R$ {mockDoctor.fee}
                            </button>
                            <button
                                onClick={() => setAppointmentType('online')}
                                className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${appointmentType === 'online'
                                        ? 'border-teal-600 text-teal-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                📹 Teleconsulta - R$ {mockDoctor.telePrice}
                            </button>
                        </div>

                        {/* Calendário */}
                        <div className="border rounded-lg p-4">
                            <p className="text-sm font-medium mb-3">Escolha o dia</p>
                            <div className="flex gap-2 mb-5">
                                {mockDays.map((d, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setSelectedDay(i); setSelectedSlot(null) }}
                                        className={`flex-1 py-2 rounded text-center transition-colors ${selectedDay === i
                                                ? 'bg-teal-600 text-white'
                                                : 'bg-gray-50 hover:bg-gray-100'
                                            }`}
                                    >
                                        <p className="text-xs">{d.weekday}</p>
                                        <p className="text-sm font-semibold">{d.day}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Horários */}
                            <p className="text-sm font-medium mb-2">Horários disponíveis</p>
                            <div className="grid grid-cols-5 gap-2">
                                {mockDays[selectedDay].slots.map(slot => (
                                    <button
                                        key={slot}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`py-2 rounded text-sm transition-colors ${selectedSlot === slot
                                                ? 'bg-teal-600 text-white'
                                                : 'bg-gray-100 hover:bg-teal-50'
                                            }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Resumo + Confirmar */}
                        {selectedSlot && (
                            <div className="mt-4 border rounded-lg p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-xs text-gray-500">Agendamento</p>
                                        <p className="text-sm font-medium">
                                            {mockDays[selectedDay].day} {mockDays[selectedDay].month} às {selectedSlot}
                                            {appointmentType === 'online' && ' (Online)'}
                                        </p>
                                    </div>
                                    <p className="text-lg font-semibold text-teal-600">
                                        R$ {appointmentType === 'online' ? mockDoctor.telePrice : mockDoctor.fee}
                                    </p>
                                </div>
                                <button className="w-full py-2.5 bg-teal-600 text-white rounded text-sm font-medium hover:bg-teal-700">
                                    Confirmar Agendamento
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

export default DoctoraliaTpl2
