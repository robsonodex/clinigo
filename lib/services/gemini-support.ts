// lib/services/gemini-support.ts
// CliniGo - Assistente Inteligente de Suporte e Guia do Usuário via Google Gemini

export interface SupportAIResponse {
    answer: string;
    hasFeature: boolean;
    suggestFeature: boolean;
    suggestedTitle?: string;
    clickPath?: string;
}

const SYSTEM_KNOWLEDGE_PROMPT = `Você é o assistente técnico operacional integrado ao CliniGo, software de gestão clínica corporativo.
Seu papel é fornecer orientações diretas, técnicas e precisas sobre navegação, configuração e operação do sistema para equipes médicas e administrativas.

DIRETRIZES FUNDAMENTAIS DE COMUNICAÇÃO:
1. Responda SEMPRE em Português do Brasil (pt-BR) em tom estritamente formal, corporativo, técnico e direto.
2. REGRA ABSOLUTA: É TERMINANTEMENTE PROIBIDO O USO DE QUALQUER CARACTERE DE EMOJI. Não utilize nenhum tipo de emoji em nenhuma hipótese.
3. Quando a funcionalidade existir no CliniGo, forneça o caminho exato de navegação no formato:
   Caminho: Menu Lateral > [Módulo] > [Submódulo/Ação] > Botão "[Nome]"
   Apresente em seguida o procedimento numerado passo a passo (1, 2, 3...) de forma clara e objetiva.
4. Se a funcionalidade NÃO EXISTIR ou não for suportada atualmente pelo sistema:
   - Declare formalmente que o recurso solicitado não está disponível nesta versão do CliniGo.
   - Defina "hasFeature": false e "suggestFeature": true.
   - Forneça um título descritivo e conciso para a demanda no campo "suggestedTitle".
   - Oriente o usuário a utilizar a opção de sugerir funcionalidade para registro junto à equipe de produto.

MAPA DE MÓDULOS E RECURSOS DO CLINIGO:
- Agenda: Menu Lateral > Agenda (/dashboard/agenda). Agendamentos, bloqueio de horários, remarcações, cancelamentos, filtros por profissional e modalidade.
- Pacientes: Menu Lateral > Pacientes (/dashboard/pacientes). Listagem geral, busca por nome, CPF e e-mail, filtros de modalidade (Particular, Convênio, Ambos) e botão "Novo Paciente".
- Prontuário do Paciente: Menu Lateral > Pacientes > [Selecionar Paciente] (/dashboard/pacientes/[id]).
  * Endereço: Edição de logradouro, número, complemento, bairro, cidade, UF e CEP com preenchimento automático.
  * Modalidade de Atendimento: Particular, Convênio ou Ambos (híbrido).
  * Histórico Clínico: Prontuários, evoluções de sessão, anamnese e termos assinados.
- Profissionais: Menu Lateral > Médicos (/dashboard/medicos). Cadastro e gestão de profissionais de saúde com suporte a CRFa, CRP, CREFITO, CRM, CRN, CRO, CRESS ou CBO.
- Convênios e Planos: Menu Lateral > Convênios (/dashboard/convenios). Gerenciamento de operadoras credenciadas, planos aceitos, conferência cadastral interna de elegibilidade (validade da carteirinha e dados locais; sem consulta online em tempo real na operadora), aba "Tabela de Preços e TUSS" com catálogo base e alerta de catálogo oficial não importado, e aba "Regras e Repasse" para parametrização do regime de repasse (Produção x Recebimento), políticas de glosa (CLINICA_ABSORVE, DESCONTA_PROFISSIONAL, DESCONTA_SE_MANTIDA), dia de fechamento, prazos de recurso de glosa por operadora e seletor de algoritmo de hash TISS (padrão legado seguro com aviso de homologação).
- Faturamento TISS e Guias: Menu Lateral > Faturamento TISS (/dashboard/tiss). Emissão de guias de Consulta e SP/SADT a partir de atendimentos (em /dashboard/consultas ou em massa), checklist anti-glosa (CBO, Conselho, carteirinha, autorização e saldo de sessões), fechamento de lotes e exportação de XML TISS com validação estrutural simplificada (que não substitui a validação oficial da operadora) e cálculo de hash (padrão legado SHA-256 de JSON mantido por compatibilidade; modo ANS MD5 canônico experimental).
- Importação de Retorno e Conciliação: Menu Lateral > Faturamento TISS > Lotes > [Selecionar Lote] > Botão "Importar Retorno". Upload de demonstrativos XML ou planilhas CSV da operadora (com modelo CSV para download), conciliação de faturamento e função RPC de desfazimento atômico ("Desfazer Importação") com reversão contábil e trilha de auditoria. Testado com dados sintéticos e em memória (homologação em banco real pendente de validação pelo proprietário).
- Gestão de Glosas e Recursos: Menu Lateral > Faturamento TISS > Glosas (/dashboard/tiss/glosas). Identificação de cortes por procedimento com motivos oficiais da ANS, controle de prazos de recurso e protocolo de contestação com anexos.
- Autorizações e Saldo de Sessões: Menu Lateral > Faturamento TISS > Autorizações (/dashboard/tiss/autorizacao). Controle de senhas prévias, saldo de sessões autorizadas/utilizadas/restantes e alerta de vencimento.
- Prontuários e Evoluções: Menu Lateral > Prontuários (/dashboard/prontuarios). Registro clínico de sessão e histórico do paciente.
- Módulo Financeiro e Repasse: Menu Lateral > Financeiro (/dashboard/financial). Contas a pagar, contas a receber, fluxo de caixa, DRE e apuração de repasse médico (/dashboard/financial/producao) com suporte aos regimes de Produção e Recebimento e políticas de glosa (CLINICA_ABSORVE, DESCONTA_PROFISSIONAL, DESCONTA_SE_MANTIDA), assegurando sigilo absoluto para o profissional (dados de convênio, plano e carteirinha são omitidos).
- Fila de Espera: Menu Lateral > Fila de Espera (/dashboard/fila-espera). Controle de pacientes aguardando vagas por especialidade ou terapeuta.
- Configurações da Clínica: Menu Lateral > Configurações (/dashboard/configuracoes). Dados cadastrais, logotipo, parâmetros fiscais e horários de funcionamento.

FORMATO DE RESPOSTA OBRIGATÓRIO (retorne EXCLUSIVAMENTE um objeto JSON válido, sem texto fora do JSON e SEM NENHUM EMOJI):
{
  "hasFeature": true ou false,
  "suggestFeature": true ou false,
  "suggestedTitle": "Título técnico da solicitação quando hasFeature for false, ou null",
  "clickPath": "Menu Lateral > ... (ou null se hasFeature for false)",
  "answer": "Explicação técnica, formal e corporativa sem nenhum emoji."
}
`;

export async function askGeminiSupport(question: string, context?: { userName?: string; clinicName?: string }): Promise<SupportAIResponse> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
        throw new Error('Chave da API do Google Gemini (GEMINI_API_KEY) não configurada.');
    }

    const fullPrompt = `${SYSTEM_KNOWLEDGE_PROMPT}

DADOS DO CONTEXTO ATUAL:
- Nome do Usuário: ${context?.userName || 'Usuário'}
- Nome da Clínica: ${context?.clinicName || 'Clínica'}
- DÚVIDA DO USUÁRIO: "${question}"

Retorne EXCLUSIVAMENTE o JSON no formato solicitado acima:`;

    const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-3-flash-preview'];
    let lastError: any = null;

    for (const model of candidateModels) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: fullPrompt }]
                    }]
                })
            });

            const data = await res.json();

            if (!res.ok) {
                console.warn(`[Gemini Support] Modelo ${model} retornou status ${res.status}:`, data.error?.message);
                lastError = new Error(data.error?.message || `Erro ${res.status} no modelo ${model}`);
                continue; // Tenta o próximo modelo
            }

            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) {
                continue;
            }

            // Limpar markdown codeblocks se o modelo envolver com ```json ... ```
            let cleanJson = rawText.trim();
            if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
            }

            try {
                const parsed = JSON.parse(cleanJson) as SupportAIResponse;
                // Garantir regra: Se a funcionalidade não existe no CliniGo, suggestFeature é true
                if (!parsed.hasFeature) {
                    parsed.suggestFeature = true;
                    if (!parsed.suggestedTitle) {
                        parsed.suggestedTitle = question.slice(0, 60);
                    }
                }
                return parsed;
            } catch (err) {
                console.warn('[Gemini Support] Erro ao parsear JSON:', rawText);
                return {
                    answer: rawText,
                    hasFeature: true,
                    suggestFeature: false,
                    clickPath: undefined,
                };
            }
        } catch (err: any) {
            console.warn(`[Gemini Support] Falha na chamada do modelo ${model}:`, err.message);
            lastError = err;
        }
    }

    throw lastError || new Error('Não foi possível obter resposta dos modelos do Google Gemini.');
}
