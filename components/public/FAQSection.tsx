'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useClinicTheme } from './ThemeProvider'
import { ChevronDown, MessageCircle, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// =============================================================================
// Types
// =============================================================================

interface FAQItem {
    question: string
    answer: string
}

interface FAQSectionProps {
    clinicSlug: string
    faqs?: FAQItem[]
    whatsappNumber?: string | null
}

// =============================================================================
// Default FAQs
// =============================================================================

const DEFAULT_FAQS: FAQItem[] = [
    {
        question: 'Como funciona o agendamento online?',
        answer: 'O agendamento é simples e rápido! Escolha o médico ou especialidade desejada, selecione um horário disponível, preencha seus dados e confirme. Você receberá uma confirmação por e-mail e WhatsApp.',
    },
    {
        question: 'Quais formas de pagamento são aceitas?',
        answer: 'Aceitamos cartão de crédito, débito, PIX e boleto bancário. Para consultas presenciais, também aceitamos dinheiro. Muitos dos nossos médicos também atendem por convênios.',
    },
    {
        question: 'Como funciona a teleconsulta?',
        answer: 'A teleconsulta é uma consulta médica realizada por vídeo chamada. Após agendar, você receberá um link de acesso exclusivo. No horário marcado, basta acessar o link para iniciar sua consulta.',
    },
    {
        question: 'Posso cancelar ou remarcar minha consulta?',
        answer: 'Sim! Você pode cancelar ou remarcar sua consulta até 24 horas antes do horário agendado sem custos. Para cancelamentos com menos de 24 horas, entre em contato conosco.',
    },
    {
        question: 'Vocês atendem por convênio?',
        answer: 'Sim, atendemos diversos convênios médicos. Os convênios aceitos variam por médico e especialidade. Ao agendar, você pode verificar quais convênios cada profissional aceita.',
    },
    {
        question: 'Preciso levar algum documento na consulta?',
        answer: 'Para a primeira consulta, traga um documento de identidade com foto, cartão do convênio (se aplicável) e exames anteriores relacionados ao motivo da consulta.',
    },
]

// =============================================================================
// Accordion Item Component
// =============================================================================

function AccordionItem({
    item,
    isOpen,
    onToggle
}: {
    item: FAQItem
    isOpen: boolean
    onToggle: () => void
}) {
    const { theme } = useClinicTheme()

    return (
        <div className="border-b border-gray-100 last:border-0">
            <button
                onClick={onToggle}
                className="w-full py-5 flex items-center justify-between gap-4 text-left hover:bg-gray-50/50 transition-colors"
            >
                <span className="font-medium text-gray-900 pr-4">{item.question}</span>
                <ChevronDown
                    className={cn(
                        'w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200',
                        isOpen && 'rotate-180'
                    )}
                    style={{ color: isOpen ? theme.colors.primary : undefined }}
                />
            </button>

            <div
                className={cn(
                    'overflow-hidden transition-all duration-200',
                    isOpen ? 'max-h-96 pb-5' : 'max-h-0'
                )}
            >
                <p className="text-gray-600 leading-relaxed pr-12">{item.answer}</p>
            </div>
        </div>
    )
}

// =============================================================================
// Main Component
// =============================================================================

export function FAQSection({
    clinicSlug,
    faqs = DEFAULT_FAQS,
    whatsappNumber
}: FAQSectionProps) {
    const { theme } = useClinicTheme()
    const [openIndex, setOpenIndex] = useState<number | null>(0)

    if (!theme.display.show_faq) {
        return null
    }

    const displayFaqs = faqs.length > 0 ? faqs : DEFAULT_FAQS

    return (
        <section id="faq" className="py-16 md:py-20 bg-gray-50/50">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2
                        className="text-3xl md:text-4xl font-bold font-theme-heading mb-4"
                        style={{ color: theme.colors.text }}
                    >
                        Perguntas Frequentes
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Tire suas dúvidas sobre nossos serviços
                    </p>
                </div>

                {/* FAQ List */}
                <div className="max-w-3xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 md:px-8">
                        {displayFaqs.map((faq, index) => (
                            <AccordionItem
                                key={index}
                                item={faq}
                                isOpen={openIndex === index}
                                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                            />
                        ))}
                    </div>
                </div>

                {/* Contact CTA */}
                <div id="contato" className="max-w-3xl mx-auto mt-10">
                    <div
                        className="rounded-2xl p-6 md:p-8 text-center"
                        style={{ backgroundColor: `${theme.colors.primary}10` }}
                    >
                        <HelpCircle
                            className="w-10 h-10 mx-auto mb-4"
                            style={{ color: theme.colors.primary }}
                        />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Ainda tem dúvidas?
                        </h3>
                        <p className="text-gray-600 mb-6">
                            Nossa equipe está pronta para ajudar você
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {whatsappNumber && (
                                <a
                                    href={`https://wa.me/55${whatsappNumber.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button
                                        className="btn-theme-primary"
                                        style={{ backgroundColor: theme.colors.primary }}
                                    >
                                        <MessageCircle className="w-4 h-4 mr-2" />
                                        Falar no WhatsApp
                                    </Button>
                                </a>
                            )}
                            <Link href={`/${clinicSlug}/agendar`}>
                                <Button
                                    variant="outline"
                                    style={{ borderColor: theme.colors.primary, color: theme.colors.primary }}
                                >
                                    Agendar uma consulta
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
