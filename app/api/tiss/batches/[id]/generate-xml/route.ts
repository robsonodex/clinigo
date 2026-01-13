// app/api/tiss/batches/[id]/generate-xml/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateTissXML } from '@/lib/services/tiss/xml-generator';

/**
 * POST /api/tiss/batches/[id]/generate-xml
 * Gera XML TISS 4.02.00 de um lote
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        // Verificar permissão
        if (profile.role !== 'CLINIC_ADMIN' && profile.role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Sem permissão para gerar XML' },
                { status: 403 }
            );
        }

        const batch_id = params.id;

        // Buscar lote
        const { data: batch } = await supabase
            .from('tiss_batches')
            .select('*')
            .eq('id', batch_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!batch) {
            return NextResponse.json(
                { success: false, error: 'Lote não encontrado' },
                { status: 404 }
            );
        }

        // Verificar se lote está válido
        if (batch.status === 'INVALID') {
            return NextResponse.json(
                { success: false, error: 'Lote possui erros de validação. Corrija antes de gerar XML.' },
                { status: 400 }
            );
        }

        // Buscar guias do lote
        const { data: guides } = await supabase
            .from('tiss_guides')
            .select('*')
            .eq('batch_id', batch_id)
            .order('created_at', { ascending: true });

        if (!guides || guides.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Lote não possui guias' },
                { status: 400 }
            );
        }

        // Buscar dados da clínica
        const { data: clinic } = await supabase
            .from('clinics')
            .select('*')
            .eq('id', profile.clinic_id)
            .single();

        // Buscar dados da operadora
        const { data: operadora } = await supabase
            .from('health_insurances')
            .select('*')
            .eq('id', batch.insurance_company_id)
            .single();

        // Gerar XML
        const xmlContent = generateTissXML(batch, guides, clinic, operadora);

        // Salvar XML no Supabase Storage
        const fileName = `${batch.batch_number}.xml`;
        const filePath = `tiss-batches/${profile.clinic_id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, xmlContent, {
                contentType: 'application/xml',
                upsert: true, // Sobrescreve se já existe
            });

        if (uploadError) {
            console.error('[TISS] Erro ao fazer upload do XML:', uploadError);
            return NextResponse.json(
                { success: false, error: 'Erro ao salvar XML' },
                { status: 500 }
            );
        }

        // Obter URL pública do arquivo
        const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        const xmlUrl = urlData.publicUrl;

        // Atualizar registrodo lote
        await supabase
            .from('tiss_batches')
            .update({
                xml_file_url: xmlUrl,
                xml_file_size: Buffer.from(xmlContent).length,
                xml_generated_at: new Date().toISOString(),
                status: 'VALID', // Marca como válido após gerar XML
            })
            .eq('id', batch_id);

        return NextResponse.json({
            success: true,
            data: {
                xml_url: xmlUrl,
                file_size: Buffer.from(xmlContent).length,
                guide_count: guides.length,
                generated_at: new Date().toISOString(),
            },
            message: 'XML gerado com sucesso',
        });

    } catch (error: any) {
        console.error('[TISS] Erro ao gerar XML:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/tiss/batches/[id]/generate-xml
 * Download direto do XML (se já foi gerado)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const batch_id = params.id;

        // Buscar lote
        const { data: batch } = await supabase
            .from('tiss_batches')
            .select('batch_number, xml_file_url')
            .eq('id', batch_id)
            .eq('clinic_id', profile.clinic_id)
            .single();

        if (!batch) {
            return NextResponse.json(
                { success: false, error: 'Lote não encontrado' },
                { status: 404 }
            );
        }

        if (!batch.xml_file_url) {
            return NextResponse.json(
                { success: false, error: 'XML ainda não foi gerado para este lote' },
                { status: 400 }
            );
        }

        // Redirecionar para URL do arquivo
        return NextResponse.redirect(batch.xml_file_url);

    } catch (error: any) {
        console.error('[TISS] Erro ao buscar XML:', error);
        return NextResponse.json(
            { success: false, error: 'Erro interno do servidor' },
            { status: 500 }
        );
    }
}
