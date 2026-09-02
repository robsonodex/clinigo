import { describe, it, expect } from '@jest/globals';

describe('Doctor Patient Rates - Validações e Regras de Negócio', () => {
  // 1. Validação de regras de negócio para Fixed vs Percentage
  describe('Validações de tipos e constraints', () => {
    function validateRatePayload(data: {
      rate_type: string;
      fixed_value?: number | null;
      percentage?: number | null;
    }): { valid: boolean; error?: string } {
      if (!['FIXED', 'PERCENTAGE'].includes(data.rate_type)) {
        return { valid: false, error: 'Tipo inválido' };
      }

      if (data.rate_type === 'FIXED') {
        if (data.fixed_value == null || data.fixed_value < 0) {
          return { valid: false, error: 'fixed_value deve ser maior ou igual a 0' };
        }
        if (data.percentage != null) {
          return { valid: false, error: 'percentage deve ser nulo para FIXED' };
        }
      }

      if (data.rate_type === 'PERCENTAGE') {
        if (data.percentage == null || data.percentage < 0 || data.percentage > 100) {
          return { valid: false, error: 'percentage deve estar entre 0 e 100' };
        }
        if (data.fixed_value != null) {
          return { valid: false, error: 'fixed_value deve ser nulo para PERCENTAGE' };
        }
      }

      return { valid: true };
    }

    it('deve aceitar payload FIXED válido com fixed_value e sem percentage', () => {
      const res = validateRatePayload({
        rate_type: 'FIXED',
        fixed_value: 150.0,
        percentage: null,
      });
      expect(res.valid).toBe(true);
    });

    it('deve rejeitar FIXED com percentage preenchido', () => {
      const res = validateRatePayload({
        rate_type: 'FIXED',
        fixed_value: 150.0,
        percentage: 50,
      });
      expect(res.valid).toBe(false);
    });

    it('deve aceitar payload PERCENTAGE válido entre 0 e 100', () => {
      const res = validateRatePayload({
        rate_type: 'PERCENTAGE',
        fixed_value: null,
        percentage: 75.5,
      });
      expect(res.valid).toBe(true);
    });

    it('deve rejeitar PERCENTAGE maior que 100', () => {
      const res = validateRatePayload({
        rate_type: 'PERCENTAGE',
        fixed_value: null,
        percentage: 105,
      });
      expect(res.valid).toBe(false);
    });
  });

  // 2. Estatísticas Agregadas
  describe('Cálculo de Estatísticas na Listagem', () => {
    function computeAggregates(
      patients: Array<{
        patient_name: string;
        has_override: boolean;
        rate_value: number;
        rate_type: string;
      }>
    ) {
      const total = patients.length;
      const customCount = patients.filter((p) => p.has_override).length;
      const defaultCount = total - customCount;
      const sum = patients.reduce((acc, p) => acc + p.rate_value, 0);
      const avg = total > 0 ? Number((sum / total).toFixed(2)) : 0;

      let max = patients[0] || null;
      let min = patients[0] || null;

      patients.forEach((p) => {
        if (p.rate_value > max.rate_value) max = p;
        if (p.rate_value < min.rate_value) min = p;
      });

      return {
        total,
        customCount,
        defaultCount,
        averageRate: avg,
        max,
        min,
      };
    }

    it('deve calcular corretamente a média e os extremos da lista de pacientes', () => {
      const mockList = [
        { patient_name: 'Ana', has_override: true, rate_value: 150, rate_type: 'FIXED' },
        { patient_name: 'Bruno', has_override: false, rate_value: 70, rate_type: 'PERCENTAGE' },
        { patient_name: 'Carlos', has_override: true, rate_value: 200, rate_type: 'FIXED' },
        { patient_name: 'Daniela', has_override: false, rate_value: 70, rate_type: 'PERCENTAGE' },
      ];

      const stats = computeAggregates(mockList);

      expect(stats.total).toBe(4);
      expect(stats.customCount).toBe(2);
      expect(stats.defaultCount).toBe(2);
      expect(stats.averageRate).toBe(122.5); // (150 + 70 + 200 + 70) / 4 = 122.5
      expect(stats.max?.patient_name).toBe('Carlos');
      expect(stats.min?.patient_name).toBe('Bruno');
    });
  });
});
