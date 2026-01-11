'use client'

import { X, Check, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const comparisons = [
    { without: 'Telefone toca o dia todo', with: 'Agendamento 100% online' },
    { without: 'Paciente liga e não atende', with: 'Paciente agenda sozinho' },
    { without: 'Perde 30% dos leads', with: '0% de perda (sempre disponível)' },
    { without: 'Secretária sobrecarregada', with: 'Equipe focada no atendimento' },
    { without: 'Sem controle de agenda', with: 'Tudo organizado automaticamente' },
    { without: 'Dificuldade para achar fichas', with: 'Prontuário 100% digital e seguro' },
    { without: 'Confirmação manual', with: 'WhatsApp automático' },
    { without: 'Planilhas e papéis', with: 'Relatórios em tempo real' },
]

export function ComparisonSection() {
    return (
        <section className="py-20 md:py-32 bg-white">
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        Antes vs Depois do{' '}
                        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            CliniGo
                        </span>
                    </h2>
                    <p className="text-lg text-gray-600">
                        Veja como sua rotina muda completamente
                    </p>
                </div>

                {/* Comparison Table */}
                <div className="max-w-4xl mx-auto">
                    {/* Table Headers */}
                    <div className="grid grid-cols-2 gap-4 md:gap-8 mb-6">
                        <div className="bg-red-50 rounded-2xl p-4 md:p-6 text-center border-2 border-red-100">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
                                <X className="h-6 w-6 text-red-500" />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-red-600">
                                Sem CliniGo
                            </h3>
                        </div>

                        <div className="bg-emerald-50 rounded-2xl p-4 md:p-6 text-center border-2 border-emerald-200">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
                                <Check className="h-6 w-6 text-emerald-600" />
                            </div>
                            <h3 className="text-lg md:text-xl font-bold text-emerald-600">
                                Com CliniGo
                            </h3>
                        </div>
                    </div>

                    {/* Comparison Rows */}
                    <div className="space-y-3">
                        {comparisons.map((item, index) => (
                            <div
                                key={index}
                                className="grid grid-cols-2 gap-4 md:gap-8"
                            >
                                {/* Without */}
                                <div className={cn(
                                    "bg-gray-50 rounded-xl p-4 flex items-center gap-3",
                                    "border border-gray-100",
                                    "transition-all duration-300 hover:bg-red-50/50"
                                )}>
                                    <X className="h-5 w-5 text-red-400 flex-shrink-0" />
                                    <span className="text-gray-600 text-sm md:text-base">
                                        {item.without}
                                    </span>
                                </div>

                                {/* With */}
                                <div className={cn(
                                    "bg-emerald-50/50 rounded-xl p-4 flex items-center gap-3",
                                    "border border-emerald-100",
                                    "transition-all duration-300 hover:bg-emerald-100/50"
                                )}>
                                    <Check className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                    <span className="text-gray-700 font-medium text-sm md:text-base">
                                        {item.with}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="text-center mt-12">
                        <Link href="/cadastro">
                            <Button
                                size="lg"
                                className={cn(
                                    "h-14 px-8 text-lg font-semibold gap-2",
                                    "bg-gradient-to-r from-emerald-500 to-teal-500",
                                    "hover:from-emerald-600 hover:to-teal-600",
                                    "shadow-lg shadow-emerald-500/20",
                                    "transition-all duration-300 hover:scale-105"
                                )}
                            >
                                Quero trabalhar menos e ganhar mais
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
