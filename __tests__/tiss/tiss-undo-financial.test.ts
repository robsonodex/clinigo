/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST as undoReturn } from '@/app/api/tiss/returns/[id]/undo/route';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceRoleClient: jest.fn(),
}));

const { createClient } = require('@/lib/supabase/server');

describe('TISS Undo: Desfazimento Atômico de Retorno, Estorno Contábil e Regras de Bloqueio', () => {
  const clinicId = '11111111-1111-1111-1111-111111111111';
  const adminUserId = '22222222-2222-2222-2222-222222222222';
  const batchId = '33333333-3333-3333-3333-333333333333';
  const returnId = '44444444-4444-4444-4444-444444444444';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. BLOQUEIO: Competência contábil fechada / Lançamento conciliado
  it('1. Deve bloquear desfazimento se a competência ou lançamento estiver fechado/conciliado', async () => {
    const mockReturn = {
      id: returnId,
      batch_id: batchId,
      clinic_id: clinicId,
      processing_status: 'COMPLETED',
      amount_approved: 1250.0,
      batch: { id: batchId, batch_number: 'LOTE-2026-09-01', status: 'APPROVED' },
    };

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: adminUserId } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { clinic_id: clinicId, role: 'CLINIC_ADMIN', full_name: 'Gestor Financeiro' },
              error: null,
            }),
          };
        }
        if (table === 'tiss_returns') {
          return {
            select: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: mockReturn, error: null }),
          };
        }
        if (table === 'tiss_glosas') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
          };
        }
        if (table === 'financial_entries') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [{ id: 'entry-locked', status: 'CLOSED' }], // Status real CLOSED
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    createClient.mockResolvedValue(mockSupabase);

    const req = new NextRequest(`http://localhost:3000/api/tiss/returns/${batchId}/undo`, {
      method: 'POST',
    });

    const res = await undoReturn(req, { params: Promise.resolve({ id: batchId }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('liquidado ou conciliado definitivamente');
  });

  // 2. BLOQUEIO: Recursos de glosa ativos
  it('2. Deve bloquear desfazimento se existirem recursos de glosa ativos', async () => {
    const mockReturn = {
      id: returnId,
      batch_id: batchId,
      clinic_id: clinicId,
      processing_status: 'COMPLETED',
      amount_approved: 1250.0,
      batch: { id: batchId, batch_number: 'LOTE-2026-09-01', status: 'APPROVED' },
    };

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: adminUserId } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { clinic_id: clinicId, role: 'CLINIC_ADMIN', full_name: 'Gestor Financeiro' },
              error: null,
            }),
          };
        }
        if (table === 'tiss_returns') {
          return {
            select: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: mockReturn, error: null }),
          };
        }
        if (table === 'tiss_glosas') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({
              data: [{ id: 'glosa-1', status: 'IN_APPEAL' }],
              error: null,
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    createClient.mockResolvedValue(mockSupabase);

    const req = new NextRequest(`http://localhost:3000/api/tiss/returns/${batchId}/undo`, {
      method: 'POST',
    });

    const res = await undoReturn(req, { params: Promise.resolve({ id: batchId }) });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('recurso de glosa em andamento');
  });

  // 3. SUCESSO: Desfazimento com estorno contábil e status reais de financial_entries
  it('3. Desfazimento atômico bem-sucedido: Valida status reais de financial_entries, cancelamento e auditoria', async () => {
    const mockReturn = {
      id: returnId,
      batch_id: batchId,
      clinic_id: clinicId,
      processing_status: 'COMPLETED',
      amount_approved: 1250.0,
      batch: { id: batchId, batch_number: 'LOTE-2026-09-01', status: 'APPROVED' },
    };

    let financialUpdatePayload: any = null;
    let financialInsertPayload: any = null;
    let importUpdatePayload: any = null;
    let glosasUpdatePayload: any = null;
    let batchUpdatePayload: any = null;
    let returnUpdatePayload: any = null;

    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: adminUserId } },
          error: null,
        }),
      },
      from: jest.fn().mockImplementation((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { clinic_id: clinicId, role: 'CLINIC_ADMIN', full_name: 'Gestor Financeiro' },
              error: null,
            }),
          };
        }
        if (table === 'tiss_returns') {
          return {
            select: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: mockReturn, error: null }),
            update: jest.fn().mockImplementation((payload) => {
              returnUpdatePayload = payload;
              return { eq: jest.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        if (table === 'tiss_glosas') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
            update: jest.fn().mockImplementation((payload) => {
              glosasUpdatePayload = payload;
              return {
                eq: jest.fn().mockReturnThis(),
                then: (resolve: any) => resolve({ error: null }),
              };
            }),
          };
        }
        if (table === 'financial_entries') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            in: jest.fn().mockResolvedValue({ data: [], error: null }),
            update: jest.fn().mockImplementation((payload) => {
              financialUpdatePayload = payload;
              return {
                eq: jest.fn().mockReturnThis(),
                ilike: jest.fn().mockResolvedValue({ error: null }),
              };
            }),
            insert: jest.fn().mockImplementation((payload) => {
              financialInsertPayload = payload;
              return Promise.resolve({ error: null });
            }),
          };
        }
        if (table === 'tiss_guides') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: [{ id: 'guide-1', status_history: [] }], error: null }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'tiss_batches') {
          return {
            update: jest.fn().mockImplementation((payload) => {
              batchUpdatePayload = payload;
              return { eq: jest.fn().mockResolvedValue({ error: null }) };
            }),
          };
        }
        if (table === 'tiss_return_imports') {
          return {
            update: jest.fn().mockImplementation((payload) => {
              importUpdatePayload = payload;
              return {
                eq: jest.fn().mockReturnThis(),
                then: (resolve: any) => resolve({ error: null }),
              };
            }),
          };
        }
        if (table === 'audit_logs') {
          return {
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    createClient.mockResolvedValue(mockSupabase);

    const req = new NextRequest(`http://localhost:3000/api/tiss/returns/${batchId}/undo`, {
      method: 'POST',
    });

    const res = await undoReturn(req, { params: Promise.resolve({ id: batchId }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);

    // Validações dos status reais contábeis de financial_entries
    expect(financialUpdatePayload).toBeDefined();
    expect(financialUpdatePayload.status).toBe('CANCELLED'); // Lançamento original soft-deleted

    expect(financialInsertPayload).toBeDefined();
    expect(financialInsertPayload.status).toBe('REVERSED'); // Contrapartida de estorno
    expect(financialInsertPayload.type).toBe('EXPENSE');
    expect(financialInsertPayload.category).toBe('ESTORNO_CONVENIO');
    expect(financialInsertPayload.amount).toBe(1250.0);

    // Validação de soft-delete de glosas e reset de lotes
    expect(glosasUpdatePayload.status).toBe('CANCELLED');
    expect(batchUpdatePayload.status).toBe('SENT');
    expect(returnUpdatePayload.processing_status).toBe('CANCELLED');

    // Validação de permissão para reimportação via partial unique index
    expect(importUpdatePayload.status).toBe('CANCELLED');
  });
});
