export type BlogIconKey =
    | 'calendar'
    | 'clipboard'
    | 'lock'
    | 'spreadsheet'
    | 'trending'
    | 'smartphone'
    | 'shield'
    | 'layers'

export interface BlogArticle {
    id: string
    title: string
    excerpt: string
    category: string
    date: string
    isoDate: string
    readTime: string
    iconKey: BlogIconKey
    keywords: string[]
    relatedSolutionSlug: string
    takeaways: string[]
    sections: { heading: string; body: string }[]
}

export const BLOG_ARTICLES: BlogArticle[] = [
    {
        id: 'agenda-recorrente-co-terapia',
        title: 'Agenda recorrente e co-terapia sem conflitos em clínicas multidisciplinares',
        excerpt:
            'Como estruturar séries semanais, quinzenais e salas compartilhadas entre Psicologia, ABA, Fonoaudiologia e Terapia Ocupacional sem retrabalho na recepção.',
        category: 'Agenda e Recorrência',
        date: '14 Abr 2026',
        isoDate: '2026-04-14',
        readTime: '6 min',
        iconKey: 'calendar',
        keywords: [
            'agenda recorrente clínica de terapias',
            'co-terapia agenda multidisciplinar',
            'gestão sala sensorial clínica',
            'reposição de sessões terapia',
        ],
        relatedSolutionSlug: 'clinica-multidisciplinar',
        takeaways: [
            'Defina durações reais por modalidade (40, 45, 50 ou 120 min) em vez de forçar blocos fixos de 30 minutos.',
            'Vincule salas temáticas (ex: Sala Sensorial) ao agendamento para evitar colisões entre terapeutas.',
            'Registre faltas justificadas e reposições diretamente na série para preservar o saldo do paciente.',
        ],
        sections: [
            {
                heading: 'Por que agendas genéricas falham em clínicas de terapia',
                body: 'Diferente de atendimentos pontuais, um paciente em acompanhamento de ABA, Fonoaudiologia ou Terapia Ocupacional possui sessões recorrentes por meses. Quando a agenda não suporta séries nativas, qualquer feriado ou mudança de horário exige edição manual de dezenas de eventos.',
            },
            {
                heading: 'Co-terapia e gestão de salas sensoriais',
                body: 'Em atendimentos conjuntos — como dupla de terapeutas ou supervisão em sala — o sistema precisa permitir dois profissionais no mesmo paciente sem acusar falso conflito, mantendo o bloqueio rigoroso da sala física e da disponibilidade de cada profissional.',
            },
            {
                heading: 'Reposições rastreáveis sem planilhas paralelas',
                body: 'Ao controlar o motivo da ausência e gerar o crédito de reposição dentro da própria grade, a recepção e a coordenação enxergam imediatamente quantas sessões restam no ciclo mensal ou na guia de convênio.',
            },
        ],
    },
    {
        id: 'como-escolher-sistema-clinica-aba',
        title: 'Como escolher um sistema para clínica ABA e neurodesenvolvimento (TEA)',
        excerpt:
            'Checklist técnico dos requisitos indispensáveis para clínicas de Análise do Comportamento Aplicada: planos de sessão, níveis de ajuda, supervisão e biometria facial TISS.',
        category: 'Prontuário e ABA',
        date: '10 Abr 2026',
        isoDate: '2026-04-10',
        readTime: '8 min',
        iconKey: 'layers',
        keywords: [
            'sistema para clínica ABA',
            'como escolher software clínica autismo TEA',
            'folha de tentativas ABA',
            'biometria facial TISS terapia ABA',
        ],
        relatedSolutionSlug: 'clinica-aba',
        takeaways: [
            'Exija registro estruturado de metas, critérios de aquisição e níveis de ajuda (independente, gestual, parcial e total).',
            'Confirme suporte nativo a co-terapia e supervisão em sala sem bloqueios artificiais na agenda.',
            'Valide se o faturamento TISS possui controle de saldo de guias e comprovação biométrica de presença contra glosas.',
        ],
        sections: [
            {
                heading: 'A armadilha dos softwares médicos adaptados para ABA',
                body: 'Muitas clínicas de neurodesenvolvimento começam utilizando sistemas médicos tradicionais e acabam recorrendo a planilhas paralelas para registrar programas ABA, controlar carga horária semanal de 10 a 20 horas por criança e auditar evoluções de aplicadores. Essa fragmentação gera atraso no fechamento e insegurança jurídica.',
            },
            {
                heading: 'Planos terapêuticos e supervisão em tempo real',
                body: 'Um sistema adequado para clínica ABA deve estruturar objetivos de pareamento, comunicação funcional e ensino naturalista com acompanhamento longitudinal, além de apontar para a coordenação quais sessões realizadas ainda aguardam registro de evolução.',
            },
            {
                heading: 'Blindagem contra glosas de convênios em alta frequência',
                body: 'Como atendimentos ABA envolvem dezenas de sessões mensais por beneficiário, a comprovação objetiva de comparecimento é decisiva. Vincular biometria facial do paciente ou responsável diretamente às guias XML TISS reduz drasticamente glosas por contestação de presença.',
            },
        ],
    },
    {
        id: 'planos-terapeuticos-aba-evolucoes',
        title: 'Planos terapêuticos estruturados e conformidade de evoluções clínicas',
        excerpt:
            'Organize objetivos, níveis de ajuda e revisões periódicas por especialidade, reduzindo evoluções pendentes no fechamento do mês.',
        category: 'Prontuário e ABA',
        date: '06 Abr 2026',
        isoDate: '2026-04-06',
        readTime: '7 min',
        iconKey: 'clipboard',
        keywords: [
            'planos terapêuticos ABA',
            'conformidade de evoluções clínicas',
            'prontuário eletrônico por especialidade',
            'assinatura digital CRP CRFa CREFITO',
        ],
        relatedSolutionSlug: 'clinica-aba',
        takeaways: [
            'Padronize critérios de aquisição e níveis de ajuda para acompanhar progressão longitudinal.',
            'Monitore evoluções pendentes em tempo real em vez de cobrar a equipe apenas no fim do mês.',
            'Aplique assinatura eletrônica com registro de conselho (CRP, CRFa, CREFITO) em cada prontuário.',
        ],
        sections: [
            {
                heading: 'Continuidade clínica entre sessões',
                body: 'Cada especialidade trabalha com terminologia própria: programas de pareamento e tentativas discretas em ABA, metas SOAP na Psicologia, domínios fonológicos na Fonoaudiologia e desempenho ocupacional na TO. Ter templates por disciplina acelera o registro sem engessar o raciocínio clínico.',
            },
            {
                heading: 'Auditoria de conformidade pela coordenação',
                body: 'Com indicadores de conformidade de evoluções, a supervisão visualiza rapidamente quais sessões realizadas ainda aguardam evolução — sem invadir o sigilo clínico dos conteúdos protegidos de outros conselhos.',
            },
        ],
    },
    {
        id: 'sigilo-prontuario-crp-crfa-crefito',
        title: 'Sigilo de prontuário para CRP, CRFa e CREFITO em clínicas multidisciplinares',
        excerpt:
            'Como conciliar trabalho em equipe multidisciplinar com o sigilo profissional exigido pelos conselhos de classe e pela LGPD sem bloquear a recepção.',
        category: 'LGPD e Sigilo',
        date: '30 Mar 2026',
        isoDate: '2026-03-30',
        readTime: '7 min',
        iconKey: 'shield',
        keywords: [
            'sigilo prontuário psicologia CRP',
            'LGPD clínica multidisciplinar',
            'RBAC RLS prontuário eletrônico',
            'prontuário separado CRP CRFa CREFITO',
        ],
        relatedSolutionSlug: 'psicologia',
        takeaways: [
            'Dados administrativos (cadastro e agenda) podem ser compartilhados, mas evoluções clínicas devem respeitar o sigilo do conselho.',
            'Exija isolamento RBAC e RLS no banco de dados — ocultar apenas um botão na tela não protege contra vazamentos.',
            'Use sessão única auditada e termos eletrônicos assinados (Lei 14.063/2020) para fechar brechas operacionais.',
        ],
        sections: [
            {
                heading: 'O desafio do sigilo quando 4 especialistas atendem a mesma criança',
                body: 'Em uma clínica multidisciplinar, Psicologia, Fonoaudiologia, Terapia Ocupacional e Psicomotricidade acompanham o mesmo paciente. Porém, o sigilo ético previsto pelo CRP e pelas normas da LGPD impede que informações íntimas de psicoterapia fiquem abertas à recepção, ao financeiro ou a usuários sem autorização.',
            },
            {
                heading: 'Segurança aplicada no servidor e no banco de dados',
                body: 'A arquitetura segura aplica controle de acesso baseado em função (RBAC) somado a políticas de isolamento por linha (RLS) no banco de dados. Assim, mesmo em nível de API, cada terapeuta recebe apenas seus próprios prontuários e seu extrato individual de produção.',
            },
            {
                heading: 'Portabilidade e documentos com URLs temporárias',
                body: 'Anexos sensíveis como laudos, áudios fonoaudiológicos e termos assinados devem residir em armazenamento privado com links temporários criptografados, preservando trilha de auditoria para fiscalizações e solicitações do titular sob a LGPD.',
            },
        ],
    },
    {
        id: 'lgpd-sigilo-clinico-rbac',
        title: 'LGPD e sigilo clínico: isolamento real por perfil (RBAC) na equipe',
        excerpt:
            'Entenda como separar o acesso de recepção, coordenação, financeiro e terapeutas diretamente no servidor para cumprir exigências legais e dos conselhos.',
        category: 'LGPD e Sigilo',
        date: '25 Mar 2026',
        isoDate: '2026-03-25',
        readTime: '8 min',
        iconKey: 'lock',
        keywords: [
            'LGPD clínicas de terapia',
            'RBAC prontuário eletrônico',
            'assinatura eletrônica Lei 14.063/2020',
            'sessão única auditada clínica',
        ],
        relatedSolutionSlug: 'psicologia',
        takeaways: [
            'O sigilo exigido por CRP, CRFa e CREFITO deve ser garantido no banco de dados e na API, não apenas escondido no menu.',
            'Terapeutas acessam exclusivamente seus pacientes e seu extrato de produção individual.',
            'Sessão única auditada impede compartilhamento indevido de senhas entre computadores da clínica.',
        ],
        sections: [
            {
                heading: 'O risco das permissões apenas visuais',
                body: 'Sistemas que ocultam botões apenas na tela ainda expõem dados sensíveis em consultas de rede ou relatórios amplos. O controle de acesso baseado em perfil (RBAC) acoplado a políticas no banco (RLS) garante que cada usuário receba apenas o que compete à sua função.',
            },
            {
                heading: 'Termos eletrônicos com validade probatória',
                body: 'Consentimentos LGPD, contratos de atendimento e autorizações de imagem assinados no celular com carimbo de data, IP e hash SHA-256 (Lei 14.063/2020) eliminam arquivos em papel e facilitam auditorias.',
            },
        ],
    },
    {
        id: 'faturamento-tiss-terapias-glosas',
        title: 'Faturamento TISS em terapias seriadas: como reduzir glosas evitáveis',
        excerpt:
            'Da autorização prévia à dupla comprovação de presença biométrica e geração de lotes XML no padrão ANS.',
        category: 'TISS e Convênios',
        date: '16 Mar 2026',
        isoDate: '2026-03-16',
        readTime: '7 min',
        iconKey: 'spreadsheet',
        keywords: [
            'faturamento TISS terapias seriadas',
            'como reduzir glosas convênios clínica',
            'lotes XML padrão ANS',
            'biometria facial presença TISS',
        ],
        relatedSolutionSlug: 'faturamento-tiss-terapias',
        takeaways: [
            'Valide códigos TUSS, saldo de sessões autorizadas e vigência da guia antes da realização da sessão.',
            'Vincule biometria facial do paciente ou responsável como evidência objetiva de presença.',
            'Trate retornos de glosa com rastreabilidade por guia para montar recursos dentro do prazo da operadora.',
        ],
        sections: [
            {
                heading: 'Onde nascem as glosas em terapias seriadas',
                body: 'A maior parte das glosas ocorre por sessões realizadas após o vencimento da senha de autorização, divergência no código TUSS da especialidade ou ausência de comprovação clara de comparecimento do beneficiário.',
            },
            {
                heading: 'Lotes XML validados e ciclo de recursos',
                body: 'Validar a estrutura XML contra o esquema ANS antes do envio e acompanhar o status de cada guia no retorno da operadora reduz o tempo entre a sessão realizada e o recebimento efetivo.',
            },
        ],
    },
    {
        id: 'repasse-profissional-regras-individuais',
        title: 'Fechamento de repasse por profissional sem planilhas manuais',
        excerpt:
            'Como parametrizar valores por terapeuta, convênio ou paciente específico e liberar demonstrativos transparentes com sigilo.',
        category: 'Gestão e Repasse',
        date: '04 Mar 2026',
        isoDate: '2026-03-04',
        readTime: '5 min',
        iconKey: 'trending',
        keywords: [
            'repasse por profissional clínica de terapia',
            'fechamento de produção terapeutas',
            'gestão financeira clínica multidisciplinar',
            'cálculo automático repasse convênio',
        ],
        relatedSolutionSlug: 'clinica-multidisciplinar',
        takeaways: [
            'Configure regras por contrato, por tabela de convênio ou exceções por paciente em um único motor.',
            'Considere automaticamente apenas sessões realizadas ou reposições válidas conforme a política da clínica.',
            'Permita que cada terapeuta consulte seu próprio resumo de produção sem visualizar dados de colegas.',
        ],
        sections: [
            {
                heading: 'Fim das horas perdidas cruzando agenda e planilhas',
                body: 'Em clínicas multidisciplinares, cada terapeuta pode ter modelo de remuneração distinto: percentual sobre convênio, valor fixo por sessão particular ou regra diferenciada por paciente. Centralizar essas regras no sistema elimina erros de cálculo e retrabalho no fechamento.',
            },
            {
                heading: 'Transparência que fortalece a retenção da equipe',
                body: 'Quando o profissional acompanha sua produção consolidada com clareza ao longo do mês, diminuem dúvidas no fechamento e a gestão ganha previsibilidade financeira.',
            },
        ],
    },
    {
        id: 'confirmacao-whatsapp-reducao-faltas',
        title: 'Confirmação automática no WhatsApp e controle de evasão terapêutica',
        excerpt:
            'Estratégias práticas para diminuir faltas recorrentes, acionar a fila de espera e identificar pacientes com risco de abandono do tratamento.',
        category: 'Teleatendimento',
        date: '22 Fev 2026',
        isoDate: '2026-02-22',
        readTime: '5 min',
        iconKey: 'smartphone',
        keywords: [
            'confirmação automática WhatsApp clínica',
            'reduzir faltas em clínica de terapia',
            'controle de evasão terapêutica BI',
            'teleconsulta WebRTC clínica',
        ],
        relatedSolutionSlug: 'clinica-multidisciplinar',
        takeaways: [
            'Envie confirmações automáticas com antecedência adequada para liberar horários à fila de espera.',
            'Acompanhe faltas consecutivas no BI de terapia para agir antes do abandono do plano terapêutico.',
            'Ofereça teleconsulta WebRTC integrada nos casos elegíveis quando houver imprevisto de deslocamento.',
        ],
        sections: [
            {
                heading: 'Comunicação organizada com famílias e responsáveis',
                body: 'Famílias com crianças em múltiplas terapias por semana lidam com agendas complexas. Lembretes objetivos e confirmação automática direto no WhatsApp reduzem esquecimentos e liberam a recepção para acolhimento humanizado.',
            },
            {
                heading: 'Sinal de alerta precoce de evasão',
                body: 'Cruzar taxa de comparecimento e histórico de reagendamentos permite à coordenação entrar em contato preventivo com a família, preservando a continuidade clínica e a estabilidade da agenda.',
            },
        ],
    },
]

export function getBlogArticleBySlug(slug: string): BlogArticle | undefined {
    return BLOG_ARTICLES.find((article) => article.id === slug)
}

