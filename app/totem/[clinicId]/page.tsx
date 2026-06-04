'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { InactivityTimer } from '@/components/totem/InactivityTimer'
import { Loader2 } from 'lucide-react'

type TotemStep = 'home' | 'select_priority' | 'identification' | 'ticket_result'

export default function TotemHomePage() {
    const router = useRouter()
    const params = useParams()
    const clinicId = params.clinicId as string

    const [currentTime, setCurrentTime] = useState(new Date())
    const [step, setStep] = useState<TotemStep>('home')
    const [priorityLevel, setPriorityLevel] = useState<number>(0) // 0: Normal, 1: Preferencial
    const [patientName, setPatientName] = useState('')
    const [cpf, setCpf] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [generatedTicket, setGeneratedTicket] = useState<{ ticket_number: string; patient_name: string } | null>(null)
    const [countdown, setCountdown] = useState(10)

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    // Countdown effect to return home on ticket result step
    useEffect(() => {
        if (step !== 'ticket_result') return
        setCountdown(12)
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    resetFlow()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [step])

    const timeStr = currentTime.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
    })

    const dateStr = currentTime.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'America/Sao_Paulo',
    })

    const resetFlow = () => {
        setStep('home')
        setPriorityLevel(0)
        setPatientName('')
        setCpf('')
        setErrorMsg('')
        setGeneratedTicket(null)
        setIsLoading(false)
    }

    const formatCpf = (value: string) => {
        const numbers = value.replace(/\D/g, '')
        return numbers
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1')
    }

    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatCpf(e.target.value)
        setCpf(formatted)
    }

    const handleGenerateTicket = async (skipIdentification: boolean) => {
        setIsLoading(true)
        setErrorMsg('')
        try {
            const payload = {
                clinic_id: clinicId,
                priority_level: priorityLevel,
                patient_name: skipIdentification ? '' : patientName,
                cpf: skipIdentification ? '' : cpf,
            }

            const res = await fetch('/api/totem/generate-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            if (res.ok && data.success) {
                setGeneratedTicket({
                    ticket_number: data.ticket_number,
                    patient_name: data.patient_name
                })
                setStep('ticket_result')
            } else {
                setErrorMsg(data.error || 'Falha ao gerar senha. Tente novamente.')
            }
        } catch (error) {
            console.error('Error generating ticket:', error)
            setErrorMsg('Erro de conexão ao gerar senha. Verifique com a recepção.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-8 select-none"
            style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
        >
            {/* Auto reset to home after inactivity */}
            {step !== 'ticket_result' && (
                <InactivityTimer redirectTo={() => resetFlow()} timeoutSeconds={60} />
            )}

            {/* Clock */}
            <div className="absolute top-6 right-6 md:top-10 md:right-12 text-right">
                <div className="text-2xl md:text-3xl font-light tracking-[0.2em] text-white/80 font-mono tabular-nums">
                    {timeStr}
                </div>
                <div className="text-xs md:text-sm text-white/30 capitalize mt-0.5">{dateStr}</div>
            </div>

            {/* Step 1: Main Menu */}
            {step === 'home' && (
                <div className="w-full flex flex-col items-center max-w-4xl" style={{ animation: 'fadeUp 0.4s ease-out' }}>
                    <div className="text-center mb-12 md:mb-16">
                        <h1 className="text-4xl md:text-6xl font-extralight text-white tracking-tight mb-3">
                            CliniGo
                        </h1>
                        <p className="text-base md:text-lg text-white/40 font-light">
                            Escolha o serviço desejado para iniciar
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl px-4">
                        {/* Facial Recognition */}
                        <button
                            onClick={() => router.push(`/totem/${clinicId}/face-checkin`)}
                            className="group relative rounded-2xl p-6 md:p-8 text-left transition-all duration-300 active:scale-[0.98] overflow-hidden min-h-[160px] cursor-pointer"
                            style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            <div className="mb-4">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
                                    <path d="M3 8V6a3 3 0 0 1 3-3h2" />
                                    <path d="M21 8V6a3 3 0 0 0-3-3h-2" />
                                    <path d="M3 16v2a3 3 0 0 0 3 3h2" />
                                    <path d="M21 16v2a3 3 0 0 1-3 3h-2" />
                                    <circle cx="9" cy="10" r="1" fill="currentColor" />
                                    <circle cx="15" cy="10" r="1" fill="currentColor" />
                                    <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
                                </svg>
                            </div>
                            <h2 className="text-lg md:text-xl font-medium text-white mb-1">Check-in Facial</h2>
                            <p className="text-xs md:text-sm text-white/40 font-light pr-4">
                                Identificação facial automática para consultas agendadas
                            </p>
                        </button>

                        {/* QR Code */}
                        <button
                            onClick={() => router.push(`/totem/${clinicId}/qr-code`)}
                            className="group relative rounded-2xl p-6 md:p-8 text-left transition-all duration-300 active:scale-[0.98] overflow-hidden min-h-[160px] cursor-pointer"
                            style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            <div className="mb-4">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sky-400">
                                    <rect x="3" y="3" width="7" height="7" rx="1" />
                                    <rect x="14" y="3" width="7" height="7" rx="1" />
                                    <rect x="3" y="14" width="7" height="7" rx="1" />
                                    <rect x="14" y="14" width="3" height="3" />
                                    <line x1="21" y1="14" x2="21" y2="21" />
                                    <line x1="14" y1="21" x2="21" y2="21" />
                                </svg>
                            </div>
                            <h2 className="text-lg md:text-xl font-medium text-white mb-1">QR Code</h2>
                            <p className="text-xs md:text-sm text-white/40 font-light pr-4">
                                Aproxime o QR Code do seu celular na câmera do totem
                            </p>
                        </button>

                        {/* Generate Ticket */}
                        <button
                            onClick={() => setStep('select_priority')}
                            className="group relative rounded-2xl p-6 md:p-8 text-left transition-all duration-300 active:scale-[0.98] overflow-hidden min-h-[160px] cursor-pointer"
                            style={{
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                backdropFilter: 'blur(20px)',
                            }}
                        >
                            <div className="mb-4">
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-400">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                            </div>
                            <h2 className="text-lg md:text-xl font-medium text-white mb-1">Retirar Senha</h2>
                            <p className="text-xs md:text-sm text-white/40 font-light pr-4">
                                Emita uma senha avulsa de atendimento ou triagem
                            </p>
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Select Priority */}
            {step === 'select_priority' && (
                <div className="w-full max-w-2xl px-4 flex flex-col items-center" style={{ animation: 'fadeUp 0.3s ease-out' }}>
                    <div className="text-center mb-10 md:mb-12">
                        <h2 className="text-3xl md:text-4xl font-extralight text-white mb-2">
                            Tipo de Atendimento
                        </h2>
                        <p className="text-sm md:text-base text-white/40 font-light">
                            Escolha abaixo conforme suas necessidades
                        </p>
                    </div>

                    <div className="flex flex-col gap-4 w-full">
                        {/* Normal ticket */}
                        <button
                            onClick={() => {
                                setPriorityLevel(0)
                                setStep('identification')
                            }}
                            className="w-full text-left p-6 rounded-xl border border-white/10 bg-white/5 active:scale-[0.99] transition-all hover:bg-white/10 cursor-pointer min-h-[80px]"
                        >
                            <div className="font-medium text-white text-lg">Atendimento Geral</div>
                            <div className="text-xs md:text-sm text-white/40 font-light mt-1">
                                Para triagem padrão, consultas agendadas, dúvidas ou recepção geral.
                            </div>
                        </button>

                        {/* Priority ticket */}
                        <button
                            onClick={() => {
                                setPriorityLevel(1)
                                setStep('identification')
                            }}
                            className="w-full text-left p-6 rounded-xl border border-amber-500/20 bg-amber-500/5 active:scale-[0.99] transition-all hover:bg-amber-500/10 cursor-pointer min-h-[80px]"
                        >
                            <div className="font-medium text-amber-400 text-lg flex items-center gap-2">
                                Atendimento Preferencial
                                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider">
                                    Prioridade Legal
                                </span>
                            </div>
                            <div className="text-xs md:text-sm text-white/40 font-light mt-1">
                                Idosos de 60+, gestantes, lactantes, autistas, pessoas com deficiência ou crianças de colo.
                            </div>
                        </button>
                    </div>

                    <div className="mt-8 flex justify-center w-full">
                        <button
                            onClick={() => setStep('home')}
                            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 active:scale-95 transition-all text-sm font-medium cursor-pointer min-h-[44px] min-w-[120px]"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Patient Identification */}
            {step === 'identification' && (
                <div className="w-full max-w-lg px-4 flex flex-col items-center" style={{ animation: 'fadeUp 0.3s ease-out' }}>
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-extralight text-white mb-2">
                            Identificação Opcional
                        </h2>
                        <p className="text-xs md:text-sm text-white/40 font-light">
                            Caso queira, insira seus dados para agilizar sua chamada
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="w-full mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-sm text-center">
                            {errorMsg}
                        </div>
                    )}

                    <div className="w-full flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-white/50 uppercase tracking-wider pl-1">
                                Nome Completo
                            </label>
                            <input
                                type="text"
                                placeholder="Digite seu nome (se preferir)"
                                value={patientName}
                                onChange={(e) => setPatientName(e.target.value)}
                                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-all text-base min-h-[48px]"
                                style={{ fontSize: '16px' }} // Regra PWA/Mobile: evita zoom no iOS
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-white/50 uppercase tracking-wider pl-1">
                                CPF (Apenas números)
                            </label>
                            <input
                                type="text"
                                placeholder="000.000.000-00"
                                value={cpf}
                                onChange={handleCpfChange}
                                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-all text-base min-h-[48px]"
                                style={{ fontSize: '16px' }} // Regra PWA/Mobile: evita zoom no iOS
                            />
                        </div>

                        <div className="flex flex-col gap-3 mt-6">
                            {isLoading ? (
                                <button
                                    disabled
                                    className="w-full py-4 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center gap-2 text-base font-semibold min-h-[50px]"
                                >
                                    <Loader2 className="w-5 height-5 animate-spin" />
                                    Gerando senha...
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => handleGenerateTicket(false)}
                                        disabled={!patientName.trim() && !cpf.trim()}
                                        className="w-full py-4 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-semibold active:scale-[0.98] transition-all text-base cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed min-h-[50px]"
                                    >
                                        Gerar Senha Identificada
                                    </button>

                                    <button
                                        onClick={() => handleGenerateTicket(true)}
                                        className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium active:scale-[0.98] transition-all text-base cursor-pointer min-h-[50px]"
                                    >
                                        Gerar Senha Rápida (Anônima)
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={() => setStep('select_priority')}
                                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 active:scale-95 transition-all text-sm font-medium cursor-pointer min-h-[44px] min-w-[100px]"
                            >
                                Voltar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 4: Ticket Result */}
            {step === 'ticket_result' && generatedTicket && (
                <div className="w-full max-w-lg px-4 flex flex-col items-center text-center" style={{ animation: 'fadeScale 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                    {/* Success Icon */}
                    <div className="mb-8">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-3xl font-extralight text-white mb-2">
                        Senha Gerada com Sucesso!
                    </h2>
                    <p className="text-sm text-white/40 mb-10 font-light">
                        Memorize seu número ou retire seu papel de senha
                    </p>

                    {/* Ticket Display */}
                    <div className="w-full py-10 px-8 rounded-2xl border border-white/10 bg-white/5 mb-10 relative overflow-hidden">
                        {/* Decorative tickets holes */}
                        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0f172a]" />
                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#0f172a]" />

                        <div className="text-white/30 text-xs font-mono tracking-[0.2em] uppercase mb-2">
                            Senha de Atendimento
                        </div>
                        <div className="text-6xl md:text-7xl font-bold font-mono tracking-wider text-amber-400 tabular-nums">
                            {generatedTicket.ticket_number}
                        </div>

                        {generatedTicket.patient_name && generatedTicket.patient_name !== 'Paciente Avulso' && (
                            <div className="mt-4 text-white/70 font-medium text-lg uppercase tracking-wide truncate">
                                {generatedTicket.patient_name}
                            </div>
                        )}
                    </div>

                    <p className="text-base text-white/50 font-light mb-16">
                        Por favor, aguarde na sala de espera.
                        <br />
                        Você será chamado no painel de TV pelo seu número.
                    </p>

                    {/* Return count */}
                    <div className="w-full">
                        <button
                            onClick={() => resetFlow()}
                            className="w-full py-4 rounded-xl bg-white/15 hover:bg-white/20 text-white font-medium active:scale-95 transition-all text-base cursor-pointer min-h-[50px]"
                        >
                            Concluir (Retornando em {countdown}s)
                        </button>
                    </div>
                </div>
            )}

            {/* Subtle footer */}
            {step === 'home' && (
                <p className="mt-20 md:mt-28 text-white/20 text-xs md:text-sm tracking-[0.25em] uppercase font-light">
                    Autoatendimento CliniGo
                </p>
            )}

            <style jsx>{`
                @keyframes fadeScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
