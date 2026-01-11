'use client'

import { Globe, Code, Check, ExternalLink, MessageCircle, Sparkles, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface IntegracaoOption {
    id: 'site-novo' | 'site-existente'
    badge?: string
    badgeColor?: string
    icon: React.ReactNode
    iconBgColor: string
    accentColor: string
    titulo: string
    subtitulo: string
    valorSetup: number
    valorSetupOriginal?: number
    valorMensal: number
    recursos: string[]
    extras?: Array<{ nome: string; valor: string }>
    ctaTexto: string
    ctaLink: string
    ctaSecundario?: { texto: string; link: string }
}

const options: IntegracaoOption[] = [
    {
        id: 'site-novo',
        badge: 'MAIS VENDIDO',
        badgeColor: 'bg-green-500',
        icon: <Globe className="h-12 w-12 text-blue-500" />,
        iconBgColor: 'bg-blue-100',
        accentColor: 'from-blue-500 to-blue-600',
        titulo: 'Criamos seu site completo',
        subtitulo: 'Do zero ao ar em 48 horas',
        valorSetup: 497,
        valorSetupOriginal: 997,
        valorMensal: 97,
        recursos: [
            'Site profissional responsivo',
            '5 templates modernos à escolha',
            'Páginas dos médicos com foto e bio',
            'Formulário de contato inteligente',
            'SEO otimizado (apareça no Google)',
            'Certificado SSL (site seguro)',
            'Hospedagem rápida incluída',
            'Sistema de agendamento integrado',
            'Suporte técnico prioritário',
        ],
        extras: [
            { nome: 'Domínio personalizado (www.suaclinica.com.br)', valor: '+R$ 47/mês' }
        ],
        ctaTexto: 'Quero meu site agora',
        ctaLink: 'https://wa.me/5521965532247?text=Olá!%20Quero%20criar%20meu%20site%20com%20CliniGo',
        ctaSecundario: { texto: 'Ver exemplos de sites criados', link: '#exemplos-sites' },
    },
    {
        id: 'site-existente',
        icon: <Code className="h-12 w-12 text-purple-500" />,
        iconBgColor: 'bg-purple-100',
        accentColor: 'from-purple-500 to-purple-600',
        titulo: 'Integre ao seu site existente',
        subtitulo: 'Instalação em 5 minutos',
        valorSetup: 297,
        valorMensal: 47,
        recursos: [
            'Widget invisível (modal de agendamento)',
            'Código de 1 linha (copiar e colar)',
            'Cores personalizadas (sua marca)',
            'White-label (sem logo CliniGo)',
            'Instalação gratuita (fazemos pra você)',
            'Botão flutuante OU inline',
            'Funciona em qualquer site (WordPress, Wix, etc)',
            'Suporte técnico',
        ],
        ctaTexto: 'Quero integrar',
        ctaLink: 'https://wa.me/5521965532247?text=Olá!%20Quero%20integrar%20o%20CliniGo%20no%20meu%20site',
        ctaSecundario: { texto: 'Ver demonstração do widget', link: '#demo-widget' },
    },
]

function IntegracaoCard({ option, delay = 0 }: { option: IntegracaoOption; delay?: number }) {
    return (
        <Card
            className={cn(
                "group relative overflow-hidden border-0 shadow-xl bg-white",
                "transition-all duration-500 hover:shadow-2xl hover:-translate-y-2",
                "animate-fade-in-up"
            )}
            style={{
                animationDelay: `${delay}ms`,
                animationFillMode: 'both',
            }}
        >
            {/* Top accent gradient bar */}
            <div className={cn(
                "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                option.accentColor
            )} />

            {/* Badge */}
            {option.badge && (
                <div className="absolute top-4 right-4">
                    <Badge
                        className={cn(
                            option.badgeColor || 'bg-green-500',
                            "text-white font-semibold px-3 py-1 animate-pulse-subtle"
                        )}
                    >
                        {option.badge}
                    </Badge>
                </div>
            )}

            <CardHeader className="pb-4 pt-8">
                {/* Icon */}
                <div className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center mb-4",
                    "group-hover:scale-110 transition-transform duration-300",
                    option.iconBgColor
                )}>
                    {option.icon}
                </div>

                <CardTitle className="text-2xl font-bold text-gray-900">
                    {option.titulo}
                </CardTitle>
                <CardDescription className="text-base text-gray-600 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    {option.subtitulo}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm text-gray-500">Setup:</span>
                        {option.valorSetupOriginal && (
                            <span className="text-lg text-gray-400 line-through">
                                R$ {option.valorSetupOriginal.toLocaleString('pt-BR')}
                            </span>
                        )}
                        <span className="text-3xl font-extrabold text-gray-900">
                            R$ {option.valorSetup.toLocaleString('pt-BR')}
                        </span>
                        {option.valorSetupOriginal && (
                            <Badge className="bg-orange-500 text-white text-xs">
                                50% OFF
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm text-gray-500">Mensalidade:</span>
                        <span className="text-2xl font-bold text-gray-900">
                            R$ {option.valorMensal}/mês
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* Features list */}
                <ul className="space-y-3">
                    {option.recursos.map((recurso, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                                <Check className="h-3 w-3 text-green-600" />
                            </div>
                            <span className={cn(
                                "text-sm text-gray-700",
                                recurso.includes('agendamento') && "font-semibold text-gray-900"
                            )}>
                                {recurso}
                            </span>
                        </li>
                    ))}
                </ul>

                {/* Extras */}
                {option.extras && option.extras.length > 0 && (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                        {option.extras.map((extra, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                <span className="text-gray-700">{extra.nome}:</span>
                                <span className="font-semibold text-gray-900">{extra.valor}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* CTA Buttons */}
                <div className="space-y-3 pt-2">
                    <a
                        href={option.ctaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            "flex items-center justify-center w-full h-14 rounded-md text-lg font-semibold gap-2",
                            "bg-gradient-to-r text-white shadow-lg",
                            "transition-all duration-300 hover:scale-105 hover:shadow-xl",
                            option.accentColor
                        )}
                    >
                        <MessageCircle className="h-5 w-5" />
                        {option.ctaTexto}
                    </a>

                    {option.ctaSecundario && (
                        <a
                            href={option.ctaSecundario.link}
                            className={cn(
                                "flex items-center justify-center gap-1 text-sm text-gray-600",
                                "hover:text-gray-900 transition-colors group/link"
                            )}
                        >
                            {option.ctaSecundario.texto}
                            <ExternalLink className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
                        </a>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export function IntegracaoSitesSection() {
    return (
        <section
            id="integracao-sites"
            className="relative py-20 md:py-32 overflow-hidden"
        >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />

            {/* Decorative elements */}
            <div className="absolute top-10 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
            <div className="absolute top-20 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
            <div className="absolute bottom-10 left-1/3 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

            <div className="container mx-auto px-4 relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white mb-4 px-4 py-1">
                        <Globe className="h-3 w-3 mr-1 inline" />
                        Serviços Exclusivos
                    </Badge>

                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                        Sua clínica ainda{' '}
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            não tem site?
                        </span>
                    </h2>

                    <p className="text-lg md:text-xl text-gray-600">
                        Criamos seu site completo{' '}
                        <span className="font-semibold text-gray-800">OU</span>{' '}
                        integramos o CliniGo no site que você já tem.{' '}
                        <span className="font-semibold text-gray-800">Você escolhe!</span>
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">
                    {options.map((option, index) => (
                        <IntegracaoCard
                            key={option.id}
                            option={option}
                            delay={index * 200}
                        />
                    ))}
                </div>

                {/* Social Proof */}
                <div className="mt-16 text-center">
                    <div className="inline-flex items-center gap-4 px-6 py-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
                        <div className="flex -space-x-3">
                            {[...Array(4)].map((_, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-white font-bold text-sm",
                                        i === 0 && "bg-gradient-to-br from-blue-400 to-blue-600",
                                        i === 1 && "bg-gradient-to-br from-purple-400 to-purple-600",
                                        i === 2 && "bg-gradient-to-br from-pink-400 to-pink-600",
                                        i === 3 && "bg-gradient-to-br from-emerald-400 to-emerald-600"
                                    )}
                                >
                                    {['C', 'M', 'P', 'S'][i]}
                                </div>
                            ))}
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-semibold text-gray-900">
                                +50 clínicas parceiras
                            </div>
                            <div className="text-xs text-gray-500">
                                já criaram seus sites conosco
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-500">
                            {[...Array(5)].map((_, i) => (
                                <svg key={i} className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                </svg>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom CSS for animations */}
            <style jsx>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes pulse-subtle {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.85;
                    }
                }

                @keyframes blob {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    25% {
                        transform: translate(20px, -30px) scale(1.1);
                    }
                    50% {
                        transform: translate(-20px, 20px) scale(0.9);
                    }
                    75% {
                        transform: translate(30px, 30px) scale(1.05);
                    }
                }

                :global(.animate-fade-in-up) {
                    animation: fade-in-up 0.6s ease-out;
                }

                :global(.animate-pulse-subtle) {
                    animation: pulse-subtle 2s ease-in-out infinite;
                }

                :global(.animate-blob) {
                    animation: blob 7s infinite;
                }

                :global(.animation-delay-2000) {
                    animation-delay: 2s;
                }

                :global(.animation-delay-4000) {
                    animation-delay: 4s;
                }
            `}</style>
        </section>
    )
}
