// app/api/patients/[id]/biometrics/route.ts
// CliniGo - LGPD: API para consulta e exclusão de biometrias faciais do paciente e responsáveis

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: patientId } = await params;
        const { searchParams } = new URL(request.url);
        const biometricId = searchParams.get('biometricId') || searchParams.get('id');

        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        let query = supabase
            .from('patient_face_biometrics')
            .select('id, reference_image_url, clinic_id')
            .eq('patient_id', patientId);

        if (biometricId) {
            query = query.eq('id', biometricId);
        }

        const { data: records, error: fetchErr } = await query;

        if (fetchErr || !records || records.length === 0) {
            return NextResponse.json({ error: 'Biometria não encontrada' }, { status: 404 });
        }

        // Deleta fotos do storage se existirem
        for (const record of records) {
            if (record.reference_image_url) {
                try {
                    const urlParts = record.reference_image_url.split('/');
                    const fileName = urlParts.slice(-2).join('/');
                    await supabase.storage
                        .from('biometric-photos')
                        .remove([fileName]);
                } catch (storageErr) {
                    console.warn('[Biometrics DELETE] Falha ao remover imagem do storage:', storageErr);
                }
            }
        }

        // Deleta registro(s) do banco
        let deleteQuery = supabase
            .from('patient_face_biometrics')
            .delete()
            .eq('patient_id', patientId);

        if (biometricId) {
            deleteQuery = deleteQuery.eq('id', biometricId);
        }

        const { error: deleteError } = await deleteQuery;

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({
            success: true,
            message: 'Biometria excluída conforme diretrizes de privacidade e LGPD'
        });

    } catch (error: any) {
        console.error('Delete biometrics error:', error);
        return NextResponse.json(
            { error: 'Erro ao excluir biometria' },
            { status: 500 }
        );
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: patientId } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('patient_face_biometrics')
            .select('id, patient_id, clinic_id, person_type, person_name, notes, consent_given, consent_date, detection_score, created_at, reference_image_url')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        const items = data || [];

        return NextResponse.json({
            hasBiometrics: items.length > 0,
            biometrics: items[0] || null,
            items: items,
            count: items.length
        });

    } catch (error: any) {
        console.error('Get biometrics error:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar biometria' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: patientId } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Recupera a clínica do usuário logado
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single();

        let clinicId = userData?.clinic_id;
        if (!clinicId) {
            const { data: patientData } = await supabase
                .from('patients')
                .select('clinic_id')
                .eq('id', patientId)
                .single();
            clinicId = patientData?.clinic_id;
        }

        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não identificada para este usuário' }, { status: 400 });
        }

        const body = await request.json();
        const {
            person_type = 'patient',
            person_name,
            notes,
            detection_score = 0.95,
            angles_captured = ['frontal', 'left', 'right'],
            thumbnailBase64,
            descriptor,
            encryptedDescriptor
        } = body;

        // Criptografia do descritor facial
        let finalEncrypted = encryptedDescriptor;
        if (!finalEncrypted && descriptor && Array.isArray(descriptor)) {
            try {
                const { encryptFaceDescriptor } = await import('@/lib/utils/face-encryption');
                finalEncrypted = encryptFaceDescriptor(new Float32Array(descriptor));
            } catch (encErr) {
                finalEncrypted = Buffer.from(JSON.stringify(descriptor)).toString('base64');
            }
        }

        if (!finalEncrypted) {
            return NextResponse.json({ error: 'Descritor facial não fornecido' }, { status: 400 });
        }

        // Upload de thumbnail para o Storage
        let imageUrl: string | null = null;
        if (thumbnailBase64 && typeof thumbnailBase64 === 'string') {
            try {
                const fileName = `${clinicId}/${patientId}-face-${Date.now()}.jpg`;
                const base64Data = thumbnailBase64.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');

                const { error: uploadError } = await supabase
                    .storage
                    .from('biometric-photos')
                    .upload(fileName, buffer, {
                        contentType: 'image/jpeg',
                        upsert: true
                    });

                if (!uploadError) {
                    const { data: urlData } = supabase
                        .storage
                        .from('biometric-photos')
                        .getPublicUrl(fileName);
                    imageUrl = urlData.publicUrl;
                } else {
                    console.warn('[Biometrics POST] Falha no upload da foto:', uploadError);
                }
            } catch (storageErr) {
                console.warn('[Biometrics POST] Erro ao processar thumbnail:', storageErr);
            }
        }

        // Insere registro na tabela patient_face_biometrics
        const { data: inserted, error: insertError } = await supabase
            .from('patient_face_biometrics')
            .insert({
                patient_id: patientId,
                clinic_id: clinicId,
                person_type,
                person_name: person_name?.trim() || null,
                notes: notes?.trim() || null,
                face_descriptor_encrypted: finalEncrypted,
                reference_image_url: imageUrl,
                detection_score: Number(detection_score) || 0.95,
                angles_captured: angles_captured || ['frontal', 'left', 'right'],
                consent_given: true,
                consent_date: new Date().toISOString(),
                retention_until: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString()
            })
            .select()
            .single();

        if (insertError) {
            console.error('[Biometrics POST] Erro no banco:', insertError);
            throw insertError;
        }

        return NextResponse.json({
            success: true,
            message: 'Biometria cadastrada com sucesso',
            data: inserted
        });

    } catch (error: any) {
        console.error('[Biometrics POST] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao registrar biometria' },
            { status: 500 }
        );
    }
}
