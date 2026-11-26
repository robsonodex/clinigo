import {
    createInitialState,
    detectIntent,
    processStep,
    recomendarPlano,
} from '@/lib/chatbot/clin-engine'
import * as clinMessages from '@/lib/chatbot/clin-messages'
import {
    extractWhatsappDigits,
    isSessionEligibleForFollowUp,
    isWithinBrtBusinessHours,
} from '@/lib/chatbot/clin-growth'

describe('Bot Clin 2.0 — Motor de Vendas, Conta Encerrada, ROI e Anti-Regressão', () => {
    it('roteia mensagem exata de conta encerrada para o fluxo de Nova Contratação (nunca inadimplência) e pausa por 24h', () => {
        const msg =
            'Olá, represento a clínica cuja conta no CliniGo foi encerrada e gostaria de falar com a administração comercial para avaliar uma nova contratação.'

        expect(detectIntent(msg)).toBe('contaEncerrada')

        const step1 = processStep(createInitialState(), msg)
        expect(step1.newState.step).toBe('fluxo_encerrada_clinica')
        expect(step1.messages.join(' ')).toContain('nova contratação')
        expect(step1.messages.join(' ').toLowerCase()).not.toContain('mensalidade atrasada')

        const step2 = processStep(step1.newState, 'Clínica Modelo Terapias')
        expect(step2.newState.step).toBe('fluxo_encerrada_responsavel')
        expect(step2.newState.leadData.clinica).toBe('Clínica Modelo Terapias')

        const step3 = processStep(step2.newState, 'Maria Silva — Diretora')
        expect(step3.transfer).toBe(true)
        expect(step3.transferTag).toBe('nova_contratacao_encerrada')
        expect(step3.pauseHours).toBe(24)
        expect(step3.newState.step).toBe('transferred')
        expect(step3.messages.join(' ')).toContain('Protocolo de Nova Contratação Registrado')
    })

    it('mantém inadimplência separada no Fluxo 6 sem confundir com conta encerrada', () => {
        const msg = 'Minha clínica foi suspensa por mensalidade atrasada'
        expect(detectIntent(msg)).toBe('acessoBloqueado')
        const step = processStep(createInitialState(), msg)
        expect(step.newState.step).toBe('fluxo_6_bloqueio')
    })

    it('detecta novas intenções CliniGo 2.0 (CliniGo IA, CliniGo Família, Modo Tatame ABA, Migração e ROI)', () => {
        expect(detectIntent('Vocês têm inteligência artificial com Escudo LGPD?')).toBe('clinigoIA')
        expect(detectIntent('Tem portal dos pais para atividades em casa?')).toBe('clinigoFamilia')
        expect(detectIntent('Funciona com Modo Tatame e curvas ABA?')).toBe('especialidadeAba')
        expect(detectIntent('Consigo importar pacientes da minha planilha Excel?')).toBe('migracao')
        expect(detectIntent('Quero simular economia ROI para 10 terapeutas')).toBe('simuladorRoi')

        const roiRes = processStep(createInitialState(), 'Quero simular economia ROI para 10 terapeutas')
        expect(roiRes.newState.step).toBe('fluxo_roi_resultado')
        expect(roiRes.newState.leadData.numProfissionais).toBe(10)
        expect(roiRes.messages.join(' ')).toContain('Professional')
        expect(roiRes.messages.join(' ')).toContain('10 profissionais')
    })

    it('recomenda exatamente os 3 planos oficiais conforme número de profissionais', () => {
        expect(recomendarPlano(1)).toContain('Básico (R$ 149/mês')
        expect(recomendarPlano(5)).toContain('Avançado (R$ 249/mês')
        expect(recomendarPlano(20)).toContain('Professional (R$ 449/mês')
        expect(recomendarPlano(35)).toContain('5 licenças extras a R$ 49,90/mês')
    })

    it('garante que todas as mensagens do Bot Clin 2.0 respeitam Padrão Premium (zero emojis, zero &, zero emissão de senhas, zero ao vivo, zero Enterprise)', () => {
        const allMessageTexts: string[] = []
        for (const [key, value] of Object.entries(clinMessages)) {
            if (key === 'DOR_MAP') continue
            if (typeof value === 'string') allMessageTexts.push(value)
            if (Array.isArray(value)) allMessageTexts.push(...value.filter((v) => typeof v === 'string'))
        }

        const joined = allMessageTexts.join('\n')
        expect(joined).not.toContain('&')
        expect(joined.toLowerCase()).not.toContain('emissão de senhas')
        expect(joined.toLowerCase()).not.toContain('ao vivo')
        expect(joined.toLowerCase()).not.toContain('enterprise')
        expect(joined.toLowerCase()).not.toContain('nota fiscal')
        expect(/[\p{Extended_Pictographic}]/u.test(joined)).toBe(false)
    })

    it('aplica travas rígidas no follow-up automático (nunca dispara para transferidos, pausados, bloqueio ou conta encerrada)', () => {
        const futurePause = new Date(Date.now() + 60 * 60 * 1000).toISOString()
        const pastPause = new Date(Date.now() - 60 * 60 * 1000).toISOString()

        expect(isSessionEligibleForFollowUp('menu', 'active', null)).toBe(true)
        expect(isSessionEligibleForFollowUp('fluxo_2_aguarda_num', 'active', pastPause)).toBe(true)
        expect(isSessionEligibleForFollowUp('menu', 'transferred', null)).toBe(false)
        expect(isSessionEligibleForFollowUp('menu', 'active', futurePause)).toBe(false)
        expect(isSessionEligibleForFollowUp('fluxo_6_bloqueio', 'active', null)).toBe(false)
        expect(isSessionEligibleForFollowUp('fluxo_encerrada_clinica', 'active', null)).toBe(false)
    })

    it('respeita janela comercial BRT (08h30 às 19h30) e normaliza WhatsApp', () => {
        // 13:00 UTC = 10:00 BRT (dentro do horário comercial)
        expect(isWithinBrtBusinessHours(new Date('2026-11-26T13:00:00Z'))).toBe(true)
        // 04:00 UTC = 01:00 BRT (madrugada — fora)
        expect(isWithinBrtBusinessHours(new Date('2026-11-26T04:00:00Z'))).toBe(false)
        // 23:30 UTC = 20:30 BRT (noite — fora)
        expect(isWithinBrtBusinessHours(new Date('2026-11-26T23:30:00Z'))).toBe(false)

        expect(extractWhatsappDigits('wa-5515992012801')).toBe('5515992012801')
        expect(extractWhatsappDigits('web-123', '(21) 97512-9005')).toBe('5521975129005')
    })
})

