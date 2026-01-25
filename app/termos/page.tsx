'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Shield, Scale, AlertTriangle, CheckCircle } from 'lucide-react'

export default function TermosPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/logo_black.svg" alt="CliniGo" className="h-10 w-auto" />
                    </Link>
                    <Link
                        href="/"
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar ao site
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-12">
                {/* Title */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                        <FileText className="w-4 h-4" />
                        Documento Legal
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Termos de Uso
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Condições gerais de uso da plataforma CliniGo
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                        Última atualização: Janeiro de 2026
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-8">
                    {/* Section 1 */}
                    <section className="bg-white rounded-xl p-8 shadow-sm border">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <Scale className="w-5 h-5 text-emerald-600" />
                            1. Aceitação dos Termos
                        </h2>
                        <div className="prose prose-gray max-w-none text-gray-600">
                            <p>
                                Ao acessar e utilizar a plataforma CliniGo, você concorda em cumprir e estar vinculado
                                aos seguintes Termos de Uso. Se você não concordar com qualquer parte destes termos,
                                não deverá utilizar nossos serviços.
                            </p>
                            <p>
                                A utilização do CliniGo implica na aceitação integral e irrestrita de todos os termos
                                e condições aqui estabelecidos, bem como das políticas de privacidade e demais normas disponíveis.
                            </p>
                        </div>
                    </section>

                    {/* Section 2 */}
                    <section className="bg-white rounded-xl p-8 shadow-sm border">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            2. Descrição do Serviço
                        </h2>
                        <div className="prose prose-gray max-w-none text-gray-600">
                            <p>
                                O CliniGo é uma plataforma de gestão para clínicas e consultórios médicos que oferece:
                            </p>
                            <ul>
                                <li>Sistema de agendamento online de consultas</li>
                                <li>Prontuário eletrônico do paciente</li>
                                <li>Gestão financeira e faturamento</li>
                                <li>Teleconsulta com videoconferência</li>
                                <li>Faturamento TISS para convênios</li>
                                <li>Relatórios e análises gerenciais</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 3 */}
                    <section className="bg-white rounded-xl p-8 shadow-sm border">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-600" />
                            3. Cadastro e Conta
                        </h2>
                        <div className="prose prose-gray max-w-none text-gray-600">
                            <p>Para utilizar o CliniGo, é necessário:</p>
                            <ul>
                                <li>Ser pessoa jurídica legalmente constituída ou profissional de saúde habilitado</li>
                                <li>Fornecer informações verdadeiras, precisas e completas no cadastro</li>
                                <li>Manter seus dados de acesso (login e senha) em sigilo</li>
                                <li>Notificar imediatamente sobre qualquer uso não autorizado da conta</li>
                            </ul>
                            <p>
                                O usuário é integralmente responsável por todas as atividades realizadas em sua conta.
                            </p>
                        </div>
                    </section>

                    {/* Section 4 */}
                    <section className="bg-white rounded-xl p-8 shadow-sm border">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            4. Responsabilidades do Usuário
                        </h2>
                        <div className="prose prose-gray max-w-none text-gray-600">
                            <p>O usuário compromete-se a:</p>
                            <ul>
                                <li>Utilizar a plataforma de acordo com a legislação vigente</li>
                                <li>Respeitar as normas do Conselho Federal de Medicina e demais conselhos profissionais</li>
                                <li>Garantir a veracidade dos dados de pacientes inseridos</li>
                                <li>Manter sigilo profissional conforme Código de Ética Médica</li>
                                <li>Obter consentimento dos pacientes para tratamento de dados</li>
                                <li>Não utilizar a plataforma para fins ilícitos</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 5 */}
                    <section className="bg-white rounded-xl p-8 shadow-sm border">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-emerald-600" />
                            5. Limitação de Responsabilidade
                        </h2>
                        <div className="prose prose-gray max-w-none text-gray-600">
                            <p>O CliniGo não se responsabiliza por:</p>
                            <ul>
                                <li>Decisões médicas ou clínicas tomadas pelos profissionais de saúde</li>
                                <li>Veracidade das informações inseridas pelos usuários</li>
                                <li>Interrupções temporárias por manutenção ou força maior</li>
                                <li>Perdas ou danos decorrentes de uso indevido da plataforma</li>
                                <li>Conflitos entre clínicas e pacientes</li>
                            </ul>
                            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mt-4">
                                <p className="text-amber-800 mb-0">
                                    <strong>Importante:</strong> A plataforma é uma ferramenta de apoio à gestão.
                                    A responsabilidade técnica e legal pelos atendimentos é do profissional de saúde
                                    e/ou estabelecimento de saúde.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section 6 */}
                    <section className="bg-white rounded-xl p-8 shadow-sm border">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <Scale className="w-5 h-5 text-emerald-600" />
                            6. Planos e Pagamentos
                        </h2>
                        <div className="prose prose-gray max-w-none text-gray-600">
                            <ul>
                                <li>Os valores e condições dos planos estão disponíveis em <Link href="/planos" className="text-emerald-600 hover:underline">clinigo.app/planos</Link></li>
                                <li>O pagamento é mensal, via cartão de crédito, boleto ou PIX</li>
                                <li>O período de teste gratuito é de 7 dias</li>
                                <li>O cancelamento pode ser solicitado a qualquer momento</li>
                                <li>Não há reembolso proporcional para cancelamentos antecipados</li>
                                <li>Os preços podem ser alterados com aviso prévio de 30 dias</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 7 */}
                    <section className="bg-white rounded-xl p-8 shadow-sm border">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <Shield className="w-5 h-5 text-emerald-600" />
                            7. Propriedade Intelectual
                        </h2>
                        <div className="prose prose-gray max-w-none text-gray-600">
                            <p>
                                Todo o conteúdo da plataforma CliniGo, incluindo mas não limitado a textos, gráficos,
                                logotipos, ícones, imagens, clipes de áudio, código fonte e software, é de propriedade
                                exclusiva da CLINIGO TECNOLOGIA LTDA ou de seus licenciadores.
                            </p>
                            <p>
                                É vedada a reprodução, distribuição, modificação ou qualquer uso não autorizado do conteúdo
                                sem prévia autorização por escrito.
                            </p>
                        </div>
                    </section>

                    {/* Section 8 */}
                    <section className="bg-white rounded-xl p-8 shadow-sm border">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            8. Rescisão
                        </h2>
                        <div className="prose prose-gray max-w-none text-gray-600">
                            <p>A conta pode ser encerrada:</p>
                            <ul>
                                <li><strong>Pelo usuário:</strong> a qualquer momento, mediante solicitação</li>
                                <li><strong>Pelo CliniGo:</strong> em caso de violação destes termos, uso indevido,
                                    inadimplência ou por decisão comercial com aviso prévio de 30 dias</li>
                            </ul>
                            <p>
                                Após o encerramento, os dados serão mantidos conforme prazos legais
                                (prontuários por 20 anos, dados fiscais por 5 anos).
                            </p>
                        </div>
                    </section>

                    {/* Section 9 */}
                    <section className="bg-white rounded-xl p-8 shadow-sm border">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                            <Scale className="w-5 h-5 text-emerald-600" />
                            9. Disposições Gerais
                        </h2>
                        <div className="prose prose-gray max-w-none text-gray-600">
                            <ul>
                                <li>Estes termos são regidos pelas leis da República Federativa do Brasil</li>
                                <li>Fica eleito o foro da comarca do Rio de Janeiro/RJ para dirimir quaisquer controvérsias</li>
                                <li>A tolerância quanto ao descumprimento não implica renúncia de direitos</li>
                                <li>A nulidade de qualquer cláusula não afeta as demais</li>
                                <li>O CliniGo reserva-se o direito de modificar estes termos a qualquer momento</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 10 */}
                    <section className="bg-white rounded-xl p-8 shadow-sm border">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">
                            10. Contato
                        </h2>
                        <div className="prose prose-gray max-w-none text-gray-600">
                            <p>Para dúvidas sobre estes Termos de Uso:</p>
                            <div className="grid md:grid-cols-2 gap-4 mt-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="font-medium text-gray-900">E-mail</p>
                                    <a href="mailto:contato@clinigo.app" className="text-emerald-600">contato@clinigo.app</a>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="font-medium text-gray-900">WhatsApp</p>
                                    <a href="https://wa.me/5521965532247" className="text-emerald-600">(21) 96553-2247</a>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Final */}
                    <div className="text-center text-gray-500 text-sm pt-8 border-t">
                        <p>
                            <strong>CLINIGO TECNOLOGIA LTDA</strong><br />
                            Rio de Janeiro, RJ - Brasil<br />
                            Versão 1.0 - Janeiro de 2026
                        </p>
                    </div>

                    {/* Related Links */}
                    <div className="flex flex-wrap justify-center gap-4 pt-4">
                        <Link href="/lgpd" className="text-emerald-600 hover:text-emerald-700 font-medium">
                            Política de Privacidade (LGPD)
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link href="/contato" className="text-emerald-600 hover:text-emerald-700 font-medium">
                            Fale Conosco
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-8 px-4 mt-12">
                <div className="max-w-4xl mx-auto text-center text-sm">
                    <p>© 2026 CliniGo. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}
