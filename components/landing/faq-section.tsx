'use client'

import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const faqs = [
    {
        question: 'Preciso ter conhecimento técnico?',
        answer: 'Zero. Tudo é visual e intuitivo. Se você sabe usar WhatsApp, sabe usar o CliniGo. Além disso, nossa equipe faz toda a configuração inicial pra você.',
    },
    {
        question: 'E se meus pacientes são idosos?',
        answer: '78% dos nossos agendamentos são de pessoas 50+. A interface é mais fácil que ligar pro consultório, e muitos pacientes preferem não ter que falar ao telefone.',
    },
    {
        question: 'Posso cancelar a qualquer momento?',
        answer: 'Sim. Sem multa, sem burocracia, sem pegadinhas. Cancela em 1 clique direto no painel. Seus dados ficam disponíveis por 30 dias para exportação.',
    },
    {
        question: 'Preciso instalar algum programa?',
        answer: 'Não. O CliniGo é 100% online (na nuvem). Você acessa de qualquer computador, tablet ou celular sem instalar nada.',
    },
    {
        question: 'E se eu tiver dúvidas ou problemas?',
        answer: 'Suporte via WhatsApp em até 2 horas (plano Pro: 30 minutos). Nossa equipe te ajuda em cada passo da configuração.',
    },
    {
        question: 'Funciona com convênios?',
        answer: 'Sim! Você pode configurar atendimento particular, por convênio ou misto. O sistema se adapta à sua realidade.',
    },
    {
        question: 'Preciso de contrato longo?',
        answer: 'Não. Todos os planos são mensais sem fidelidade. Você só continua se estiver satisfeito.',
    },
]

function FAQItem({ faq, isOpen, onToggle }: {
    faq: typeof faqs[0]
    isOpen: boolean
    onToggle: () => void
}) {
    return (
        <div
            className={cn(
                "border rounded-2xl overflow-hidden transition-all duration-300",
                isOpen ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100 bg-white"
            )}
        >
            <button
                onClick={onToggle}
                className="w-full p-6 flex items-center justify-between gap-4 text-left"
            >
                <span className={cn(
                    "font-semibold text-lg transition-colors",
                    isOpen ? "text-emerald-700" : "text-gray-900"
                )}>
                    {faq.question}
                </span>
                <ChevronDown
                    className={cn(
                        "h-5 w-5 flex-shrink-0 transition-transform duration-300",
                        isOpen ? "rotate-180 text-emerald-600" : "text-gray-400"
                    )}
                />
            </button>

            <div className={cn(
                "overflow-hidden transition-all duration-300",
                isOpen ? "max-h-96" : "max-h-0"
            )}>
                <div className="px-6 pb-6 text-gray-600">
                    {faq.answer}
                </div>
            </div>
        </div>
    )
}

export function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    return (
        <section className="py-20 md:py-32 bg-gray-50">
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                        Perguntas{' '}
                        <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            Frequentes
                        </span>
                    </h2>
                    <p className="text-lg text-gray-600">
                        Tudo o que você precisa saber antes de começar
                    </p>
                </div>

                {/* FAQ List */}
                <div className="max-w-3xl mx-auto space-y-4">
                    {faqs.map((faq, index) => (
                        <FAQItem
                            key={index}
                            faq={faq}
                            isOpen={openIndex === index}
                            onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                        />
                    ))}
                </div>

                {/* Still have questions */}
                <div className="text-center mt-12">
                    <p className="text-gray-600 mb-4">
                        Ainda tem dúvidas?
                    </p>
                    <a
                        href="https://wa.me/5521965532247?text=Olá!%20Tenho%20uma%20dúvida%20sobre%20o%20CliniGo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                            "inline-flex items-center gap-2 px-6 py-3 rounded-xl",
                            "bg-white border border-gray-200 text-gray-700 font-medium",
                            "transition-all duration-300 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50"
                        )}
                    >
                        Fale conosco pelo WhatsApp
                    </a>
                </div>
            </div>
        </section>
    )
}
