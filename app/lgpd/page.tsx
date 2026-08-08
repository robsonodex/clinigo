'use client'

import Link from 'next/link'
import { ArrowLeft, Shield, Lock, Eye, FileText, Users, Server, AlertTriangle, CheckCircle, Scale } from 'lucide-react'

export default function LGPDPage() {
    const sections = [
        { id: 'introducao', title: '1. Introdução e Compromisso', icon: Shield },
        { id: 'definicoes', title: '2. Definições', icon: FileText },
        { id: 'dados-coletados', title: '3. Dados Pessoais Coletados', icon: Eye },
        { id: 'finalidade', title: '4. Finalidade do Tratamento', icon: CheckCircle },
        { id: 'base-legal', title: '5. Base Legal', icon: Scale },
        { id: 'compartilhamento', title: '6. Compartilhamento de Dados', icon: Users },
        { id: 'seguranca', title: '7. Segurança dos Dados', icon: Lock },
        { id: 'direitos', title: '8. Direitos do Titular', icon: Shield },
        { id: 'retencao', title: '9. Retenção e Exclusão', icon: Server },
        { id: 'saude', title: '10. Dados de Saúde', icon: AlertTriangle },
        { id: 'contato', title: '11. Contato e DPO', icon: Users },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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

            <main className="max-w-5xl mx-auto px-4 py-12">
                {/* Title */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                        <Shield className="w-4 h-4" />
                        Lei Geral de Proteção de Dados
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        Política de Privacidade e Proteção de Dados
                    </h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Em conformidade com a Lei nº 13.709/2018 (LGPD), Resolução CFM nº 2.314/2022
                        e demais normas aplicáveis ao setor de saúde.
                    </p>
                    <p className="text-sm text-gray-500 mt-4">
                        Última atualização: Janeiro de 2026
                    </p>
                </div>

                <div className="grid lg:grid-cols-4 gap-8">
                    {/* Navigation */}
                    <nav className="lg:col-span-1">
                        <div className="sticky top-24 bg-white rounded-xl p-4 shadow-sm border">
                            <h3 className="font-semibold text-gray-900 mb-4">Índice</h3>
                            <ul className="space-y-2">
                                {sections.map((section) => (
                                    <li key={section.id}>
                                        <a
                                            href={`#${section.id}`}
                                            className="text-sm text-gray-600 hover:text-emerald-600 transition-colors flex items-center gap-2"
                                        >
                                            <section.icon className="w-3 h-3" />
                                            {section.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </nav>

                    {/* Content */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Section 1 */}
                        <section id="introducao" className="bg-white rounded-xl p-8 shadow-sm border">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <Shield className="w-6 h-6 text-emerald-600" />
                                1. Introdução e Compromisso
                            </h2>
                            <div className="prose prose-gray max-w-none">
                                <p>
                                    A <strong>CLINIGO TECNOLOGIA LTDA</strong>, pessoa jurídica de direito privado,
                                    inscrita no CNPJ sob o nº [NÚMERO], com sede na cidade do Rio de Janeiro/RJ,
                                    doravante denominada <strong>"CliniGo"</strong> ou <strong>"Controladora"</strong>,
                                    apresenta esta Política de Privacidade e Proteção de Dados Pessoais.
                                </p>
                                <p>
                                    Esta política descreve como coletamos, usamos, armazenamos, compartilhamos e protegemos
                                    os dados pessoais de nossos usuários, em conformidade com:
                                </p>
                                <ul>
                                    <li><strong>Lei nº 13.709/2018</strong> – Lei Geral de Proteção de Dados (LGPD)</li>
                                    <li><strong>Lei nº 12.965/2014</strong> – Marco Civil da Internet</li>
                                    <li><strong>Lei nº 13.787/2018</strong> – Digitalização de Prontuários Médicos</li>
                                    <li><strong>Resolução CFM nº 2.314/2022</strong> – Telemedicina</li>
                                    <li><strong>Resolução CFM nº 1.821/2007</strong> – Prontuário Eletrônico</li>
                                    <li><strong>Lei nº 8.078/1990</strong> – Código de Defesa do Consumidor</li>
                                </ul>
                                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg mt-4">
                                    <p className="text-emerald-800 font-medium mb-0">
                                        <strong>Compromisso:</strong> O CliniGo assume o compromisso de tratar os dados
                                        pessoais de seus usuários com responsabilidade, transparência e segurança,
                                        garantindo os direitos fundamentais de liberdade e privacidade.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Section 2 */}
                        <section id="definicoes" className="bg-white rounded-xl p-8 shadow-sm border">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <FileText className="w-6 h-6 text-emerald-600" />
                                2. Definições
                            </h2>
                            <div className="prose prose-gray max-w-none">
                                <p>Para fins desta Política, considera-se:</p>
                                <dl className="space-y-4 mt-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <dt className="font-semibold text-gray-900">Dado Pessoal</dt>
                                        <dd className="text-gray-600 mt-1">Informação relacionada a pessoa natural identificada ou identificável (Art. 5º, I, LGPD).</dd>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <dt className="font-semibold text-gray-900">Dado Pessoal Sensível</dt>
                                        <dd className="text-gray-600 mt-1">Dado sobre origem racial, convicção religiosa, opinião política, filiação a sindicato, dado referente à saúde ou à vida sexual, dado genético ou biométrico, quando vinculado a pessoa natural (Art. 5º, II, LGPD).</dd>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <dt className="font-semibold text-gray-900">Tratamento</dt>
                                        <dd className="text-gray-600 mt-1">Toda operação realizada com dados pessoais, como coleta, produção, recepção, classificação, utilização, acesso, reprodução, transmissão, distribuição, processamento, arquivamento, armazenamento, eliminação ou modificação.</dd>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <dt className="font-semibold text-gray-900">Titular</dt>
                                        <dd className="text-gray-600 mt-1">Pessoa natural a quem se referem os dados pessoais que são objeto de tratamento.</dd>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <dt className="font-semibold text-gray-900">Controlador</dt>
                                        <dd className="text-gray-600 mt-1">Pessoa natural ou jurídica, de direito público ou privado, a quem competem as decisões referentes ao tratamento de dados pessoais. No âmbito desta plataforma, o CliniGo atua como Controlador em relação aos dados de gestão da plataforma, e como Operador em relação aos dados de pacientes das clínicas.</dd>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <dt className="font-semibold text-gray-900">Operador</dt>
                                        <dd className="text-gray-600 mt-1">Pessoa natural ou jurídica que realiza o tratamento de dados pessoais em nome do Controlador.</dd>
                                    </div>
                                </dl>
                            </div>
                        </section>

                        {/* Section 3 */}
                        <section id="dados-coletados" className="bg-white rounded-xl p-8 shadow-sm border">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <Eye className="w-6 h-6 text-emerald-600" />
                                3. Dados Pessoais Coletados
                            </h2>
                            <div className="prose prose-gray max-w-none">
                                <h3 className="text-lg font-semibold">3.1. Dados de Cadastro (Clínicas e Profissionais)</h3>
                                <ul>
                                    <li>Nome completo e razão social</li>
                                    <li>CPF e CNPJ</li>
                                    <li>Endereço de e-mail</li>
                                    <li>Número de telefone</li>
                                    <li>Endereço comercial</li>
                                    <li>Número de registro profissional (CRM, CRO, etc.)</li>
                                    <li>Especialidade médica</li>
                                    <li>Dados bancários para repasse de pagamentos</li>
                                </ul>

                                <h3 className="text-lg font-semibold mt-6">3.2. Dados de Pacientes</h3>
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                                    <p className="text-amber-800 mb-0">
                                        <strong>Importante:</strong> Os dados de pacientes são inseridos pelas clínicas usuárias
                                        da plataforma. O CliniGo atua como <strong>Operador</strong> destes dados, cabendo às
                                        clínicas a responsabilidade de <strong>Controlador</strong> perante seus pacientes.
                                    </p>
                                </div>
                                <ul className="mt-4">
                                    <li>Nome completo</li>
                                    <li>CPF</li>
                                    <li>Data de nascimento</li>
                                    <li>Endereço de e-mail e telefone</li>
                                    <li>Dados de saúde (anamnese, prontuário médico, prescrições)</li>
                                    <li>Histórico de consultas e atendimentos</li>
                                    <li>Gravações de teleconsultas (quando autorizadas)</li>
                                </ul>

                                <h3 className="text-lg font-semibold mt-6">3.3. Dados de Navegação</h3>
                                <ul>
                                    <li>Endereço IP</li>
                                    <li>Tipo de navegador e dispositivo</li>
                                    <li>Páginas acessadas e tempo de permanência</li>
                                    <li>Cookies e tecnologias similares</li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 4 */}
                        <section id="finalidade" className="bg-white rounded-xl p-8 shadow-sm border">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-emerald-600" />
                                4. Finalidade do Tratamento
                            </h2>
                            <div className="prose prose-gray max-w-none">
                                <p>Os dados pessoais são tratados para as seguintes finalidades:</p>
                                <div className="grid md:grid-cols-2 gap-4 mt-4">
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-gray-900 mb-2">Prestação de Serviços</h4>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            <li>• Disponibilização da plataforma</li>
                                            <li>• Agendamento de consultas</li>
                                            <li>• Prontuário eletrônico</li>
                                            <li>• Teleconsultas</li>
                                            <li>• Gestão financeira</li>
                                        </ul>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-gray-900 mb-2">Cumprimento Legal</h4>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            <li>• Obrigações fiscais e tributárias</li>
                                            <li>• Guarda de prontuários (20 anos)</li>
                                            <li>• Requisições judiciais</li>
                                            <li>• Auditoria contábil</li>
                                        </ul>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-gray-900 mb-2">Comunicação</h4>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            <li>• Lembretes de consultas</li>
                                            <li>• Notificações do sistema</li>
                                            <li>• Suporte técnico</li>
                                            <li>• Atualizações de serviço</li>
                                        </ul>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-gray-900 mb-2">Segurança</h4>
                                        <ul className="text-sm text-gray-600 space-y-1">
                                            <li>• Prevenção de fraudes</li>
                                            <li>• Proteção da plataforma</li>
                                            <li>• Auditoria de acessos</li>
                                            <li>• Backup de dados</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 5 */}
                        <section id="base-legal" className="bg-white rounded-xl p-8 shadow-sm border">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <Scale className="w-6 h-6 text-emerald-600" />
                                5. Base Legal para Tratamento
                            </h2>
                            <div className="prose prose-gray max-w-none">
                                <p>O tratamento de dados pessoais é realizado com base nas seguintes hipóteses legais previstas na LGPD:</p>

                                <div className="space-y-4 mt-4">
                                    <div className="border-l-4 border-emerald-500 pl-4">
                                        <h4 className="font-semibold text-gray-900">Art. 7º, II – Cumprimento de Obrigação Legal</h4>
                                        <p className="text-gray-600 text-sm">Guarda de prontuários médicos por 20 anos (Resolução CFM 1.821/2007), emissão de notas fiscais, cumprimento de requisições judiciais.</p>
                                    </div>
                                    <div className="border-l-4 border-emerald-500 pl-4">
                                        <h4 className="font-semibold text-gray-900">Art. 7º, V – Execução de Contrato</h4>
                                        <p className="text-gray-600 text-sm">Prestação dos serviços contratados pelas clínicas, processamento de pagamentos, disponibilização das funcionalidades da plataforma.</p>
                                    </div>
                                    <div className="border-l-4 border-emerald-500 pl-4">
                                        <h4 className="font-semibold text-gray-900">Art. 7º, IX – Interesse Legítimo</h4>
                                        <p className="text-gray-600 text-sm">Segurança da plataforma, prevenção a fraudes, melhorias no serviço, comunicações relacionadas ao uso.</p>
                                    </div>
                                    <div className="border-l-4 border-amber-500 pl-4 bg-amber-50 p-4 rounded-r-lg">
                                        <h4 className="font-semibold text-amber-900">Art. 11, II, f – Tutela da Saúde (Dados Sensíveis)</h4>
                                        <p className="text-amber-800 text-sm">Para dados de saúde, o tratamento é necessário para a tutela da saúde, exclusivamente, em procedimento realizado por profissionais de saúde, serviços de saúde ou autoridade sanitária.</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 6 */}
                        <section id="compartilhamento" className="bg-white rounded-xl p-8 shadow-sm border">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <Users className="w-6 h-6 text-emerald-600" />
                                6. Compartilhamento de Dados
                            </h2>
                            <div className="prose prose-gray max-w-none">
                                <p>Os dados pessoais podem ser compartilhados com:</p>

                                <div className="overflow-x-auto mt-4">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destinatário</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Finalidade</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Legal</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                            <tr>
                                                <td className="px-4 py-3">Provedores de infraestrutura (Supabase, Vercel)</td>
                                                <td className="px-4 py-3">Hospedagem e armazenamento</td>
                                                <td className="px-4 py-3">Execução contratual</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3">Processadores de pagamento (MercadoPago)</td>
                                                <td className="px-4 py-3">Processamento financeiro</td>
                                                <td className="px-4 py-3">Execução contratual</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3">Autoridades públicas</td>
                                                <td className="px-4 py-3">Cumprimento de ordem judicial ou requisição legal</td>
                                                <td className="px-4 py-3">Obrigação legal</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3">Operadoras de saúde</td>
                                                <td className="px-4 py-3">Faturamento TISS (quando aplicável)</td>
                                                <td className="px-4 py-3">Execução contratual</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mt-6">
                                    <p className="text-red-800 mb-0">
                                        <strong>Vedações:</strong> O CliniGo <strong>NÃO</strong> comercializa, vende ou
                                        disponibiliza dados pessoais de pacientes para fins de marketing, publicidade
                                        ou qualquer finalidade não relacionada à prestação dos serviços de saúde.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Section 7 */}
                        <section id="seguranca" className="bg-white rounded-xl p-8 shadow-sm border">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <Lock className="w-6 h-6 text-emerald-600" />
                                7. Segurança dos Dados
                            </h2>
                            <div className="prose prose-gray max-w-none">
                                <p>Adotamos medidas técnicas e administrativas aptas a proteger os dados pessoais:</p>

                                <div className="grid md:grid-cols-2 gap-4 mt-4">
                                    <div className="bg-emerald-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-emerald-900 mb-2">🔐 Criptografia</h4>
                                        <ul className="text-sm text-emerald-800 space-y-1">
                                            <li>• TLS 1.3 para transmissão</li>
                                            <li>• AES-256 para armazenamento</li>
                                            <li>• Criptografia de ponta a ponta em teleconsultas</li>
                                        </ul>
                                    </div>
                                    <div className="bg-emerald-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-emerald-900 mb-2">🛡️ Controle de Acesso</h4>
                                        <ul className="text-sm text-emerald-800 space-y-1">
                                            <li>• Autenticação multifator</li>
                                            <li>• Row Level Security (RLS)</li>
                                            <li>• Isolamento de dados por clínica</li>
                                        </ul>
                                    </div>
                                    <div className="bg-emerald-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-emerald-900 mb-2">📊 Monitoramento</h4>
                                        <ul className="text-sm text-emerald-800 space-y-1">
                                            <li>• Logs de auditoria completos</li>
                                            <li>• Monitoramento 24/7</li>
                                            <li>• Alertas de segurança em tempo real</li>
                                        </ul>
                                    </div>
                                    <div className="bg-emerald-50 p-4 rounded-lg">
                                        <h4 className="font-semibold text-emerald-900 mb-2">💾 Backup e Recuperação</h4>
                                        <ul className="text-sm text-emerald-800 space-y-1">
                                            <li>• Backup diário automatizado</li>
                                            <li>• Redundância geográfica</li>
                                            <li>• Plano de continuidade de negócios</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 8 */}
                        <section id="direitos" className="bg-white rounded-xl p-8 shadow-sm border">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <Shield className="w-6 h-6 text-emerald-600" />
                                8. Direitos do Titular
                            </h2>
                            <div className="prose prose-gray max-w-none">
                                <p>Conforme o Art. 18 da LGPD, o titular dos dados pessoais tem direito a:</p>

                                <div className="grid gap-3 mt-4">
                                    {[
                                        { title: 'Confirmação', desc: 'Confirmar a existência de tratamento de seus dados' },
                                        { title: 'Acesso', desc: 'Acessar seus dados pessoais mantidos por nós' },
                                        { title: 'Correção', desc: 'Corrigir dados incompletos, inexatos ou desatualizados' },
                                        { title: 'Anonimização', desc: 'Anonimizar, bloquear ou eliminar dados desnecessários' },
                                        { title: 'Portabilidade', desc: 'Portabilidade dos dados a outro fornecedor' },
                                        { title: 'Eliminação', desc: 'Eliminação dos dados tratados com consentimento' },
                                        { title: 'Informação', desc: 'Informação sobre compartilhamento com terceiros' },
                                        { title: 'Revogação', desc: 'Revogação do consentimento a qualquer momento' },
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                                            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <strong className="text-gray-900">{item.title}:</strong>
                                                <span className="text-gray-600 ml-1">{item.desc}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mt-6">
                                    <p className="text-blue-800 mb-0">
                                        <strong>Como exercer seus direitos:</strong> Envie uma solicitação para
                                        <a href="mailto:dpo.lgpd@clinigo.app" className="font-semibold ml-1">dpo.lgpd@clinigo.app</a>
                                        informando seu nome completo, CPF e o direito que deseja exercer.
                                        Responderemos em até 15 dias úteis.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Section 9 */}
                        <section id="retencao" className="bg-white rounded-xl p-8 shadow-sm border">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <Server className="w-6 h-6 text-emerald-600" />
                                9. Retenção e Exclusão de Dados
                            </h2>
                            <div className="prose prose-gray max-w-none">
                                <p>Os dados pessoais são retidos pelos seguintes períodos:</p>

                                <div className="overflow-x-auto mt-4">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de Dado</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fundamento</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                            <tr>
                                                <td className="px-4 py-3 font-medium">Prontuário médico</td>
                                                <td className="px-4 py-3">20 anos após último atendimento</td>
                                                <td className="px-4 py-3">Resolução CFM 1.821/2007</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-medium">Dados fiscais/tributários</td>
                                                <td className="px-4 py-3">5 anos</td>
                                                <td className="px-4 py-3">Código Tributário Nacional</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-medium">Logs de acesso</td>
                                                <td className="px-4 py-3">6 meses</td>
                                                <td className="px-4 py-3">Marco Civil da Internet</td>
                                            </tr>
                                            <tr>
                                                <td className="px-4 py-3 font-medium">Dados de conta (após cancelamento)</td>
                                                <td className="px-4 py-3">30 dias para exclusão</td>
                                                <td className="px-4 py-3">Art. 16, LGPD</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                        {/* Section 10 */}
                        <section id="saude" className="bg-white rounded-xl p-8 shadow-sm border">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <AlertTriangle className="w-6 h-6 text-emerald-600" />
                                10. Disposições Específicas para Dados de Saúde
                            </h2>
                            <div className="prose prose-gray max-w-none">
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg mb-6">
                                    <p className="text-amber-800 mb-0">
                                        Dados de saúde são considerados <strong>dados pessoais sensíveis</strong> pela LGPD
                                        e possuem proteção reforçada.
                                    </p>
                                </div>

                                <h3 className="text-lg font-semibold">10.1. Sigilo Médico</h3>
                                <p>
                                    O CliniGo respeita integralmente o sigilo profissional previsto no Código de Ética Médica
                                    (Resolução CFM 2.217/2018). Os dados clínicos e prontuários são acessíveis exclusivamente:
                                </p>
                                <ul>
                                    <li>Ao profissional de saúde responsável pelo atendimento</li>
                                    <li>Ao paciente titular dos dados</li>
                                    <li>Por ordem judicial expressa</li>
                                </ul>

                                <h3 className="text-lg font-semibold mt-6">10.2. Teleconsulta</h3>
                                <p>
                                    As teleconsultas realizadas através da plataforma estão em conformidade com a
                                    Resolução CFM nº 2.314/2022, garantindo:
                                </p>
                                <ul>
                                    <li>Criptografia de ponta a ponta via WebRTC</li>
                                    <li>Consentimento prévio do paciente</li>
                                    <li>Registro no prontuário eletrônico</li>
                                    <li>Gravação opcional (mediante autorização expressa)</li>
                                </ul>

                                <h3 className="text-lg font-semibold mt-6">10.3. Prontuário Eletrônico</h3>
                                <p>
                                    O prontuário eletrônico do CliniGo atende aos requisitos da Lei 13.787/2018 e
                                    Resolução CFM 1.821/2007:
                                </p>
                                <ul>
                                    <li>Integridade e autenticidade dos registros</li>
                                    <li>Assinatura digital do profissional</li>
                                    <li>Auditoria de alterações</li>
                                    <li>Guarda por período mínimo de 20 anos</li>
                                </ul>
                            </div>
                        </section>

                        {/* Section 11 */}
                        <section id="contato" className="bg-white rounded-xl p-8 shadow-sm border">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                <Users className="w-6 h-6 text-emerald-600" />
                                11. Contato e Encarregado (DPO)
                            </h2>
                            <div className="prose prose-gray max-w-none">
                                <p>
                                    Para exercer seus direitos ou esclarecer dúvidas sobre esta Política, entre em contato:
                                </p>

                                <div className="grid md:grid-cols-2 gap-4 mt-6">
                                    <div className="bg-emerald-50 p-6 rounded-xl">
                                        <h4 className="font-semibold text-emerald-900 mb-3">📧 Encarregado de Dados (DPO)</h4>
                                        <p className="text-emerald-800 text-sm mb-2">
                                            <strong>E-mail:</strong> dpo.lgpd@clinigo.app
                                        </p>
                                        <p className="text-emerald-700 text-sm">
                                            Para solicitações de titulares e questões relacionadas à proteção de dados pessoais.
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 p-6 rounded-xl">
                                        <h4 className="font-semibold text-gray-900 mb-3">📞 Outros Canais</h4>
                                        <p className="text-gray-600 text-sm mb-1">
                                            <strong>Comercial:</strong> contato@clinigo.app
                                        </p>
                                        <p className="text-gray-600 text-sm mb-1">
                                            <strong>Suporte:</strong> suporte@clinigo.app
                                        </p>
                                        <p className="text-gray-600 text-sm">
                                            <strong>WhatsApp:</strong> (21) 99040-0577
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 p-6 bg-gray-900 text-white rounded-xl">
                                    <h4 className="font-semibold mb-3">Autoridade Nacional de Proteção de Dados (ANPD)</h4>
                                    <p className="text-gray-300 text-sm">
                                        Caso entenda que o tratamento de seus dados pessoais viola a LGPD, você tem o
                                        direito de apresentar reclamação perante a Autoridade Nacional de Proteção de Dados.
                                    </p>
                                    <p className="text-gray-400 text-sm mt-2">
                                        Site: <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">www.gov.br/anpd</a>
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Final */}
                        <div className="text-center text-gray-500 text-sm pt-8 border-t">
                            <p>
                                Esta Política de Privacidade entra em vigor a partir de sua publicação e poderá ser
                                atualizada periodicamente. Recomendamos a leitura regular deste documento.
                            </p>
                            <p className="mt-4">
                                <strong>CLINIGO TECNOLOGIA LTDA</strong><br />
                                Rio de Janeiro, RJ - Brasil<br />
                                Versão 1.0 - Janeiro de 2026
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-8 px-4 mt-12">
                <div className="max-w-5xl mx-auto text-center text-sm">
                    <p>© 2026 CliniGo. Todos os direitos reservados.</p>
                    <div className="mt-4 flex items-center justify-center gap-6">
                        <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
                        <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
                        <Link href="/contato" className="hover:text-white transition-colors">Contato</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
