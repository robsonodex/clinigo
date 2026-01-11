'use client'

import { Phone, TrendingDown, DollarSign, Sparkles, ArrowDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const problems = [
    {
        icon: Phone,
        emoji: '😰',
        title: 'Telefone toca o dia todo',
        description: 'Sua secretária atende 50 ligações/dia. Metade é só pra agendar consulta.',
        color: 'from-red-500 to-orange-500',
        bgColor: 'bg-red-50',
        iconColor: 'text-red-500',
    },
    {
        icon: TrendingDown,
        emoji: '📉',
        title: 'Pacientes desistem',
        description: '67% dos pacientes não ligam de volta se a primeira tentativa falha.',
        color: 'from-orange-500 to-amber-500',
        bgColor: 'bg-orange-50',
        iconColor: 'text-orange-500',
    },
    {
        icon: DollarSign,
        emoji: '💸',
        title: 'Você perde dinheiro',
        description: 'Cada "não atendi" é R$ 300 que saiu pela janela. Todo mês.',
        color: 'from-amber-500 to-yellow-500',
        bgColor: 'bg-amber-50',
        iconColor: 'text-amber-600',
    },
]

export function ProblemSolutionSection() {
    return (
        <section className="py-20 md:py-32 relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-emerald-50" />

            <div className="container mx-auto px-4 relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                        Quantos pacientes você{' '}
                        <span className="text-red-500">PERDE</span>
                        {' '}porque não atendem o telefone?
                    </h2>
                    <p className="text-lg text-gray-600">
                        Esses são os problemas mais comuns que médicos enfrentam todo dia:
                    </p>
                </div>

                {/* Problem Cards */}
                <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto mb-16">
                    {problems.map((problem, index) => (
                        <Card
                            key={index}
                            className={cn(
                                "relative overflow-hidden border-0 shadow-lg",
                                "transition-all duration-300 hover:shadow-xl hover:-translate-y-2",
                                problem.bgColor
                            )}
                        >
                            {/* Top gradient bar */}
                            <div className={cn(
                                "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                                problem.color
                            )} />

                            <CardContent className="p-8">
                                {/* Emoji */}
                                <div className="text-4xl mb-4">{problem.emoji}</div>

                                {/* Title */}
                                <h3 className="text-xl font-bold text-gray-900 mb-3">
                                    {problem.title}
                                </h3>

                                {/* Description */}
                                <p className="text-gray-600">
                                    {problem.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Arrow transition */}
                <div className="flex justify-center mb-12">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center animate-bounce">
                        <ArrowDown className="h-8 w-8 text-emerald-600" />
                    </div>
                </div>

                {/* Solution teaser */}
                <div className="text-center max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-6">
                        <Sparkles className="h-4 w-4" />
                        A solução existe
                    </div>

                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                        E se os pacientes agendassem{' '}
                        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            sozinhos
                        </span>
                        ,<br className="hidden md:block" />
                        24h por dia, até de madrugada?
                    </h3>

                    <p className="text-lg text-gray-600">
                        Com o CliniGo, sua clínica nunca para de receber pacientes.
                    </p>
                </div>
            </div>
        </section>
    )
}
