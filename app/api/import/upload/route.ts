import { createClient } from '@/lib/supabase/server';
import { parseExcelFile } from '@/lib/services/import/file-parser';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return Response.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!userData?.clinic_id || !['CLINIC_ADMIN', 'SUPER_ADMIN'].includes(userData.role)) {
            return Response.json({ error: 'Sem permissão' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const importType = formData.get('type') as string;

        if (!file) {
            return Response.json({ error: 'Arquivo não enviado' }, { status: 400 });
        }

        const allowedExtensions = ['.xlsx', '.xls', '.csv'];
        const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            return Response.json({ error: 'Formato inválido. Use .xlsx, .xls ou .csv' }, { status: 400 });
        }

        if (file.size > 10 * 1024 * 1024) {
            return Response.json({ error: 'Arquivo muito grande. Máximo: 10MB' }, { status: 400 });
        }

        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `imports/${userData.clinic_id}/${fileName}`;

        // Step 1: Upload to storage
        console.log('[Import Upload] Step 1: Uploading file to storage...');
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);

        if (uploadError) {
            console.error('[Import Upload] Storage upload error:', uploadError);
            return Response.json({
                error: 'Erro ao fazer upload. Verifique as permissões de storage.',
                details: uploadError.message
            }, { status: 500 });
        }

        const { data: UrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        // Step 2: Parse Excel file
        console.log('[Import Upload] Step 2: Parsing Excel file...');
        let rows: any[];
        let headers: string[];
        try {
            const arrayBuffer = await file.arrayBuffer();
            const parseResult = await parseExcelFile(Buffer.from(arrayBuffer));
            rows = parseResult.rows;
            headers = parseResult.headers;
            console.log(`[Import Upload] Parsed ${rows.length} rows with headers:`, headers);
        } catch (parseError: any) {
            console.error('[Import Upload] Excel parse error:', parseError);
            return Response.json({
                error: 'Erro ao processar arquivo Excel.',
                details: parseError.message
            }, { status: 500 });
        }

        // Step 3: Create import job in database
        console.log('[Import Upload] Step 3: Creating import job in database...');
        const { data: job, error: jobError } = await supabase
            .from('import_jobs')
            .insert({
                clinic_id: userData.clinic_id,
                import_type: importType,
                file_url: UrlData.publicUrl,
                total_rows: rows.length,
                created_by: user.id
            })
            .select()
            .single();

        if (jobError) {
            console.error('[Import Upload] Database insert error:', jobError);
            return Response.json({
                error: 'Erro ao criar job de importação. A tabela import_jobs pode não existir.',
                details: jobError.message,
                code: jobError.code
            }, { status: 500 });
        }

        console.log('[Import Upload] Success! Job ID:', job.id);
        return Response.json({
            jobId: job.id,
            totalRows: rows.length,
            headers: headers
        });
    } catch (error: any) {
        console.error('[Import Upload] Unexpected error:', error);
        return Response.json({
            error: 'Erro inesperado no upload.',
            details: error.message
        }, { status: 500 });
    }
}
