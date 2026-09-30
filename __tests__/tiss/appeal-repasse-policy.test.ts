import {
    computeAdvancedRepasse,
    type DoctorContractRecord,
    type GuideBillingInfo,
    type GlosaPolicy,
} from '@/lib/services/repasse-calculator';

describe('C8: Teste Numérico do Efeito de Recurso de Glosa no Repasse por Política (glosa_policy)', () => {
    const baseContract: DoctorContractRecord = {
        id: 'doc-contract-01',
        clinic_id: 'cli-001',
        doctor_id: 'doc-001',
        percentage_private: 70,
        percentage_insurance: 60, // 60% sobre convênio
        fixed_value_private: null,
        fixed_value_insurance: null,
        is_active: true,
    };

    const appointmentGrossValue = 200.00; // Sessão de R$ 200,00

    describe('1. Política CLINICA_ABSORVE', () => {
        test('O repasse do médico é sempre integral (R$ 120,00), independente da glosa ou do resultado do recurso', () => {
            // Cenário A: Guia com Glosa inicial de R$ 100,00
            const guideWithGlosa: GuideBillingInfo = {
                guideStatus: 'PARTIALLY_GLOSED',
                guideTotalValue: 200.00,
                guidePaidValue: 100.00,
                glosaValue: 100.00,
                glosaMaintained: false,
            };

            const resultInitial = computeAdvancedRepasse({
                appointmentValue: appointmentGrossValue,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'CLINICA_ABSORVE',
                guideInfo: guideWithGlosa,
            });

            expect(resultInitial.amount).toBe(120.00); // 60% de 200
            expect(resultInitial.discountAmount).toBe(0);

            // Cenário B: Recurso ACATADO (Operadora pagou os R$ 100,00 adicionais)
            const guideAfterAppealAccepted: GuideBillingInfo = {
                guideStatus: 'APPROVED',
                guideTotalValue: 200.00,
                guidePaidValue: 200.00,
                glosaValue: 0.00,
                glosaMaintained: false,
            };

            const resultAfterAccept = computeAdvancedRepasse({
                appointmentValue: appointmentGrossValue,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'CLINICA_ABSORVE',
                guideInfo: guideAfterAppealAccepted,
            });

            expect(resultAfterAccept.amount).toBe(120.00);
            expect(resultAfterAccept.discountAmount).toBe(0);

            // Cenário C: Recurso NEGADO (Operadora manteve a glosa de R$ 100,00)
            const guideAfterAppealDenied: GuideBillingInfo = {
                guideStatus: 'DENIED',
                guideTotalValue: 200.00,
                guidePaidValue: 100.00,
                glosaValue: 100.00,
                glosaMaintained: true,
            };

            const resultAfterDeny = computeAdvancedRepasse({
                appointmentValue: appointmentGrossValue,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'CLINICA_ABSORVE',
                guideInfo: guideAfterAppealDenied,
            });

            // Clínica continua absorvendo
            expect(resultAfterDeny.amount).toBe(120.00);
            expect(resultAfterDeny.discountAmount).toBe(0);
        });
    });

    describe('2. Política DESCONTA_PROFISSIONAL', () => {
        test('Glosa inicial desconta proporcionalmente; recurso recuperado recompõe crédito ao médico', () => {
            // Cenário A: Glosa de R$ 100,00 aplicada
            // Desconto esperado: 60% de R$ 100,00 = R$ 60,00. Repasse líquido: R$ 60,00.
            const guideWithGlosa: GuideBillingInfo = {
                guideStatus: 'PARTIALLY_GLOSED',
                guideTotalValue: 200.00,
                guidePaidValue: 100.00,
                glosaValue: 100.00,
                glosaMaintained: false,
            };

            const resultInitial = computeAdvancedRepasse({
                appointmentValue: appointmentGrossValue,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'DESCONTA_PROFISSIONAL',
                guideInfo: guideWithGlosa,
            });

            expect(resultInitial.amount).toBe(60.00); // 120 - 60
            expect(resultInitial.discountAmount).toBe(60.00);

            // Cenário B: Recurso ACATADO integralmente (glosa zerada, valor recuperado = R$ 100)
            // Recomposição do crédito: volta para R$ 120,00 com desconto zerado.
            const guideRecoveredFull: GuideBillingInfo = {
                guideStatus: 'APPROVED',
                guideTotalValue: 200.00,
                guidePaidValue: 200.00,
                glosaValue: 0.00,
                glosaMaintained: false,
            };

            const resultFullRecovery = computeAdvancedRepasse({
                appointmentValue: appointmentGrossValue,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'DESCONTA_PROFISSIONAL',
                guideInfo: guideRecoveredFull,
            });

            expect(resultFullRecovery.amount).toBe(120.00);
            expect(resultFullRecovery.discountAmount).toBe(0.00);

            // Cenário C: Recurso PARCIAL (recuperou R$ 60, restando glosa residual de R$ 40)
            // Desconto final: 60% de R$ 40 = R$ 24,00. Repasse líquido: R$ 120 - 24 = R$ 96,00.
            const guideRecoveredPartial: GuideBillingInfo = {
                guideStatus: 'PARTIAL',
                guideTotalValue: 200.00,
                guidePaidValue: 160.00,
                glosaValue: 40.00,
                glosaMaintained: false,
            };

            const resultPartialRecovery = computeAdvancedRepasse({
                appointmentValue: appointmentGrossValue,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'DESCONTA_PROFISSIONAL',
                guideInfo: guideRecoveredPartial,
            });

            expect(resultPartialRecovery.amount).toBe(96.00);
            expect(resultPartialRecovery.discountAmount).toBe(24.00);
        });
    });

    describe('3. Política DESCONTA_SE_MANTIDA', () => {
        test('Glosa em recurso não desconta do profissional; só desconta se a glosa for definitivamente mantida/negada', () => {
            // Cenário A: Glosa em andamento de recurso (glosaMaintained = false)
            // Repasse permanece integral (R$ 120,00)
            const guideInAppeal: GuideBillingInfo = {
                guideStatus: 'PARTIALLY_GLOSED',
                guideTotalValue: 200.00,
                guidePaidValue: 100.00,
                glosaValue: 100.00,
                glosaMaintained: false, // Em recurso ativo
            };

            const resultInAppeal = computeAdvancedRepasse({
                appointmentValue: appointmentGrossValue,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'DESCONTA_SE_MANTIDA',
                guideInfo: guideInAppeal,
            });

            expect(resultInAppeal.amount).toBe(120.00);
            expect(resultInAppeal.discountAmount).toBe(0.00);

            // Cenário B: Recurso ACATADO (glosaMaintained = false e glosaValue = 0)
            // Repasse permanece integral (R$ 120,00)
            const guideAppealAccepted: GuideBillingInfo = {
                guideStatus: 'APPROVED',
                guideTotalValue: 200.00,
                guidePaidValue: 200.00,
                glosaValue: 0.00,
                glosaMaintained: false,
            };

            const resultAccepted = computeAdvancedRepasse({
                appointmentValue: appointmentGrossValue,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'DESCONTA_SE_MANTIDA',
                guideInfo: guideAppealAccepted,
            });

            expect(resultAccepted.amount).toBe(120.00);
            expect(resultAccepted.discountAmount).toBe(0.00);

            // Cenário C: Recurso NEGADO (glosa confirmada/mantida definitivamente: glosaMaintained = true)
            // Agora sim desconta do profissional: 60% de R$ 100 = R$ 60, repasse R$ 60.
            const guideAppealDenied: GuideBillingInfo = {
                guideStatus: 'DENIED',
                guideTotalValue: 200.00,
                guidePaidValue: 100.00,
                glosaValue: 100.00,
                glosaMaintained: true, // Glosa mantida
            };

            const resultDenied = computeAdvancedRepasse({
                appointmentValue: appointmentGrossValue,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'DESCONTA_SE_MANTIDA',
                guideInfo: guideAppealDenied,
            });

            expect(resultDenied.amount).toBe(60.00);
            expect(resultDenied.discountAmount).toBe(60.00);
        });
    });
});
