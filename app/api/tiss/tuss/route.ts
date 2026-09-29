import { enforceTissAdministrativeGuard } from '@/lib/auth/tiss-role-guard';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createTussSchema = z.object({
    code: z.string().min(8, 'Código TUSS deve ter ao menos 8 dígitos').max(10),
    description: z.string().min(3, 'Descrição obrigatória'),
    category: z.enum(['CONSULTA', 'SADT', 'TERAPIA', 'EXAME']).default('CONSULTA'),
});

const bulkImportTussSchema = z.object({
    procedures: z.array(createTussSchema).min(1, 'Lista deve conter ao menos um procedimento'),
});

/**
 * GET /api/tiss/tuss
 * Busca procedimentos TUSS com busca sanitizada (anti PGRST100) e paginação.
 */
export async function GET(request: NextRequest) {
    const guard = await enforceTissAdministrativeGuard(request);
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const searchRaw = searchParams.get('q') || searchParams.get('search') || '';
        const category = searchParams.get('category');
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const offset = (page - 1) * limit;

        // Sanitização contra injeção em filtros PostgREST (.or(...) com vírgulas ou parênteses)
        const sanitizedSearch = searchRaw.replace(/[,()]/g, '').trim();

        let query = supabase
            .from('tuss_procedures')
            .select('*', { count: 'exact' })
            .eq('is_active', true);

        if (sanitizedSearch) {
            // Se for puramente numérico busca por prefixo de código, senão por descrição
            if (/^\d+$/.test(sanitizedSearch)) {
                query = query.ilike('code', `${sanitizedSearch}%`);
            } else {
                query = query.ilike('description', `%${sanitizedSearch}%`);
            }
        }

        if (category) {
            query = query.eq('category', category);
        }

        const { data, count, error } = await query
            .order('code', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('[TUSS] Erro ao listar procedimentos TUSS:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: data || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit),
        });

    } catch (err: any) {
        console.error('[TUSS] Exceção na busca TUSS:', err);
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}

/**
 * POST /api/tiss/tuss
 * Importação/cadastro de procedimentos no catálogo TUSS.
 */
export async function POST(request: NextRequest) {
    const guard = await enforceTissAdministrativeGuard(request);
    if (!guard.authorized) {
        return guard.response;
    }
    try {
        const supabase: any = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = (await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()) as { data: any; error: any };

        if (!['CLINIC_ADMIN', 'SUPER_ADMIN', 'FINANCIAL', 'RECEPTIONIST'].includes(profile?.role)) {
            return NextResponse.json({ success: false, error: 'Acesso negado: apenas administradores podem importar catálogo TUSS' }, { status: 403 });
        }

        const body = await request.json();

        if (Array.isArray(body.procedures)) {
            const validated = bulkImportTussSchema.parse(body);

            const { data, error } = await supabase
                .from('tuss_procedures')
                .upsert(
                    validated.procedures.map(p => ({
                        code: p.code,
                        description: p.description,
                        category: p.category,
                        source: 'OFICIAL_IMPORTADO',
                        is_active: true,
                    })),
                    { onConflict: 'code' }
                )
                .select();

            if (error) {
                console.error('[TUSS] Erro ao fazer upsert em lote:', error);
                return NextResponse.json({ success: false, error: error.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: `${data.length} procedimentos TUSS importados/atualizados com sucesso`,
                count: data.length,
            });
        } else {
            const validated = createTussSchema.parse(body);

            const { data, error } = await supabase
                .from('tuss_procedures')
                .upsert({
                    code: validated.code,
                    description: validated.description,
                    category: validated.category,
                    source: 'OFICIAL_IMPORTADO',
                    is_active: true,
                }, { onConflict: 'code' })
                .select()
                .single();

            if (error) {
                return NextResponse.json({ success: false, error: error.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                message: 'Procedimento TUSS cadastrado com sucesso',
                data,
            });
        }
    } catch (err: any) {
        console.error('[TUSS] Erro ao cadastrar TUSS:', err);
        if (err instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: err.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: err.message || 'Erro interno' }, { status: 500 });
    }
}
