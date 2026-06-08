'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { format, addDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api, type Doctor, type AvailableSlotsResponse } from '@/lib/api-client'
import { formatCurrency, getInitials, formatCPF, formatPhone } from '@/lib/utils'
import { toast } from 'sonner'

interface PageProps {
    params: Promise<{ clinic_slug: string; doctor_id: string }>
}

export default function DoctorProfilePage({ params }: PageProps) {
    const { clinic_slug, doctor_id } = use(params)
    const router = useRouter()
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [selectedTime, setSelectedTime] = useState<string | null>(null)
    const [showQuickBooking, setShowQuickBooking] = useState(false)
    const [pendingDate, setPendingDate] = useState<string | null>(null)
    const [pendingTime, setPendingTime] = useState<string | null>(null)

    // Fetch doctor data
    const { data: doctor, isLoading: doctorLoading } = useQuery({
        queryKey: ['doctor-profile', doctor_id],
        queryFn: () => api.get<Doctor>(`/doctors/detail?id=${doctor_id}&action=profile`),
    })

    // Fetch available slots when date is selected
    const { data: slotsData, isLoading: slotsLoading } = useQuery({
        queryKey: ['available-slots', doctor_id, selectedDate?.toISOString().split('T')[0]],
        queryFn: () =>
            api.get<AvailableSlotsResponse>('/appointments/available-slots', {
                doctor_id,
                date: selectedDate!.toISOString().split('T')[0],
            }),
        enabled: !!selectedDate,
    })

    // Generate next 7 days
    const today = startOfDay(new Date())
    const dates = Array.from({ length: 7 }, (_, i) => addDays(today, i))

    const handleTimeSelect = (time: string) => {
        if (!selectedDate) return
        setSelectedTime(time)
        const dateStr = format(selectedDate, 'yyyy-MM-dd')

        // Check if patient_token cookie exists
        const hasPatientToken = document.cookie.split(';').some(c => c.trim().startsWith('patient_token='))

        if (hasPatientToken) {
            // Authenticated patient — go to full confirmation flow
            router.push(`/${clinic_slug}/agendar/${doctor_id}/confirmar?date=${dateStr}&time=${time}`)
        } else {
            // Anonymous user — show quick booking modal
            setPendingDate(dateStr)
            setPendingTime(time)
            setShowQuickBooking(true)
        }
    }

    if (doctorLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-gray-500">Carregando...</p>
            </div>
        )
    }

    if (!doctor) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-gray-500">Medico nao encontrado</p>
            </div>
        )
    }

    const rating = doctor.rating || 5.0
    const reviewCount = doctor.review_count || 0
    const experienceYears = doctor.experience_years || 0
    const subspecialties = doctor.subspecialties || []
    const education = doctor.education || []
    const insurances = doctor.accepted_insurances || []
    const hasTele = doctor.display_settings?.show_teleconsulta || false

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="h-10 border-b">
                <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
                    <Link href={`/${clinic_slug}/agendar`} className="text-xs font-medium min-h-[44px] flex items-center">
                        Voltar
                    </Link>
                    <span className="text-xs text-gray-400">Agendamento</span>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Perfil Horizontal */}
                <div className="border-b pb-5 mb-5">
                    <div className="flex flex-col sm:flex-row gap-4 items-start justify-between">
                        <div className="flex gap-4 items-start flex-1 w-full">
                            {/* Avatar */}
                            {doctor.user.avatar_url ? (
                                <Image
                                    src={doctor.user.avatar_url}
                                    alt={doctor.user.full_name}
                                    width={64}
                                    height={64}
                                    className="w-16 h-16 rounded-full object-cover shrink-0"
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-sm font-medium shrink-0">
                                    {getInitials(doctor.user.full_name)}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <h1 className="font-semibold text-lg text-gray-900">{doctor.user.full_name}</h1>
                                <p className="text-sm text-gray-600">{doctor.specialty} - CRM {doctor.crm}/{doctor.crm_state}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                                    <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded font-medium">★ {rating.toFixed(1)} ({reviewCount} avaliações)</span>
                                    {experienceYears > 0 && (
                                        <>
                                            <span className="text-gray-300">|</span>
                                            <span>{experienceYears}+ anos de experiência</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="text-left sm:text-right w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 flex sm:flex-col justify-between items-center sm:items-end">
                            <div>
                                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(doctor.consultation_price)}</p>
                                <p className="text-xs text-gray-500">por consulta</p>
                            </div>
                            {hasTele && <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full sm:mt-2">Teleconsulta</span>}
                        </div>
                    </div>
                </div>

                {/* Info em linha */}
                <div className="flex gap-8 text-xs border-b pb-5 mb-5 flex-wrap">
                    {subspecialties.length > 0 && (
                        <div>
                            <p className="text-gray-400 mb-1">Especialidades</p>
                            <p>{subspecialties.join(', ')}</p>
                        </div>
                    )}
                    {education.length > 0 && (
                        <div>
                            <p className="text-gray-400 mb-1">Formacao</p>
                            <p>{education.join(' | ')}</p>
                        </div>
                    )}
                    {insurances.length > 0 && (
                        <div>
                            <p className="text-gray-400 mb-1">Convenios</p>
                            <p>{insurances.join(', ')}</p>
                        </div>
                    )}
                    {doctor.bio && (
                        <div>
                            <p className="text-gray-400 mb-1">Sobre</p>
                            <p className="max-w-md">{doctor.bio}</p>
                        </div>
                    )}
                </div>

                {/* Agenda */}
                <div>
                    <p className="text-sm font-medium mb-4">Horarios Disponiveis</p>

                    {/* Dias em abas */}
                    <div className="flex border-b mb-4 overflow-x-auto whitespace-nowrap scrollbar-none scroll-smooth">
                        {dates.map((date, i) => {
                            const isSelected = selectedDate?.toDateString() === date.toDateString()
                            const isToday = date.toDateString() === today.toDateString()
                            return (
                                <button
                                    key={date.toISOString()}
                                    onClick={() => {
                                        setSelectedDate(date)
                                        setSelectedTime(null)
                                    }}
                                    className={`px-4 py-2.5 text-xs font-medium border-b-2 shrink-0 transition-all min-h-[44px] ${isSelected
                                        ? 'border-emerald-600 text-emerald-600 font-semibold'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {isToday ? 'Hoje' : format(date, 'EEEE', { locale: ptBR })} {format(date, 'd/MM')}
                                </button>
                            )
                        })}
                    </div>

                    {/* Horarios */}
                    {!selectedDate && (
                        <p className="text-xs text-gray-400 py-8 text-center">
                            Selecione uma data acima para ver os horarios
                        </p>
                    )}

                    {selectedDate && slotsLoading && (
                        <p className="text-xs text-gray-400 py-8 text-center">Carregando horarios...</p>
                    )}

                    {selectedDate && !slotsLoading && !slotsData?.available_slots?.filter(s => s.available).length && (
                        <p className="text-xs text-gray-400 py-8 text-center">
                            Nenhum horario disponivel para esta data
                        </p>
                    )}

                    {selectedDate && !slotsLoading && slotsData?.available_slots && (
                        <div className="flex flex-wrap gap-2">
                            {slotsData.available_slots
                                .filter(slot => slot.available)
                                .map(slot => (
                                    <button
                                        key={slot.time}
                                        onClick={() => handleTimeSelect(slot.time)}
                                        className={`px-4 py-2 text-sm border min-h-[44px] ${selectedTime === slot.time
                                            ? 'bg-black text-white border-black'
                                            : 'hover:border-black'
                                            }`}
                                    >
                                        {slot.time}
                                    </button>
                                ))}
                        </div>
                    )}

                    {/* Confirmar (for authenticated patients only) */}
                    {selectedTime && selectedDate && !showQuickBooking && (
                        <div className="mt-6 pt-4 border-t flex items-center justify-between">
                            <div className="text-sm">
                                <span className="text-gray-500">Agendamento: </span>
                                <span>{format(selectedDate, "EEE d/MM", { locale: ptBR })} as {selectedTime}</span>
                            </div>
                            <button
                                onClick={() => handleTimeSelect(selectedTime)}
                                className="px-6 py-2 bg-black text-white text-sm min-h-[44px]"
                            >
                                Confirmar - {formatCurrency(doctor.consultation_price)}
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Quick Booking Modal (anonymous users) */}
            {showQuickBooking && pendingDate && pendingTime && (
                <QuickBookingModal
                    clinicSlug={clinic_slug}
                    doctorId={doctor_id}
                    doctorName={doctor.user.full_name}
                    date={pendingDate}
                    time={pendingTime}
                    price={doctor.consultation_price}
                    onClose={() => {
                        setShowQuickBooking(false)
                        setPendingDate(null)
                        setPendingTime(null)
                    }}
                />
            )}
        </div>
    )
}

// ============================================
// Quick Booking Modal — Agendamento sem login
// ============================================

interface QuickBookingModalProps {
    clinicSlug: string
    doctorId: string
    doctorName: string
    date: string
    time: string
    price: number
    onClose: () => void
}

function QuickBookingModal({ clinicSlug, doctorId, doctorName, date, time, price, onClose }: QuickBookingModalProps) {
    const router = useRouter()
    const [fullName, setFullName] = useState('')
    const [cpf, setCpf] = useState('')
    const [phone, setPhone] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const handleCpfChange = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11)
        setCpf(formatCPF(digits))
    }

    const handlePhoneChange = (value: string) => {
        const digits = value.replace(/\D/g, '').slice(0, 11)
        setPhone(formatPhone(digits))
    }

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {}
        if (!fullName.trim() || fullName.trim().length < 3) {
            newErrors.fullName = 'Nome completo é obrigatório (mínimo 3 caracteres)'
        }
        const cpfDigits = cpf.replace(/\D/g, '')
        if (cpfDigits.length !== 11) {
            newErrors.cpf = 'CPF deve ter 11 dígitos'
        }
        const phoneDigits = phone.replace(/\D/g, '')
        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            newErrors.phone = 'Telefone inválido'
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const { mutate: submitBooking, isPending } = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clinic_slug: clinicSlug,
                    doctor_id: doctorId,
                    appointment_date: date,
                    appointment_time: time,
                    payment_type: 'PARTICULAR',
                    patient: {
                        cpf: cpf.replace(/\D/g, ''),
                        full_name: fullName.trim(),
                        email: '', // Not required for quick booking
                        phone: phone.replace(/\D/g, ''),
                    },
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error?.message || data.error || 'Erro ao agendar')
            }
            return data
        },
        onSuccess: (data) => {
            setSubmitted(true)
            toast.success('Agendamento realizado com sucesso!')
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Erro ao criar agendamento')
        },
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!validate()) return
        submitBooking()
    }

    const formattedDate = (() => {
        try {
            const [y, m, d] = date.split('-').map(Number)
            const dateObj = new Date(y, m - 1, d)
            return format(dateObj, "EEEE, d 'de' MMMM", { locale: ptBR })
        } catch {
            return date
        }
    })()

    // Success state
    if (submitted) {
        return (
            <div
                className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
                onClick={onClose}
            >
                <div
                    className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 animate-in slide-in-from-bottom"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Agendamento realizado!</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Você receberá uma confirmação em breve.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full h-12 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <div
                className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Handle bar (mobile) */}
                <div className="flex justify-center pt-3 sm:hidden">
                    <div className="w-10 h-1 bg-gray-300 rounded-full" />
                </div>

                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Agendar consulta</h3>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px]"
                            aria-label="Fechar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Appointment summary */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm">
                        <p className="font-medium text-gray-800">Dr(a). {doctorName}</p>
                        <p className="text-gray-500 mt-1 capitalize">{formattedDate} às {time}</p>
                        <p className="text-emerald-600 font-semibold mt-1">{formatCurrency(price)}</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="qb-name" className="block text-sm font-medium text-gray-700 mb-1">
                                Nome completo *
                            </label>
                            <input
                                id="qb-name"
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Seu nome completo"
                                className={`w-full h-12 px-4 rounded-lg border text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${errors.fullName ? 'border-red-400' : 'border-gray-300'}`}
                                style={{ fontSize: '16px' }}
                                autoComplete="name"
                            />
                            {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                        </div>

                        <div>
                            <label htmlFor="qb-cpf" className="block text-sm font-medium text-gray-700 mb-1">
                                CPF *
                            </label>
                            <input
                                id="qb-cpf"
                                type="text"
                                value={cpf}
                                onChange={e => handleCpfChange(e.target.value)}
                                placeholder="000.000.000-00"
                                inputMode="numeric"
                                className={`w-full h-12 px-4 rounded-lg border text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${errors.cpf ? 'border-red-400' : 'border-gray-300'}`}
                                style={{ fontSize: '16px' }}
                            />
                            {errors.cpf && <p className="text-xs text-red-500 mt-1">{errors.cpf}</p>}
                        </div>

                        <div>
                            <label htmlFor="qb-phone" className="block text-sm font-medium text-gray-700 mb-1">
                                Telefone *
                            </label>
                            <input
                                id="qb-phone"
                                type="tel"
                                value={phone}
                                onChange={e => handlePhoneChange(e.target.value)}
                                placeholder="(00) 00000-0000"
                                inputMode="tel"
                                className={`w-full h-12 px-4 rounded-lg border text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${errors.phone ? 'border-red-400' : 'border-gray-300'}`}
                                style={{ fontSize: '16px' }}
                            />
                            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isPending}
                                className="w-full h-12 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isPending ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Agendando...
                                    </>
                                ) : (
                                    'Confirmar agendamento'
                                )}
                            </button>
                        </div>

                        <p className="text-xs text-gray-400 text-center">
                            Ou{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    onClose()
                                    // Navigate to full confirmation page
                                    window.location.href = `/${clinicSlug}/agendar/${doctorId}/confirmar?date=${date}&time=${time}`
                                }}
                                className="text-emerald-600 hover:text-emerald-700 font-medium"
                            >
                                preencha o formulário completo
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    )
}
