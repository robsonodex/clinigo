import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireTissAction } from '@/lib/auth/tiss-role-guard';
import crypto from 'crypto';
import { z } from 'zod';

const dryRunSchema = z.object({
    batch_id: z.string().uuid('ID do lote inválido'),
    file_name: z.string().min(1, 'Nome do arquivo obrigatório'),
    file_type: z.enum(['CSV', 'XML', 'TXT']),
    file_content: z.string().min(1, 'Conteúdo do arquivo obrigatório'),
});

export interface ReturnParsedItem {
    numero_guia: string;
    status: 'APROVADO' | 'PARCIAL' | 'NEGADO';
    valor_apresentado: number;
    valor_pago: number;
    valor_glosado: number;
    codigo_glosa?: string;
    motivo_glosa?: string;
}

export function parseReturnContent(content: string, type: 'CSV' | 'XML' | 'TXT'): ReturnParsedItem[] {
    const items: ReturnParsedItem[] = [];

    // Se estiver em base64, decodifica
    let text = content;
    if (!content.includes(';') && !content.includes('<') && content.length > 20) {
        try {
            text = Buffer.from(content, 'base64').toString('utf8');
        } catch {
            text = content;
        }
    }

    if (type === 'CSV' || type === 'TXT') {
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        for (const line of lines) {
            // Ignorar cabeçalho
            if (line.toLowerCase().includes('numero_guia') || line.toLowerCase().includes('guia;')) continue;

            const separator = line.includes(';') ? ';' : ',';
            const cols = line.split(separator).map(c => c.trim().replace(/^["']|["']$/g, ''));

            if (cols.length >= 3) {
                const numero_guia = cols[0];
                const rawStatus = (cols[1] || 'APROVADO').toUpperCase();
                const status = rawStatus.includes('PARC') ? 'PARCIAL' : (rawStatus.includes('NEG') || rawStatus.includes('GLOS')) ? 'NEGADO' : 'APROVADO';

                const valor_apresentado = parseFloat((cols[2] || '0').replace(',', '.')) || 0;
                const valor_pago = parseFloat((cols[3] || '0').replace(',', '.')) || 0;
                const valor_glosado = parseFloat((cols[4] || '0').replace(',', '.')) || 0;
                const codigo_glosa = cols[5] || undefined;
                const motivo_glosa = cols[6] || undefined;

                items.push({
                    numero_guia,
                    status,
                    valor_apresentado: Number(valor_apresentado.toFixed(2)),
                    valor_pago: Number(valor_pago.toFixed(2)),
                    valor_glosado: Number(valor_glosado.toFixed(2)),
                    codigo_glosa,
                    motivo_glosa
                });
            }
        }
    } else if (type === 'XML') {
        // Parser simplificado e resiliente para XML TISS de retorno
        const guideRegex = /<(?:ans:)?guiaDemonstrativo>([\s\S]*?)<\/(?:ans:)?guiaDemonstrativo>/gi;
        let match;
        while ((match = guideRegex.exec(text)) !== null) {
            const block = match[1];
            const numMatch = /<(?:ans:)?numeroGuiaPrestador>([^<]+)<\//i.exec(block);
            const statusMatch = /<(?:ans:)?situacaoGuia>([^<]+)<\//i.exec(block);
            const infMatch = /<(?:ans:)?valorInformadoGuia>([^<]+)<\//i.exec(block);
            const procMatch = /<(?:ans:)?valorProcessadoGuia>([^<]+)<\//i.exec(block);
            const glosaMatch = /<(?:ans:)?valorGlosaGuia>([^<]+)<\//i.exec(block);
            const codGlosaMatch = /<(?:ans:)?codigoGlosa>([^<]+)<\//i.exec(block);
            const descGlosaMatch = /<(?:ans:)?descricaoGlosa>([^<]+)<\//i.exec(block);

            if (numMatch) {
                const numero_guia = numMatch[1].trim();
                const rawStatus = (statusMatch ? statusMatch[1] : 'APROVADO').toUpperCase();
                const status = rawStatus.includes('PARC') ? 'PARCIAL' : (rawStatus.includes('NEG') || rawStatus.includes('GLOS')) ? 'NEGADO' : 'APROVADO';

                const valor_apresentado = infMatch ? parseFloat(infMatch[1].replace(',', '.')) : 0;
                const valor_pago = procMatch ? parseFloat(procMatch[1].replace(',', '.')) : 0;
                const valor_glosado = glosaMatch ? parseFloat(glosaMatch[1].replace(',', '.')) : 0;

                items.push({
                    numero_guia,
                    status,
                    valor_apresentado: Number(valor_apresentado.toFixed(2)),
                    valor_pago: Number(valor_pago.toFixed(2)),
                    valor_glosado: Number(valor_glosado.toFixed(2)),
                    codigo_glosa: codGlosaMatch ? codGlosaMatch[1].trim() : undefined,
                    motivo_glosa: descGlosaMatch ? descGlosaMatch[1].trim() : undefined,
                });
            }
        }
    }

    return items;
}

export async function POST(request: NextRequest) {
    const guard = await requireTissAction(request, 'retorno.importar');
    if (!guard.authorized) {
        return guard.response;
    }

    try {
        const body = await request.json();
        const validated = dryRunSchema.parse(body);

        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        if (!profile?.clinic_id) {
            return NextResponse.json({ success: false, error: 'Clínica não encontrada' }, { status: 403 });
        }

        const clinicId = profile.clinic_id;

        // 1. Calcular SHA-256 do arquivo para idempotência
        const fileHash = crypto.createHash('sha256').update(validated.file_content).digest('hex');

        // 2. Verificar se o mesmo arquivo já foi importado com sucesso anteriormente
        const { data: existingImport } = await supabase
            .from('tiss_return_imports')
            .select('id, file_name, created_at, status')
            .eq('clinic_id', clinicId)
            .eq('file_hash', fileHash)
            .neq('status', 'CANCELLED')
            .maybeSingle();

        if (existingImport) {
            return NextResponse.json({
                success: false,
                error: `Este arquivo de retorno já foi importado e processado anteriormente em ${existingImport.created_at}. Não é permitido importar o mesmo arquivo duas vezes.`,
                code: 'DUPLICATE_RETURN_FILE',
                file_hash: fileHash,
                existing_import_id: existingImport.id
            }, { status: 409 });
        }

        // 3. Buscar lote
        const { data: batch, error: batchError } = await supabase
            .from('tiss_batches')
            .select('id, batch_number, status')
            .eq('id', validated.batch_id)
            .eq('clinic_id', clinicId)
            .single();

        if (batchError || !batch) {
            return NextResponse.json({ success: false, error: 'Lote não encontrado' }, { status: 404 });
        }

        // 4. Parsear o conteúdo
        const parsedItems = parseReturnContent(validated.file_content, validated.file_type);

        if (parsedItems.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'Não foi possível encontrar nenhum registro de guia no arquivo informado.',
                code: 'EMPTY_PARSED_RETURN'
            }, { status: 400 });
        }

        // 5. Buscar todas as guias deste lote
        const { data: batchGuides } = await supabase
            .from('tiss_guides')
            .select('id, guide_number, total_value, status, patient_name, procedure_code')
            .eq('batch_id', validated.batch_id)
            .eq('clinic_id', clinicId)
            .neq('status', 'CANCELLED');

        const guidesMap = new Map<string, any>();
        (batchGuides || []).forEach(g => {
            if (g.guide_number) guidesMap.set(g.guide_number.trim(), g);
        });

        // 6. Categorizar itens sem persistir nada
        const reconhecidas: any[] = [];
        const pagas: any[] = [];
        const glosadas: any[] = [];
        const nao_reconhecidas: any[] = [];
        const divergencias: any[] = [];

        let totalApresentado = 0;
        let totalPago = 0;
        let totalGlosado = 0;

        for (const item of parsedItems) {
            totalApresentado += item.valor_apresentado;
            totalPago += item.valor_pago;
            totalGlosado += item.valor_glosado;

            const existingGuide = guidesMap.get(item.numero_guia.trim());

            if (existingGuide) {
                const itemData = {
                    ...item,
                    guide_id: existingGuide.id,
                    system_guide_number: existingGuide.guide_number,
                    system_total_value: Number(existingGuide.total_value),
                    patient_name: existingGuide.patient_name,
                };

                reconhecidas.push(itemData);

                // Pagas
                if (item.valor_glosado === 0 && item.valor_pago > 0) {
                    pagas.push(itemData);
                }

                // Glosadas
                if (item.valor_glosado > 0) {
                    glosadas.push(itemData);
                }

                // Divergências de valor
                if (Math.abs(item.valor_apresentado - Number(existingGuide.total_value)) > 0.01) {
                    divergencias.push({
                        ...itemData,
                        difference: Number((item.valor_apresentado - Number(existingGuide.total_value)).toFixed(2)),
                        message: `Valor apresentado no retorno (R$ ${item.valor_apresentado.toFixed(2)}) difere do cadastrado no sistema (R$ ${Number(existingGuide.total_value).toFixed(2)})`
                    });
                }
            } else {
                nao_reconhecidas.push({
                    ...item,
                    message: `Guia nº ${item.numero_guia} não encontrada entre as guias vinculadas ao lote.`
                });
            }
        }

        // 7. Gerar dry-run token único
        const dryRunToken = crypto.createHash('sha256').update(`${fileHash}:${Date.now()}:${validated.batch_id}`).digest('hex');

        return NextResponse.json({
            success: true,
            data: {
                dry_run_token: dryRunToken,
                file_hash: fileHash,
                batch_id: validated.batch_id,
                batch_number: batch.batch_number,
                total_items_file: parsedItems.length,
                counts: {
                    reconhecidas: reconhecidas.length,
                    pagas: pagas.length,
                    glosadas: glosadas.length,
                    nao_reconhecidas: nao_reconhecidas.length,
                    divergencias: divergencias.length,
                },
                totals: {
                    valor_apresentado: Number(totalApresentado.toFixed(2)),
                    valor_pago: Number(totalPago.toFixed(2)),
                    valor_glosado: Number(totalGlosado.toFixed(2)),
                },
                items: {
                    reconhecidas,
                    pagas,
                    glosadas,
                    nao_reconhecidas,
                    divergencias,
                }
            },
            message: 'Prévia de retorno gerada com sucesso. Nenhuma alteração foi gravada no banco de dados.'
        });

    } catch (error: any) {
        console.error('[TISS] Erro no dry-run de retorno:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Dados inválidos' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Erro interno ao processar prévia do retorno' }, { status: 500 });
    }
}
