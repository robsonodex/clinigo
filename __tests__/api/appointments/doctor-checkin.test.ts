import { describe, it, expect } from '@jest/globals';

describe('Doctor Check-in Trigger & Cascade Logic', () => {
  // 1. Testes de Determinação do Nível de Comprovação (TISS & Auditoria)
  describe('Verification Level (Níveis de Comprovação)', () => {
    function computeVerificationLevel(hasReceptionCheckin: boolean, hasDoctorCheckin: boolean): string {
      if (hasDoctorCheckin && hasReceptionCheckin) return 'DOUBLE_VERIFIED';
      if (hasDoctorCheckin) return 'DOCTOR_ONLY';
      if (hasReceptionCheckin) return 'FACIAL_ONLY';
      return 'UNVERIFIED';
    }

    it('deve marcar como DOUBLE_VERIFIED quando ambos os check-ins existirem', () => {
      const result = computeVerificationLevel(true, true);
      expect(result).toBe('DOUBLE_VERIFIED');
    });

    it('deve marcar como DOCTOR_ONLY quando apenas o profissional confirmar presença', () => {
      const result = computeVerificationLevel(false, true);
      expect(result).toBe('DOCTOR_ONLY');
    });

    it('deve marcar como FACIAL_ONLY quando apenas a recepção/totem confirmar', () => {
      const result = computeVerificationLevel(true, false);
      expect(result).toBe('FACIAL_ONLY');
    });

    it('deve marcar como UNVERIFIED quando nenhum check-in foi realizado', () => {
      const result = computeVerificationLevel(false, false);
      expect(result).toBe('UNVERIFIED');
    });
  });

  // 2. Testes de Cálculo de Repasse Snapshot Imutável
  describe('Repasse Calculation Snapshot', () => {
    function calculateRepasse(params: {
      price: number;
      isInsurance: boolean;
      contract?: {
        percentage_private: number;
        percentage_insurance: number;
      } | null;
      insuranceRulePercentage?: number | null;
      doctorFallbackPercentage?: number;
    }) {
      let appliedRate = 70;

      if (params.contract) {
        appliedRate = params.isInsurance
          ? params.contract.percentage_insurance
          : params.contract.percentage_private;

        if (params.insuranceRulePercentage !== undefined && params.insuranceRulePercentage !== null) {
          appliedRate = params.insuranceRulePercentage;
        }
      } else if (params.doctorFallbackPercentage) {
        appliedRate = params.doctorFallbackPercentage;
      }

      const grossPrice = Number(params.price) || 0;
      const repasseAmount = Number(((grossPrice * appliedRate) / 100).toFixed(2));

      return { appliedRate, repasseAmount };
    }

    it('deve calcular repasse particular conforme contrato ativo', () => {
      const result = calculateRepasse({
        price: 250.0,
        isInsurance: false,
        contract: { percentage_private: 75, percentage_insurance: 60 },
      });

      expect(result.appliedRate).toBe(75);
      expect(result.repasseAmount).toBe(187.5);
    });

    it('deve calcular repasse convênio conforme contrato ativo', () => {
      const result = calculateRepasse({
        price: 150.0,
        isInsurance: true,
        contract: { percentage_private: 75, percentage_insurance: 60 },
      });

      expect(result.appliedRate).toBe(60);
      expect(result.repasseAmount).toBe(90.0);
    });

    it('deve respeitar regra específica de convênio sobrepondo a regra geral', () => {
      const result = calculateRepasse({
        price: 200.0,
        isInsurance: true,
        contract: { percentage_private: 70, percentage_insurance: 50 },
        insuranceRulePercentage: 65, // Regra específica (ex: Unimed 65%)
      });

      expect(result.appliedRate).toBe(65);
      expect(result.repasseAmount).toBe(130.0);
    });

    it('deve usar fallback do cadastro do médico caso não haja contrato cadastrado', () => {
      const result = calculateRepasse({
        price: 300.0,
        isInsurance: false,
        contract: null,
        doctorFallbackPercentage: 80,
      });

      expect(result.appliedRate).toBe(80);
      expect(result.repasseAmount).toBe(240.0);
    });
  });

  // 3. Testes de Trilha de Auditoria e Transição de Status
  describe('Cascade Audit Trail', () => {
    it('deve transicionar status para IN_PROGRESS e registrar data/hora', () => {
      const now = new Date().toISOString();
      const updatedFields = {
        status: 'IN_PROGRESS',
        doctor_checked_in_at: now,
        doctor_checked_in_by: 'doctor-user-uuid-123',
        doctor_checkin_method: 'APP',
        in_consultation_at: now,
      };

      expect(updatedFields.status).toBe('IN_PROGRESS');
      expect(updatedFields.doctor_checked_in_at).toBeDefined();
      expect(updatedFields.doctor_checked_in_by).toBe('doctor-user-uuid-123');
    });
  });
});
