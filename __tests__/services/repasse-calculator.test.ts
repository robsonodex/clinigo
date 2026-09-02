import { describe, it, expect } from '@jest/globals';
import { computeRepasseFromRules } from '@/lib/services/repasse-calculator';

describe('repasse-calculator (Cálculo de Repasse & Override por Paciente)', () => {
  // Cenário 1: COM OVERRIDE ATIVO (FIXED e PERCENTAGE)
  describe('Cenário 1: Com Override Ativo por Paciente', () => {
    it('deve priorizar valor fixo customizado sobre o contrato geral', () => {
      const result = computeRepasseFromRules({
        appointmentValue: 300,
        override: {
          id: 'override-1',
          clinic_id: 'clinic-1',
          doctor_id: 'doc-1',
          patient_id: 'pat-1',
          rate_type: 'FIXED',
          fixed_value: 180,
          percentage: null,
          active: true,
        },
        contract: {
          id: 'contract-1',
          clinic_id: 'clinic-1',
          doctor_id: 'doc-1',
          percentage_private: 50, // Daria 150, mas override fixo é 180
          is_active: true,
        },
      });

      expect(result.source).toBe('PATIENT_OVERRIDE');
      expect(result.rateType).toBe('FIXED');
      expect(result.amount).toBe(180);
      expect(result.rateApplied).toBe(180);
      expect(result.rateId).toBe('override-1');
      expect(result.contractId).toBeNull();
    });

    it('deve priorizar percentual customizado sobre o contrato geral', () => {
      const result = computeRepasseFromRules({
        appointmentValue: 200,
        override: {
          id: 'override-2',
          clinic_id: 'clinic-1',
          doctor_id: 'doc-1',
          patient_id: 'pat-2',
          rate_type: 'PERCENTAGE',
          fixed_value: null,
          percentage: 85, // 85% de 200 = 170
          active: true,
        },
        contract: {
          id: 'contract-1',
          clinic_id: 'clinic-1',
          doctor_id: 'doc-1',
          percentage_private: 60, // 60% seria 120
          is_active: true,
        },
      });

      expect(result.source).toBe('PATIENT_OVERRIDE');
      expect(result.rateType).toBe('PERCENTAGE');
      expect(result.amount).toBe(170);
      expect(result.rateApplied).toBe(85);
      expect(result.rateId).toBe('override-2');
    });
  });

  // Cenário 2: SEM OVERRIDE (FALLBACK PARA O CONTRATO)
  describe('Cenário 2: Sem Override (Fallback para o Contrato Padrão)', () => {
    it('deve aplicar percentual particular do contrato quando não houver override', () => {
      const result = computeRepasseFromRules({
        appointmentValue: 250,
        override: null,
        contract: {
          id: 'contract-1',
          clinic_id: 'clinic-1',
          doctor_id: 'doc-1',
          percentage_private: 70,
          percentage_insurance: 50,
          is_active: true,
        },
        isInsurance: false,
      });

      expect(result.source).toBe('CONTRACT_DEFAULT');
      expect(result.rateType).toBe('PERCENTAGE');
      expect(result.amount).toBe(175); // 70% de 250
      expect(result.rateApplied).toBe(70);
      expect(result.contractId).toBe('contract-1');
      expect(result.rateId).toBeNull();
    });

    it('deve aplicar percentual convênio do contrato quando isInsurance for true', () => {
      const result = computeRepasseFromRules({
        appointmentValue: 120,
        override: null,
        contract: {
          id: 'contract-1',
          clinic_id: 'clinic-1',
          doctor_id: 'doc-1',
          percentage_private: 70,
          percentage_insurance: 50,
          is_active: true,
        },
        isInsurance: true,
      });

      expect(result.source).toBe('CONTRACT_DEFAULT');
      expect(result.amount).toBe(60); // 50% de 120
      expect(result.rateApplied).toBe(50);
    });

    it('deve aplicar regra específica de convênio do contrato quando fornecida', () => {
      const result = computeRepasseFromRules({
        appointmentValue: 100,
        override: null,
        contract: {
          id: 'contract-1',
          clinic_id: 'clinic-1',
          doctor_id: 'doc-1',
          percentage_private: 70,
          percentage_insurance: 50,
          is_active: true,
        },
        isInsurance: true,
        insuranceRulePercentage: 80, // Regra específica prevalece sobre percentual padrão de convênio
      });

      expect(result.source).toBe('CONTRACT_DEFAULT');
      expect(result.amount).toBe(80);
      expect(result.rateApplied).toBe(80);
    });
  });

  // Cenário 3: OVERRIDE INATIVO (FALLBACK TRANSPARENTE)
  describe('Cenário 3: Override Inativo (Soft-Delete / Desativado)', () => {
    it('deve ignorar override se active = false e recorrer ao contrato padrão', () => {
      const result = computeRepasseFromRules({
        appointmentValue: 400,
        override: {
          id: 'override-inactive',
          clinic_id: 'clinic-1',
          doctor_id: 'doc-1',
          patient_id: 'pat-1',
          rate_type: 'FIXED',
          fixed_value: 350,
          percentage: null,
          active: false, // Inativo!
        },
        contract: {
          id: 'contract-1',
          clinic_id: 'clinic-1',
          doctor_id: 'doc-1',
          percentage_private: 50,
          is_active: true,
        },
      });

      expect(result.source).toBe('CONTRACT_DEFAULT');
      expect(result.amount).toBe(200); // 50% de 400
      expect(result.rateType).toBe('PERCENTAGE');
      expect(result.rateId).toBeNull();
      expect(result.contractId).toBe('contract-1');
    });
  });

  // Cenário 4: EMPATE DE TIPOS E VALIDAÇÃO DE CONSTRAINTS
  describe('Cenário 4: Empate de Tipos e Fallback sem Contrato', () => {
    it('deve recorrer ao fallback geral do médico caso não exista contrato nem override', () => {
      const result = computeRepasseFromRules({
        appointmentValue: 500,
        override: null,
        contract: null,
        doctorFallbackPercentage: 65,
      });

      expect(result.source).toBe('CONTRACT_DEFAULT');
      expect(result.amount).toBe(325); // 65% de 500
      expect(result.rateApplied).toBe(65);
      expect(result.rateId).toBeNull();
      expect(result.contractId).toBeNull();
    });

    it('deve usar 70% padrão se não houver percentual no perfil do médico', () => {
      const result = computeRepasseFromRules({
        appointmentValue: 100,
        override: null,
        contract: null,
      });

      expect(result.source).toBe('CONTRACT_DEFAULT');
      expect(result.amount).toBe(70);
      expect(result.rateApplied).toBe(70);
    });

    it('deve tratar contrato com valor fixo para convênio ou particular', () => {
      const result = computeRepasseFromRules({
        appointmentValue: 250,
        override: null,
        contract: {
          id: 'contract-fixed',
          clinic_id: 'clinic-1',
          doctor_id: 'doc-1',
          contract_type: 'FIXED_VALUE',
          fixed_value_private: 120,
          is_active: true,
        },
        isInsurance: false,
      });

      expect(result.source).toBe('CONTRACT_DEFAULT');
      expect(result.rateType).toBe('FIXED');
      expect(result.amount).toBe(120);
      expect(result.rateApplied).toBe(120);
    });
  });
});
