import { describe, it, expect } from '@jest/globals';

describe('Doctor Patient Rates - Bulk Import & Diff Logic', () => {
  // 1. Normalização de dados vindos da planilha Excel
  describe('Normalização de valores importados', () => {
    function parseRateFromCell(cellValue: string | number): {
      rate_type: 'FIXED' | 'PERCENTAGE';
      value: number;
    } | null {
      if (cellValue == null || cellValue === '') return null;

      const strVal = String(cellValue).trim();

      // Se contém % ou é indicado como percentual
      if (strVal.includes('%')) {
        const cleanNumber = parseFloat(strVal.replace('%', '').replace(',', '.').trim());
        if (isNaN(cleanNumber) || cleanNumber < 0 || cleanNumber > 100) return null;
        return { rate_type: 'PERCENTAGE', value: cleanNumber };
      }

      // Se contém R$ ou apenas número (fixo)
      const cleanFixed = parseFloat(
        strVal.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
      );

      if (isNaN(cleanFixed) || cleanFixed < 0) return null;

      // Se o usuário digitou ex: "80" sem R$, pode ser interpretado como valor ou percentual
      return { rate_type: 'FIXED', value: cleanFixed };
    }

    it('deve converter "80%" corretamente para tipo PERCENTAGE com valor 80', () => {
      const parsed = parseRateFromCell('80%');
      expect(parsed).toEqual({ rate_type: 'PERCENTAGE', value: 80 });
    });

    it('deve converter "R$ 150,50" corretamente para tipo FIXED com valor 150.5', () => {
      const parsed = parseRateFromCell('R$ 150,50');
      expect(parsed).toEqual({ rate_type: 'FIXED', value: 150.5 });
    });

    it('deve rejeitar valores inválidos como letras ou negativos', () => {
      expect(parseRateFromCell('invalido')).toBeNull();
      expect(parseRateFromCell('-50%')).toBeNull();
    });
  });

  // 2. Diff de importação prévia
  describe('Cálculo de Prévia (Diff) de Alterações em Lote', () => {
    function computeImportDiff(
      currentRates: Array<{ patient_id: string; rate_type: string; rate_value: number }>,
      newRates: Array<{ patient_id: string; rate_type: string; value: number }>
    ) {
      const currentMap = new Map<string, { rate_type: string; rate_value: number }>();
      currentRates.forEach((r) => currentMap.set(r.patient_id, r));

      const changes: Array<{
        patient_id: string;
        previous: { rate_type: string; rate_value: number } | null;
        next: { rate_type: string; value: number };
        isChanged: boolean;
      }> = [];

      newRates.forEach((item) => {
        const prev = currentMap.get(item.patient_id) || null;
        const isChanged =
          !prev || prev.rate_type !== item.rate_type || prev.rate_value !== item.value;

        changes.push({
          patient_id: item.patient_id,
          previous: prev,
          next: item,
          isChanged,
        });
      });

      return {
        totalItems: changes.length,
        changedCount: changes.filter((c) => c.isChanged).length,
        unchangedCount: changes.filter((c) => !c.isChanged).length,
        changes,
      };
    }

    it('deve detectar alterações de valor e itens inalterados', () => {
      const current = [
        { patient_id: 'p1', rate_type: 'PERCENTAGE', rate_value: 70 },
        { patient_id: 'p2', rate_type: 'FIXED', rate_value: 150 },
      ];

      const incoming = [
        { patient_id: 'p1', rate_type: 'PERCENTAGE', value: 80 }, // Mudou 70 -> 80
        { patient_id: 'p2', rate_type: 'FIXED', value: 150 }, // Igual
        { patient_id: 'p3', rate_type: 'FIXED', value: 200 }, // Novo
      ];

      const diff = computeImportDiff(current, incoming);

      expect(diff.totalItems).toBe(3);
      expect(diff.changedCount).toBe(2);
      expect(diff.unchangedCount).toBe(1);
    });
  });
});
