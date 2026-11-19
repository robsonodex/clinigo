'use client'

import Link from 'next/link'
import { AlertTriangle, CheckCircle, FileText, Printer, Scale, Shield } from 'lucide-react'
import { EditorialShell } from '@/components/marketing/EditorialShell'

const SECTIONS = [
    { id: 'aceitacao', num: '1', label: 'Aceitação' },
    { id: 'servico', num: '2', label: 'Serviço' },
    { id: 'cadastro', num: '3', label: 'Cadastro' },
    { id: 'responsabilidades', num: '4', label: 'Responsabilidades' },
    { id: 'limitacao', num: '5', label: 'Limitação' },
    { id: 'planos', num: '6', label: 'Planos' },
    { id: 'propriedade', num: '7', label: 'Propriedade' },
    { id: 'rescisao', num: '8', label: 'Rescisão' },
    { id: 'gerais', num: '9', label: 'Gerais' },
    { id: 'contato', num: '10', label: 'Contato' },
]

export default function TermosPage() {
    return (
        <EditorialShell>
            <main className="flex-1 py-12 sm:py-16 px-5 sm:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E6E8E5] mb-8">
                        <div>
                            <p className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#155E4B] mb-2">
                                DOCUMENTO LEGAL · VERSÃO 2.0
                            </p>
                            <h1 className="text-3xl sm:text-4xl font-semibold text-[#0F1F1B] tracking-tight mb-2">
                                Termos de Uso
                            </h1>
                            <p className="text-sm sm:text-base text-[#4B5B56]">
                                Condições gerais de licenciamento e uso da plataforma CliniGo. Atualizado em 2026.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="min-h-[44px] px-4 rounded-md border border-[#E6E8E5] bg-white hover:bg-[#F2F5F3] text-xs font-medium text-[#0F1F1B] inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                        >
                            <Printer className="w-4 h-4 text-[#155E4B]" />
                            Imprimir termos
                        </button>
                    </div>

                    {/* Navegação rápida */}
                    <nav aria-label="Índice dos termos" className="bg-white border border-[#E6E8E5] rounded-xl p-4 mb-8">
                        <p className="font-tech-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4B5B56] mb-3">
                            ÍNDICE RÁPIDO
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {SECTIONS.map((s) => (
                                <a
                                    key={s.id}
                                    href={`#${s.id}`}
                                    className="px-3 py-1.5 rounded-md bg-[#FAFAF8] border border-[#E6E8E5] hover:border-[#155E4B] text-xs font-medium text-[#0F1F1B] transition-colors"
                                >
                                    {s.num}. {s.label}
                                </a>
                            ))}
                        </div>
                    </nav>

                    {/* Seções */}
                    <div className="space-y-6">
                        <section id="aceitacao" className="scroll-mt-24 bg-white rounded-xl p-6 sm:p-8 border border-[#E6E8E5]">
                            <h2 className="text-lg sm:text-xl font-semibold text-[#0F1F1B] mb-3 flex items-center gap-2.5">
                                <Scale className="w-5 h-5 text-[#155E4B] shrink-0" />
                                1. Aceitação dos Termos
                            </h2>
                            <div className="space-y-3 text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                <p>
                                    Ao acessar e utilizar a plataforma CliniGo, a clínica contratante e seus usuários autorizados concordam integralmente com estes Termos de Uso. Caso não concorde com qualquer disposição, não deverá utilizar os serviços.
                                </p>
                                <p>
                                    O tratamento de dados pessoais e sensíveis de saúde segue a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD), atuando a clínica como Controladora e o CliniGo como Operador tecnológico.
                                </p>
                            </div>
                        </section>

                        <section id="servico" className="scroll-mt-24 bg-white rounded-xl p-6 sm:p-8 border border-[#E6E8E5]">
                            <h2 className="text-lg sm:text-xl font-semibold text-[#0F1F1B] mb-3 flex items-center gap-2.5">
                                <FileText className="w-5 h-5 text-[#155E4B] shrink-0" />
                                2. Descrição do Serviço
                            </h2>
                            <div className="space-y-3 text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                <p>
                                    O CliniGo é uma plataforma em nuvem para clínicas de terapias multidisciplinares e serviços de saúde, oferecendo conforme o plano contratado:
                                </p>
                                <ul className="list-disc list-inside space-y-1.5">
                                    <li>Agenda recorrente, co-terapia, gestão de salas e controle de reposições</li>
                                    <li>Prontuário eletrônico por especialidade (Psicologia, ABA, Fonoaudiologia, TO, Psicomotricidade e Fisioterapia)</li>
                                    <li>Teleconsulta WebRTC, check-in por QR Code e biometria facial</li>
                                    <li>Termos eletrônicos com validade probatória (Lei 14.063/2020 e hash SHA-256)</li>
                                    <li>Faturamento TISS (padrão ANS), gestão de glosas e motor de repasse por profissional</li>
                                    <li>Guia de Uso integrado ao sistema para capacitação autônoma da equipe</li>
                                </ul>
                            </div>
                        </section>

                        <section id="cadastro" className="scroll-mt-24 bg-white rounded-xl p-6 sm:p-8 border border-[#E6E8E5]">
                            <h2 className="text-lg sm:text-xl font-semibold text-[#0F1F1B] mb-3 flex items-center gap-2.5">
                                <CheckCircle className="w-5 h-5 text-[#155E4B] shrink-0" />
                                3. Cadastro e Conta
                            </h2>
                            <div className="space-y-3 text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                <p>Para contratar e operar o CliniGo, é necessário:</p>
                                <ul className="list-disc list-inside space-y-1.5">
                                    <li>Ser pessoa jurídica legalmente constituída ou profissional de saúde regularmente inscrito em seu conselho</li>
                                    <li>Fornecer informações verdadeiras, atualizadas e completas no cadastro</li>
                                    <li>Manter credenciais individuais e intransferíveis (a plataforma aplica controle de sessão única auditada)</li>
                                    <li>Comunicar imediatamente qualquer suspeita de acesso não autorizado</li>
                                </ul>
                            </div>
                        </section>

                        <section id="responsabilidades" className="scroll-mt-24 bg-white rounded-xl p-6 sm:p-8 border border-[#E6E8E5]">
                            <h2 className="text-lg sm:text-xl font-semibold text-[#0F1F1B] mb-3 flex items-center gap-2.5">
                                <Shield className="w-5 h-5 text-[#155E4B] shrink-0" />
                                4. Responsabilidades do Usuário
                            </h2>
                            <div className="space-y-3 text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                <p>A clínica e seus profissionais comprometem-se a:</p>
                                <ul className="list-disc list-inside space-y-1.5">
                                    <li>Cumprir a legislação vigente, a LGPD e as resoluções de seus conselhos profissionais (CFP, CREFONO, CREFITO, CFM e demais conselhos de classe)</li>
                                    <li>Respeitar o sigilo profissional e os perfis de permissão configurados na unidade</li>
                                    <li>Garantir a veracidade dos registros clínicos e cadastrais inseridos</li>
                                    <li>Obter bases legais e consentimentos adequados junto a pacientes e responsáveis legais</li>
                                </ul>
                            </div>
                        </section>

                        <section id="limitacao" className="scroll-mt-24 bg-white rounded-xl p-6 sm:p-8 border border-[#E6E8E5]">
                            <h2 className="text-lg sm:text-xl font-semibold text-[#0F1F1B] mb-3 flex items-center gap-2.5">
                                <AlertTriangle className="w-5 h-5 text-[#155E4B] shrink-0" />
                                5. Limitação de Responsabilidade
                            </h2>
                            <div className="space-y-3 text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                <p>O CliniGo não se responsabiliza por:</p>
                                <ul className="list-disc list-inside space-y-1.5">
                                    <li>Condutas terapêuticas, avaliações ou decisões clínicas tomadas pelos profissionais</li>
                                    <li>Exatidão dos dados inseridos pelos usuários ou enviados a operadoras de saúde</li>
                                    <li>Indisponibilidades causadas por falhas de internet local, terceiros ou força maior</li>
                                    <li>Conflitos contratuais entre clínicas, profissionais, pacientes ou convênios</li>
                                </ul>
                                <div className="bg-[#F2F5F3] border-l-4 border-[#155E4B] p-4 rounded-r-lg mt-4">
                                    <p className="text-sm text-[#0F1F1B]">
                                        <strong>Importante:</strong> o CliniGo é uma ferramenta tecnológica de apoio operacional e registro. A responsabilidade técnica, ética e assistencial pelos atendimentos pertence exclusivamente ao profissional e ao estabelecimento de saúde.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section id="planos" className="scroll-mt-24 bg-white rounded-xl p-6 sm:p-8 border border-[#E6E8E5]">
                            <h2 className="text-lg sm:text-xl font-semibold text-[#0F1F1B] mb-3 flex items-center gap-2.5">
                                <Scale className="w-5 h-5 text-[#155E4B] shrink-0" />
                                6. Planos, Licenças e Pagamentos
                            </h2>
                            <div className="space-y-3 text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                <ul className="list-disc list-inside space-y-1.5">
                                    <li>
                                        Os planos ativos e valores vigentes estão publicados em{' '}
                                        <Link href="/planos" className="text-[#155E4B] font-medium hover:underline">
                                            clinigo.app/planos
                                        </Link>
                                    </li>
                                    <li>Cada assinatura contempla 1 unidade operacional e inclui taxa única de implantação e configuração inicial</li>
                                    <li>Licenças adicionais além da franquia do plano podem ser contratadas conforme tabela vigente (R$ 49,90/mês por licença extra)</li>
                                    <li>O período de avaliação gratuita é de 7 dias corridos, sem exigência de cartão de crédito</li>
                                    <li>O cancelamento pode ser solicitado a qualquer momento, sem fidelidade; reajustes são comunicados com aviso prévio mínimo de 30 dias</li>
                                </ul>
                            </div>
                        </section>

                        <section id="propriedade" className="scroll-mt-24 bg-white rounded-xl p-6 sm:p-8 border border-[#E6E8E5]">
                            <h2 className="text-lg sm:text-xl font-semibold text-[#0F1F1B] mb-3 flex items-center gap-2.5">
                                <Shield className="w-5 h-5 text-[#155E4B] shrink-0" />
                                7. Propriedade Intelectual
                            </h2>
                            <div className="space-y-3 text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                <p>
                                    O software, código-fonte, marcas, identidade visual, documentação e materiais do CliniGo são de propriedade exclusiva da CLINIGO TECNOLOGIA LTDA ou de seus licenciadores. Os dados clínicos e cadastrais inseridos pela clínica permanecem de titularidade da clínica contratante.
                                </p>
                            </div>
                        </section>

                        <section id="rescisao" className="scroll-mt-24 bg-white rounded-xl p-6 sm:p-8 border border-[#E6E8E5]">
                            <h2 className="text-lg sm:text-xl font-semibold text-[#0F1F1B] mb-3 flex items-center gap-2.5">
                                <FileText className="w-5 h-5 text-[#155E4B] shrink-0" />
                                8. Rescisão e Guarda de Dados
                            </h2>
                            <div className="space-y-3 text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                <p>
                                    A conta pode ser encerrada pelo contratante mediante solicitação, ou pelo CliniGo em caso de violação destes Termos ou inadimplência prolongada. A clínica dispõe de recursos de exportação estruturada para portabilidade LGPD e atendimento aos prazos legais de guarda de prontuários.
                                </p>
                            </div>
                        </section>

                        <section id="gerais" className="scroll-mt-24 bg-white rounded-xl p-6 sm:p-8 border border-[#E6E8E5]">
                            <h2 className="text-lg sm:text-xl font-semibold text-[#0F1F1B] mb-3 flex items-center gap-2.5">
                                <Scale className="w-5 h-5 text-[#155E4B] shrink-0" />
                                9. Disposições Gerais e Foro
                            </h2>
                            <div className="space-y-3 text-sm sm:text-base text-[#4B5B56] leading-relaxed">
                                <p>
                                    Estes Termos são regidos pelas leis da República Federativa do Brasil, elegendo-se o foro da comarca do Rio de Janeiro, RJ, para dirimir eventuais controvérsias.
                                </p>
                            </div>
                        </section>

                        <section id="contato" className="scroll-mt-24 bg-white rounded-xl p-6 sm:p-8 border border-[#E6E8E5]">
                            <h2 className="text-lg sm:text-xl font-semibold text-[#0F1F1B] mb-3">
                                10. Contato e Encarregado (DPO)
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-sm">
                                <div className="bg-[#FAFAF8] border border-[#E6E8E5] p-4 rounded-lg">
                                    <p className="font-semibold text-[#0F1F1B] mb-1">Atendimento</p>
                                    <a href="mailto:contato@clinigo.app" className="text-[#155E4B] hover:underline break-all">
                                        contato@clinigo.app
                                    </a>
                                </div>
                                <div className="bg-[#FAFAF8] border border-[#E6E8E5] p-4 rounded-lg">
                                    <p className="font-semibold text-[#0F1F1B] mb-1">DPO / LGPD</p>
                                    <a href="mailto:dpo.lgpd@clinigo.app" className="text-[#155E4B] hover:underline break-all">
                                        dpo.lgpd@clinigo.app
                                    </a>
                                </div>
                                <div className="bg-[#FAFAF8] border border-[#E6E8E5] p-4 rounded-lg">
                                    <p className="font-semibold text-[#0F1F1B] mb-1">WhatsApp</p>
                                    <a
                                        href="https://wa.me/5521975129005"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#155E4B] hover:underline"
                                    >
                                        (21) 97512-9005
                                    </a>
                                </div>
                            </div>
                        </section>

                        <div className="text-center text-xs text-[#4B5B56] pt-6">
                            <p className="font-semibold text-[#0F1F1B]">CLINIGO TECNOLOGIA LTDA</p>
                            <p>Rio de Janeiro, RJ — Brasil</p>
                        </div>
                    </div>
                </div>
            </main>
        </EditorialShell>
    )
}
