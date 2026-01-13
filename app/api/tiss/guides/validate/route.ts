// app/api/tiss/guides/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { BatchValidationResult, TissValidationError } from '@/types/tiss';

// ============================================
// SCHEMA DE VALIDAÇÃO
// ============================================

const validateRequestSchema = z.object({
    batch_id: z.string().uuid().optional(),
    guide_ids: z.array(z.string().uuid()).optional(),
}).refine(data => data.batch_id || (data.guide_ids && data.guide_ids.length > 0), {
    message: 'Forneça batch_id ou guide_ids',
});

// ============================================
// REGRAS DE VALIDAÇÃO TISS
// ============================================

interface ValidationRule {
    code: string;
    description: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    validate: (guide: any) => Promise<ValidationResult>;
}

interface ValidationResult {
    valid: boolean;
    message?: string;
    field?: string;
    current_value?: string;
    suggested_value?: string;
}

const VALIDATION_RULES: ValidationRule[] = [
    {
        code: 'V001',
        description: 'Número da carteirinha é obrigatório',
        severity: 'ERROR',
        validate: async (guide) => {
            if (!guide.patient_card_number || guide.patient_card_number.trim() === '') {
                return {
                    valid: false,
                    message: 'Número da carteirinha do paciente é obrigatório',
                    field: 'patient_card_number',
                };
            }
            return { valid: true };
        },
    },

    {
        code: 'V002',
        description: 'CPF do paciente deve ter 11 dígitos',
        severity: 'WARNING',
        validate: async (guide) => {
            if (guide.patient_cpf) {
                const cpfClean = guide.patient_cpf.replace(/\D/g, '');
                if (cpfClean.length !== 11) {
                    return {
                        valid: false,
                        message: 'CPF deve conter 11 dígitos',
                        field: 'patient_cpf',
                        current_value: guide.patient_cpf,
                    };
                }
            }
            return { valid: true };
        },
    },

    {
        code: 'V003',
        description: 'Código do procedimento é obrigatório',
        severity: 'ERROR',
        validate: async (guide) => {
            if (!guide.procedure_code || guide.procedure_code.trim() === '') {
                return {
                    valid: false,
                    message: 'Código TUSS do procedimento é obrigatório',
                    field: 'procedure_code',
                };
            }
            return { valid: true };
        },
    },

    {
        code: 'V004',
        description: 'Valor unitário deve ser maior que zero',
        severity: 'ERROR',
        validate: async (guide) => {
            if (!guide.unit_value || guide.unit_value <= 0) {
                return {
                    valid: false,
                    message: 'Valor unitário deve ser maior que zero',
                    field: 'unit_value',
                    current_value: String(guide.unit_value || 0),
                };
            }
            return { valid: true };
        },
    },

    {
        code: 'V005',
        description: 'Total = Quantidade × Valor Unitário',
        severity: 'ERROR',
        validate: async (guide) => {
            const expectedTotal = (guide.procedure_quantity || 1) * (guide.unit_value || 0);
            const actualTotal = guide.total_value || 0;

            // Tolerância de 0.01 para arredondamento
            if (Math.abs(expectedTotal - actualTotal) > 0.01) {
                return {
                    valid: false,
                    message: `Valor total incorreto. Esperado: R$ ${expectedTotal.toFixed(2)}`,
                    field: 'total_value',
                    current_value: String(actualTotal),
                    suggested_value: String(expectedTotal),
                };
            }
            return { valid: true };
        },
    },

    {
        code: 'V006',
        description: 'Data de execução não pode ser futura',
        severity: 'ERROR',
        validate: async (guide) => {
            const executionDate = new Date(guide.execution_date);
            const today = new Date();
            today.setHours(23, 59, 59, 999); // Fim do dia

            if (executionDate > today) {
                return {
                    valid: false,
                    message: 'Data de execução não pode ser no futuro',
                    field: 'execution_date',
                    current_value: guide.execution_date,
                };
            }
            return { valid: true };
        },
    },

    {
        code: 'V007',
        description: 'CID-10 recomendado para consultas',
        severity: 'WARNING',
        validate: async (guide) => {
            if (guide.guide_type === 'CONSULTATION' && !guide.cid10_code) {
                return {
                    valid: false,
                    message: 'CID-10 é recomendado para guias de consulta',
                    field: 'cid10_code',
                };
            }
            return { valid: true };
        },
    },

    {
        code: 'V008',
        description: 'Código de autorização para procedimentos de alto custo',
        severity: 'WARNING',
        validate: async (guide) => {
            // Lista simplificada de códigos que geralmente requerem autorização
            const requiresAuth = ['40101010', '40301010', '40501035']; // Exemplos

            if (requiresAuth.includes(guide.procedure_code) && !guide.authorization_code) {
                return {
                    valid: false,
                    message: 'Este procedimento geralmente requer código de autorização prévia',
                    field: 'authorization_code',
                };
            }
            return { valid: true };
        },
    },

    {
        code: 'V009',
        description: 'Quantidade  do procedimento suspeita',
        severity: 'WARNING',
        validate: async (guide) => {
            if (guide.procedure_quantity > 10) {
                return {
                    valid: false,
                    message: `Quantidade elevada (${guide.procedure_quantity}) pode ser questionada pela operadora`,
                    field: 'procedure_quantity',
                    current_value: String(guide.procedure_quantity),
                };
            }
            return { valid: true };
        },
    },

    {
        code: 'V010',
        description: 'Nome do procedimento deve estar preenchido',
        severity: 'ERROR',
        validate: async (guide) => {
            if (!guide.procedure_name || guide.procedure_name.trim() === '') {
                return {
                    valid: false,
                    message: 'Descrição do procedimento é obrigatória',
                    field: 'procedure_name',
                };
            }
            return { valid: true };
        },
    },
];

// ============================================
// POST /api/tiss/guides/validate - Validar Guias
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

        // Parse e validar body
        const body = await request.json();
        const validated = validateRequestSchema.parse(body);

        // Buscar guias a validar
        let guidesQuery = supabase
            .from('tiss_guides')
            .select('*')
            .eq('clinic_id', clinic_id);

        if (validated.batch_id) {
            guidesQuery = guidesQuery.eq('batch_id', validated.batch_id);
        } else if (validated.guide_ids) {
            guidesQuery = guidesQuery.in('id', validated.guide_ids);
        }

        const { data: guides, error: guidesError } = await guidesQuery;

        if (guidesError || !guides || guides.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Nenhuma guia encontrada para validar' },
                { status: 404 }
            );
        }

        // Limpar erros antigos
        if (validated.batch_id) {
            await supabase
                .from('tiss_validation_errors')
                .delete()
                .eq('batch_id', validated.batch_id);
        } else if (validated.guide_ids) {
            await supabase
                .from('tiss_validation_errors')
                .delete()
                .in('guide_id', validated.guide_ids);
        }

        // Executar validações
        const allErrors: TissValidationError[] = [];
        let totalErrors = 0;
        let totalWarnings = 0;

        for (const guide of guides) {
            for (const rule of VALIDATION_RULES) {
                try {
                    const result = await rule.validate(guide);

                    if (!result.valid) {
                        const error: Partial<TissValidationError> = {
                            guide_id: guide.id,
                            batch_id: guide.batch_id,
                            clinic_id,
                            error_code: rule.code,
                            error_message: result.message || rule.description,
                            error_field: result.field || null,
                            severity: rule.severity,
                            current_value: result.current_value || null,
                            suggested_value: result.suggested_value || null,
                            resolved: false,
                        };

                        // Inserir erro no banco
                        const { data: savedError } = await supabase
                            .from('tiss_validation_errors')
                            .insert(error)
                            .select()
                            .single();

                        if (savedError) {
                            allErrors.push(savedError);
                        }

                        if (rule.severity === 'ERROR') totalErrors++;
                        if (rule.severity === 'WARNING') totalWarnings++;
                    }
                } catch (validationError) {
                    console.error(`[TISS] Erro ao executar regra ${rule.code}:`, validationError);
                }
            }

            // Atualizar status de validação da guia
            const hasErrors = allErrors.filter(e => e.guide_id === guide.id && e.severity === 'ERROR').length > 0;
            const hasWarnings = allErrors.filter(e => e.guide_id === guide.id && e.severity === 'WARNING').length > 0;

            let validationStatus = 'VALID';
            if (hasErrors) validationStatus = 'INVALID';
            else if (hasWarnings) validationStatus = 'WARNING';

            await supabase
                .from('tiss_guides')
                .update({ validation_status: validationStatus })
                .eq('id', guide.id);
        }

        // Atualizar status do lote se houver
        if (validated.batch_id) {
            const batchHasErrors = totalErrors > 0;
            const batchStatus = batchHasErrors ? 'INVALID' : 'VALID';

            await supabase
                .from('tiss_batches')
                .update({ status: batchStatus })
                .eq('id', validated.batch_id);
        }

        // Preparar resposta
        const result: BatchValidationResult = {
            batch_id: validated.batch_id || '',
            is_valid: totalErrors === 0,
            total_guides: guides.length,
            total_errors: totalErrors,
            total_warnings: totalWarnings,
            errors: allErrors,
            can_generate_xml: totalErrors === 0,
        };

        return NextResponse.json({
            success: true,
            data: result,
            message: totalErrors === 0
                ? 'Validação concluída com sucesso'
                : `Validação concluída com ${totalErrors} erro(s) e ${totalWarnings} aviso(s)`,
        });

    } catch (error: any) {
        console.error('[TISS] Erro na validação:', error);

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
