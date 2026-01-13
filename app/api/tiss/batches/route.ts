// app/api/tiss/batches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { CreateTissBatchDTO, TissBatch, TissBatchFilters } from '@/types/tiss';

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

const createBatchSchema = z.object({
    insurance_company_id: z.string().uuid('ID da operadora inválido'),
    reference_month: z.number().min(1).max(12),
    reference_year: z.number().min(2020).max(2050),
    appointment_ids: z.array(z.string().uuid()).optional(),
});

const batchFiltersSchema = z.object({
    status: z.array(z.string()).optional(),
    insurance_company_id: z.string().uuid().optional(),
    reference_year: z.number().optional(),
    reference_month: z.number().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    search: z.string().optional(),
});

// ============================================
// GET /api/tiss/batches - Listar Lotes
// ============================================

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Obter clinic_id do usuário
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        const clinic_id = profile.clinic_id;

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const filters: TissBatchFilters = {
            status: searchParams.get('status')?.split(','),
            insurance_company_id: searchParams.get('insurance_company_id') || undefined,
            reference_year: searchParams.get('reference_year') ? parseInt(searchParams.get('reference_year')!) : undefined,
            reference_month: searchParams.get('reference_month') ? parseInt(searchParams.get('reference_month')!) : undefined,
            date_from: searchParams.get('date_from') || undefined,
            date_to: searchParams.get('date_to') || undefined,
            search: searchParams.get('search') || undefined,
        };

        // Validar filtros
        const validatedFilters = batchFiltersSchema.parse(filters);

        // Construir query
        let query = supabase
            .from('tiss_batches')
            .select(`
        *,
        health_insurance:health_insurances(id, name, code),
        created_by_user:users!tiss_batches_created_by_fkey(id, full_name)
      `)
            .eq('clinic_id', clinic_id)
            .order('created_at', { ascending: false });

        // Aplicar filtros
        if (validatedFilters.status && validatedFilters.status.length > 0) {
            query = query.in('status', validatedFilters.status);
        }

        if (validatedFilters.insurance_company_id) {
            query = query.eq('insurance_company_id', validatedFilters.insurance_company_id);
        }

        if (validatedFilters.reference_year) {
            query = query.eq('reference_year', validatedFilters.reference_year);
        }

        if (validatedFilters.reference_month) {
            query = query.eq('reference_month', validatedFilters.reference_month);
        }

        if (validatedFilters.date_from) {
            query = query.gte('created_at', validatedFilters.date_from);
        }

        if (validatedFilters.date_to) {
            query = query.lte('created_at', validatedFilters.date_to);
        }

        if (validatedFilters.search) {
            query = query.or(
                `batch_number.ilike.%${validatedFilters.search}%,protocol_number.ilike.%${validatedFilters.search}%`
            );
        }

        const { data: batches, error } = await query;

        if (error) {
            console.error('[TISS] Erro ao listar lotes:', error);
            return NextResponse.json(
                { success: false, error: 'Erro ao buscar lotes' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: batches,
            count: batches.length,
        });

    } catch (error: any) {
        console.error('[TISS] Erro na listagem de lotes:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Parâmetros inválidos', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

// ============================================
// POST /api/tiss/batches - Criar Novo Lote
// ============================================

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Não autenticado' },
                { status: 401 }
            );
        }

        // Obter clinic_id do usuário
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json(
                { success: false, error: 'Clínica não encontrada' },
                { status: 403 }
            );
        }

        // Verificar permissão (apenas ADMIN pode criar lotes)
        if (profile.role !== 'CLINIC_ADMIN' && profile.role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Sem permissão para criar lotes TISS' },
                { status: 403 }
            );
        }

        const clinic_id = profile.clinic_id;

        // Parse e validar body
        const body: CreateTissBatchDTO = await request.json();
        const validated = createBatchSchema.parse(body);

        // Buscar informações da operadora
        const { data: insurance } = await supabase
            .from('health_insurances')
            .select('id, name')
            .eq('id', validated.insurance_company_id)
            .eq('clinic_id', clinic_id)
            .single();

        if (!insurance) {
            return NextResponse.json(
                { success: false, error: 'Operadora não encontrada' },
                { status: 404 }
            );
        }

        // Gerar batch_number usando a function
        const { data: batchNumberResult } = await supabase
            .rpc('generate_batch_number', {
                p_clinic_id: clinic_id,
                p_year: validated.reference_year,
                p_month: validated.reference_month,
            });

        const batch_number = batchNumberResult ||
            `${validated.reference_year}${String(validated.reference_month).padStart(2, '0')}001`;

        // Criar lote
        const { data: batch, error: createError } = await supabase
            .from('tiss_batches')
            .insert({
                clinic_id,
                batch_number,
                insurance_company_id: validated.insurance_company_id,
                insurance_company_name: insurance.name,
                reference_month: validated.reference_month,
                reference_year: validated.reference_year,
                status: 'DRAFT',
                created_by: user.id,
            })
            .select()
            .single();

        if (createError) {
            console.error('[TISS] Erro ao criar lote:', createError);
            return NextResponse.json(
                { success: false, error: 'Erro ao criar lote' },
                { status: 500 }
            );
        }

        // Se foram fornecidos appointment_ids, criar guias automaticamente
        if (validated.appointment_ids && validated.appointment_ids.length > 0) {
            // Buscar appointments com dados necessários
            const { data: appointments } = await supabase
                .from('appointments')
                .select(`
          *,
          patient:patients(*),
          doctor:doctors(*, user:users(*)),
          consultation:consultations(*)
        `)
                .in('id', validated.appointment_ids)
                .eq('clinic_id', clinic_id)
                .eq('status', 'COMPLETED');

            if (appointments && appointments.length > 0) {
                // Criar guias para cada appointment
                const guidesData = appointments.map((apt: any, index: number) => {
                    const guideNumber = `${batch_number}${String(index + 1).padStart(3, '0')}`;

                    return {
                        batch_id: batch.id,
                        clinic_id,
                        appointment_id: apt.id,
                        consultation_id: apt.consultation?.id || null,
                        patient_id: apt.patient_id,
                        doctor_id: apt.doctor_id,
                        guide_number: guideNumber,
                        guide_type: 'CONSULTATION' as const,
                        patient_cpf: apt.patient.cpf,
                        patient_name: apt.patient.full_name,
                        patient_card_number: apt.patient.insurance_card_number || '',
                        patient_card_validity: apt.patient.insurance_card_validity || null,
                        procedure_code: '10101012', // Código TUSS para consulta (exemplo)
                        procedure_name: 'Consulta médica',
                        procedure_quantity: 1,
                        unit_value: apt.doctor.consultation_price || 0,
                        total_value: apt.doctor.consultation_price || 0,
                        cid10_code: apt.consultation?.diagnosis || null,
                        cid10_description: null,
                        authorization_code: null,
                        execution_date: apt.scheduled_at.split('T')[0],
                        status: 'PENDING',
                        validation_status: 'NOT_VALIDATED',
                    };
                });

                const { error: guidesError } = await supabase
                    .from('tiss_guides')
                    .insert(guidesData);

                if (guidesError) {
                    console.error('[TISS] Erro ao criar guias automáticas:', guidesError);
                    // Não falha a criação do lote, apenas loga o erro
                }
            }
        }

        // Buscar lote completo com guias
        const { data: completeBatch } = await supabase
            .from('tiss_batches')
            .select(`
        *,
        health_insurance:health_insurances(id, name, code),
        guides:tiss_guides(count)
      `)
            .eq('id', batch.id)
            .single();

        return NextResponse.json({
            success: true,
            data: completeBatch,
            message: 'Lote TISS criado com sucesso',
        }, { status: 201 });

    } catch (error: any) {
        console.error('[TISS] Erro ao criar lote:', error);

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dados inválidos', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
