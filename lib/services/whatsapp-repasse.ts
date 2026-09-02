import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp/service';
import { computeRepasseFromRules } from '@/lib/services/repasse-calculator';

/**
 * Normaliza número de telefone brasileiro e retorna lista de variações
 * (com/sem 55, com/sem 9º dígito após DDD).
 */
export function generatePhoneVariations(rawPhone: string): string[] {
  if (!rawPhone) return [];
  const clean = rawPhone.replace(/\D/g, '');
  if (!clean) return [];

  const variations = new Set<string>();

  // Adiciona original limpo
  variations.add(clean);

  // Sem 55
  if (clean.startsWith('55') && clean.length >= 12) {
    const withoutCountry = clean.substring(2);
    variations.add(withoutCountry);

    // DDD + 9 dígitos -> DDD + 8 dígitos
    if (withoutCountry.length === 11 && withoutCountry[2] === '9') {
      const semNove = withoutCountry.substring(0, 2) + withoutCountry.substring(3);
      variations.add(semNove);
      variations.add(`55${semNove}`);
    }
  } else if (clean.length === 11 && clean[2] === '9') {
    // 11 dígitos com 9 -> com 55 e sem 9
    variations.add(`55${clean}`);
    const semNove = clean.substring(0, 2) + clean.substring(3);
    variations.add(semNove);
    variations.add(`55${semNove}`);
  } else if (clean.length === 10) {
    // 10 dígitos -> adiciona com 9 e com 55
    variations.add(`55${clean}`);
    const comNove = clean.substring(0, 2) + '9' + clean.substring(2);
    variations.add(comNove);
    variations.add(`55${comNove}`);
  }

  return Array.from(variations);
}

/**
 * Detecta se a mensagem é um comando solicitando extrato/repasse financeiro
 */
export function isRepasseExtractCommand(text: string): boolean {
  if (!text) return false;
  const normalized = text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const triggers = [
    'extrato',
    'extrato de repasse',
    'meu extrato',
    'repasse',
    'meu repasse',
    'ganhos',
    'meus ganhos',
    'quanto ja ganhei',
    'quanto ganhei',
    'saldo',
    'meu saldo',
    'producao',
    'minha producao',
    'comissao',
    'minha comissao',
  ];

  return triggers.some((trigger) => normalized === trigger || normalized.startsWith(`${trigger} `));
}

export interface DoctorExtractData {
  doctor_id: string;
  doctor_name: string;
  specialty: string;
  clinic_id: string;
  clinic_name: string;
  reference_month: string;
  period_label: string;
  completed_count: number;
  gross_revenue: number;
  net_repasse: number;
  private_count: number;
  private_gross: number;
  private_repasse: number;
  insurance_count: number;
  insurance_gross: number;
  insurance_repasse: number;
  rule_description: string;
  future_scheduled_count: number;
  projected_additional_repasse: number;
  total_projected_repasse: number;
}

/**
 * Autentica o profissional pelo número de WhatsApp e clínica
 */
export async function authenticateDoctorByPhone(
  clinicId: string,
  rawPhone: string
): Promise<{
  doctor: {
    id: string;
    user_id: string;
    crm: string;
    specialty: string;
    percentage: number;
    clinic_id: string;
    user: {
      full_name: string;
      email: string;
      phone: string;
    };
  } | null;
  clinic: {
    id: string;
    name: string;
    financial_cutoff_day?: number;
  } | null;
}> {
  const supabase = createServiceRoleClient();
  const phoneVariations = generatePhoneVariations(rawPhone);

  if (phoneVariations.length === 0) {
    return { doctor: null, clinic: null };
  }

  // 1. Busca dados da clínica
  const { data: clinic } = await supabase
    .from('clinics')
    .select('id, name, financial_cutoff_day')
    .eq('id', clinicId)
    .single();

  // 2. Busca usuário com role DOCTOR que coincida com o telefone
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, phone, role, clinic_id')
    .eq('clinic_id', clinicId)
    .eq('role', 'DOCTOR');

  const matchingUser = (users || []).find((u) => {
    if (!u.phone) return false;
    const uClean = u.phone.replace(/\D/g, '');
    const uVariations = generatePhoneVariations(uClean);
    return phoneVariations.some((v) => uVariations.includes(v));
  });

  if (!matchingUser) {
    return { doctor: null, clinic };
  }

  // 3. Busca o registro do médico
  const { data: doctor } = await supabase
    .from('doctors')
    .select('id, user_id, crm, specialty, percentage, clinic_id')
    .eq('user_id', matchingUser.id)
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .single();

  if (!doctor) {
    return { doctor: null, clinic };
  }

  return {
    doctor: {
      ...doctor,
      user: {
        full_name: matchingUser.full_name,
        email: matchingUser.email,
        phone: matchingUser.phone,
      },
    },
    clinic,
  };
}

/**
 * Calcula o extrato de repasse do profissional no mês vigente
 */
export async function calculateDoctorMonthlyExtract(
  clinicId: string,
  doctorId: string,
  referenceDate: Date = new Date()
): Promise<DoctorExtractData | null> {
  const supabase = createServiceRoleClient();

  // 1. Buscar médico e clínica
  const { data: doctor } = await supabase
    .from('doctors')
    .select(`
      id, crm, specialty, percentage, clinic_id,
      user:users(full_name),
      clinic:clinics(id, name, financial_cutoff_day)
    `)
    .eq('id', doctorId)
    .eq('clinic_id', clinicId)
    .single();

  if (!doctor) return null;

  const docUser = Array.isArray(doctor.user) ? doctor.user[0] : doctor.user;
  const clinicData = Array.isArray(doctor.clinic) ? doctor.clinic[0] : doctor.clinic;

  const doctorName = docUser?.full_name || 'Profissional';
  const clinicName = clinicData?.name || 'Clínica';
  const cutoffDay = clinicData?.financial_cutoff_day || 1;

  // 2. Determinar período do mês
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth(); // 0-indexed

  let periodStart: string;
  let periodEnd: string;
  let periodLabel: string;

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  if (cutoffDay === 1) {
    periodStart = new Date(year, month, 1).toISOString().split('T')[0];
    periodEnd = new Date(year, month + 1, 0).toISOString().split('T')[0];
    periodLabel = `${monthNames[month]} de ${year}`;
  } else {
    // Período com corte personalizado
    const startObj = new Date(year, month - 1, cutoffDay);
    const endObj = new Date(year, month, cutoffDay - 1);
    periodStart = startObj.toISOString().split('T')[0];
    periodEnd = endObj.toISOString().split('T')[0];
    periodLabel = `${cutoffDay}/${String(month).padStart(2, '0')} a ${cutoffDay - 1}/${String(month + 1).padStart(2, '0')}/${year}`;
  }

  // 3. Buscar contrato ativo
  const { data: contracts } = await (supabase
    .from('doctor_contracts') as any)
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('clinic_id', clinicId)
    .eq('is_active', true)
    .limit(1);

  const contract = (contracts as any)?.[0];

  // Buscar regras específicas de convênio caso existam
  let insuranceRulesMap: Record<string, number> = {};
  if (contract) {
    const { data: rules } = await (supabase
      .from('doctor_contract_insurance_rules') as any)
      .select('health_insurance_id, payment_type, percentage')
      .eq('doctor_contract_id', contract.id);

    if (rules) {
      (rules as any[]).forEach((r: any) => {
        const key = r.health_insurance_id ? `${r.health_insurance_id}` : `type_${r.payment_type}`;
        insuranceRulesMap[key] = r.percentage;
      });
    }
  }

  const defaultPercentage = contract?.percentage_private ?? (doctor as any).percentage ?? 70;
  const insurancePercentage = contract?.percentage_insurance ?? defaultPercentage;

  let ruleDescription = `${defaultPercentage}% Particular`;
  if (insurancePercentage !== defaultPercentage) {
    ruleDescription += ` / ${insurancePercentage}% Convênio`;
  }

  // 4. Buscar overrides por paciente ativos para este médico
  const { data: patientOverrides } = await (supabase
    .from('doctor_patient_rates') as any)
    .select('id, clinic_id, doctor_id, patient_id, rate_type, fixed_value, percentage, active')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .eq('active', true);

  const overrideMap = new Map<string, any>();
  (patientOverrides as any[] || []).forEach((ov: any) => {
    overrideMap.set(ov.patient_id, ov);
  });

  // 5. Buscar atendimentos concluídos no período
  const { data: completedApts } = await (supabase
    .from('appointments') as any)
    .select(`
      id, appointment_date, price, type, status,
      patient_id, repasse_amount, repasse_rate_applied, rate_source,
      health_insurance_id,
      health_insurance:health_insurances(id, name)
    `)
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .eq('status', 'COMPLETED')
    .gte('appointment_date', periodStart)
    .lte('appointment_date', periodEnd);

  let privateCount = 0;
  let privateGross = 0;
  let privateRepasse = 0;

  let insuranceCount = 0;
  let insuranceGross = 0;
  let insuranceRepasse = 0;

  (completedApts || []).forEach((apt) => {
    const price = Number(apt.price) || 0;
    const isInsurance = Boolean(apt.health_insurance_id || apt.type === 'convenio');

    let itemRepasse = 0;
    if (apt.repasse_amount != null && Number(apt.repasse_amount) >= 0) {
      itemRepasse = Number(apt.repasse_amount);
    } else {
      const override = apt.patient_id ? overrideMap.get(apt.patient_id) : null;
      const calcResult = computeRepasseFromRules({
        appointmentValue: price,
        override,
        contract,
        insuranceRulePercentage:
          apt.health_insurance_id && insuranceRulesMap[apt.health_insurance_id] !== undefined
            ? insuranceRulesMap[apt.health_insurance_id]
            : null,
        doctorFallbackPercentage: defaultPercentage,
        isInsurance,
      });
      itemRepasse = calcResult.amount;
    }

    if (isInsurance) {
      insuranceCount++;
      insuranceGross += price;
      insuranceRepasse += itemRepasse;
    } else {
      privateCount++;
      privateGross += price;
      privateRepasse += itemRepasse;
    }
  });

  const totalCompleted = privateCount + insuranceCount;
  const totalGross = privateGross + insuranceGross;
  const totalRepasse = privateRepasse + insuranceRepasse;

  // 5. Buscar agendamentos futuros no período para projeção
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: futureApts } = await supabase
    .from('appointments')
    .select('id, price, type, health_insurance_id')
    .eq('clinic_id', clinicId)
    .eq('doctor_id', doctorId)
    .in('status', ['SCHEDULED', 'CONFIRMED'])
    .gte('appointment_date', todayStr)
    .lte('appointment_date', periodEnd);

  let futureScheduledCount = 0;
  let projectedAdditionalRepasse = 0;

  (futureApts || []).forEach((apt) => {
    futureScheduledCount++;
    const price = Number(apt.price) || 0;
    const isInsurance = Boolean(apt.health_insurance_id || apt.type === 'convenio');
    const pct = isInsurance ? insurancePercentage : defaultPercentage;
    projectedAdditionalRepasse += price * (pct / 100);
  });

  return {
    doctor_id: doctorId,
    doctor_name: doctorName,
    specialty: doctor.specialty || 'Clínico',
    clinic_id: clinicId,
    clinic_name: clinicName,
    reference_month: periodStart.substring(0, 7),
    period_label: periodLabel,
    completed_count: totalCompleted,
    gross_revenue: totalGross,
    net_repasse: totalRepasse,
    private_count: privateCount,
    private_gross: privateGross,
    private_repasse: privateRepasse,
    insurance_count: insuranceCount,
    insurance_gross: insuranceGross,
    insurance_repasse: insuranceRepasse,
    rule_description: ruleDescription,
    future_scheduled_count: futureScheduledCount,
    projected_additional_repasse: projectedAdditionalRepasse,
    total_projected_repasse: totalRepasse + projectedAdditionalRepasse,
  };
}

/**
 * Formata mensagem rica para envio via WhatsApp
 */
export function formatRepasseWhatsAppMessage(data: DoctorExtractData): string {
  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return [
    `📊 *EXTRATO DE REPASSE — ${data.clinic_name.toUpperCase()}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Olá, *Dr(a). ${data.doctor_name}*! 👋`,
    ``,
    `📅 *Período de Referência:* ${data.period_label}`,
    `🩺 *Especialidade:* ${data.specialty}`,
    ``,
    `📈 *PRODUÇÃO CONCLUÍDA:*`,
    `• *Atendimentos Realizados:* ${data.completed_count} consulta(s)`,
    `  ↳ Particular: ${data.private_count} (${formatBRL(data.private_gross)})`,
    `  ↳ Convênio: ${data.insurance_count} (${formatBRL(data.insurance_gross)})`,
    `• *Faturamento Bruto Gerado:* ${formatBRL(data.gross_revenue)}`,
    `• *Regra de Repasse:* ${data.rule_description}`,
    `• *VALOR A RECEBER (ACUMULADO):* *${formatBRL(data.net_repasse)}*`,
    ``,
    `⏳ *PROJEÇÃO ATÉ O FIM DO MÊS:*`,
    `• *Consultas Agendadas:* ${data.future_scheduled_count} consulta(s)`,
    `• *Projeção Adicional:* + ${formatBRL(data.projected_additional_repasse)}`,
    `• *PROJEÇÃO TOTAL DO MÊS:* *${formatBRL(data.total_projected_repasse)}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `_Dados atualizados em tempo real pelo sistema CliniGo._`,
  ].join('\n');
}

/**
 * Mensagem de erro/segurança para remetente não autenticado
 */
export function formatUnauthorizedRepasseMessage(): string {
  return [
    `🔒 *CLINIGO — AUTENTICAÇÃO DE REPASSE*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `Olá! Identificamos sua solicitação de extrato de repasse.`,
    ``,
    `⚠️ *Acesso Não Autorizado:* Não localizamos um cadastro profissional ativo vinculado a este número de WhatsApp nesta clínica.`,
    ``,
    `Por motivos de LGPD e sigilo financeiro, os dados de comissão só são liberados para o número cadastrado no perfil do profissional.`,
    ``,
    `_Se você é membro da equipe, solicite à administração da clínica a atualização do seu telefone no sistema._`,
  ].join('\n');
}

/**
 * Processador central de mensagens WhatsApp para comandos de repasse
 */
export async function processIncomingWhatsAppRepasse(
  clinicId: string,
  senderJid: string,
  messageText: string,
  sector: string = 'default'
): Promise<{ handled: boolean; sent: boolean; message?: string }> {
  if (!isRepasseExtractCommand(messageText)) {
    return { handled: false, sent: false };
  }

  console.log(`[WhatsApp Repasse] 📩 Comando recebido de ${senderJid} na clínica ${clinicId}`);

  // Extrai número do sender
  const rawPhone = senderJid.split('@')[0];

  // 1. Autenticar profissional
  const { doctor, clinic } = await authenticateDoctorByPhone(clinicId, rawPhone);

  if (!doctor) {
    console.warn(`[WhatsApp Repasse] ❌ Telefone ${rawPhone} não autenticado para repasse na clínica ${clinicId}`);
    const unauthMessage = formatUnauthorizedRepasseMessage();
    try {
      await sendWhatsAppMessage(clinicId, rawPhone, unauthMessage, 'repasse-unauthorized', sector);
      return { handled: true, sent: true, message: unauthMessage };
    } catch (err: any) {
      console.error(`[WhatsApp Repasse] Erro ao enviar resposta não autorizada:`, err.message);
      return { handled: true, sent: false, message: unauthMessage };
    }
  }

  // 2. Calcular extrato
  const extractData = await calculateDoctorMonthlyExtract(clinicId, doctor.id);
  if (!extractData) {
    console.error(`[WhatsApp Repasse] Falha ao calcular extrato para doctor ${doctor.id}`);
    return { handled: true, sent: false };
  }

  // 3. Formatar e enviar
  const responseText = formatRepasseWhatsAppMessage(extractData);

  try {
    await sendWhatsAppMessage(clinicId, rawPhone, responseText, 'repasse-extract-response', sector);
    console.log(`[WhatsApp Repasse] ✅ Extrato entregue com sucesso para Dr(a). ${doctor.user.full_name} (${rawPhone})`);
    return { handled: true, sent: true, message: responseText };
  } catch (err: any) {
    console.error(`[WhatsApp Repasse] Erro ao enviar mensagem de extrato:`, err.message);
    return { handled: true, sent: false, message: responseText };
  }
}

/**
 * Dispara notificação via WhatsApp ao médico quando um valor customizado é cadastrado/alterado
 */
export async function sendDoctorPatientRateNotification(params: {
  clinicId: string;
  doctorId: string;
  patientName: string;
  rateType: 'FIXED' | 'PERCENTAGE';
  value: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient();

    // 1. Buscar dados do médico e clínica
    const { data: doctor } = await (supabase
      .from('doctors') as any)
      .select('id, user:users(full_name, phone), clinic:clinics(name)')
      .eq('id', params.doctorId)
      .eq('clinic_id', params.clinicId)
      .single();

    if (!doctor) {
      return { success: false, error: 'Médico não encontrado' };
    }

    const docUser = Array.isArray(doctor.user) ? doctor.user[0] : doctor.user;
    const clinic = Array.isArray(doctor.clinic) ? doctor.clinic[0] : doctor.clinic;

    if (!docUser?.phone) {
      return { success: false, error: 'Profissional não possui telefone cadastrado' };
    }

    const valueFormatted =
      params.rateType === 'FIXED'
        ? `R$ ${Number(params.value).toFixed(2).replace('.', ',')}`
        : `${params.value}%`;

    const message =
      `Olá, Dr(a). ${docUser.full_name}! 👋\n\n` +
      `Foi definido um novo valor de repasse personalizado para seus atendimentos:\n\n` +
      `👤 *Paciente:* ${params.patientName}\n` +
      `💰 *Novo Repasse:* ${valueFormatted}\n` +
      `🏥 *Clínica:* ${clinic?.name || 'CliniGo'}\n\n` +
      `Este valor será aplicado automaticamente nos seus próximos atendimentos deste paciente.`;

    await sendWhatsAppMessage(
      params.clinicId,
      docUser.phone,
      message,
      'doctor-patient-rate-notification',
      'default'
    );

    return { success: true };
  } catch (err: any) {
    console.error('[WhatsApp Repasse Notification] Erro ao notificar profissional:', err);
    return { success: false, error: err.message };
  }
}

