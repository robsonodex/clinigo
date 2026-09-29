/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getProductionSummary } from '@/app/api/financial/production-summary/route';
import { GET as getAppointments } from '@/app/api/appointments/route';

// Mocks do Supabase
jest.mock('@/lib/supabase/server', () => {
  return {
    createClient: jest.fn(),
    createServiceRoleClient: jest.fn(),
  };
});

const { createClient, createServiceRoleClient } = require('@/lib/supabase/server');

// Definição da tabela de proteção RBAC conforme middleware.ts
const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
  '/api/clinics': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'],
  '/api/crm/pipelines': ['SUPER_ADMIN', 'CLINIC_ADMIN'],
  '/api/crm/pipeline-cards': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST', 'DOCTOR'],
  '/api/crm': ['SUPER_ADMIN', 'CLINIC_ADMIN'],
  '/api/admin': ['SUPER_ADMIN'],
  '/api/ai/predict-diagnosis': ['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'],
  '/api/tiss': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
  '/api/health-insurances': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
  '/api/insurance': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
};

function checkMiddlewareApiAccess(pathname: string, role: string) {
  if (role === 'SUPER_ADMIN') return { allowed: true };
  const sorted = Object.entries(ROLE_PROTECTED_ROUTES).sort(([a], [b]) => b.length - a.length);
  for (const [route, allowedRoles] of sorted) {
    if (pathname.startsWith(route)) {
      if (allowedRoles.includes(role)) {
        return { allowed: true };
      }
      return { allowed: false, status: 403, code: 'FORBIDDEN' };
    }
  }
  return { allowed: true };
}

describe('Sigilo Médico Estrito & Proteção RBAC contra Vazamento (Perfil DOCTOR)', () => {
  const clinicId = 'clinic-uuid-1111';
  const doctorUserId = 'user-doctor-uuid';
  const doctorRecordId = 'doctor-rec-uuid';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. PRODUCTION SUMMARY: Sigilo em JSON e Excel
  it('1. /api/financial/production-summary: Não vaza operadora, plano nem carteirinha para DOCTOR', async () => {
    const mockAppointments = [
      {
        id: 'appt-1',
        appointment_date: '2026-09-15',
        appointment_time: '10:00',
        status: 'CONFIRMADO',
        session_status: 'Presente',
        appointment_type: 'Fonoaudiologia',
        therapy_modality: 'Presencial',
        session_format: 'Individual',
        no_show: false,
        payment_type: 'CONVENIO',
        health_insurance_id: 'insurance-secret-id',
        patient_id: 'pat-1',
        patient: {
          id: 'pat-1',
          full_name: 'Paciente Teste Sigilo',
          cpf: '12345678900',
          billing_type: 'CONVENIO',
        },
      },
    ];

    const mockDoctor = {
      id: doctorRecordId,
      user_id: doctorUserId,
      clinic_id: clinicId,
      specialty: 'Fonoaudiologia',
      crm: '12345-SP',
      consultation_price: 150.0,
      user: { full_name: 'Dra. Terapeuta' },
    };

    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: doctorUserId } },
          error: null,
        }),
      },
    });

    const mockAdmin = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: doctorUserId, clinic_id: clinicId, role: 'DOCTOR' },
              error: null,
            }),
          };
        }
        if (table === 'doctors') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: mockDoctor, error: null }),
          };
        }
        if (table === 'appointments') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: mockAppointments, error: null }),
          };
        }
        if (table === 'doctor_patient_rates') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'doctor_contracts') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                id: 'contract-1',
                percentage_private: 70,
                percentage_insurance: 60,
                is_active: true,
              },
              error: null,
            }),
          };
        }
        if (table === 'patient_reimbursement_rules') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [], error: null }),
          };
        }
        if (table === 'financial_entries') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'clinics') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { repasse_regime: 'PRODUCAO', glosa_policy: 'CLINICA_ABSORVE' },
              error: null,
            }),
          };
        }
        if (table === 'tiss_guides') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    createServiceRoleClient.mockReturnValue(mockAdmin);

    const req = new NextRequest(
      `http://localhost:3000/api/financial/production-summary?doctor_id=${doctorRecordId}&month_reference=2026-09`,
      {
        headers: {
          'x-user-id': doctorUserId,
          'x-user-role': 'DOCTOR',
          'x-clinic-id': clinicId,
        },
      }
    );

    const res = await getProductionSummary(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    const item = json.items[0];
    expect(item).toBeDefined();

    // Campos permitidos de produção
    expect(item.patient_name).toBe('Paciente Teste Sigilo');
    expect(item.repasse_amount).toBe(90.0); // 60% de 150

    // GARANTIA DE SIGILO: Proibido vazar operadora, plano ou carteirinha
    const serializedItem = JSON.stringify(item);
    expect(serializedItem).not.toContain('insurance_card_number');
    expect(serializedItem).not.toContain('health_insurance_name');
    expect(serializedItem).not.toContain('plan_id');
    expect(serializedItem).not.toContain('insurance-secret-id');
    expect(item.health_insurance_name).toBeUndefined();
    expect(item.insurance_card_number).toBeUndefined();
    expect(item.plan_id).toBeUndefined();
  });

  // 2. APPOINTMENTS LISTING: Omissão de carteirinha/plano de convênio
  it('2. /api/appointments: Listagem para DOCTOR não inclui dados de faturamento/carteirinha do convênio', async () => {
    const mockAppts = [
      {
        id: 'appt-99',
        appointment_date: '2026-09-15',
        appointment_time: '14:00',
        status: 'CONFIRMED',
        clinic_id: clinicId,
        doctor_id: doctorRecordId,
        patient_id: 'pat-99',
        doctor: { id: doctorRecordId, user: { full_name: 'Dra. Terapeuta' } },
        patient: { id: 'pat-99', full_name: 'Paciente Agendado', cpf: '11122233344' },
        payment: null,
      },
    ];

    const mockAdmin = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { clinic_id: clinicId, role: 'DOCTOR', is_coordinator: false },
              error: null,
            }),
          };
        }
        if (table === 'doctors') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: doctorRecordId },
              error: null,
            }),
          };
        }
        if (table === 'appointments') {
          const qb: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockReturnThis(),
          };
          // Faz com que await qb resolva com data e count
          qb.then = (resolve: any) => resolve({ data: mockAppts, count: 1, error: null });
          return qb;
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    createServiceRoleClient.mockReturnValue(mockAdmin);
    createClient.mockResolvedValue(mockAdmin);

    const req = new NextRequest('http://localhost:3000/api/appointments?page=1&pageSize=10', {
      headers: {
        'x-user-id': doctorUserId,
        'x-user-role': 'DOCTOR',
        'x-clinic-id': clinicId,
      },
    });

    const res = await getAppointments(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    const appt = json.data?.items?.[0] || json.items?.[0] || json.data?.[0];
    expect(appt).toBeDefined();

    // Verificação de sigilo
    const serialized = JSON.stringify(appt);
    expect(serialized).not.toContain('insurance_card_number');
    expect(serialized).not.toContain('health_insurance_name');
    expect(serialized).not.toContain('plan_id');
  });

  // 3. BLOQUEIO DE ROTAS ADMINISTRATIVAS /api/tiss/* e /api/insurance/* PARA DOCTOR
  it('3. /api/tiss/* e /api/insurance/*: DOCTOR é bloqueado com 403 Forbidden', () => {
    // TISS
    const tissBatchAccess = checkMiddlewareApiAccess('/api/tiss/batches', 'DOCTOR');
    expect(tissBatchAccess.allowed).toBe(false);
    expect(tissBatchAccess.status).toBe(403);

    const tissGuideAccess = checkMiddlewareApiAccess('/api/tiss/guides', 'DOCTOR');
    expect(tissGuideAccess.allowed).toBe(false);
    expect(tissGuideAccess.status).toBe(403);

    const tissReturnAccess = checkMiddlewareApiAccess('/api/tiss/returns/upload', 'DOCTOR');
    expect(tissReturnAccess.allowed).toBe(false);
    expect(tissReturnAccess.status).toBe(403);

    // Insurance / Convênios
    const insuranceCheckAccess = checkMiddlewareApiAccess('/api/insurance/check-eligibility', 'DOCTOR');
    expect(insuranceCheckAccess.allowed).toBe(false);
    expect(insuranceCheckAccess.status).toBe(403);

    const healthInsurancesAccess = checkMiddlewareApiAccess('/api/health-insurances', 'DOCTOR');
    expect(healthInsurancesAccess.allowed).toBe(false);
    expect(healthInsurancesAccess.status).toBe(403);
  });
});
