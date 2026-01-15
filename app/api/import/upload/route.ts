import { createClient } from '@/lib/supabase/server';
import { parseExcelFile } from '@/lib/services/import/file-parser';

export async function POST(request: Request) {
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

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents') // Assuming 'documents' bucket exists and has folders
        .upload(filePath, file);

    if (uploadError) {
        console.error('Upload Error', uploadError);
        return Response.json({ error: 'Erro ao fazer upload. Verifique as permissões de storage.' }, { status: 500 });
    }

    const { data: UrlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

    const arrayBuffer = await file.arrayBuffer();
    const { rows, headers } = await parseExcelFile(Buffer.from(arrayBuffer));

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
        return Response.json({ error: 'Erro ao criar job de importação' }, { status: 500 });
    }

    return Response.json({
        jobId: job.id,
        totalRows: rows.length,
        headers: headers
    });
}
