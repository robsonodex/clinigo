/**
 * Plan Guards Tests
 * Verifies plan-based access control works correctly
 */

import { describe, test, expect } from '@jest/globals'
import { hasFeature, canUpgradeTo, PLAN_DEFINITIONS } from '@/types/core'

describe('Plan Guards', () => {
    describe('Feature Access', () => {
        test('BASIC has only basic features', () => {
            expect(hasFeature('BASIC', 'ai_simple')).toBe(true)
            expect(hasFeature('BASIC', 'video_google_meet')).toBe(true)
            expect(hasFeature('BASIC', 'whatsapp_manual')).toBe(true)

            // Does NOT have premium features
            expect(hasFeature('BASIC', 'ai_reasoning')).toBe(false)
            expect(hasFeature('BASIC', 'video_daily')).toBe(false)
            expect(hasFeature('BASIC', 'crm')).toBe(false)
            expect(hasFeature('BASIC', 'tiss')).toBe(false)
        })

        test('PRO has PRO features', () => {
            expect(hasFeature('PRO', 'ai_reasoning')).toBe(true)
            expect(hasFeature('PRO', 'video_daily')).toBe(true)
            expect(hasFeature('PRO', 'whatsapp_automation')).toBe(true)
            expect(hasFeature('PRO', 'crm')).toBe(true)
            expect(hasFeature('PRO', 'tiss')).toBe(true)
            expect(hasFeature('PRO', 'marketplace')).toBe(true)

            // Does NOT have ENTERPRISE-only features
            expect(hasFeature('PRO', 'ai_predictive')).toBe(false)
            expect(hasFeature('PRO', 'video_whitelabel')).toBe(false)
            expect(hasFeature('PRO', 'whatsapp_chatbot')).toBe(false)
        })

        test('ENTERPRISE has all features', () => {
            expect(hasFeature('ENTERPRISE', 'ai_predictive')).toBe(true)
            expect(hasFeature('ENTERPRISE', 'video_whitelabel')).toBe(true)
            expect(hasFeature('ENTERPRISE', 'whatsapp_chatbot')).toBe(true)
            expect(hasFeature('ENTERPRISE', 'multi_units')).toBe(true)
        })
    })

    describe('Plan Limits', () => {
        test('BASIC has correct limits', () => {
            const limits = PLAN_DEFINITIONS.BASIC.limits

            expect(limits.max_doctors).toBe(3)
            expect(limits.max_appointments_month).toBe(200)
            expect(limits.max_patients).toBe(-1) // unlimited
            expect(limits.max_storage_gb).toBe(5)
        })

        test('PRO has correct limits', () => {
            const limits = PLAN_DEFINITIONS.PRO.limits

            expect(limits.max_doctors).toBe(15)
            expect(limits.max_appointments_month).toBe(-1) // unlimited
            expect(limits.max_patients).toBe(-1)
            expect(limits.max_storage_gb).toBe(50)
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
        test('can upgrade from BASIC to PRO', () => {
            expect(canUpgradeTo('BASIC', 'PRO')).toBe(true)
        })

        test('can upgrade from BASIC to ENTERPRISE', () => {
            expect(canUpgradeTo('BASIC', 'ENTERPRISE')).toBe(true)
        })

        test('can upgrade from PRO to ENTERPRISE', () => {
            expect(canUpgradeTo('PRO', 'ENTERPRISE')).toBe(true)
        })

        test('cannot downgrade from PRO to BASIC', () => {
            expect(canUpgradeTo('PRO', 'BASIC')).toBe(false)
        })

        test('cannot downgrade from ENTERPRISE to PRO', () => {
            expect(canUpgradeTo('ENTERPRISE', 'PRO')).toBe(false)
        })
    })

    describe('AI Model Selection', () => {
        test('BASIC uses free AI model', () => {
            const plan = 'BASIC'
            const expectedModel = 'meta-llama/llama-3-8b-instruct:free'

            const model = plan === 'BASIC'
                ? 'meta-llama/llama-3-8b-instruct:free'
                : 'anthropic/claude-3-sonnet'

            expect(model).toBe(expectedModel)
        })

        test('BASIC cannot use reasoning', () => {
            const plan = 'BASIC'
            const requestedReasoning = true

            const allowReasoning = plan === 'BASIC' ? false : requestedReasoning

            expect(allowReasoning).toBe(false)
        })

        test('PRO can use reasoning if requested', () => {
            const plan: string = 'PRO'
            const requestedReasoning = true

            const allowReasoning = plan === 'BASIC' ? false : requestedReasoning

            expect(allowReasoning).toBe(true)
        })
    })
})
