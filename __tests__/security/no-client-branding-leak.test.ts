import fs from 'fs'
import path from 'path'
import {
    ALL_CLINICAL_SESSION_SPECIALTIES,
    DEFAULT_CLINIC_CLINICAL_MODULES,
    extractClinicalModulesFromTheme,
    getDefaultClinicalModulesForClinic,
    normalizeClinicClinicalModules,
} from '@/lib/utils/clinic-clinical-modules'
import {
    isClinicAuthorizedForContracts,
    isClinicAuthorizedForTeleconsulta,
} from '@/lib/constants/contracts-allowlist'
import { isClinicInSessionPlansAllowlist } from '@/lib/constants/session-plans-beta-clinics'
import { HERO_CONTENT, OPERATIONAL_CONTRAST, SIMULATOR_CONTENT } from '@/components/preview-home/content'

describe('Blindagem White-Label & Módulos Clínicos Configuráveis para Todas as Clínicas', () => {
    it('NUNCA deve exibir nome de clínica cliente em telas compartilhadas, manuais, labels ou PDFs', () => {
        const filesToAudit = [
            'components/medical-records/WorldSensoryEvolutionForm.tsx',
            'components/session-plans/ManualEvolucaoReader.tsx',
            'components/session-plans/SessionPlanFormClient.tsx',
            'components/session-plans/SpecialtyDashboardClient.tsx',
            'components/session-plans/SessionPlansDropdown.tsx',
            'app/dashboard/(clinic)/prontuarios/[id]/page.tsx',
            'app/dashboard/(clinic)/configuracoes/components/ClinicalModulesSettings.tsx',
            'lib/constants/features.ts',
            'lib/services/medical-records-export.ts',
            'components/preview-home/content.ts',
            'components/preview-home/OperationalContrastSection.tsx',
            'components/preview-home/OperationalSimulator.tsx',
            'components/session-plans/SessionPlansAnalyticsPanel.tsx',
            'components/session-plans/QuickDttCollector.tsx',
            'components/family-portal/FamilyPortalManager.tsx',
            'components/family-portal/FamilyPortalPublicView.tsx',
            'app/familia/[token]/page.tsx',
            'lib/session-plans/learning-curve.ts',
        ]

        // Padrões de marca de clínica cliente em strings visíveis ao usuário
        const forbiddenVisiblePatterns = [
            /Ficha Exclusiva World Sensory/i,
            /WORLD SENSORY • USO INTERNO/i,
            /Ficha de Evolução Terapêutica • World Sensory/i,
            /Evolucao_WorldSensory_/i,
            /World Sensory · v1\.0/i,
            /profissionais da World Sensory/i,
            /manual World Sensory/i,
            /Checklist World Sensory/i,
            /• World Sensory/i,
            /Psicomotricidade \(World Sensory\)/i,
            /Evolução Terapêutica — World Sensory/i,
            /World Sensory - Padrão/i,
            /\? 'World Sensory'/i,
        ]

        for (const relPath of filesToAudit) {
            const content = fs.readFileSync(path.join(process.cwd(), relPath), 'utf8')
            for (const pattern of forbiddenVisiblePatterns) {
                expect(content).not.toMatch(pattern)
            }
        }
    })

    it('varredura global recursiva em app/ e components/: ZERO nomes de clínicas clientes em textos visíveis', () => {
        const roots = ['app', 'components']
        const forbiddenGlobalVisiblePatterns = [
            /World\s+Sensory/i,
            /Terapeuta\s+WorldSensory/i,
            /WorldSensory\s+Terapias/i,
            /Espa[cç]o\s+Incluir/i,
            /Biblioteca\s+(Oficial\s+)?World/i,
        ]

        const violations: string[] = []

        const walk = (dirPath: string) => {
            if (!fs.existsSync(dirPath)) return
            for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
                const fullPath = path.join(dirPath, entry.name)
                if (entry.isDirectory()) {
                    walk(fullPath)
                } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                    const rel = path.relative(process.cwd(), fullPath).replace(/\\/g, '/')
                    const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)
                    lines.forEach((line, idx) => {
                        const trimmed = line.trim()
                        // Ignorar comentários puramente internos de código/JSX
                        if (
                            trimmed.startsWith('//') ||
                            trimmed.startsWith('*') ||
                            trimmed.startsWith('/*') ||
                            (trimmed.startsWith('{/*') && trimmed.endsWith('*/}'))
                        ) {
                            return
                        }
                        for (const pattern of forbiddenGlobalVisiblePatterns) {
                            if (pattern.test(line)) {
                                violations.push(`${rel}:${idx + 1}: ${trimmed}`)
                            }
                        }
                    })
                }
            }
        }

        roots.forEach((root) => walk(path.join(process.cwd(), root)))
        expect(violations).toEqual([])
    })

    it('deve liberar Planos de Sessão, Contratos e Teleconsulta para qualquer clínica válida respeitando toggles', () => {
        const anyNewClinicId = '11111111-2222-3333-4444-555555555555'

        expect(isClinicInSessionPlansAllowlist(anyNewClinicId)).toBe(true)
        expect(isClinicInSessionPlansAllowlist('')).toBe(false)

        // Padrão: habilitado para novas clínicas
        expect(isClinicAuthorizedForContracts(anyNewClinicId)).toBe(true)
        expect(isClinicAuthorizedForTeleconsulta(anyNewClinicId)).toBe(true)

        // Quando a própria clínica desativa via Configurações -> Módulos Clínicos
        const disabledTheme = {
            clinical_modules: {
                contractsEnabled: false,
                teleconsultaEnabled: false,
            },
        }
        expect(isClinicAuthorizedForContracts(anyNewClinicId, { theme: disabledTheme })).toBe(false)
        expect(isClinicAuthorizedForTeleconsulta(anyNewClinicId, { theme: disabledTheme })).toBe(false)
    })

    it('deve normalizar módulos clínicos com padrão seguro para novas clínicas e preservar defaults legados', () => {
        const newClinicDefaults = getDefaultClinicalModulesForClinic('99999999-aaaa-bbbb-cccc-dddddddddddd')
        expect(newClinicDefaults.sessionPlansEnabled).toBe(true)
        expect(newClinicDefaults.sessionPlanSpecialties).toEqual(ALL_CLINICAL_SESSION_SPECIALTIES)
        expect(newClinicDefaults.evolutionManualEnabled).toBe(true)
        expect(newClinicDefaults.contractsEnabled).toBe(true)
        expect(newClinicDefaults.teleconsultaEnabled).toBe(true)
        expect(newClinicDefaults.structuredEvolutionDefault).toBe(false)
        expect(newClinicDefaults.staffSignatureGateEnabled).toBe(false)
        expect(newClinicDefaults.receptionFlowMode).toBe('full_4_steps')

        // Preserva comportamento legado sem quebrar clínicas em produção
        const legacyStructured = getDefaultClinicalModulesForClinic('4c13e586-5390-4393-a180-2c9dd7ed81c7')
        expect(legacyStructured.structuredEvolutionDefault).toBe(true)

        const legacyFast = getDefaultClinicalModulesForClinic('5163c916-8b82-4d80-8a71-01726836ee46')
        expect(legacyFast.staffSignatureGateEnabled).toBe(true)
        expect(legacyFast.receptionFlowMode).toBe('fast_2_steps')

        // Respeita override explícito de qualquer clínica
        const custom = extractClinicalModulesFromTheme(
            {
                clinical_modules: {
                    sessionPlansEnabled: true,
                    sessionPlanSpecialties: ['intervencao_precoce_aba', 'psicologia', 'invalida'],
                    structuredEvolutionDefault: true,
                    receptionFlowMode: 'fast_2_steps',
                },
            },
            '99999999-aaaa-bbbb-cccc-dddddddddddd'
        )
        expect(custom.sessionPlanSpecialties).toEqual(['intervencao_precoce_aba', 'psicologia'])
        expect(custom.structuredEvolutionDefault).toBe(true)
        expect(custom.receptionFlowMode).toBe('fast_2_steps')
        expect(normalizeClinicClinicalModules(null)).toEqual(DEFAULT_CLINIC_CLINICAL_MODULES)
    })

    it('deve manter a chamada do Hero intacta e focar seções abaixo em resultados reais sem foco em perdas/glosas', () => {
        expect(HERO_CONTENT.headlineBefore).toContain('Clínicas e profissionais de terapia exigem um sistema')
        expect(HERO_CONTENT.headlineAccent).toBe('feito para terapias')
        expect(OPERATIONAL_CONTRAST.items).toHaveLength(6)
        expect(OPERATIONAL_CONTRAST.headlineBefore).toContain('Resultados concretos')
        expect(SIMULATOR_CONTENT.subtitle).not.toMatch(/perdas|glosa/i)

        const contrastText = JSON.stringify(OPERATIONAL_CONTRAST)
        expect(contrastText).not.toMatch(/especialista em glosas|perdas evitáveis|anti-glosa/i)
        expect(contrastText).toContain('456+ objetivos')
    })

    it('deve garantir minimização LGPD, noindex e checagem de revogação/expiração no CliniGo Família público', () => {
        const publicApi = fs.readFileSync(
            path.join(process.cwd(), 'app/api/public/familia/[token]/route.ts'),
            'utf8'
        )
        const publicPage = fs.readFileSync(
            path.join(process.cwd(), 'app/familia/[token]/page.tsx'),
            'utf8'
        )
        const middlewareSource = fs.readFileSync(
            path.join(process.cwd(), 'middleware.ts'),
            'utf8'
        )

        expect(publicApi).toContain('revoked_at')
        expect(publicApi).toContain('expires_at')
        expect(publicApi).toContain('TOKEN_REGEX')
        expect(publicApi).not.toContain('cpf')
        expect(publicApi).not.toContain('medical_records')

        expect(publicPage).toContain('index: false')
        expect(publicPage).toContain('follow: false')
        expect(publicPage).toContain('revoked_at')
        expect(publicPage).not.toContain('cpf')

        expect(middlewareSource).toContain("pathname.startsWith('/familia/')")
    })
})

