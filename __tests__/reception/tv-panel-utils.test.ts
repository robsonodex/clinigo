import fs from 'fs'
import path from 'path'
import {
    formatPatientNameForTv,
    getTvRealtimeChannelName,
    normalizeTvLayout,
    normalizeTvPrivacyMode,
    TV_LAYOUT_OPTIONS,
    VALID_TV_LAYOUTS,
} from '@/lib/utils/tv-panel'

describe('Painel de TV & Central de Comando da Recepção', () => {
    it('deve disponibilizar os 4 layouts oficiais incluindo o Editorial Sensorial para clínicas de terapias', () => {
        expect(VALID_TV_LAYOUTS).toEqual(['editorial', 'executivo', 'informativo', 'classico'])
        expect(TV_LAYOUT_OPTIONS).toHaveLength(4)
        expect(TV_LAYOUT_OPTIONS.map((l) => l.id)).toEqual(['editorial', 'executivo', 'informativo', 'classico'])
    })

    it('deve normalizar layouts e modo de privacidade LGPD com fallback seguro', () => {
        expect(normalizeTvLayout('editorial')).toBe('editorial')
        expect(normalizeTvLayout('executivo')).toBe('executivo')
        expect(normalizeTvLayout('informativo')).toBe('informativo')
        expect(normalizeTvLayout('classico')).toBe('classico')
        expect(normalizeTvLayout('desconhecido')).toBe('classico')
        expect(normalizeTvLayout(undefined)).toBe('classico')

        expect(normalizeTvPrivacyMode('initials')).toBe('initials')
        expect(normalizeTvPrivacyMode('full')).toBe('full')
        expect(normalizeTvPrivacyMode('invalido')).toBe('full')
    })

    it('deve formatar nomes corretamente no modo completo e no modo Privacidade LGPD', () => {
        expect(formatPatientNameForTv('Lucas Mendes Oliveira', 'full')).toBe('Lucas Mendes Oliveira')
        expect(formatPatientNameForTv('Lucas Mendes Oliveira', 'initials')).toBe('Lucas O.')
        expect(formatPatientNameForTv('  Ana   Clara  ', 'initials')).toBe('Ana C.')
        expect(formatPatientNameForTv('Pedro', 'initials')).toBe('Pedro')
        expect(formatPatientNameForTv('', 'initials')).toBe('Paciente')
    })

    it('deve isolar o canal Supabase Realtime por clinicId', () => {
        expect(getTvRealtimeChannelName('clinic-abc')).toBe('tv_panel_realtime_clinic-abc')
        expect(getTvRealtimeChannelName('clinic-1')).not.toBe(getTvRealtimeChannelName('clinic-2'))
    })

    it('deve exibir os 4 módulos de destaque diretamente na Recepção (fora do dropdown escondido Filtros e Ações)', () => {
        const recepcaoSrc = fs.readFileSync(
            path.join(process.cwd(), 'app/dashboard/(clinic)/recepcao/page.tsx'),
            'utf8'
        )
        expect(recepcaoSrc).not.toContain('Filtros e Ações')
        expect(recepcaoSrc).toContain('Abrir TV')
        expect(recepcaoSrc).toContain('Abrir Totem')
        expect(recepcaoSrc).toContain('Iniciar Check-in Facial')
        expect(recepcaoSrc).toContain('Ler QR Code')
        expect(recepcaoSrc).toContain('/dashboard/configuracoes?tab=consultorios')
    })

    it('deve oferecer os botões diretos da TV e teste ao vivo em Configurações > Consultórios e TV', () => {
        const settingsSrc = fs.readFileSync(
            path.join(process.cwd(), 'app/dashboard/(clinic)/configuracoes/components/ConsultingRoomsSettings.tsx'),
            'utf8'
        )
        expect(settingsSrc).toContain('Abrir Painel de TV')
        expect(settingsSrc).toContain('Ir para Recepção')
        expect(settingsSrc).toContain('Testar Chamada na TV')
        expect(settingsSrc).toContain('tv_test_call')
        expect(settingsSrc).not.toContain('window.confirm')
    })

    it('não deve induzir impressão de papel ou Retirar Senha em /help nem no Totem (/totem/[clinicId])', () => {
        const publicHelpSrc = fs.readFileSync(
            path.join(process.cwd(), 'app/help/page.tsx'),
            'utf8'
        )
        const totemSrc = fs.readFileSync(
            path.join(process.cwd(), 'app/totem/[clinicId]/page.tsx'),
            'utf8'
        )

        expect(publicHelpSrc).not.toMatch(/Retirar Senha|imprimir ou visualizar|número do bilhete/i)
        expect(publicHelpSrc).toContain('Senha Digital na Tela')
        expect(totemSrc).not.toMatch(/Retirar Senha|papel de senha/i)
        expect(totemSrc).toContain('Senha Digital (Fila)')
        expect(totemSrc).toContain('não há impressão em papel')
    })
})
