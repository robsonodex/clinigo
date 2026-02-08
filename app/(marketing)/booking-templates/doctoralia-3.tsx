'use client'

import { useState } from 'react'

// Mock Data
const mockClinic = { name: 'Clínica Saúde Total' }
const mockDoctor = {
    name: 'Dr. Mauricio Pereira Lopes',
    specialty: 'Psiquiatria',
    subspecialties: ['Ansiedade', 'Depressão', 'TDAH', 'Transtorno Bipolar'],
    crm: 'CRM/SP 000000',
    rating: 5.0,
    reviews: 12,
    fee: 450,
    tele: true,
    bio: 'Especialista em Psiquiatria pela USP com mais de 15 anos de experiência. Atendimento humanizado focado em saúde mental.',
    address: 'Av. Paulista, 1000 - Sala 801, Bela Vista',
    city: 'São Paulo - SP',
    education: ['Medicina - USP (2005)', 'Especialização Psiquiatria - HC-FMUSP (2009)', 'MBA Gestão em Saúde - FGV (2015)'],
    insurances: ['Unimed', 'Bradesco Saúde', 'SulAmérica', 'Amil', 'Porto Seguro', 'NotreDame'],
    experience: '15+ anos',
    languages: ['Português', 'Inglês']
}

const mockDays = [
    { label: 'Hoje', day: 8, month: 'fev', slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
    { label: 'Seg', day: 9, month: 'fev', slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'] },
    { label: 'Ter', day: 10, month: 'fev', slots: ['09:00', '10:00', '14:00', '15:00'] },
    { label: 'Qua', day: 11, month: 'fev', slots: ['08:00', '09:00', '10:00', '11:00', '14:00'] },
    { label: 'Qui', day: 12, month: 'fev', slots: ['14:00', '15:00', '16:00', '17:00'] },
    { label: 'Sex', day: 13, month: 'fev', slots: ['08:00', '09:00', '10:00'] }
]

/**
 * Template Doctoralia Style 3
 * Visual mais elaborado com seções expandíveis, badge de verificado
 */
export function DoctoraliaTpl3() {
    const [selectedDay, setSelectedDay] = useState(0)
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
    const [expandedSection, setExpandedSection] = useState<string | null>('about')

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="h-14 bg-white border-b sticky top-0 z-50 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold">{mockClinic.name}</span>
                    </div>
                    <button className="h-8 px-4 bg-teal-600 text-white text-sm rounded-full hover:bg-teal-700">
                        Entrar
                    </button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-6">
                <div className="flex gap-6">
                    {/* LEFT: Perfil Completo */}
                    <div className="w-[420px] flex-shrink-0">
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden sticky top-20">
                            {/* Header com foto e info básica */}
                            <div className="p-5 bg-gradient-to-r from-teal-600 to-teal-700 text-white">
                                <div className="flex gap-4">
                                    <div className="w-20 h-20 rounded-xl bg-white/20 flex items-center justify-center text-xl font-bold">
                                        MP
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h1 className="font-semibold text-lg">{mockDoctor.name}</h1>
                                            <span className="px-1.5 py-0.5 bg-white/20 rounded text-xs">✓ Verificado</span>
                                        </div>
                                        <p className="text-teal-100 text-sm">{mockDoctor.specialty}</p>
                                        <p className="text-teal-200 text-xs mt-1">{mockDoctor.crm}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-yellow-300">★★★★★</span>
                                            <span className="text-sm">{mockDoctor.rating} ({mockDoctor.reviews} opiniões)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 border-b">
                                <div className="p-3 text-center border-r">
                                    <p className="text-lg font-semibold text-teal-600">{mockDoctor.experience}</p>
                                    <p className="text-xs text-gray-500">Experiência</p>
                                </div>
                                <div className="p-3 text-center border-r">
                                    <p className="text-lg font-semibold text-teal-600">{mockDoctor.reviews}</p>
                                    <p className="text-xs text-gray-500">Avaliações</p>
                                </div>
                                <div className="p-3 text-center">
                                    <p className="text-lg font-semibold text-teal-600">R$ {mockDoctor.fee}</p>
                                    <p className="text-xs text-gray-500">Consulta</p>
                                </div>
                            </div>

                            {/* Seções Expansíveis */}
                            <div className="divide-y">
                                {/* Sobre */}
                                <div>
                                    <button
                                        onClick={() => toggleSection('about')}
                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                                    >
                                        <span className="font-medium text-sm">Sobre o especialista</span>
                                        <span className="text-gray-400">{expandedSection === 'about' ? '−' : '+'}</span>
                                    </button>
                                    {expandedSection === 'about' && (
                                        <div className="px-4 pb-4">
                                            <p className="text-sm text-gray-600 leading-relaxed">{mockDoctor.bio}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Especialidades */}
                                <div>
                                    <button
                                        onClick={() => toggleSection('specialties')}
                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                                    >
                                        <span className="font-medium text-sm">Áreas de atuação</span>
                                        <span className="text-gray-400">{expandedSection === 'specialties' ? '−' : '+'}</span>
                                    </button>
                                    {expandedSection === 'specialties' && (
                                        <div className="px-4 pb-4 flex flex-wrap gap-1">
                                            {mockDoctor.subspecialties.map(s => (
                                                <span key={s} className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-full">{s}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Formação */}
                                <div>
                                    <button
                                        onClick={() => toggleSection('education')}
                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                                    >
                                        <span className="font-medium text-sm">Formação acadêmica</span>
                                        <span className="text-gray-400">{expandedSection === 'education' ? '−' : '+'}</span>
                                    </button>
                                    {expandedSection === 'education' && (
                                        <div className="px-4 pb-4 space-y-1">
                                            {mockDoctor.education.map((e, i) => (
                                                <p key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                    <span className="text-teal-500 mt-0.5">🎓</span> {e}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Convênios */}
                                <div>
                                    <button
                                        onClick={() => toggleSection('insurance')}
                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                                    >
                                        <span className="font-medium text-sm">Convênios ({mockDoctor.insurances.length})</span>
                                        <span className="text-gray-400">{expandedSection === 'insurance' ? '−' : '+'}</span>
                                    </button>
                                    {expandedSection === 'insurance' && (
                                        <div className="px-4 pb-4 flex flex-wrap gap-1">
                                            {mockDoctor.insurances.map(ins => (
                                                <span key={ins} className="px-2 py-1 bg-gray-100 text-xs rounded">{ins}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Localização */}
                                <div>
                                    <button
                                        onClick={() => toggleSection('location')}
                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                                    >
                                        <span className="font-medium text-sm">Localização</span>
                                        <span className="text-gray-400">{expandedSection === 'location' ? '−' : '+'}</span>
                                    </button>
                                    {expandedSection === 'location' && (
                                        <div className="px-4 pb-4">
                                            <p className="text-sm text-gray-600">📍 {mockDoctor.address}</p>
                                            <p className="text-sm text-gray-500">{mockDoctor.city}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: Calendário */}
                    <div className="flex-1">
                        <div className="bg-white rounded-xl border shadow-sm p-6">
                            <h2 className="text-lg font-semibold mb-1">Agendar Consulta</h2>
                            <p className="text-sm text-gray-500 mb-5">Escolha a data e horário de sua preferência</p>

                            {/* Dias */}
                            <div className="flex gap-2 mb-6">
                                {mockDays.map((d, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setSelectedDay(i); setSelectedSlot(null) }}
                                        className={`flex-1 py-3 rounded-lg text-center transition-all ${selectedDay === i
                                                ? 'bg-teal-600 text-white shadow-md'
                                                : 'bg-gray-50 hover:bg-gray-100'
                                            }`}
                                    >
                                        <p className="text-xs font-medium">{d.label}</p>
                                        <p className="text-lg font-bold">{d.day}</p>
                                        <p className="text-xs opacity-70">{d.month}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Horários */}
                            <p className="text-sm text-gray-500 mb-3">{mockDays[selectedDay].slots.length} horários disponíveis</p>
                            <div className="grid grid-cols-4 gap-2">
                                {mockDays[selectedDay].slots.map(slot => (
                                    <button
                                        key={slot}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`py-3 rounded-lg text-sm font-medium transition-all ${selectedSlot === slot
                                                ? 'bg-teal-600 text-white shadow-md'
                                                : 'bg-gray-100 hover:bg-teal-50 hover:text-teal-700'
                                            }`}
                                    >
                                        {slot}
                                    </button>
                                ))}
                            </div>

                            {/* Teleconsulta Badge */}
                            {mockDoctor.tele && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                                    <span className="text-lg">📹</span>
                                    <div>
                                        <p className="text-sm font-medium text-blue-700">Teleconsulta disponível</p>
                                        <p className="text-xs text-blue-600">Atendimento por vídeo sem sair de casa</p>
                                    </div>
                                </div>
                            )}

                            {/* Confirmar */}
                            {selectedSlot && (
                                <div className="mt-6 pt-6 border-t">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Seu agendamento</p>
                                            <p className="font-semibold">{mockDays[selectedDay].label}, {mockDays[selectedDay].day} {mockDays[selectedDay].month} às {selectedSlot}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-teal-600">R$ {mockDoctor.fee}</p>
                                        </div>
                                    </div>
                                    <button className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 shadow-md">
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

export default DoctoraliaTpl3
