import { createServiceRoleClient } from '@/lib/supabase/server';

export type RateType = 'FIXED' | 'PERCENTAGE';
export type RateSource = 'PATIENT_OVERRIDE' | 'CONTRACT_DEFAULT';

export interface DoctorPatientRateOverride {
  id: string;
  clinic_id: string;
  doctor_id: string;
  patient_id: string;
  rate_type: RateType;
  fixed_value: number | null;
  percentage: number | null;
  active: boolean;
  notes?: string | null;
}

export interface DoctorContractRecord {
  id: string;
  clinic_id: string;
  doctor_id: string;
  contract_type?: string;
  percentage_private?: number;
  percentage_insurance?: number;
  fixed_value_private?: number | null;
  fixed_value_insurance?: number | null;
  is_active?: boolean;
}

export interface ResolveRepasseParams {
  clinicId: string;
  doctorId: string;
  patientId: string;
  appointmentValue: number;
  isInsurance?: boolean;
  healthInsuranceId?: string | null;
  supabaseClient?: any;
}

export interface RepasseCalculationResult {
  amount: number;
  rateType: RateType;
  rateApplied: number;
  source: RateSource;
  rateId: string | null;
  contractId: string | null;
  grossPrice: number;
}

/**
 * Função pura de cálculo do repasse a partir do override ou contrato já carregados.
 * Útil para testes unitários isolados e performance.
 */
export function computeRepasseFromRules(params: {
  appointmentValue: number;
  override?: DoctorPatientRateOverride | null;
  contract?: DoctorContractRecord | null;
  insuranceRulePercentage?: number | null;
  doctorFallbackPercentage?: number;
  isInsurance?: boolean;
}): RepasseCalculationResult {
  const grossPrice = Number(params.appointmentValue) || 0;

  // 1. PRIORIDADE MÁXIMA: Override individual por paciente ativo
  if (params.override && params.override.active) {
    if (params.override.rate_type === 'FIXED') {
      const fixedVal = Number(params.override.fixed_value) || 0;
      return {
        amount: Number(fixedVal.toFixed(2)),
        rateType: 'FIXED',
        rateApplied: fixedVal,
        source: 'PATIENT_OVERRIDE',
        rateId: params.override.id || null,
        contractId: null,
        grossPrice,
      };
    }

    if (params.override.rate_type === 'PERCENTAGE') {
      const pct = Number(params.override.percentage) || 0;
      const amount = Number(((grossPrice * pct) / 100).toFixed(2));
      return {
        amount,
        rateType: 'PERCENTAGE',
        rateApplied: pct,
        source: 'PATIENT_OVERRIDE',
        rateId: params.override.id || null,
        contractId: null,
        grossPrice,
      };
    }
  }

  // 2. FALLBACK: Contrato geral do profissional
  if (params.contract) {
    const isFixedContract =
      params.contract.contract_type === 'FIXED_VALUE' ||
      (params.isInsurance && params.contract.fixed_value_insurance != null) ||
      (!params.isInsurance && params.contract.fixed_value_private != null);

    if (isFixedContract) {
      const fixedVal = params.isInsurance
        ? Number(params.contract.fixed_value_insurance || 0)
        : Number(params.contract.fixed_value_private || 0);

      if (fixedVal > 0) {
        return {
          amount: Number(fixedVal.toFixed(2)),
          rateType: 'FIXED',
          rateApplied: fixedVal,
          source: 'CONTRACT_DEFAULT',
          rateId: null,
          contractId: params.contract.id,
          grossPrice,
        };
      }
    }

    // Cálculo percentual do contrato
    let appliedRate = params.isInsurance
      ? Number(params.contract.percentage_insurance ?? 60)
      : Number(params.contract.percentage_private ?? 70);

    // Regra específica para o convênio cadastrado
    if (
      params.isInsurance &&
      params.insuranceRulePercentage !== undefined &&
      params.insuranceRulePercentage !== null
    ) {
      appliedRate = Number(params.insuranceRulePercentage);
    }

    const amount = Number(((grossPrice * appliedRate) / 100).toFixed(2));
    return {
      amount,
      rateType: 'PERCENTAGE',
      rateApplied: appliedRate,
      source: 'CONTRACT_DEFAULT',
      rateId: null,
      contractId: params.contract.id,
      grossPrice,
    };
  }

  // 3. FALLBACK FINAL: Percentual padrão do médico na tabela doctors ou 70%
  const fallbackPct = Number(params.doctorFallbackPercentage) || 70;
  const amount = Number(((grossPrice * fallbackPct) / 100).toFixed(2));
  return {
    amount,
    rateType: 'PERCENTAGE',
    rateApplied: fallbackPct,
    source: 'CONTRACT_DEFAULT',
    rateId: null,
    contractId: null,
    grossPrice,
  };
}

/**
 * Resolve o repasse do profissional consultando o banco de dados.
 * Consulta primeiro `doctor_patient_rates` (override). Caso não encontre,
 * busca `doctor_contracts` e as regras de convênio.
 */
export async function resolveDoctorRepasseValue(
  params: ResolveRepasseParams
): Promise<RepasseCalculationResult> {
  const supabase = params.supabaseClient || createServiceRoleClient();
  const { clinicId, doctorId, patientId, appointmentValue } = params;

  // 1. Busca override ativo para o par (doctorId, patientId)
  const { data: override, error: overrideError } = await supabase
    .from('doctor_patient_rates')
    .select('id, clinic_id, doctor_id, patient_id, rate_type, fixed_value, percentage, active, notes')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .eq('patient_id', patientId)
    .eq('active', true)
    .maybeSingle();

  if (overrideError) {
    console.error('[RepasseCalculator] Erro ao buscar doctor_patient_rates:', overrideError);
  }

  if (override && override.active) {
    return computeRepasseFromRules({
      appointmentValue,
      override,
    });
  }

  // 2. Busca contrato ativo do médico
  const { data: contracts, error: contractError } = await supabase
    .from('doctor_contracts')
    .select('*')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .eq('is_active', true)
    .limit(1);

  if (contractError) {
    console.error('[RepasseCalculator] Erro ao buscar doctor_contracts:', contractError);
  }

  const contract = contracts?.[0] || null;

  // 3. Se houver regra de convênio específica
  let insuranceRulePercentage: number | null = null;
  if (contract && params.isInsurance && params.healthInsuranceId) {
    const { data: rule } = await supabase
      .from('doctor_contract_insurance_rules')
      .select('percentage')
      .eq('contract_id', contract.id)
      .eq('insurance_id', params.healthInsuranceId)
      .maybeSingle();

    if (rule?.percentage !== undefined && rule.percentage !== null) {
      insuranceRulePercentage = Number(rule.percentage);
    }
  }

  // 4. Se não houver contrato, busca percentual do médico na tabela doctors
  let doctorFallbackPercentage = 70;
  if (!contract) {
    const { data: doctor } = await supabase
      .from('doctors')
      .select('percentage')
      .eq('id', doctorId)
      .maybeSingle();

    if (doctor?.percentage != null) {
      doctorFallbackPercentage = Number(doctor.percentage);
    }
  }

  return computeRepasseFromRules({
    appointmentValue,
    contract,
    insuranceRulePercentage,
    doctorFallbackPercentage,
    isInsurance: params.isInsurance,
  });
}
