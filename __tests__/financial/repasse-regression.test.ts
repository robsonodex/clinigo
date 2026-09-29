import {
  computeRepasseFromRules,
  computeAdvancedRepasse,
  type DoctorContractRecord,
  type DoctorPatientRateOverride,
} from '@/lib/services/repasse-calculator';

// Lógica ANTERIOR de app/api/financial/production-summary/route.ts (commit HEAD~1)
function oldProductionSummaryCalculation({
  validAppointments,
  customRatesMap,
  contract,
  reimbursementMap,
  financialMap,
  defaultPrice,
}: {
  validAppointments: any[];
  customRatesMap: Map<string, any>;
  contract: any;
  reimbursementMap: Map<string, number>;
  financialMap: Map<string, number>;
  defaultPrice: number;
}) {
  const defaultContractPercentage = contract
    ? Number(contract.percentage || contract.percentage_private || 60)
    : 60;
  const defaultContractFixed = contract?.fixed_value_private
    ? Number(contract.fixed_value_private)
    : null;

  let totalGross = 0;
  let totalNetRepasse = 0;

  const items = validAppointments.map((appt: any) => {
    const patientId = appt.patient_id;

    let grossAmount = 0;
    if (financialMap.has(appt.id)) {
      grossAmount = financialMap.get(appt.id)!;
    } else if (reimbursementMap.has(patientId)) {
      grossAmount = reimbursementMap.get(patientId)!;
    } else {
      grossAmount = defaultPrice;
    }

    let repasseAmount = 0;
    let ruleDescription = '';

    const customRate = customRatesMap.get(patientId);

    if (customRate) {
      if (customRate.rate_type === 'FIXED' && customRate.fixed_value != null) {
        repasseAmount = Number(customRate.fixed_value);
        ruleDescription = `Taxa Específica por Paciente: R$ ${repasseAmount.toFixed(2)} (Fixo)`;
      } else if (customRate.rate_type === 'PERCENTAGE' && customRate.percentage != null) {
        const pct = Number(customRate.percentage);
        repasseAmount = (grossAmount * pct) / 100;
        ruleDescription = `Taxa Específica por Paciente: ${pct}%`;
      }
    } else if (defaultContractFixed != null && defaultContractFixed > 0) {
      repasseAmount = defaultContractFixed;
      ruleDescription = `Contrato Padrão: R$ ${repasseAmount.toFixed(2)} (Fixo)`;
    } else {
      repasseAmount = (grossAmount * defaultContractPercentage) / 100;
      ruleDescription = `Contrato Padrão: ${defaultContractPercentage}%`;
    }

    totalGross += grossAmount;
    totalNetRepasse += repasseAmount;

    return {
      appointment_id: appt.id,
      gross_amount: Number(grossAmount.toFixed(2)),
      repasse_amount: Number(repasseAmount.toFixed(2)),
      rule_description: ruleDescription,
    };
  });

  return {
    totalGross: Number(totalGross.toFixed(2)),
    totalNetRepasse: Number(totalNetRepasse.toFixed(2)),
    items,
  };
}

describe('T1: Teste de Regressão Estrita do Repasse (Old vs New)', () => {
  const defaultPrice = 120.0;

  // Conjunto de atendimentos sintéticos
  const syntheticAppointments = [
    {
      id: 'appt-1-override-fixed',
      patient_id: 'patient-fixed',
      payment_type: 'PARTICULAR',
      status: 'CONFIRMED',
      session_status: 'Presente',
      no_show: false,
    },
    {
      id: 'appt-2-override-pct',
      patient_id: 'patient-pct',
      payment_type: 'CONVENIO',
      health_insurance_id: 'ins-unimed',
      status: 'CONFIRMED',
      session_status: 'Presente',
      no_show: false,
    },
    {
      id: 'appt-3-contract-standard',
      patient_id: 'patient-standard',
      payment_type: 'CONVENIO',
      health_insurance_id: 'ins-bradesco',
      status: 'CONFIRMED',
      session_status: 'Presente',
      no_show: false,
    },
    {
      id: 'appt-4-cancelled',
      patient_id: 'patient-standard',
      payment_type: 'PARTICULAR',
      status: 'CANCELLED',
      session_status: 'Cancelado',
      no_show: false,
    },
    {
      id: 'appt-5-noshow',
      patient_id: 'patient-standard',
      payment_type: 'PARTICULAR',
      status: 'CONFIRMED',
      session_status: 'Falta',
      no_show: true,
    },
    {
      id: 'appt-6-financial-custom',
      patient_id: 'patient-standard',
      payment_type: 'PARTICULAR',
      status: 'CONFIRMED',
      session_status: 'Presente',
      no_show: false,
    },
  ];

  const validAppointments = syntheticAppointments.filter((appt) => {
    if (appt.no_show) return false;
    if (appt.session_status && appt.session_status !== 'Presente' && appt.session_status !== 'Reposição') {
      return false;
    }
    const st = (appt.status || '').toLowerCase();
    return !st.includes('cancel') && !st.includes('desmarcad') && !st.includes('falt');
  });

  const customRatesMap = new Map<string, any>([
    [
      'patient-fixed',
      {
        patient_id: 'patient-fixed',
        rate_type: 'FIXED',
        fixed_value: 85.0,
        percentage: null,
      },
    ],
    [
      'patient-pct',
      {
        patient_id: 'patient-pct',
        rate_type: 'PERCENTAGE',
        fixed_value: null,
        percentage: 65.0,
      },
    ],
  ]);

  const financialMap = new Map<string, number>([['appt-6-financial-custom', 250.0]]);
  const reimbursementMap = new Map<string, number>();

  describe('Cenário A: Médico com contrato geral clássico (percentage = 75%)', () => {
    const contract = {
      id: 'contract-1',
      percentage: 75,
      percentage_private: 75,
      percentage_insurance: null,
    };

    it('deve gerar exatamente os mesmos valores brutos e líquidos em todas as sessões', () => {
      // 1. Executa lógica antiga
      const oldResult = oldProductionSummaryCalculation({
        validAppointments,
        customRatesMap,
        contract,
        reimbursementMap,
        financialMap,
        defaultPrice,
      });

      // 2. Executa lógica nova no regime PRODUCAO + CLINICA_ABSORVE
      let newTotalGross = 0;
      let newTotalNetRepasse = 0;

      const newItems = validAppointments.map((appt) => {
        let grossAmount = 0;
        if (financialMap.has(appt.id)) {
          grossAmount = financialMap.get(appt.id)!;
        } else {
          grossAmount = defaultPrice;
        }

        const customRate = customRatesMap.get(appt.patient_id);
        const isInsurance = appt.payment_type === 'CONVENIO' || !!appt.health_insurance_id;

        const defaultContractPercentage = contract
          ? Number(contract.percentage || contract.percentage_private || 60)
          : 60;

        const repasseCalc = computeAdvancedRepasse({
          appointmentValue: grossAmount,
          override: customRate
            ? {
                id: 'ov-1',
                clinic_id: 'c1',
                doctor_id: 'd1',
                patient_id: appt.patient_id,
                rate_type: customRate.rate_type,
                fixed_value: customRate.fixed_value,
                percentage: customRate.percentage,
                active: true,
              }
            : null,
          contract: contract as any,
          doctorFallbackPercentage: defaultContractPercentage,
          isInsurance,
          regime: 'PRODUCAO',
          glosaPolicy: 'CLINICA_ABSORVE',
        });

        newTotalGross += grossAmount;
        newTotalNetRepasse += repasseCalc.amount;

        return {
          appointment_id: appt.id,
          gross_amount: Number(grossAmount.toFixed(2)),
          repasse_amount: Number(repasseCalc.amount.toFixed(2)),
        };
      });

      // 3. Comparações estritas centavo a centavo
      expect(newTotalGross).toBe(oldResult.totalGross);
      expect(newTotalNetRepasse).toBe(oldResult.totalNetRepasse);
      expect(newItems).toHaveLength(oldResult.items.length);

      for (let i = 0; i < oldResult.items.length; i++) {
        expect(newItems[i].appointment_id).toBe(oldResult.items[i].appointment_id);
        expect(newItems[i].gross_amount).toBe(oldResult.items[i].gross_amount);
        expect(newItems[i].repasse_amount).toBe(oldResult.items[i].repasse_amount);
      }
    });
  });

  describe('Cenário B: Médico sem nenhum contrato cadastrado (fallback padrão da clínica)', () => {
    const contract = null;

    it('deve reproduzir a mesma taxa padrão (60%) do production-summary anterior', () => {
      const oldResult = oldProductionSummaryCalculation({
        validAppointments,
        customRatesMap,
        contract,
        reimbursementMap,
        financialMap,
        defaultPrice,
      });

      let newTotalGross = 0;
      let newTotalNetRepasse = 0;

      const newItems = validAppointments.map((appt) => {
        let grossAmount = financialMap.has(appt.id) ? financialMap.get(appt.id)! : defaultPrice;
        const customRate = customRatesMap.get(appt.patient_id);
        const isInsurance = appt.payment_type === 'CONVENIO' || !!appt.health_insurance_id;

        const defaultContractPercentage = 60;

        const repasseCalc = computeAdvancedRepasse({
          appointmentValue: grossAmount,
          override: customRate
            ? {
                id: 'ov-1',
                clinic_id: 'c1',
                doctor_id: 'd1',
                patient_id: appt.patient_id,
                rate_type: customRate.rate_type,
                fixed_value: customRate.fixed_value,
                percentage: customRate.percentage,
                active: true,
              }
            : null,
          contract: null,
          doctorFallbackPercentage: defaultContractPercentage,
          isInsurance,
          regime: 'PRODUCAO',
          glosaPolicy: 'CLINICA_ABSORVE',
        });

        newTotalGross += grossAmount;
        newTotalNetRepasse += repasseCalc.amount;

        return {
          appointment_id: appt.id,
          gross_amount: Number(grossAmount.toFixed(2)),
          repasse_amount: Number(repasseCalc.amount.toFixed(2)),
        };
      });

      expect(newTotalGross).toBe(oldResult.totalGross);
      expect(newTotalNetRepasse).toBe(oldResult.totalNetRepasse);
      expect(newItems).toEqual(
        oldResult.items.map((it) => ({
          appointment_id: it.appointment_id,
          gross_amount: it.gross_amount,
          repasse_amount: it.repasse_amount,
        }))
      );
    });
  });
});
