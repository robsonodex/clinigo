/**
 * Modelo Jurídico Oficial de Contrato Comercial B2B SaaS — CliniGo (Fidelidade 12 Meses).
 *
 * Regras comerciais invioláveis incorporadas:
 * - Apenas 3 planos oficiais: Básico (R$ 149 / 1 licença), Avançado (R$ 249 / até 5 licenças), Professional (R$ 449 / até 30 licenças).
 * - Licença adicional avulsa: R$ 49,90/mês.
 * - 1 única unidade operacional por assinatura.
 * - Taxa única de implantação ou reimplantação.
 * - Treinamento 100% digital via Guia de Uso Integrado e CliniGo Academy (sem sessões presenciais ou individuais externas).
 * - Exclusão expressa de controle de caixa em espécie e emissão de nota fiscal.
 * - Fidelidade contratual de 12 meses (editável) com multa rescisória proporcional.
 * - Cláusula LGPD e encerramento definitivo exigindo novo contrato para retorno.
 */

export type CommercialPlanKey = 'BASICO' | 'AVANCADO' | 'PROFESSIONAL'

export interface CommercialPlanPreset {
    key: CommercialPlanKey
    label: string
    monthlyPriceReais: number
    includedLicenses: number
    summary: string
}

export const COMMERCIAL_PLAN_PRESETS: Record<CommercialPlanKey, CommercialPlanPreset> = {
    BASICO: {
        key: 'BASICO',
        label: 'Básico',
        monthlyPriceReais: 149,
        includedLicenses: 1,
        summary:
            '1 licença (1 unidade operacional), atendimentos ilimitados, agenda recorrente, prontuário por especialidade, planos terapêuticos ABA, controle de faltas e reposições, teleconsulta WebRTC, pré-cadastro, contratos com assinatura eletrônica (Lei 14.063/2020), CliniGo Família, CliniGo IA com Escudo LGPD e Guia de Uso Integrado.',
    },
    AVANCADO: {
        key: 'AVANCADO',
        label: 'Avançado',
        monthlyPriceReais: 249,
        includedLicenses: 5,
        summary:
            'Até 5 licenças (1 unidade operacional), todos os recursos do plano Básico acrescidos de BI de Terapia, Mesa de Supervisão ABA/PEI, motor de repasse individual com sigilo RBAC, WhatsApp integrado por setores, CRM Kanban, DRE gerencial, importação em lote (Excel/CSV) e templates customizados.',
    },
    PROFESSIONAL: {
        key: 'PROFESSIONAL',
        label: 'Professional',
        monthlyPriceReais: 449,
        includedLicenses: 30,
        summary:
            'Até 30 licenças (1 unidade operacional), todos os recursos do plano Avançado acrescidos de faturamento TISS padrão ANS, lotes XML, gestão de glosas e recursos, check-in biométrico facial multi-superfície, Totem de autoatendimento, Painel de TV, pesquisa NPS, API, webhooks e SLA de 99,5%.',
    },
}

export interface CommercialContractFormData {
    contractNumber: string
    providerName: string
    providerBrand: string
    providerCnpj: string
    providerAddress: string
    providerRepresentative: string
    providerEmail: string
    providerPhone: string

    clinicId?: string | null
    clientName: string
    clientCnpj: string
    clientAddress: string
    clientRepresentative: string
    clientRepresentativeCpf: string
    clientEmail: string
    clientPhone: string

    planType: CommercialPlanKey
    monthlyValueReais: number
    setupFeeReais: number
    includedLicenses: number
    extraLicensePriceReais: number
    dueDay: number
    startDate: string
    fidelityMonths: number
    earlyTerminationPenaltyPct: number
    noticeDaysAfterFidelity: number
    readjustmentIndex: string
    forumCity: string
    isReactivationNewContract: boolean
    customNotes: string
}

export function createDefaultContractFormData(): CommercialContractFormData {
    const todayIso = new Date().toISOString().slice(0, 10)
    const year = todayIso.slice(0, 4)
    const seq = String(Math.floor(100 + Math.random() * 899))
    return {
        contractNumber: `CG-${year}-${seq}`,
        providerName: 'NODEX SOLUTIONS TECNOLOGIA LTDA',
        providerBrand: 'CliniGo',
        providerCnpj: 'A preencher (CNPJ da Contratada)',
        providerAddress: 'Rio de Janeiro/RJ',
        providerRepresentative: 'Robson — Diretoria Administrativa',
        providerEmail: 'contato@clinigo.app',
        providerPhone: '(21) 97512-9005',

        clinicId: null,
        clientName: '',
        clientCnpj: '',
        clientAddress: '',
        clientRepresentative: '',
        clientRepresentativeCpf: '',
        clientEmail: '',
        clientPhone: '',

        planType: 'PROFESSIONAL',
        monthlyValueReais: 449,
        setupFeeReais: 0,
        includedLicenses: 30,
        extraLicensePriceReais: 49.9,
        dueDay: 7,
        startDate: todayIso,
        fidelityMonths: 12,
        earlyTerminationPenaltyPct: 30,
        noticeDaysAfterFidelity: 30,
        readjustmentIndex: 'IPCA (IBGE)',
        forumCity: 'Rio de Janeiro/RJ',
        isReactivationNewContract: true,
        customNotes: '',
    }
}

export function formatBrl(value: number): string {
    const safe = Number.isFinite(value) ? value : 0
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
    }).format(safe)
}

export function formatCnpjDisplay(raw: string | null | undefined): string {
    if (!raw) return ''
    const digits = raw.replace(/\D/g, '')
    if (digits.length !== 14) return raw
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

export function formatPhoneDisplay(raw: string | null | undefined): string {
    if (!raw) return ''
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    }
    if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    }
    return raw
}

export function formatDatePtBr(isoDate: string): string {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return isoDate || '____/____/______'
    const [y, m, d] = isoDate.slice(0, 10).split('-')
    return `${d}/${m}/${y}`
}

export function calculateFidelityEndDate(startDateIso: string, months: number): string {
    if (!startDateIso || !/^\d{4}-\d{2}-\d{2}/.test(startDateIso)) return '____/____/______'
    const [y, m, d] = startDateIso.slice(0, 10).split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1 + Math.max(0, months), d))
    const dd = String(dt.getUTCDate()).padStart(2, '0')
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = dt.getUTCFullYear()
    return `${dd}/${mm}/${yyyy}`
}

function formatCountWithPtWord(value: number): string {
    const safe = Math.max(0, Math.round(Number.isFinite(value) ? value : 0))
    const map: Record<number, string> = {
        1: 'um',
        3: 'três',
        6: 'seis',
        12: 'doze',
        15: 'quinze',
        18: 'dezoito',
        24: 'vinte e quatro',
        30: 'trinta',
        36: 'trinta e seis',
        45: 'quarenta e cinco',
        60: 'sessenta',
    }
    return map[safe] ? `${safe} (${map[safe]})` : `${safe}`
}

export function generateCommercialContractText(data: CommercialContractFormData): string {
    const plan = COMMERCIAL_PLAN_PRESETS[data.planType] || COMMERCIAL_PLAN_PRESETS.PROFESSIONAL
    const startPt = formatDatePtBr(data.startDate)
    const endFidelityPt = calculateFidelityEndDate(data.startDate, data.fidelityMonths)
    const monthlyStr = formatBrl(data.monthlyValueReais)
    const setupStr = formatBrl(data.setupFeeReais)
    const extraLicenseStr = formatBrl(data.extraLicensePriceReais)
    const totalAnnualStr = formatBrl(data.monthlyValueReais * Math.max(1, data.fidelityMonths))
    const penaltyPct = Number.isFinite(data.earlyTerminationPenaltyPct) ? data.earlyTerminationPenaltyPct : 30
    const fidelityLabel = formatCountWithPtWord(data.fidelityMonths)
    const noticeLabel = formatCountWithPtWord(data.noticeDaysAfterFidelity)

    const clientName = data.clientName.trim() || '[RAZÃO SOCIAL / NOME DA CLÍNICA CONTRATANTE]'
    const clientCnpj = formatCnpjDisplay(data.clientCnpj.trim()) || '[CNPJ DA CONTRATANTE]'
    const clientAddress = data.clientAddress.trim() || '[ENDEREÇO COMPLETO DA CONTRATANTE]'
    const clientRep = data.clientRepresentative.trim() || '[NOME DO REPRESENTANTE LEGAL]'
    const clientRepCpf = data.clientRepresentativeCpf.trim() || '[CPF DO REPRESENTANTE LEGAL]'
    const clientEmail = data.clientEmail.trim() || '[E-MAIL ADMINISTRATIVO]'
    const clientPhone = formatPhoneDisplay(data.clientPhone.trim()) || '[TELEFONE]'

    const providerName = data.providerName.trim() || 'NODEX SOLUTIONS TECNOLOGIA LTDA'
    const providerCnpj = formatCnpjDisplay(data.providerCnpj.trim()) || '[CNPJ DA CONTRATADA]'
    const providerAddress = data.providerAddress.trim() || 'Rio de Janeiro/RJ'
    const providerRep = data.providerRepresentative.trim() || 'Diretoria Administrativa'

    const reactivationParagraph = data.isReactivationNewContract
        ? `\n1.4. O presente instrumento constitui NOVA CONTRATAÇÃO INTEGRAL E INDEPENDENTE, substituindo e revogando quaisquer combinações, condições comerciais ou vínculos anteriores eventualmente mantidos entre as partes. A liberação ou reativação do ambiente da CONTRATANTE na plataforma somente será efetivada manualmente pela CONTRATADA após a assinatura formal deste contrato e a confirmação do pagamento inicial acordado.`
        : ''

    const setupParagraph =
        data.setupFeeReais > 0
            ? `4.2. Taxa Única de Implantação e Configuração Inicial: a CONTRATANTE pagará a taxa única de ${setupStr}, devida na assinatura deste instrumento como condição para liberação do ambiente operacional.`
            : `4.2. Taxa de Implantação e Configuração Inicial: isenta ou quitada conforme condição comercial específica registrada neste instrumento (valor: ${setupStr}).`

    const customNotesSection = data.customNotes.trim()
        ? `\nCLÁUSULA 12 - CONDIÇÕES ESPECÍFICAS E OBSERVAÇÕES ACORDADAS\n12.1. ${data.customNotes.trim()}\n`
        : ''

    const forumClauseNumber = data.customNotes.trim() ? '13' : '12'

    return `CONTRATO DE LICENCIAMENTO DE SOFTWARE COMO SERVIÇO (SAAS) E PRESTAÇÃO DE SERVIÇOS DIGITAIS — PLATAFORMA CLINIGO
Contrato N. ${data.contractNumber}

Pelo presente instrumento particular, de um lado:

CONTRATADA: ${providerName}, detentora da plataforma ${data.providerBrand}, inscrita no CNPJ sob o n. ${providerCnpj}, com sede em ${providerAddress}, neste ato representada por ${providerRep}, e-mail ${data.providerEmail}, telefone ${data.providerPhone};

E, de outro lado:

CONTRATANTE: ${clientName}, inscrita no CNPJ sob o n. ${clientCnpj}, com sede em ${clientAddress}, e-mail administrativo ${clientEmail}, telefone ${clientPhone}, neste ato representada legalmente por ${clientRep}, inscrito(a) no CPF sob o n. ${clientRepCpf};

As partes têm entre si justo e contratado o presente instrumento, que se regerá pelas cláusulas e condições abaixo:

CLÁUSULA 1 - OBJETO E ESCOPO DO SISTEMA
1.1. O objeto deste contrato é a concessão de licença de uso não exclusiva, intransferível e temporária do software de gestão clínica e operacional ${data.providerBrand} (https://clinigo.app), disponibilizado em nuvem na modalidade Software como Serviço (SaaS), destinado exclusivamente a 1 (uma) unidade operacional da CONTRATANTE.
1.2. O plano contratado contempla o pacote ${plan.label}: ${plan.summary}
1.3. Fica expressamente acordado que a plataforma ${data.providerBrand} tem foco em gestão clínica, agenda, prontuários, planos terapêuticos, faturamento de convênios TISS e repasses gerenciais, NÃO incluindo nem prometendo módulos financeiros bancários, rotinas de frente de loja ou obrigações fiscais externas.${reactivationParagraph}

CLÁUSULA 2 - LICENÇAS DE USUÁRIOS E LICENÇAS ADICIONAIS
2.1. O plano ${plan.label} inclui até ${data.includedLicenses} (${data.includedLicenses === 1 ? 'uma licença' : 'licenças'}) de usuários ativos simultaneamente vinculados à unidade operacional da CONTRATANTE.
2.2. Caso a CONTRATANTE necessite ultrapassar o limite de licenças incluído no plano, cada licença adicional avulsa terá o custo mensal de ${extraLicenseStr}, cobrada proporcionalmente na fatura mensal seguinte.
2.3. Cada credencial de acesso é individual e intransferível, contando o sistema com controle técnico de sessão única ativa por usuário para preservação do sigilo clínico e auditoria LGPD.

CLÁUSULA 3 - IMPLANTAÇÃO, CONFIGURAÇÃO E CAPACITAÇÃO DIGITAL
3.1. A capacitação da equipe administrativa e clínica da CONTRATANTE é realizada integralmente de forma digital e autoguiada por meio do Guia de Uso Integrado e da CliniGo Academy disponíveis nativamente dentro do sistema, não estando incluídos treinamentos presenciais ou sessões individuais externas.
3.2. O suporte técnico operacional será prestado exclusivamente pelos canais digitais oficiais da CONTRATADA em horário comercial (segunda a sexta-feira, das 09h00 às 18h00, horário de Brasília).

CLÁUSULA 4 - VALORES, PAGAMENTO E REAJUSTE
4.1. Pela licença de uso da plataforma no plano ${plan.label}, a CONTRATANTE pagará à CONTRATADA a mensalidade fixa de ${monthlyStr} (valor total previsto no ciclo de ${data.fidelityMonths} meses: ${totalAnnualStr}), com vencimento todo dia ${String(data.dueDay).padStart(2, '0')} de cada mês, a iniciar-se em ${startPt}.
${setupParagraph}
4.3. Em caso de atraso no pagamento de qualquer parcela, incidirá multa moratória de 2% (dois por cento) sobre o valor devido, acrescida de juros de mora de 1% (um por cento) ao mês pro rata die.
4.4. Os valores contratados serão reajustados anualmente, a cada período de 12 (doze) meses contados da data de início de vigência, pela variação positiva acumulada do índice ${data.readjustmentIndex} ou outro índice oficial que venha a substituí-lo.

CLÁUSULA 5 - VIGÊNCIA, FIDELIDADE CONTRATUAL DE ${data.fidelityMonths} MESES E MULTA RESCISÓRIA
5.1. O presente contrato entra em vigor na data de ${startPt}, com PRAZO MÍNIMO DE FIDELIDADE CONTRATUAL DE ${fidelityLabel.toUpperCase()} MESES, vigorando o período de fidelidade até ${endFidelityPt}.
5.2. A fidelidade contratual de ${data.fidelityMonths} meses justifica-se pelos custos de dedicação de infraestrutura em nuvem, armazenamento seguro de prontuários, configuração operacional e manutenção das condições comerciais pactuadas neste instrumento.
5.3. Caso a CONTRATANTE solicite a rescisão imotivada, o cancelamento ou o encerramento da conta antes do término do período de fidelidade (${endFidelityPt}), ficará obrigada ao pagamento de MULTA RESCISÓRIA PROPORCIONAL equivalente a ${penaltyPct}% (${penaltyPct} por cento) sobre a soma das mensalidades vincendas até o encerramento do prazo mínimo de ${data.fidelityMonths} meses, sem prejuízo da quitação de eventuais parcelas vencidas e não pagas.
5.4. Após o cumprimento integral dos ${data.fidelityMonths} meses de fidelidade, o contrato passará a vigorar por prazo indeterminado, podendo ser rescindido por qualquer das partes sem multa rescisória, mediante comunicação formal por escrito com antecedência mínima de ${noticeLabel} dias.

CLÁUSULA 6 - INADIMPLÊNCIA E SUSPENSÃO DE ACESSO
6.1. O atraso no pagamento superior a 10 (dez) dias após o vencimento autoriza a CONTRATADA a suspender temporariamente o acesso de todos os usuários da CONTRATANTE à plataforma até a comprovação da regularização financeira, sem que isso implique isenção das mensalidades ou interrupção da contagem do prazo de fidelidade.
6.2. Persistindo a inadimplência por prazo superior a 30 (trinta) dias, o contrato poderá ser rescindido por justa causa pela CONTRATADA, aplicando-se a multa rescisória proporcional prevista na Cláusula 5.3 se ainda dentro do período de fidelidade.

CLÁUSULA 7 - ENCERRAMENTO DE CONTA, PORTABILIDADE LGPD E RETORNO
7.1. Em caso de pedido formal de cancelamento ou encerramento definitivo com solicitação de exportação de base de dados (portabilidade LGPD), a CONTRATADA disponibilizará os arquivos de exportação à CONTRATANTE e procederá ao bloqueio definitivo e integral de todos os usuários, sessões, credenciais e portais da unidade.
7.2. Uma vez encerrada a conta e bloqueado o ambiente, a reativação NÃO ocorre de forma automática. Caso a CONTRATANTE decida retornar ao uso da plataforma no futuro, deverá formalizar novo contrato comercial e quitar eventual nova taxa de reimplantação vigente à época.

CLÁUSULA 8 - PROTEÇÃO DE DADOS PESSOAIS (LGPD - LEI N. 13.709/2018)
8.1. Para fins da Lei Geral de Proteção de Dados (Lei n. 13.709/2018), a CONTRATANTE figura como CONTROLADORA dos dados pessoais e dados sensíveis de saúde de seus pacientes e profissionais, enquanto a CONTRATADA atua exclusivamente como OPERADORA, realizando o tratamento estritamente para execução dos serviços previstos neste contrato.
8.2. A CONTRATADA adota medidas técnicas de isolamento multi-clínica (Row Level Security), controle de acesso por perfil (RBAC), criptografia em trânsito e em repouso e registros de auditoria para proteção das informações.
8.3. A CONTRATANTE declara possuir base legal adequada, termos de consentimento quando aplicáveis e responsabilidade exclusiva pelo conteúdo inserido na plataforma por sua equipe.

CLÁUSULA 9 - DISPONIBILIDADE, MANUTENÇÃO E LIMITAÇÃO DE RESPONSABILIDADE
9.1. A CONTRATADA envidará melhores esforços técnicos para manter a plataforma disponível, ressalvadas janelas programadas de manutenção, atualizações de segurança ou indisponibilidades decorrentes de provedores externos de internet, energia, operadoras de telecomunicações ou caso fortuito e força maior.
9.2. A responsabilidade patrimonial total da CONTRATADA por eventuais danos comprovados decorrentes deste contrato fica limitada ao valor total efetivamente pago pela CONTRATANTE nos últimos 3 (três) meses anteriores ao evento.

CLÁUSULA 10 - PROPRIEDADE INTELECTUAL E CONFIDENCIALIDADE
10.1. Todos os direitos autorais, código-fonte, marcas, logotipos, interfaces, fluxos, modelos e bancos estruturais do ${data.providerBrand} pertencem exclusivamente à CONTRATADA, sendo vedada a engenharia reversa, cópia, sublicenciamento ou cessão de acesso a terceiros.
10.2. As partes obrigam-se a manter sigilo absoluto sobre informações comerciais, técnicas e operacionais a que tiverem acesso em razão deste instrumento, durante toda a sua vigência e pelo prazo de 5 (cinco) anos após o seu encerramento.

CLÁUSULA 11 - DISPOSIÇÕES GERAIS
11.1. A tolerância de qualquer das partes quanto ao descumprimento de obrigações não constituirá novação, renúncia ou alteração das cláusulas ora pactuadas.
11.2. Este contrato obriga as partes e seus sucessores a qualquer título e poderá ser assinado de forma física ou eletrônica com plena validade jurídica nos termos da Lei n. 14.063/2020 e da Medida Provisória n. 2.200-2/2001.
${customNotesSection}
CLÁUSULA ${forumClauseNumber} - FORO DE ELEIÇÃO
${forumClauseNumber}.1. Fica eleito o foro da Comarca de ${data.forumCity}, com renúncia expressa a qualquer outro, por mais privilegiado que seja, para dirimir quaisquer controvérsias oriundas deste contrato.

E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor e forma (ou por assinatura eletrônica válida), juntamente com as 2 (duas) testemunhas abaixo.

${data.forumCity}, ${startPt}.


____________________________________________________________
CONTRATADA: ${providerName}
CNPJ: ${providerCnpj}
Representante: ${providerRep}


____________________________________________________________
CONTRATANTE: ${clientName}
CNPJ: ${clientCnpj}
Representante Legal: ${clientRep} — CPF: ${clientRepCpf}


TESTEMUNHAS:

1. ______________________________________    2. ______________________________________
Nome:                                         Nome:
CPF:                                          CPF:`
}
