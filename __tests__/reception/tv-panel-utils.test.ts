import fs from 'fs'
import path from 'path'
import {
    OFFICIAL_CLINIGO_LOGO_DARK,
    OFFICIAL_CLINIGO_LOGO_LIGHT,
    formatPatientNameForTv,
    getTvRealtimeChannelName,
    normalizeTvLayout,
    normalizeTvLogoMode,
    normalizeTvPrivacyMode,
    resolveTvDisplayLogo,
    TV_LAYOUT_OPTIONS,
    VALID_TV_LAYOUTS,
    VALID_TV_LOGO_MODES,
} from '@/lib/utils/tv-panel'
import {
    DEFAULT_RECEPTION_VISIBLE_MODULES,
    RECEPTION_MODULE_OPTIONS,
    RECEPTION_PREFERENCES_ALLOWED_ROLES,
    countVisibleReceptionModules,
    getReceptionModulesGridClass,
    getReceptionModulesStorageKey,
    normalizeReceptionModules,
} from '@/lib/utils/reception-modules'

describe('Painel de TV, Totem & Central de Comando da Recepção', () => {
    it('deve disponibilizar os 4 layouts oficiais incluindo o Editorial Sensorial para clínicas de terapias', () => {
        expect(VALID_TV_LAYOUTS).toEqual(['editorial', 'executivo', 'informativo', 'classico'])
        expect(TV_LAYOUT_OPTIONS).toHaveLength(4)
        expect(TV_LAYOUT_OPTIONS.map((l) => l.id)).toEqual(['editorial', 'executivo', 'informativo', 'classico'])
    })

    it('deve normalizar layouts, modo de logo e modo de privacidade LGPD com fallback seguro', () => {
        expect(normalizeTvLayout('editorial')).toBe('editorial')
        expect(normalizeTvLayout('executivo')).toBe('executivo')
        expect(normalizeTvLayout('informativo')).toBe('informativo')
        expect(normalizeTvLayout('classico')).toBe('classico')
        expect(normalizeTvLayout('desconhecido')).toBe('classico')
        expect(normalizeTvLayout(undefined)).toBe('classico')

        expect(normalizeTvPrivacyMode('initials')).toBe('initials')
        expect(normalizeTvPrivacyMode('full')).toBe('full')
        expect(normalizeTvPrivacyMode('invalido')).toBe('full')

        expect(VALID_TV_LOGO_MODES).toEqual(['clinic', 'clinigo'])
        expect(normalizeTvLogoMode('clinigo')).toBe('clinigo')
        expect(normalizeTvLogoMode('clinic')).toBe('clinic')
        expect(normalizeTvLogoMode('qualquer')).toBe('clinic')
    })

    it('deve resolver corretamente entre logotipo da clínica e logotipo oficial CliniGo (claro/escuro)', () => {
        const withClinicLogo = resolveTvDisplayLogo({
            logoMode: 'clinic',
            clinicLogoUrl: 'https://cdn.clinigo.app/logo-minha-clinica.png',
            clinicName: 'Clínica Exemplo',
            surface: 'dark',
        })
        expect(withClinicLogo).toEqual({
            src: 'https://cdn.clinigo.app/logo-minha-clinica.png',
            isClinicLogo: true,
            alt: 'Clínica Exemplo',
        })

        // Quando clinic escolheu logo da clínica mas ainda não subiu imagem, usa logo oficial CliniGo
        const fallbackDark = resolveTvDisplayLogo({
            logoMode: 'clinic',
            clinicLogoUrl: null,
            clinicName: 'Clínica Exemplo',
            surface: 'dark',
        })
        expect(fallbackDark).toEqual({
            src: OFFICIAL_CLINIGO_LOGO_DARK,
            isClinicLogo: false,
            alt: 'CliniGo',
        })

        // Quando escolheu explicitamente logo oficial CliniGo, ignora clinicLogoUrl e adapta ao fundo
        const forcedLight = resolveTvDisplayLogo({
            logoMode: 'clinigo',
            clinicLogoUrl: 'https://cdn.clinigo.app/logo-minha-clinica.png',
            surface: 'light',
        })
        expect(forcedLight).toEqual({
            src: OFFICIAL_CLINIGO_LOGO_LIGHT,
            isClinicLogo: false,
            alt: 'CliniGo',
        })
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

    it('deve normalizar e contar módulos visíveis da Recepção com grade responsiva adaptável', () => {
        expect(DEFAULT_RECEPTION_VISIBLE_MODULES).toEqual({
            tvPanel: true,
            totem: true,
            faceCheckin: true,
            qrScanner: true,
        })
        expect(RECEPTION_MODULE_OPTIONS).toHaveLength(4)
        expect(RECEPTION_PREFERENCES_ALLOWED_ROLES).toEqual([
            'RECEPTIONIST',
            'CLINIC_ADMIN',
            'STAFF',
            'SUPER_ADMIN',
        ])

        expect(normalizeReceptionModules(null)).toEqual(DEFAULT_RECEPTION_VISIBLE_MODULES)
        expect(normalizeReceptionModules({ tvPanel: false, qrScanner: false })).toEqual({
            tvPanel: false,
            totem: true,
            faceCheckin: true,
            qrScanner: false,
        })

        expect(countVisibleReceptionModules({ tvPanel: true, totem: false, faceCheckin: false, qrScanner: false })).toBe(1)
        expect(countVisibleReceptionModules({ tvPanel: false, totem: false, faceCheckin: false, qrScanner: false })).toBe(0)
        expect(getReceptionModulesGridClass(1)).toContain('sm:max-w-md')
        expect(getReceptionModulesGridClass(2)).toContain('sm:grid-cols-2')
        expect(getReceptionModulesGridClass(3)).toContain('lg:grid-cols-3')
        expect(getReceptionModulesGridClass(4)).toContain('xl:grid-cols-4')
        expect(getReceptionModulesStorageKey('c-123')).toBe('clinigo_reception_visible_modules_c-123')
    })

    it('deve permitir à Recepção ativar/ocultar cada módulo via botão Exibir Funções com toggles persistidos', () => {
        const recepcaoSrc = fs.readFileSync(
            path.join(process.cwd(), 'app/dashboard/(clinic)/recepcao/page.tsx'),
            'utf8'
        )
        const prefsApiSrc = fs.readFileSync(
            path.join(process.cwd(), 'app/api/reception/preferences/route.ts'),
            'utf8'
        )

        expect(recepcaoSrc).not.toContain('Filtros e Ações')
        expect(recepcaoSrc).toContain('Exibir Funções')
        expect(recepcaoSrc).toContain('Ativar todos')
        expect(recepcaoSrc).toContain('Ocultar todos')
        expect(recepcaoSrc).toContain('/api/reception/preferences')
        expect(recepcaoSrc).toContain('visibleModules.tvPanel')
        expect(recepcaoSrc).toContain('visibleModules.totem')
        expect(recepcaoSrc).toContain('visibleModules.faceCheckin')
        expect(recepcaoSrc).toContain('visibleModules.qrScanner')
        expect(recepcaoSrc).toContain('Abrir TV')
        expect(recepcaoSrc).toContain('Abrir Totem')
        expect(recepcaoSrc).toContain('Iniciar Check-in Facial')
        expect(recepcaoSrc).toContain('Ler QR Code')
        expect(recepcaoSrc).toContain('/dashboard/configuracoes?tab=consultorios')

        expect(prefsApiSrc).toContain('RECEPTION_PREFERENCES_ALLOWED_ROLES')
        expect(prefsApiSrc).toContain('.eq(\'id\', auth.clinicId)')
    })

    it('deve oferecer seleção de logotipo (Clínica ou CliniGo), botões diretos da TV e teste ao vivo em Configurações', () => {
        const settingsSrc = fs.readFileSync(
            path.join(process.cwd(), 'app/dashboard/(clinic)/configuracoes/components/ConsultingRoomsSettings.tsx'),
            'utf8'
        )
        expect(settingsSrc).toContain('Abrir Painel de TV')
        expect(settingsSrc).toContain('Ir para Recepção')
        expect(settingsSrc).toContain('Testar Chamada na TV')
        expect(settingsSrc).toContain('tv_test_call')
        expect(settingsSrc).toContain('Logotipo exibido no Painel de TV e Totem')
        expect(settingsSrc).toContain('Logotipo da Minha Clínica')
        expect(settingsSrc).toContain('Logotipo Oficial CliniGo')
        expect(settingsSrc).toContain('ClinicLogoModal')
        expect(settingsSrc).not.toContain('window.confirm')
    })

    it('deve remover completamente Senha Digital/Retirar Senha do Totem e /help e exibir logotipo oficial no Totem', () => {
        const publicHelpSrc = fs.readFileSync(
            path.join(process.cwd(), 'app/help/page.tsx'),
            'utf8'
        )
        const totemSrc = fs.readFileSync(
            path.join(process.cwd(), 'app/totem/[clinicId]/page.tsx'),
            'utf8'
        )
        const tvSrc = fs.readFileSync(
            path.join(process.cwd(), 'app/painel-tv/[clinicId]/page.tsx'),
            'utf8'
        )

        expect(publicHelpSrc).not.toMatch(/Retirar Senha|Senha Digital|imprimir ou visualizar|número do bilhete/i)
        expect(publicHelpSrc).toContain('Check-in Facial por Biometria')
        expect(publicHelpSrc).toContain('Check-in por QR Code')

        expect(totemSrc).not.toMatch(/Retirar Senha|Senha Digital|papel de senha|generate-ticket/i)
        expect(totemSrc).toContain('Check-in Facial')
        expect(totemSrc).toContain('QR Code')
        expect(totemSrc).toContain('resolveTvDisplayLogo')
        expect(totemSrc).toContain('/api/totem/branding')

        expect(tvSrc).toContain('resolveTvDisplayLogo')
        expect(tvSrc).toContain('/api/totem/branding')
    })
})
