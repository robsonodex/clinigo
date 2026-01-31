// app/api/patients/[id]/biometrics/route.ts
// CliniGo - LGPD: API para deletar biometria do paciente

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();

        // Verifica autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const patientId = params.id;

        // Busca biometria para pegar URL da foto
        const { data: biometric } = await supabase
            .from('patient_face_biometrics')
            .select('reference_image_url, clinic_id')
            .eq('patient_id', patientId)
            .single();

        if (!biometric) {
            return NextResponse.json({ error: 'Biometria não encontrada' }, { status: 404 });
        }

        // Deleta foto do storage se existir
        if (biometric.reference_image_url) {
            const urlParts = biometric.reference_image_url.split('/');
            const fileName = urlParts.slice(-2).join('/'); // clinicId/patientId-face.jpg

            await supabase.storage
                .from('biometric-photos')
                .remove([fileName]);
        }

        // Deleta registro do banco
        const { error: deleteError } = await supabase
            .from('patient_face_biometrics')
            .delete()
            .eq('patient_id', patientId);

        if (deleteError) {
            throw deleteError;
        }

        return NextResponse.json({
            success: true,
            message: 'Biometria excluída conforme LGPD'
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
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('patient_face_biometrics')
            .select('id, consent_given, consent_date, detection_score, created_at, reference_image_url')
            .eq('patient_id', params.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ hasBiometrics: false });
            }
            throw error;
        }

        return NextResponse.json({
            hasBiometrics: true,
            biometrics: data
        });

    } catch (error: any) {
        console.error('Get biometrics error:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar biometria' },
            { status: 500 }
        );
    }
}
