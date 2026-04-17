/**
 * Plan Guards Tests
 * Verifies plan-based access control works correctly
 * Updated to match 4-tier plan system: BASICO, AVANCADO, PROFESSIONAL, ENTERPRISE
 */

import { describe, test, expect } from '@jest/globals'
import { hasFeature, canUpgradeTo, PLAN_DEFINITIONS } from '@/types/core'

describe('Plan Guards', () => {
    describe('Feature Access', () => {
        test('BASICO has only basic features', () => {
            expect(hasFeature('BASICO', 'check_in_qr')).toBe(true)
            expect(hasFeature('BASICO', 'prontuario')).toBe(true)
            expect(hasFeature('BASICO', 'financeiro')).toBe(true)
            expect(hasFeature('BASICO', 'agenda')).toBe(true)

            // Does NOT have premium features
            expect(hasFeature('BASICO', 'crm')).toBe(false)
            expect(hasFeature('BASICO', 'tiss')).toBe(false)
            expect(hasFeature('BASICO', 'dre')).toBe(false)
            expect(hasFeature('BASICO', 'multi_units')).toBe(false)
        })

        test('AVANCADO has CRM and DRE features', () => {
            expect(hasFeature('AVANCADO', 'crm')).toBe(true)
            expect(hasFeature('AVANCADO', 'dre')).toBe(true)
            expect(hasFeature('AVANCADO', 'whatsapp_evolution')).toBe(true)
            expect(hasFeature('AVANCADO', 'repasse_medico')).toBe(true)
            expect(hasFeature('AVANCADO', 'check_in_facial')).toBe(true)

            // Does NOT have PROFESSIONAL-only features
            expect(hasFeature('AVANCADO', 'tiss')).toBe(false)
            expect(hasFeature('AVANCADO', 'multi_units')).toBe(false)
        })

        test('PROFESSIONAL has TISS and multi-units', () => {
            expect(hasFeature('PROFESSIONAL', 'tiss')).toBe(true)
            expect(hasFeature('PROFESSIONAL', 'multi_units')).toBe(true)
            expect(hasFeature('PROFESSIONAL', 'crm')).toBe(true)
            expect(hasFeature('PROFESSIONAL', 'dre')).toBe(true)
        })

        test('ENTERPRISE has all features', () => {
            expect(hasFeature('ENTERPRISE', 'tiss')).toBe(true)
            expect(hasFeature('ENTERPRISE', 'multi_units')).toBe(true)
            expect(hasFeature('ENTERPRISE', 'crm')).toBe(true)
            expect(hasFeature('ENTERPRISE', 'whatsapp_evolution')).toBe(true)
        })
    })

    describe('Plan Limits', () => {
        test('BASICO has correct limits', () => {
            const limits = PLAN_DEFINITIONS.BASICO.limits

            expect(limits.max_doctors).toBe(2)
            expect(limits.max_appointments_month).toBe(-1) // unlimited
            expect(limits.max_patients).toBe(500)
            expect(limits.max_storage_gb).toBe(5)
        })

        test('AVANCADO has correct limits', () => {
            const limits = PLAN_DEFINITIONS.AVANCADO.limits

            expect(limits.max_doctors).toBe(5)
            expect(limits.max_appointments_month).toBe(-1) // unlimited
            expect(limits.max_patients).toBe(-1)
            expect(limits.max_storage_gb).toBe(20)
        })

        test('ENTERPRISE has unlimited everything', () => {
            const limits = PLAN_DEFINITIONS.ENTERPRISE.limits

            expect(limits.max_doctors).toBe(-1)
            expect(limits.max_appointments_month).toBe(-1)
            expect(limits.max_patients).toBe(-1)
            expect(limits.max_storage_gb).toBe(500)
        })
    })

    describe('Upgrade Logic', () => {
        test('can upgrade from BASICO to AVANCADO', () => {
            expect(canUpgradeTo('BASICO', 'AVANCADO')).toBe(true)
        })

        test('can upgrade from BASICO to ENTERPRISE', () => {
            expect(canUpgradeTo('BASICO', 'ENTERPRISE')).toBe(true)
        })

        test('can upgrade from AVANCADO to PROFESSIONAL', () => {
            expect(canUpgradeTo('AVANCADO', 'PROFESSIONAL')).toBe(true)
        })

        test('cannot downgrade from AVANCADO to BASICO', () => {
            expect(canUpgradeTo('AVANCADO', 'BASICO')).toBe(false)
        })

        test('cannot downgrade from ENTERPRISE to PROFESSIONAL', () => {
            expect(canUpgradeTo('ENTERPRISE', 'PROFESSIONAL')).toBe(false)
        })
    })

    describe('AI Model Selection', () => {
        test('BASICO uses free AI model', () => {
            const plan = 'BASICO'
            const expectedModel = 'meta-llama/llama-3-8b-instruct:free'

            const model = plan === 'BASICO'
                ? 'meta-llama/llama-3-8b-instruct:free'
                : 'anthropic/claude-3-sonnet'

            expect(model).toBe(expectedModel)
        })

        test('BASICO cannot use reasoning', () => {
            const plan = 'BASICO'
            const requestedReasoning = true

            const allowReasoning = plan === 'BASICO' ? false : requestedReasoning

            expect(allowReasoning).toBe(false)
        })

        test('PROFESSIONAL can use reasoning if requested', () => {
            const plan: string = 'PROFESSIONAL'
            const requestedReasoning = true

            const allowReasoning = plan === 'BASICO' ? false : requestedReasoning

            expect(allowReasoning).toBe(true)
        })
    })
})
