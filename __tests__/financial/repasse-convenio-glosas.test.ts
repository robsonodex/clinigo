import {
    computeRepasseFromRules,
    computeAdvancedRepasse,
    type DoctorPatientRateOverride,
    type DoctorContractRecord,
    type GuideBillingInfo
} from '@/lib/services/repasse-calculator';

describe('Cálculo de Repasse Médico: Regimes de Produção x Recebimento e Políticas de Glosa', () => {

    const baseContract: DoctorContractRecord = {
        id: 'contract-uuid-1',
        clinic_id: 'clinic-uuid-1',
        doctor_id: 'doctor-uuid-1',
        percentage_private: 70,
        percentage_insurance: 60,
        fixed_value_private: null,
        fixed_value_insurance: null,
        is_active: true,
    };

    const patientOverrideFixed: DoctorPatientRateOverride = {
        id: 'override-uuid-fixed',
        clinic_id: 'clinic-uuid-1',
        doctor_id: 'doctor-uuid-1',
        patient_id: 'patient-uuid-1',
        rate_type: 'FIXED',
        fixed_value: 85.0,
        percentage: null,
        active: true,
    };

    const patientOverridePct: DoctorPatientRateOverride = {
        id: 'override-uuid-pct',
        clinic_id: 'clinic-uuid-1',
        doctor_id: 'doctor-uuid-1',
        patient_id: 'patient-uuid-2',
        rate_type: 'PERCENTAGE',
        fixed_value: null,
        percentage: 50.0,
        active: true,
    };

    describe('1. Regra de Precedência Clássica (Retrocompatibilidade)', () => {
        test('Prioridade 1: Override fixo por paciente tem precedência sobre contrato', () => {
            const result = computeRepasseFromRules({
                appointmentValue: 200,
                override: patientOverrideFixed,
                contract: baseContract,
                isInsurance: true,
            });

            expect(result.amount).toBe(85.0);
            expect(result.source).toBe('PATIENT_OVERRIDE');
            expect(result.rateType).toBe('FIXED');
        });

        test('Prioridade 1: Override percentual por paciente tem precedência sobre contrato', () => {
            const result = computeRepasseFromRules({
                appointmentValue: 200,
                override: patientOverridePct,
                contract: baseContract,
                isInsurance: true,
            });

            expect(result.amount).toBe(100.0); // 50% de 200
            expect(result.source).toBe('PATIENT_OVERRIDE');
            expect(result.rateType).toBe('PERCENTAGE');
        });

        test('Prioridade 2: Contrato padrão de convênio (60%) é aplicado na ausência de override', () => {
            const result = computeRepasseFromRules({
                appointmentValue: 200,
                contract: baseContract,
                isInsurance: true,
            });

            expect(result.amount).toBe(120.0); // 60% de 200
            expect(result.source).toBe('CONTRACT_DEFAULT');
            expect(result.rateApplied).toBe(60);
        });

        test('Prioridade 3: Fallback de 70% quando médico não possui contrato cadastrado', () => {
            const result = computeRepasseFromRules({
                appointmentValue: 200,
                contract: null,
                doctorFallbackPercentage: 70,
                isInsurance: false,
            });

            expect(result.amount).toBe(140.0); // 70% de 200
            expect(result.rateApplied).toBe(70);
        });
    });

    describe('2. Regime RECEBIMENTO (Só repassa após pagamento da operadora)', () => {
        test('Guia de convênio não liquidada/pendente: repasse R$ 0,00 retido', () => {
            const guidePending: GuideBillingInfo = {
                guideStatus: 'SENT',
                guideTotalValue: 200,
                guidePaidValue: 0,
                glosaValue: 0,
            };

            const result = computeAdvancedRepasse({
                appointmentValue: 200,
                contract: baseContract,
                isInsurance: true,
                regime: 'RECEBIMENTO',
                glosaPolicy: 'CLINICA_ABSORVE',
                guideInfo: guidePending,
            });

            expect(result.amount).toBe(0.0);
            expect(result.isEligibleForPayment).toBe(false);
            expect(result.originalRepasseAmount).toBe(120.0);
            expect(result.discountAmount).toBe(120.0);
        });

        test('Guia aprovada e paga 100%: repasse integral de 60% liberado', () => {
            const guidePaid: GuideBillingInfo = {
                guideStatus: 'APPROVED',
                guideTotalValue: 200,
                guidePaidValue: 200,
                glosaValue: 0,
            };

            const result = computeAdvancedRepasse({
                appointmentValue: 200,
                contract: baseContract,
                isInsurance: true,
                regime: 'RECEBIMENTO',
                glosaPolicy: 'CLINICA_ABSORVE',
                guideInfo: guidePaid,
            });

            expect(result.amount).toBe(120.0);
            expect(result.isEligibleForPayment).toBe(true);
            expect(result.discountAmount).toBe(0);
        });

        test('Guia paga parcialmente (50%) com política DESCONTA_PROFISSIONAL: repassa proporcional (R$ 60,00)', () => {
            const guidePartial: GuideBillingInfo = {
                guideStatus: 'PARTIAL',
                guideTotalValue: 200,
                guidePaidValue: 100, // 50% pago pela operadora
                glosaValue: 100,
            };

            const result = computeAdvancedRepasse({
                appointmentValue: 200,
                contract: baseContract,
                isInsurance: true,
                regime: 'RECEBIMENTO',
                glosaPolicy: 'DESCONTA_PROFISSIONAL',
                guideInfo: guidePartial,
            });

            expect(result.amount).toBe(60.0); // 50% do repasse base de 120
            expect(result.discountAmount).toBe(60.0);
            expect(result.isEligibleForPayment).toBe(true);
        });

        test('Guia paga parcialmente (50%) com política CLINICA_ABSORVE: profissional recebe repasse integral (R$ 120,00)', () => {
            const guidePartial: GuideBillingInfo = {
                guideStatus: 'PARTIAL',
                guideTotalValue: 200,
                guidePaidValue: 100,
                glosaValue: 100,
            };

            const result = computeAdvancedRepasse({
                appointmentValue: 200,
                contract: baseContract,
                isInsurance: true,
                regime: 'RECEBIMENTO',
                glosaPolicy: 'CLINICA_ABSORVE',
                guideInfo: guidePartial,
            });

            expect(result.amount).toBe(120.0);
            expect(result.discountAmount).toBe(0);
        });
    });

    describe('3. Regime PRODUÇÃO com Políticas de Glosa', () => {
        test('Produção padrão com CLINICA_ABSORVE: repasse integral mesmo com glosa', () => {
            const guideWithGlosa: GuideBillingInfo = {
                guideStatus: 'PARTIAL',
                guideTotalValue: 200,
                guidePaidValue: 150,
                glosaValue: 50,
            };

            const result = computeAdvancedRepasse({
                appointmentValue: 200,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'CLINICA_ABSORVE',
                guideInfo: guideWithGlosa,
            });

            expect(result.amount).toBe(120.0);
            expect(result.discountAmount).toBe(0);
        });

        test('Produção com DESCONTA_PROFISSIONAL: estorno proporcional à taxa médica (60% de R$ 50 = R$ 30)', () => {
            const guideWithGlosa: GuideBillingInfo = {
                guideStatus: 'PARTIAL',
                guideTotalValue: 200,
                guidePaidValue: 150,
                glosaValue: 50, // Glosa de R$ 50
            };

            const result = computeAdvancedRepasse({
                appointmentValue: 200,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'DESCONTA_PROFISSIONAL',
                guideInfo: guideWithGlosa,
            });

            // Repasse bruto: R$ 120,00. Desconto de 60% sobre a glosa de 50 = R$ 30,00.
            // Repasse líquido: R$ 90,00.
            expect(result.discountAmount).toBe(30.0);
            expect(result.amount).toBe(90.0);
            expect(result.discountReason).toBe('Estorno de glosa da operadora');
        });

        test('Produção com DESCONTA_SE_MANTIDA: não desconta enquanto recurso de glosa estiver em análise', () => {
            const guideInAppeal: GuideBillingInfo = {
                guideStatus: 'PARTIAL',
                guideTotalValue: 200,
                guidePaidValue: 150,
                glosaValue: 50,
                glosaMaintained: false, // Recurso ainda pendente
            };

            const result = computeAdvancedRepasse({
                appointmentValue: 200,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'DESCONTA_SE_MANTIDA',
                guideInfo: guideInAppeal,
            });

            expect(result.amount).toBe(120.0);
            expect(result.discountAmount).toBe(0);
        });

        test('Produção com DESCONTA_SE_MANTIDA: estorna quando recurso for negado e glosa mantida', () => {
            const guideRejected: GuideBillingInfo = {
                guideStatus: 'PARTIAL',
                guideTotalValue: 200,
                guidePaidValue: 150,
                glosaValue: 50,
                glosaMaintained: true, // Recurso foi negado, glosa definitiva
            };

            const result = computeAdvancedRepasse({
                appointmentValue: 200,
                contract: baseContract,
                isInsurance: true,
                regime: 'PRODUCAO',
                glosaPolicy: 'DESCONTA_SE_MANTIDA',
                guideInfo: guideRejected,
            });

            expect(result.discountAmount).toBe(30.0);
            expect(result.amount).toBe(90.0);
            expect(result.discountReason).toBe('Estorno de glosa mantida após recurso da operadora');
        });
    });

    describe('4. Atendimentos Particulares', () => {
        test('Atendimentos particulares não sofrem influência de regras de convênio', () => {
            const result = computeAdvancedRepasse({
                appointmentValue: 200,
                contract: baseContract,
                isInsurance: false,
                regime: 'RECEBIMENTO', // Mesmo em clínica com regime recebimento
                glosaPolicy: 'DESCONTA_PROFISSIONAL',
            });

            // Atendimento particular paga 70% do contrato particular: R$ 140,00
            expect(result.amount).toBe(140.0);
            expect(result.isEligibleForPayment).toBe(true);
            expect(result.discountAmount).toBe(0);
        });
    });
});
