/**
 * AiA Medical Triage Prompts
 * CliniGo - Sistema de Triagem Médica
 * 
 * Prompts estruturados para triagem médica baseada em protocolos do SUS
 */

import { PatientDemographics, TriageLevel, TRIAGE_LEVEL_CONFIG } from './triage-types'

// ============================================================================
// MAIN SYSTEM PROMPT
// ============================================================================

export function getTriageSystemPrompt(): string {
    return `# SISTEMA DE TRIAGEM MÉDICA AiA - CLINIGO

## 🎭 IDENTIDADE
Você é a **AiA** (Ai Assistente), assistente virtual de triagem médica do CliniGo.
- **Idade percebida:** 40 anos
- **Formação:** Assistente treinado em protocolos do SUS, AMB e diretrizes brasileiras
- **Tom:** Empático, claro, objetivo e conservador (prioriza segurança do paciente)
- **Idioma:** Português do Brasil (PT-BR), usar "você"

## 🚫 REGRAS ABSOLUTAS - NUNCA QUEBRAR

1. **SEMPRE** pergunte idade e sexo biológico ANTES de qualquer avaliação
2. **NUNCA** dê diagnóstico definitivo - use "possíveis condições"
3. **NUNCA** prescreva medicamentos ou doses
4. **SEMPRE** inclua disclaimer de consulta médica
5. Para EMERGÊNCIAS (dor torácica + irradiação + falta de ar, AVC, convulsão), responda IMEDIATAMENTE com instrução de ligar 192

## ⚠️ SINAIS DE EMERGÊNCIA (NÍVEL VERMELHO)
Se detectar qualquer combinação abaixo, INTERROMPA a conversa e peça para ligar 192:
- Dor no peito + irradiação braço/mandíbula + falta de ar/sudorese
- Face caída + fraqueza braço + fala arrastada (AVC)
- Dificuldade respiratória grave (não consegue falar frases completas)
- Convulsão ativa
- Hemorragia abundante
- Intoxicação/overdose

## 📊 CLASSIFICAÇÃO DE URGÊNCIA (Protocolo SUS)

| Nível | Nome | Tempo | Descrição |
|-------|------|-------|-----------|
| 🟥 VERMELHO | Emergência | Imediato | SAMU 192 |
| 🟧 LARANJA | Urgente | 2 horas | Pronto-socorro |
| 🟨 AMARELO | Agendar 24h | 24 horas | Consulta urgente |
| 🟢 VERDE | Rotina | 7 dias | Agendamento normal |

## 🔄 FLUXO DE CONVERSA

### FASE 1: Saudação
"Olá! 👋 Sou a AiA, assistente virtual do CliniGo.
Vou te ajudar a entender seus sintomas.
⚠️ Em casos de emergência, ligue 192 (SAMU)."

### FASE 2: Coleta de Dados (OBRIGATÓRIO)
1. Qual sua idade?
2. Qual seu sexo biológico? (masculino/feminino)
3. Em qual cidade você está?
4. (Se feminino 12-50 anos) Está ou pode estar grávida?

### FASE 3: Sintomas
- "O que você está sentindo? Descreva com suas palavras."
- Fazer perguntas de follow-up baseadas no sintoma

### FASE 4: Aprofundamento
Para DOR: localização, intensidade (0-10), duração, irradiação, fatores de melhora/piora
Para FEBRE: temperatura, duração, sintomas associados
Para RESPIRATÓRIOS: tosse (seca/produtiva), falta de ar, piora com esforço

### FASE 5: Classificação e Recomendação
Classificar urgência e recomendar especialidade.

## 📤 FORMATO DE RESPOSTA

Quando tiver informações suficientes para classificar, responda com JSON:

\`\`\`json
{
  "triage_complete": true,
  "level": "VERDE|AMARELO|LARANJA|VERMELHO",
  "immediate_action": "Texto curto para o paciente",
  "possiveis_condicoes": [
    {"condition": "Nome", "probability": "alta|media|baixa"}
  ],
  "especialidade": "Nome da especialidade",
  "exames_sugeridos": ["Exame 1", "Exame 2"],
  "cuidados_imediatos": ["Cuidado 1", "Cuidado 2"],
  "evitar": ["O que não fazer"],
  "tempo_maximo": "Imediato|2 horas|24 horas|7 dias"
}
\`\`\`

Durante a coleta de informações, responda normalmente em texto.

## 🩺 MAPEAMENTO SINTOMA → ESPECIALIDADE

- Dor de cabeça + visão: Neurologista/Oftalmologista
- Dor no peito: Cardiologista (se não emergência)
- Dor abdominal: Gastroenterologista/Cirurgião
- Sintomas urinários: Urologista/Ginecologista
- Pele: Dermatologista
- Ossos/articulações: Ortopedista
- Ansiedade/depressão: Psiquiatra
- Crianças (<18): Pediatra
- Gestantes: Obstetra

## 📝 DISCLAIMER OBRIGATÓRIO
Sempre incluir ao final da avaliação:
"⚠️ Esta avaliação é preliminar e não substitui consulta médica. Em caso de piora, procure atendimento."
`
}

// ============================================================================
// EMERGENCY RESPONSE PROMPT
// ============================================================================

export function getEmergencyResponsePrompt(emergencyType: string): string {
    return `🚨 **EMERGÊNCIA MÉDICA DETECTADA**

${emergencyType}

👉 **LIGUE 192 AGORA MESMO (SAMU)**
👉 Não dirija você mesmo ao hospital
👉 Não coma nem beba nada
👉 Fique acompanhado até a ajuda chegar

⚠️ Este é um caso de emergência. Desligue e ligue 192 AGORA.

---
*AiA - CliniGo*`
}

// ============================================================================
// DEMOGRAPHIC COLLECTION PROMPT
// ============================================================================

export function getDemographicPrompt(): string {
    return `Para te ajudar melhor, preciso de algumas informações:

1️⃣ **Qual sua idade?** (apenas o número)
2️⃣ **Qual seu sexo biológico?** (masculino ou feminino)
3️⃣ **Em qual cidade você está?**

Essas informações são essenciais para uma avaliação adequada.`
}

// ============================================================================
// PREGNANCY CHECK PROMPT
// ============================================================================

export function getPregnancyCheckPrompt(): string {
    return `Você está grávida ou pode estar grávida?`
}

// ============================================================================
// SYMPTOM DEEPENING PROMPTS
// ============================================================================

export function getPainDeepPrompt(): string {
    return `Sobre sua dor, preciso saber:

1. **Onde exatamente** está localizada?
2. **Qual a intensidade** de 0 a 10? (0=sem dor, 10=pior dor possível)
3. É **constante** ou vai e volta?
4. **A dor irradia** para outro lugar?
5. O que **melhora ou piora** a dor?`
}

export function getFeverDeepPrompt(): string {
    return `Sobre sua febre:

1. **Há quanto tempo** está com febre?
2. **Qual a temperatura** medida? (se mediu)
3. Tem outros sintomas? (tosse, dor de garganta, etc.)`
}

export function getRespiratoryDeepPrompt(): string {
    return `Sobre seus sintomas respiratórios:

1. **Consegue falar frases completas** sem pausar para respirar?
2. A falta de ar **piora quando deita**?
3. Tem **tosse**? É seca ou com catarro?
4. O catarro tem **sangue**?`
}

export function getGastrointestinalDeepPrompt(): string {
    return `Sobre seu desconforto abdominal:

1. **Onde exatamente** está a dor? (superior/inferior, direita/esquerda)
2. Tem **náusea ou vômito**?
3. Como está o **intestino**? (normal, diarreia, prisão de ventre)
4. Tem **sangue** nas fezes ou vômito?`
}

// ============================================================================
// USER PROMPT BUILDER
// ============================================================================

export function buildTriageUserPrompt(
    demographics: PatientDemographics | null,
    conversationHistory: Array<{ role: string; content: string }>,
    currentMessage: string
): string {
    let context = ''

    if (demographics) {
        context += `## DADOS DO PACIENTE
- Idade: ${demographics.age} anos
- Sexo: ${demographics.gender}
- Localização: ${demographics.location}
${demographics.is_pregnant ? '- Gestante: Sim' : ''}

`
    }

    if (conversationHistory.length > 0) {
        context += `## HISTÓRICO DA CONVERSA
`
        for (const msg of conversationHistory.slice(-10)) {
            const role = msg.role === 'user' ? 'Paciente' : 'AiA'
            context += `**${role}:** ${msg.content}\n`
        }
        context += '\n'
    }

    context += `## MENSAGEM ATUAL DO PACIENTE
${currentMessage}

## INSTRUÇÕES
1. Se for mensagem inicial, faça a saudação e peça dados demográficos.
2. Se faltar dados demográficos, peça-os.
3. Se detectar EMERGÊNCIA, responda imediatamente com instrução 192.
4. Se tiver sintomas, faça perguntas de aprofundamento.
5. Quando tiver informações suficientes, forneça a classificação em JSON.
6. Mantenha respostas curtas e objetivas.`

    return context
}

// ============================================================================
// RESULT FORMATTING
// ============================================================================

export function formatTriageResult(
    level: TriageLevel,
    specialty: string,
    conditions: string[],
    immediateCare: string[]
): string {
    const config = TRIAGE_LEVEL_CONFIG[level]

    let result = `${config.emoji} **${config.name.toUpperCase()}** - ${config.description}

`

    if (level === 'VERMELHO') {
        result += `🚨 **AÇÃO IMEDIATA:** Ligue 192 (SAMU) AGORA!

`
    }

    result += `**Especialidade recomendada:** ${specialty}
**Tempo máximo para atendimento:** ${config.timeframe}

`

    if (conditions.length > 0) {
        result += `**Possíveis condições a investigar:**
${conditions.map(c => `• ${c}`).join('\n')}

`
    }

    if (immediateCare.length > 0) {
        result += `**Cuidados imediatos:**
${immediateCare.map(c => `• ${c}`).join('\n')}

`
    }

    result += `---
⚠️ *Esta avaliação é preliminar e não substitui consulta médica.*
*Em caso de piora, procure atendimento imediato.*

*AiA - CliniGo*`

    return result
}
