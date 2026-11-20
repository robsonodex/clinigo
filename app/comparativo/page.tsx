import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Check, ChevronDown, Minus, Shield } from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'
import { SOLUTIONS_DATA } from '@/lib/seo/solutions-data'
import { WHATSAPP_URL } from '@/components/preview-home/content'

export const metadata: Metadata = {
    title: 'Comparativo Técnico: Software Médico vs. Planilhas vs. CliniGo Terapias',
    description:
        'Guia técnico comparando 12 critérios reais para escolher o melhor sistema de gestão para clínicas de terapias multidisciplinares (Psicologia, ABA, Fonoaudiologia, TO, Psicomotricidade e Fisioterapia).',
    alternates: {
        canonical: 'https://clinigo.app/comparativo',
    },
    keywords: [
        'melhor sistema para clínica de terapias',
        'comparativo software clínica multidisciplinar',
        'diferença software médico e sistema para clínica de terapia',
        'como escolher sistema para clínica ABA',
        'comparativo sistema gestão psicologia e terapias',
    ],
    openGraph: {
        title: 'Comparativo Técnico para Clínicas de Terapias | CliniGo',
        description:
            'Matriz com 12 critérios objetivos comparando planilhas, softwares médicos genéricos e o CliniGo para clínicas de terapias multidisciplinares.',
        url: 'https://clinigo.app/comparativo',
        siteName: 'CliniGo',
        type: 'website',
        locale: 'pt_BR',
    },
}

interface MatrixRow {
    criterion: string
    spreadsheets: string
    genericMedical: string
    clinigo: string
}

const MATRIX_ROWS: MatrixRow[] = [
    {
        criterion: '1. Agenda recorrente minuto a minuto (40, 45, 50 ou 120 min)',
        spreadsheets: 'Edição manual de cada semana; feriados exigem retrabalho',
        genericMedical: 'Blocos rígidos de 30 ou 60 min voltados a consulta única',
        clinigo: 'Séries semanais, quinzenais e mensais com duração real por terapia',
    },
    {
        criterion: '2. Co-terapia (dois profissionais no mesmo atendimento)',
        spreadsheets: 'Controle informal sujeito a duplicidade de sala',
        genericMedical: 'Bloqueia por conflito de horário do paciente',
        clinigo: 'Suporte nativo a dupla de terapeutas e supervisão em sala',
    },
    {
        criterion: '3. Reserva de salas sensoriais e temáticas',
        spreadsheets: 'Planilha separada com choques frequentes de horário',
        genericMedical: 'Raramente acoplado à recorrência de terapias',
        clinigo: 'Bloqueio físico de Sala Sensorial, AVD e Motora integrado à grade',
    },
    {
        criterion: '4. Workspaces por especialidade e planos ABA',
        spreadsheets: 'Documentos soltos em pastas sem padronização',
        genericMedical: 'Prontuário clínico focado em receita médica e CID',
        clinigo: 'Workspaces de ABA, Psicologia, Fono, TO, Psicomotricidade e Fisioterapia',
    },
    {
        criterion: '5. Sigilo clínico RBAC + RLS (CRP, CRFa, CREFITO)',
        spreadsheets: 'Arquivos compartilhados sem auditoria de leitura',
        genericMedical: 'Permissões rasas ou ocultação apenas na interface',
        clinigo: 'Isolamento real por perfil no servidor e no banco de dados + sessão única',
    },
    {
        criterion: '6. Controle de faltas, reposições e saldo de pacotes',
        spreadsheets: 'Contagem manual propensa a divergências com famílias',
        genericMedical: 'Sem gestão de crédito de reposição dentro da série',
        clinigo: 'Créditos de reposição e saldo de sessões rastreados na agenda',
    },
    {
        criterion: '7. Pré-cadastro e assinatura eletrônica (Lei 14.063/2020)',
        spreadsheets: 'Papel impresso e assinatura física na recepção',
        genericMedical: 'Frequentemente exige ferramentas pagas de terceiros',
        clinigo: 'Link/QR Code sem login com assinatura na tela, IP, timestamp e SHA-256',
    },
    {
        criterion: '8. Faturamento TISS padrão ANS e gestão de glosas',
        spreadsheets: 'Digitação manual nos portais das operadoras',
        genericMedical: 'Voltado a consulta única; fraco em saldo de sessões seriadas',
        clinigo: 'Autorizações prévias, lotes XML ANS, saldo de guias e recursos de glosa',
    },
    {
        criterion: '9. Comprovação de presença por biometria facial',
        spreadsheets: 'Lista de presença em papel',
        genericMedical: 'Não disponível nativamente',
        clinigo: 'Biometria facial multi-superfície (sala, totem, webcam ou celular) ligada ao TISS',
    },
    {
        criterion: '10. Motor de repasse individual por profissional',
        spreadsheets: 'Horas de cruzamento manual todo fim de mês',
        genericMedical: 'Percentual simples sem exceções por paciente/contrato',
        clinigo: 'Regras individuais por terapeuta, convênio e paciente com extrato privado',
    },
    {
        criterion: '11. BI de Terapia (evasão, retenção e conformidade)',
        spreadsheets: 'Sem alertas preventivos de abandono ou atraso de evolução',
        genericMedical: 'Relatórios genéricos de volume de consultas',
        clinigo: 'Painéis de retenção, risco de evasão, fila de espera e evoluções pendentes',
    },
    {
        criterion: '12. WhatsApp integrado, Teleconsulta WebRTC e Guia de Uso',
        spreadsheets: 'Mensagens manuais e links externos de vídeo',
        genericMedical: 'Módulos cobrados à parte ou treinamento dependente de agenda',
        clinigo: 'WhatsApp por setores, WebRTC nativo e Guia de Uso filtrado por perfil',
    },
]

const COMPARATIVE_FAQS = [
    {
        question: 'Qual a principal diferença entre um software médico tradicional e um sistema para clínica de terapias?',
        answer:
            'Softwares médicos são projetados para consultas pontuais de 1 médico com 1 paciente. Clínicas de terapias multidisciplinares operam sessões seriadas recorrentes, co-terapia, salas sensoriais, planos terapêuticos longitudinais (como ABA e Psicomotricidade), sigilo rigoroso entre diferentes conselhos (CRP, CRFa, CREFITO) e comprovação intensiva de presença para convênios TISS.',
    },
    {
        question: 'Quando vale a pena migrar de planilhas para o CliniGo?',
        answer:
            'Assim que a clínica passa a gerir múltiplos horários recorrentes, precisa controlar faltas e reposições sem conflitos, enfrenta atrasos em evoluções clínicas ou perde horas mensais calculando repasses e conferindo guias de convênio. O CliniGo inclui importação em lote via Excel e CSV a partir do plano Avançado.',
    },
    {
        question: 'Os preços do CliniGo têm fidelidade ou cobrança surpresa por paciente?',
        answer:
            'Não há fidelidade e os atendimentos são ilimitados em todos os planos: Básico (R$ 149/mês, 1 licença), Avançado (R$ 249/mês, até 5 licenças) e Professional (R$ 449/mês, até 30 licenças), com taxa única de implantação e licença extra avulsa a R$ 49,90/mês.',
    },
    {
        question: 'É possível testar o CliniGo antes de migrar a equipe?',
        answer:
            'Sim. Você pode criar uma conta de avaliação gratuita de 7 dias em https://clinigo.app/trial sem cartão de crédito para testar os fluxos reais da sua clínica.',
    },
]

const comparativeJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
        {
            '@type': 'BreadcrumbList',
            itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://clinigo.app' },
                { '@type': 'ListItem', position: 2, name: 'Comparativo Técnico', item: 'https://clinigo.app/comparativo' },
            ],
        },
        {
            '@type': 'FAQPage',
            mainEntity: COMPARATIVE_FAQS.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: faq.answer,
                },
            })),
        },
    ],
}

export default function ComparativoPage() {
    return (
        <EditorialShell>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(comparativeJsonLd) }}
            />
            <main className="flex-1">
                {/* Hero */}
                <section className="py-12 sm:py-20 px-5 sm:px-8 border-b border-[#E6E8E5]">
                    <div className="max-w-5xl mx-auto">
                        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-[#4B5B56]">
                            <Link href="/" className="hover:text-[#0F1F1B] transition-colors">
                                Início
                            </Link>
                            <span aria-hidden="true">/</span>
                            <span className="text-[#0F1F1B] font-medium">Comparativo Técnico</span>
                        </nav>

                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-3">
                            GUIA DE DECISÃO PARA GESTORES · 12 CRITÉRIOS OBJETIVOS
                        </p>
                        <h1 className="text-3xl sm:text-5xl font-semibold text-[#0F1F1B] tracking-tight leading-[1.08] mb-5 max-w-4xl">
                            Como escolher o melhor{' '}
                            <span className="font-serif-accent text-[#155E4B] font-normal">
                                sistema para clínicas de terapias
                            </span>{' '}
                            multidisciplinares.
                        </h1>
                        <p className="text-base sm:text-lg text-[#4B5B56] max-w-3xl leading-relaxed mb-8">
                            Compare objetivamente o que muda na rotina clínica, jurídica e financeira ao sair de planilhas ou de softwares médicos genéricos para uma arquitetura especializada em terapias seriadas.
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                href="/trial"
                                className="min-h-[44px] px-5 rounded-md bg-[#155E4B] hover:bg-[#0F493A] text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
                            >
                                Testar CliniGo grátis por 7 dias
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/planos"
                                className="min-h-[44px] px-5 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-[#0F1F1B] text-sm font-medium inline-flex items-center transition-colors"
                            >
                                Consultar planos e preços
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Matriz de 12 Critérios */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 bg-white border-b border-[#E6E8E5]">
                    <div className="max-w-6xl mx-auto">
                        <div className="mb-8">
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                MATRIZ COMPARATIVA VERIFICÁVEL
                            </p>
                            <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight">
                                Planilhas vs. Software Médico Genérico vs. CliniGo
                            </h2>
                        </div>

                        <div className="overflow-x-auto border border-[#E6E8E5] rounded-xl">
                            <table className="w-full text-left border-collapse min-w-[760px]">
                                <thead>
                                    <tr className="bg-[#FAFAF8] border-b border-[#E6E8E5]">
                                        <th className="py-4 px-4 text-xs font-tech-mono uppercase tracking-[0.1em] text-[#4B5B56] w-[26%]">
                                            Critério Operacional
                                        </th>
                                        <th className="py-4 px-4 text-xs font-tech-mono uppercase tracking-[0.1em] text-[#4B5B56] w-[22%]">
                                            Planilhas + WhatsApp
                                        </th>
                                        <th className="py-4 px-4 text-xs font-tech-mono uppercase tracking-[0.1em] text-[#4B5B56] w-[24%]">
                                            Software Médico Genérico
                                        </th>
                                        <th className="py-4 px-4 text-xs font-tech-mono uppercase tracking-[0.1em] text-[#114D3E] bg-[#E6F2EE]/60 w-[28%]">
                                            CliniGo (Especializado em Terapias)
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E6E8E5] text-sm">
                                    {MATRIX_ROWS.map((row) => (
                                        <tr key={row.criterion}>
                                            <td className="py-4 px-4 font-semibold text-[#0F1F1B] align-top">
                                                {row.criterion}
                                            </td>
                                            <td className="py-4 px-4 text-[#4B5B56] align-top leading-relaxed">
                                                <span className="inline-flex items-start gap-2">
                                                    <Minus className="w-4 h-4 text-[#4B5B56]/50 shrink-0 mt-0.5" />
                                                    <span>{row.spreadsheets}</span>
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-[#4B5B56] align-top leading-relaxed">
                                                {row.genericMedical}
                                            </td>
                                            <td className="py-4 px-4 text-[#0F1F1B] bg-[#E6F2EE]/25 align-top leading-relaxed font-medium">
                                                <span className="inline-flex items-start gap-2">
                                                    <Check className="w-4 h-4 text-[#155E4B] shrink-0 mt-0.5" strokeWidth={2.25} />
                                                    <span>{row.clinigo}</span>
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* Links para Especialidades */}
                <section className="py-14 px-5 sm:px-8 border-b border-[#E6E8E5]">
                    <div className="max-w-5xl mx-auto">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                            APROFUNDE POR ESPECIALIDADE
                        </p>
                        <h2 className="text-2xl font-semibold text-[#0F1F1B] mb-6">
                            Veja como o CliniGo opera em cada disciplina
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                            {SOLUTIONS_DATA.map((sol) => (
                                <Link
                                    key={sol.slug}
                                    href={`/solucoes/${sol.slug}`}
                                    className="min-h-[56px] bg-white border border-[#E6E8E5] hover:border-[#155E4B] rounded-lg px-4 py-3 flex items-center justify-between gap-2 text-sm font-semibold text-[#0F1F1B] transition-colors"
                                >
                                    <span>{sol.shortLabel}</span>
                                    <ArrowRight className="w-4 h-4 text-[#155E4B] shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ Comparativa */}
                <section className="py-14 sm:py-16 px-5 sm:px-8 bg-white">
                    <div className="max-w-4xl mx-auto">
                        <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                            PERGUNTAS FREQUENTES
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-semibold text-[#0F1F1B] tracking-tight mb-8">
                            Dúvidas na escolha do sistema da sua clínica
                        </h2>

                        <div className="space-y-3 mb-12">
                            {COMPARATIVE_FAQS.map((faq, idx) => (
                                <details
                                    key={faq.question}
                                    open={idx === 0}
                                    className="group bg-[#FAFAF8] border border-[#E6E8E5] rounded-xl overflow-hidden"
                                >
                                    <summary className="list-none cursor-pointer px-5 py-4 min-h-[52px] flex items-center justify-between gap-4 text-sm sm:text-base font-semibold text-[#0F1F1B] hover:bg-[#F2F5F3] transition-colors">
                                        <span>{faq.question}</span>
                                        <ChevronDown className="w-4 h-4 text-[#155E4B] shrink-0 transition-transform group-open:rotate-180" />
                                    </summary>
                                    <div className="px-5 pb-5 pt-1 text-sm text-[#4B5B56] leading-relaxed border-t border-[#E6E8E5]/60">
                                        {faq.answer}
                                    </div>
                                </details>
                            ))}
                        </div>

                        <div className="bg-[#0D1F1B] text-white rounded-xl p-7 sm:p-9 border border-[#1D3831] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                            <div>
                                <div className="inline-flex items-center gap-2 font-tech-mono text-[11px] uppercase tracking-[0.14em] text-[#9ED3C2] mb-2">
                                    <Shield className="w-4 h-4" />
                                    VALIDAÇÃO REAL EM 7 DIAS
                                </div>
                                <h3 className="text-xl sm:text-2xl font-semibold mb-1.5">
                                    Coloque sua agenda real à prova no CliniGo
                                </h3>
                                <p className="text-sm text-white/80">
                                    Teste gratuito por 7 dias sem cartão de crédito ou tire dúvidas direto no WhatsApp.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-3 shrink-0">
                                <Link
                                    href="/trial"
                                    className="min-h-[44px] px-5 rounded-md bg-[#155E4B] hover:bg-[#1B735C] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                                >
                                    Começar teste grátis
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                                <a
                                    href={WHATSAPP_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="min-h-[44px] px-4 rounded-md border border-white/20 hover:bg-white/10 text-white text-sm font-medium inline-flex items-center transition-colors"
                                >
                                    WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </EditorialShell>
    )
}

