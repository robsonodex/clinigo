'use client'

import { useState } from 'react'

// Mock Data
const mockClinic = { name: 'Clínica Saúde Total' }
const mockDoctor = {
    id: '1',
    name: 'Dr. Mauricio Pereira Lopes',
    specialty: 'Psiquiatria',
    crm: 'CRM/SP 000000',
    rating: 5.0,
    reviews: 12,
    fee: 450,
    tele: true,
    bio: 'Especialista em Psiquiatria pela USP com mais de 15 anos de experiência. Atendimento humanizado focado em ansiedade, depressão e transtornos de humor.',
    address: 'Av. Paulista, 1000 - Sala 801, Bela Vista, São Paulo - SP',
    education: ['Medicina - USP (2005)', 'Residência Psiquiatria - HC-FMUSP (2009)'],
    languages: ['Português', 'Inglês'],
    insurances: ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil']
}

const mockDays = [
    { weekday: 'Dom', day: 8, month: 'fev', slots: ['09:00', '10:00', '11:00', '14:00', '15:00'] },
    { weekday: 'Seg', day: 9, month: 'fev', slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
    { weekday: 'Ter', day: 10, month: 'fev', slots: ['09:00', '10:00', '14:00', '15:00'] },
    { weekday: 'Qua', day: 11, month: 'fev', slots: ['08:00', '09:00', '10:00', '11:00'] },
    { weekday: 'Qui', day: 12, month: 'fev', slots: ['14:00', '15:00', '16:00', '17:00'] }
]

/**
 * Template Doctoralia Style 1
 * Perfil completo do médico à esquerda, calendário compacto à direita
 */
export function DoctoraliaTpl1() {
    const [selectedDay, setSelectedDay] = useState(0)
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Compacto */}
            <header className="h-14 bg-white border-b sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-sm">{mockClinic.name}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-sm text-gray-500">Agendamento Online</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="text-sm text-gray-600 hover:text-gray-900">Ajuda</button>
                        <button className="h-8 px-4 bg-teal-600 text-white text-sm rounded hover:bg-teal-700">Entrar</button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex gap-6">
                    {/* LEFT: Perfil do Médico */}
                    <div className="w-[400px] flex-shrink-0">
                        <div className="bg-white rounded-lg border p-5 sticky top-20">
                            {/* Header do Perfil */}
                            <div className="flex gap-4 pb-4 border-b">
                                <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-xl font-semibold text-gray-400">
                                    MP
                                </div>
                                <div className="flex-1">
                                    <h1 className="font-semibold text-lg">{mockDoctor.name}</h1>
                                    <p className="text-sm text-gray-600">{mockDoctor.specialty}</p>
                                    <p className="text-xs text-gray-400">{mockDoctor.crm}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                        <span className="text-yellow-500 text-sm">★★★★★</span>
                                        <span className="text-sm font-medium">{mockDoctor.rating}</span>
                                        <span className="text-xs text-gray-400">({mockDoctor.reviews} opiniões)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Preço e Teleconsulta */}
                            <div className="py-4 border-b">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-gray-500">Valor da consulta</p>
                                        <p className="text-xl font-semibold text-teal-600">R$ {mockDoctor.fee}</p>
                                    </div>
                                    {mockDoctor.tele && (
                                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                                            📹 Vídeo disponível
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Sobre */}
                            <div className="py-4 border-b">
                                <h3 className="text-sm font-semibold mb-2">Sobre</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">{mockDoctor.bio}</p>
                            </div>

                            {/* Formação */}
                            <div className="py-4 border-b">
                                <h3 className="text-sm font-semibold mb-2">Formação</h3>
                                <ul className="space-y-1">
                                    {mockDoctor.education.map((edu, i) => (
                                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                            <span className="text-teal-500">✓</span> {edu}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Convênios */}
                            <div className="py-4 border-b">
                                <h3 className="text-sm font-semibold mb-2">Convênios aceitos</h3>
                                <div className="flex flex-wrap gap-1">
                                    {mockDoctor.insurances.map(ins => (
                                        <span key={ins} className="px-2 py-1 bg-gray-100 text-xs rounded">{ins}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Idiomas */}
                            <div className="py-4 border-b">
                                <h3 className="text-sm font-semibold mb-2">Idiomas</h3>
                                <p className="text-sm text-gray-600">{mockDoctor.languages.join(', ')}</p>
                            </div>

                            {/* Endereço */}
                            <div className="pt-4">
                                <h3 className="text-sm font-semibold mb-2">Localização</h3>
                                <p className="text-sm text-gray-600">📍 {mockDoctor.address}</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Calendário/Agenda */}
                    <div className="flex-1">
                        <div className="bg-white rounded-lg border p-5">
                            <h2 className="font-semibold mb-4">Agendar Consulta</h2>

                            {/* Seletor de Dias */}
                            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                                {mockDays.map((d, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedDay(i)}
                                        className={`flex-shrink-0 w-16 py-3 rounded-lg text-center transition-colors ${selectedDay === i
                                                ? 'bg-teal-600 text-white'
                                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        <p className="text-xs uppercase">{d.weekday}</p>
                                        <p className="text-lg font-semibold">{d.day}</p>
                                        <p className="text-xs">{d.month}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Grade de Horários */}
                            <div>
                                <p className="text-sm text-gray-500 mb-3">
                                    {mockDays[selectedDay].slots.length} horários disponíveis
                                </p>
                                <div className="grid grid-cols-4 gap-2">
                                    {mockDays[selectedDay].slots.map(slot => (
                                        <button
                                            key={slot}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`py-2.5 rounded text-sm font-medium transition-colors ${selectedSlot === slot
                                                    ? 'bg-teal-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-teal-50 hover:text-teal-700'
                                                }`}
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Botão Confirmar */}
                            {selectedSlot && (
                                <div className="mt-6 pt-6 border-t">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Horário selecionado</p>
                                            <p className="font-semibold">{mockDays[selectedDay].weekday}, {mockDays[selectedDay].day} {mockDays[selectedDay].month} às {selectedSlot}</p>
                                        </div>
                                        <p className="text-xl font-semibold text-teal-600">R$ {mockDoctor.fee}</p>
                                    </div>
                                    <button className="w-full py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700">
                                        Confirmar Agendamento
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Aviso */}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-700">
                                💡 Você receberá confirmação por e-mail e WhatsApp após o agendamento.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export default DoctoraliaTpl1
