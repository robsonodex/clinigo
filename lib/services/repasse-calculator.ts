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
  percentage?: number;
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

export type RepasseRegime = 'PRODUCAO' | 'RECEBIMENTO';
export type GlosaPolicy = 'CLINICA_ABSORVE' | 'DESCONTA_PROFISSIONAL' | 'DESCONTA_SE_MANTIDA';

export interface GuideBillingInfo {
  guideStatus?: string; // 'DRAFT', 'SENT', 'APPROVED', 'PARTIAL', 'DENIED', etc.
  guideTotalValue?: number;
  guidePaidValue?: number;
  glosaValue?: number;
  glosaMaintained?: boolean;
}

export interface AdvancedRepasseParams {
  appointmentValue: number;
  override?: DoctorPatientRateOverride | null;
  contract?: DoctorContractRecord | null;
  insuranceRulePercentage?: number | null;
  doctorFallbackPercentage?: number;
  isInsurance?: boolean;
  regime?: RepasseRegime;
  glosaPolicy?: GlosaPolicy;
  guideInfo?: GuideBillingInfo | null;
}

export interface AdvancedRepasseResult extends RepasseCalculationResult {
  regime: RepasseRegime;
  glosaPolicy: GlosaPolicy;
  isEligibleForPayment: boolean;
  ineligibleReason?: string;
  originalRepasseAmount: number;
  discountAmount: number;
  discountReason?: string;
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

    // Cálculo percentual do contrato com herança de fallback (retrocompatibilidade estrita)
    const baseContractPct =
      params.contract.percentage ??
      params.contract.percentage_private ??
      params.doctorFallbackPercentage ??
      60;

    let appliedRate: number;
    if (params.isInsurance) {
      // Regra específica para o convênio cadastrado
      if (
        params.insuranceRulePercentage !== undefined &&
        params.insuranceRulePercentage !== null
      ) {
        appliedRate = Number(params.insuranceRulePercentage);
      } else if (params.contract.percentage_insurance != null) {
        appliedRate = Number(params.contract.percentage_insurance);
      } else {
        appliedRate = Number(baseContractPct);
      }
    } else {
      appliedRate = Number(
        params.contract.percentage_private ??
        params.contract.percentage ??
        params.doctorFallbackPercentage ??
        70
      );
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

  // 3. FALLBACK FINAL: Percentual informado pelo caller (ex: production-summary) ou fallback padrão (70% particular, 60% convênio)
  const defaultFallback = params.isInsurance ? 60 : 70;
  const fallbackPct = params.doctorFallbackPercentage != null
    ? Number(params.doctorFallbackPercentage)
    : defaultFallback;
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
 * Cálculo avançado de repasse considerando Regime de Recebimento x Produção e Políticas de Glosa.
 * Mantém sigilo médico: não expõe operadora, plano ou carteirinha.
 */
export function computeAdvancedRepasse(params: AdvancedRepasseParams): AdvancedRepasseResult {
  const baseResult = computeRepasseFromRules(params);
  const regime: RepasseRegime = params.regime || 'PRODUCAO';
  const glosaPolicy: GlosaPolicy = params.glosaPolicy || 'CLINICA_ABSORVE';
  const originalRepasseAmount = baseResult.amount;

  // Atendimentos particulares seguem 100% o fluxo padrão de produção
  if (!params.isInsurance) {
    return {
      ...baseResult,
      regime,
      glosaPolicy,
      isEligibleForPayment: true,
      originalRepasseAmount,
      discountAmount: 0,
    };
  }

  const guideInfo = params.guideInfo;
  let isEligibleForPayment = true;
  let ineligibleReason: string | undefined;
  let finalAmount = originalRepasseAmount;
  let discountAmount = 0;
  let discountReason: string | undefined;

  // REGIME RECEBIMENTO: Só repassa se a operadora tiver pago a guia
  if (regime === 'RECEBIMENTO') {
    const isPaid = guideInfo?.guideStatus === 'APPROVED' || (guideInfo?.guidePaidValue ?? 0) > 0;

    if (!isPaid) {
      isEligibleForPayment = false;
      ineligibleReason = 'Aguardando liquidação e pagamento da guia pela operadora de saúde';
      finalAmount = 0;
      discountAmount = originalRepasseAmount;
      discountReason = 'Repasse retido aguardando liquidação da operadora';
    } else {
      // Guia paga parcial ou integralmente
      const guideTotal = Number(guideInfo?.guideTotalValue) || Number(params.appointmentValue) || 1;
      const guidePaid = Number(guideInfo?.guidePaidValue) || 0;

      if (guidePaid < guideTotal && guideTotal > 0) {
        if (glosaPolicy === 'CLINICA_ABSORVE') {
          finalAmount = originalRepasseAmount;
          discountAmount = 0;
        } else {
          // DESCONTA_PROFISSIONAL ou DESCONTA_SE_MANTIDA
          const paidRatio = Math.min(1, Math.max(0, guidePaid / guideTotal));
          finalAmount = Number((originalRepasseAmount * paidRatio).toFixed(2));
          discountAmount = Number((originalRepasseAmount - finalAmount).toFixed(2));
          discountReason = 'Desconto proporcional de glosa aplicada pela operadora';
        }
      }
    }
  } else {
    // REGIME PRODUÇÃO: Paga sobre o atendimento realizado, aplicando política de glosa se configurado
    if (glosaPolicy === 'DESCONTA_PROFISSIONAL' && (guideInfo?.glosaValue ?? 0) > 0) {
      const glosaVal = Number(guideInfo?.glosaValue) || 0;
      const grossVal = Number(params.appointmentValue) || 1;
      let calculatedDiscount = 0;

      if (baseResult.rateType === 'PERCENTAGE') {
        calculatedDiscount = (glosaVal * baseResult.rateApplied) / 100;
      } else {
        const ratio = Math.min(1, glosaVal / grossVal);
        calculatedDiscount = originalRepasseAmount * ratio;
      }

      discountAmount = Number(calculatedDiscount.toFixed(2));
      finalAmount = Math.max(0, Number((originalRepasseAmount - discountAmount).toFixed(2)));
      discountReason = 'Estorno de glosa da operadora';
    } else if (glosaPolicy === 'DESCONTA_SE_MANTIDA' && guideInfo?.glosaMaintained && (guideInfo?.glosaValue ?? 0) > 0) {
      const glosaVal = Number(guideInfo?.glosaValue) || 0;
      const grossVal = Number(params.appointmentValue) || 1;
      let calculatedDiscount = 0;

      if (baseResult.rateType === 'PERCENTAGE') {
        calculatedDiscount = (glosaVal * baseResult.rateApplied) / 100;
      } else {
        const ratio = Math.min(1, glosaVal / grossVal);
        calculatedDiscount = originalRepasseAmount * ratio;
      }

      discountAmount = Number(calculatedDiscount.toFixed(2));
      finalAmount = Math.max(0, Number((originalRepasseAmount - discountAmount).toFixed(2)));
      discountReason = 'Estorno de glosa mantida após recurso da operadora';
    }
  }

  return {
    ...baseResult,
    amount: finalAmount,
    regime,
    glosaPolicy,
    isEligibleForPayment,
    ineligibleReason,
    originalRepasseAmount,
    discountAmount,
    discountReason,
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
