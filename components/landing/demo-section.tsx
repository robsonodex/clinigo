'use client'

import { Search, Calendar, CreditCard, MessageCircle, Video, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const steps = [
    {
        icon: Search,
        title: 'Seu paciente te acha no Google',
        description: 'Apareça quando buscarem "médico perto de mim"',
        color: 'from-blue-500 to-blue-600',
    },
    {
        icon: Calendar,
        title: 'Vê horários em tempo real',
        description: 'Agenda sempre atualizada, sem conflitos',
        color: 'from-emerald-500 to-emerald-600',
    },
    {
        icon: Check, // Changed icon from CreditCard
        title: 'Agendamento Direto',
        description: 'Dados enviados para a clínica na hora',
        color: 'from-purple-500 to-purple-600',
    },
    {
        icon: MessageCircle,
        title: 'Confirmação automática',
        description: 'WhatsApp com lembrete 24h antes',
        color: 'from-green-500 to-green-600',
    },
    {
        icon: Video,
        title: 'Consulta presencial ou por vídeo',
        description: 'Telemedicina integrada, sem app extra',
        color: 'from-orange-500 to-orange-600',
    },
]

export function DemoSection() {
    return (
        <section className="py-20 md:py-32 bg-gradient-to-b from-emerald-50 to-white overflow-hidden">
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        Do Google até a consulta em{' '}
                        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            3 minutos
                        </span>
                    </h2>
                    <p className="text-lg text-gray-600">
                        Sem telefonema. Sem espera. Sem burocracia.
                    </p>
                </div>

                {/* Demo Layout: Phone mockup + Steps */}
                <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                    {/* Phone Mockup */}
                    <div className="relative order-2 lg:order-1">
                        <div className="relative mx-auto w-[280px] md:w-[320px]">
                            {/* Phone frame */}
                            <div className="relative bg-gray-900 rounded-[3rem] p-3 shadow-2xl">
                                {/* Notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 rounded-b-2xl z-10" />

                                {/* Screen */}
                                <div className="bg-white rounded-[2.5rem] overflow-hidden aspect-[9/19]">
                                    {/* Status bar */}
                                    <div className="h-8 bg-emerald-600 flex items-center justify-center">
                                        <span className="text-white text-xs font-medium">clinigo.app</span>
                                    </div>

                                    {/* Screen content */}
                                    <div className="p-4 space-y-3">
                                        {/* Doctor card preview */}
                                        <div className="bg-gray-50 rounded-xl p-3">
                                            <div className="flex gap-3">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                                                    Dr
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm">Dr. Roberto Silva</div>
                                                    <div className="text-xs text-gray-500">Cardiologista</div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <div className="flex text-yellow-400">
                                                            {'★★★★★'.split('').map((s, i) => (
                                                                <span key={i} className="text-xs">{s}</span>
                                                            ))}
                                                        </div>
                                                        <span className="text-xs text-gray-400">5.0</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Calendar preview */}
                                        <div className="bg-gray-50 rounded-xl p-3">
                                            <div className="text-xs font-semibold text-gray-700 mb-2">
                                                Horários disponíveis
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['09:00', '10:30', '14:00', '15:30', '16:00', '17:30'].map((time, i) => (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "py-1.5 rounded-lg text-center text-xs font-medium",
                                                            i === 2
                                                                ? "bg-emerald-500 text-white"
                                                                : "bg-white border border-gray-200 text-gray-700"
                                                        )}
                                                    >
                                                        {time}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Confirm button */}
                                        <div className="bg-emerald-500 rounded-xl py-3 text-center text-white text-sm font-semibold shadow-lg">
                                            Confirmar Agendamento
                                        </div>

                                        {/* Clinic info */}
                                        <div className="flex justify-center gap-4 py-2">
                                            <div className="text-[10px] text-gray-400 text-center">
                                                Pagamento direto na clínica
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative elements */}
                            <div className="absolute -top-4 -right-4 w-24 h-24 bg-emerald-200 rounded-full opacity-50 blur-2xl" />
                            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-teal-200 rounded-full opacity-50 blur-2xl" />
                        </div>
                    </div>

                    {/* Steps Timeline */}
                    <div className="order-1 lg:order-2 space-y-6">
                        {steps.map((step, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-4 group"
                            >
                                {/* Icon */}
                                <div className={cn(
                                    "flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center",
                                    "transition-transform duration-300 group-hover:scale-110",
                                    step.color
                                )}>
                                    <step.icon className="h-6 w-6 text-white" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 pt-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                            {index + 1}
                                        </span>
                                        <h3 className="font-bold text-gray-900">
                                            {step.title}
                                        </h3>
                                    </div>
                                    <p className="text-gray-600 text-sm">
                                        {step.description}
                                    </p>
                                </div>

                                {/* Check mark */}
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Check className="h-4 w-4 text-emerald-600" />
                                </div>
                            </div>
                        ))}

                        {/* Bottom CTA */}
                        <div className="pt-6">
                            <a
                                href="#planos"
                                className={cn(
                                    "inline-flex items-center gap-2 px-6 py-3 rounded-xl",
                                    "bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold",
                                    "transition-all duration-300 hover:scale-105 hover:shadow-lg"
                                )}
                            >
                                Quero isso na minha clínica
                                <Check className="h-5 w-5" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
