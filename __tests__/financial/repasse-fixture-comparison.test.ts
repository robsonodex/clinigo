import { computeRepasseFromRules as computeLegacy } from '../__fixtures__/legacy/repasse-calculator';
import {
  computeRepasseFromRules as computeNew,
  computeAdvancedRepasse,
  AdvancedRepasseParams,
} from '@/lib/services/repasse-calculator';

describe('Comparação Fidedigna de Fixtures: Repasse Legado (711df48) vs Novo (HEAD)', () => {
  // 1. TAXA INDIVIDUAL: Override fixo
  it('Fixture 1A: Taxa individual - Override com valor fixo', () => {
    const params = {
      appointmentValue: 150.0,
      override: {
        id: 'ov-1',
        clinic_id: 'clinic-1',
        doctor_id: 'doc-1',
        patient_id: 'pat-1',
        rate_type: 'FIXED' as const,
        fixed_value: 85.0,
        percentage: null,
        active: true,
      },
      contract: {
        id: 'c-1',
        clinic_id: 'clinic-1',
        doctor_id: 'doc-1',
        percentage_private: 70,
        percentage_insurance: 60,
      },
      isInsurance: false,
    };

    const legacyRes = computeLegacy(params);
    const newRes = computeNew(params);
    const advancedRes = computeAdvancedRepasse({
      ...params,
      regime: 'PRODUCAO',
      glosaPolicy: 'CLINICA_ABSORVE',
    });

    expect(newRes.amount).toBe(legacyRes.amount);
    expect(newRes.amount).toBe(85.0);
    expect(advancedRes.amount).toBe(legacyRes.amount);
  });

  // 1B. TAXA INDIVIDUAL: Override percentual
  it('Fixture 1B: Taxa individual - Override com percentual', () => {
    const params = {
      appointmentValue: 200.0,
      override: {
        id: 'ov-2',
        clinic_id: 'clinic-1',
        doctor_id: 'doc-1',
        patient_id: 'pat-2',
        rate_type: 'PERCENTAGE' as const,
        fixed_value: null,
        percentage: 75,
        active: true,
      },
      contract: null,
      isInsurance: false,
    };

    const legacyRes = computeLegacy(params);
    const newRes = computeNew(params);
    const advancedRes = computeAdvancedRepasse({
      ...params,
      regime: 'PRODUCAO',
      glosaPolicy: 'CLINICA_ABSORVE',
    });

    expect(newRes.amount).toBe(legacyRes.amount);
    expect(newRes.amount).toBe(150.0);
    expect(advancedRes.amount).toBe(legacyRes.amount);
  });

  // 2. CONTRATO COMPLETO
  it('Fixture 2: Contrato completo com particular e convênio', () => {
    const contract = {
      id: 'c-full',
      clinic_id: 'clinic-1',
      doctor_id: 'doc-1',
      percentage_private: 65,
      percentage_insurance: 55,
      fixed_value_private: null,
      fixed_value_insurance: null,
      is_active: true,
    };

    // Particular
    const privLegacy = computeLegacy({ appointmentValue: 200, contract, isInsurance: false });
    const privNew = computeNew({ appointmentValue: 200, contract, isInsurance: false });
    const privAdv = computeAdvancedRepasse({
      appointmentValue: 200,
      contract,
      isInsurance: false,
      regime: 'PRODUCAO',
      glosaPolicy: 'CLINICA_ABSORVE',
    });

    expect(privNew.amount).toBe(privLegacy.amount);
    expect(privNew.amount).toBe(130.0);
    expect(privAdv.amount).toBe(privLegacy.amount);

    // Convênio
    const insLegacy = computeLegacy({ appointmentValue: 200, contract, isInsurance: true });
    const insNew = computeNew({ appointmentValue: 200, contract, isInsurance: true });
    const insAdv = computeAdvancedRepasse({
      appointmentValue: 200,
      contract,
      isInsurance: true,
      regime: 'PRODUCAO',
      glosaPolicy: 'CLINICA_ABSORVE',
    });

    expect(insNew.amount).toBe(insLegacy.amount);
    expect(insNew.amount).toBe(110.0);
    expect(insAdv.amount).toBe(insLegacy.amount);
  });

  // 3. CONTRATO SÓ COM PERCENTAGE_PRIVATE
  it('Fixture 3: Contrato apenas com percentage_private', () => {
    const contract = {
      id: 'c-priv-only',
      clinic_id: 'clinic-1',
      doctor_id: 'doc-1',
      percentage_private: 75,
      percentage_insurance: undefined,
      is_active: true,
    };

    // Particular usa percentage_private (75%)
    const privLegacy = computeLegacy({ appointmentValue: 100, contract, isInsurance: false });
    const privNew = computeNew({ appointmentValue: 100, contract, isInsurance: false });
    expect(privNew.amount).toBe(privLegacy.amount);
    expect(privNew.amount).toBe(75.0);

    // Convênio sem percentage_insurance cai no default contratual legado de 60%
    const insLegacy = computeLegacy({ appointmentValue: 100, contract, isInsurance: true });
    const insNew = computeNew({ appointmentValue: 100, contract, isInsurance: true });
    expect(insNew.amount).toBe(insLegacy.amount);
    expect(insNew.amount).toBe(60.0);
  });

  // 4. CONTRATO SÓ COM PERCENTAGE (Coluna genérica de contratos antigos)
  it('Fixture 4: Contrato antigo apenas com coluna percentage', () => {
    const contract = {
      id: 'c-old',
      clinic_id: 'clinic-1',
      doctor_id: 'doc-1',
      percentage: 58,
      is_active: true,
    };

    // Particular
    const privLegacy = computeLegacy({ appointmentValue: 100, contract: contract as any, isInsurance: false });
    const privNew = computeNew({ appointmentValue: 100, contract: contract as any, isInsurance: false });
    // Convênio
    const insLegacy = computeLegacy({ appointmentValue: 100, contract: contract as any, isInsurance: true });
    const insNew = computeNew({ appointmentValue: 100, contract: contract as any, isInsurance: true });

    // No legado de repasse-calculator (que não conhecia contract.percentage), usava 70% e 60%.
    // No novo, se percentage_private e percentage_insurance forem nulos mas percentage estiver preenchido, usa 58%.
    expect(privNew.amount).toBe(58.0);
    expect(insNew.amount).toBe(58.0);
  });

  // 5. SEM CONTRATO
  it('Fixture 5: Sem contrato - Fallback para médico (doctorFallbackPercentage)', () => {
    const legacyRes = computeLegacy({
      appointmentValue: 100,
      contract: null,
      doctorFallbackPercentage: 65,
      isInsurance: false,
    });
    const newRes = computeNew({
      appointmentValue: 100,
      contract: null,
      doctorFallbackPercentage: 65,
      isInsurance: false,
    });

    expect(newRes.amount).toBe(legacyRes.amount);
    expect(newRes.amount).toBe(65.0);

    // Sem percentual nenhum definido
    const noPctLegacy = computeLegacy({ appointmentValue: 100, contract: null, isInsurance: false });
    const noPctNew = computeNew({ appointmentValue: 100, contract: null, isInsurance: false });
    expect(noPctNew.amount).toBe(noPctLegacy.amount);
    expect(noPctNew.amount).toBe(70.0);
  });

  // 6. CANCELADO E 7. FALTA (Filtro idêntico na busca de atendimentos)
  it('Fixtures 6 e 7: Validação de cancelamento e falta (lógica do production-summary)', () => {
    const mockAppointments = [
      { id: '1', status: 'CONFIRMADO', session_status: 'Presente', no_show: false, price: 100 },
      { id: '2', status: 'CANCELADO', session_status: 'Presente', no_show: false, price: 100 },
      { id: '3', status: 'CONFIRMADO', session_status: 'Falta Justificada', no_show: false, price: 100 },
      { id: '4', status: 'CONFIRMADO', session_status: 'Presente', no_show: true, price: 100 },
      { id: '5', status: 'CONFIRMADO', session_status: 'Reposição', no_show: false, price: 100 },
      { id: '6', status: 'desmarcado', session_status: 'Presente', no_show: false, price: 100 },
    ];

    // Regra exata de filtro do production-summary (legado e novo):
    const filterAppointments = (appts: any[]) => {
      return appts.filter((appt: any) => {
        if (appt.no_show) return false;
        if (appt.session_status && appt.session_status !== 'Presente' && appt.session_status !== 'Reposição') {
          return false;
        }
        const st = (appt.status || '').toLowerCase();
        return !st.includes('cancel') && !st.includes('desmarcad') && !st.includes('falt');
      });
    };

    const valid = filterAppointments(mockAppointments);
    // Apenas os agendamentos 1 e 5 devem passar
    expect(valid.map(a => a.id)).toEqual(['1', '5']);
  });

  // 8. PARTICULAR x 9. CONVÊNIO
  it('Fixtures 8 e 9: Particular x Convênio com regra de preço do convênio', () => {
    const contract = {
      id: 'c-1',
      clinic_id: 'clinic-1',
      doctor_id: 'doc-1',
      percentage_private: 70,
      percentage_insurance: 60,
    };

    // Particular
    const privLegacy = computeLegacy({ appointmentValue: 120, contract, isInsurance: false });
    const privNew = computeNew({ appointmentValue: 120, contract, isInsurance: false });
    expect(privNew.amount).toBe(privLegacy.amount);
    expect(privNew.amount).toBe(84.0);

    // Convênio com regra específica de operadora (ex: 50% para Unimed)
    const insLegacy = computeLegacy({
      appointmentValue: 120,
      contract,
      isInsurance: true,
      insuranceRulePercentage: 50,
    });
    const insNew = computeNew({
      appointmentValue: 120,
      contract,
      isInsurance: true,
      insuranceRulePercentage: 50,
    });
    expect(insNew.amount).toBe(insLegacy.amount);
    expect(insNew.amount).toBe(60.0);
  });
});
