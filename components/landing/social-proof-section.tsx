'use client'

import { Star, Quote, Calendar, DollarSign, Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const testimonials = [
    {
        name: 'Dra. Carolina Mendes',
        specialty: 'Dermatologista',
        location: 'Copacabana, RJ',
        image: null, // Will use initials
        quote: 'Aumentei meus atendimentos em 35% no primeiro mês. Os pacientes adoram agendar pelo celular.',
        rating: 5,
        highlight: '+35% consultas',
    },
    {
        name: 'Dr. Roberto Silva',
        specialty: 'Cardiologista',
        location: '127 consultas/mês via CliniGo',
        image: null,
        quote: 'Nunca mais perdi paciente porque "não atenderam". O sistema trabalha pra mim 24/7.',
        rating: 5,
        highlight: '24/7 ativo',
    },
    {
        name: 'Dra. Beatriz Costa',
        specialty: 'Ginecologista',
        location: '4 anos usando CliniGo',
        image: null,
        quote: 'Minha secretária agora foca no atendimento, não em ficar atendendo telefone o dia todo.',
        rating: 5,
        highlight: '-70% ligações',
    },
]

const stats = [
    {
        icon: Calendar,
        value: '15.847',
        label: 'Consultas',
        sublabel: 'este mês',
        color: 'from-blue-500 to-blue-600',
    },
    {
        icon: DollarSign,
        value: '+30%',
        label: 'Crescimento',
        sublabel: 'médio de receita',
        color: 'from-emerald-500 to-emerald-600',
    },
    {
        icon: Heart,
        value: '98%',
        label: 'Satisfação',
        sublabel: 'dos pacientes',
        color: 'from-pink-500 to-pink-600',
    },
]

function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
    const initials = testimonial.name.split(' ').map(n => n[0]).slice(0, 2).join('')

    return (
        <Card className="h-full border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white">
            <CardContent className="p-6 md:p-8">
                {/* Quote icon */}
                <Quote className="h-8 w-8 text-emerald-200 mb-4" />

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            className={cn(
                                "h-5 w-5",
                                i < testimonial.rating
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-200"
                            )}
                        />
                    ))}
                </div>

                {/* Quote text */}
                <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                    "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                        {initials}
                    </div>

                    <div>
                        <div className="font-bold text-gray-900">
                            {testimonial.name}
                        </div>
                        <div className="text-sm text-gray-500">
                            {testimonial.specialty}
                        </div>
                        <div className="text-xs text-emerald-600 font-medium">
                            {testimonial.location}
                        </div>
                    </div>
                </div>

                {/* Highlight badge */}
                <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                    {testimonial.highlight}
                </div>
            </CardContent>
        </Card>
    )
}

function StatCard({ stat }: { stat: typeof stats[0] }) {
    return (
        <div className="text-center group">
            <div className={cn(
                "w-16 h-16 rounded-2xl bg-gradient-to-br mx-auto mb-4",
                "flex items-center justify-center",
                "transition-transform duration-300 group-hover:scale-110",
                stat.color
            )}>
                <stat.icon className="h-8 w-8 text-white" />
            </div>
            <div className="text-4xl md:text-5xl font-bold text-gray-900 mb-1">
                {stat.value}
            </div>
            <div className="text-gray-600 font-medium">{stat.label}</div>
            <div className="text-sm text-gray-400">{stat.sublabel}</div>
        </div>
    )
}

export function SocialProofSection() {
    return (
        <section className="py-20 md:py-32 bg-gradient-to-b from-white to-gray-50">
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        O que médicos como você{' '}
                        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            estão dizendo
                        </span>
                    </h2>
                    <p className="text-lg text-gray-600">
                        Resultados reais de clínicas que transformaram seu atendimento
                    </p>
                </div>

                {/* Testimonials Grid */}
                <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto mb-20">
                    {testimonials.map((testimonial, i) => (
                        <TestimonialCard key={i} testimonial={testimonial} />
                    ))}
                </div>

                {/* Stats Section */}
                <div className="bg-gradient-to-r from-slate-900 via-emerald-900 to-slate-900 rounded-3xl p-8 md:p-12 max-w-5xl mx-auto">
                    <div className="text-center mb-10">
                        <p className="text-emerald-400 font-medium mb-2">
                            Números que impressionam
                        </p>
                        <h3 className="text-2xl md:text-3xl font-bold text-white">
                            A plataforma que não para de crescer
                        </h3>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 md:gap-12">
                        {stats.map((stat, i) => (
                            <div key={i} className="text-center">
                                <div className={cn(
                                    "w-16 h-16 rounded-2xl bg-gradient-to-br mx-auto mb-4",
                                    "flex items-center justify-center",
                                    stat.color
                                )}>
                                    <stat.icon className="h-8 w-8 text-white" />
                                </div>
                                <div className="text-4xl md:text-5xl font-bold text-white mb-1">
                                    {stat.value}
                                </div>
                                <div className="text-gray-300 font-medium">{stat.label}</div>
                                <div className="text-sm text-gray-500">{stat.sublabel}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
