// app/api/patients/[id]/biometrics/verify/route.ts
// CliniGo Premium - Endpoint de Verificação Facial 1:1 para Consultório Clínico

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decryptFaceDescriptor, calculateFaceDistance } from '@/lib/utils/face-encryption';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: patientId } = await params;
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        const clinicId = userData?.clinic_id;
        if (!clinicId) {
            return NextResponse.json({ success: false, error: 'Clínica não vinculada' }, { status: 400 });
        }

        const body = await request.json();
        const { descriptor } = body;

        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            return NextResponse.json({
                success: false,
                error: 'Descritor facial inválido. Deve conter 128 dimensões numéricas.'
            }, { status: 400 });
        }

        const liveDescriptor = new Float32Array(descriptor);
        const adminSupabase = createServiceRoleClient();

        // 1. Buscar registros biométricos existentes do paciente e seus responsáveis
        const { data: records, error: fetchError } = await adminSupabase
            .from('patient_face_biometrics')
            .select('id, patient_id, clinic_id, person_type, person_name, face_descriptor_encrypted, reference_image_url')
            .eq('patient_id', patientId)
            .eq('clinic_id', clinicId);

        if (fetchError) {
            console.error('[Biometrics Verify] Erro ao buscar registros:', fetchError);
            return NextResponse.json({ success: false, error: 'Erro ao consultar biometria' }, { status: 500 });
        }

        if (!records || records.length === 0) {
            return NextResponse.json({
                success: true,
                hasBiometrics: false,
                match: false,
                message: 'Paciente não possui biometria cadastrada'
            });
        }

        // 2. Comparar descritor recebido com os descritores cadastrados
        const THRESHOLD = 0.58; // Padrão seguro para face-api.js ssdMobilenetv1
        let bestMatch: {
            id: string;
            person_type: string;
            person_name: string | null;
            reference_image_url: string | null;
            distance: number;
            confidence: number;
        } | null = null;

        for (const record of records) {
            if (!record.face_descriptor_encrypted) continue;

            try {
                let storedDescriptor: Float32Array | null = null;

                try {
                    storedDescriptor = decryptFaceDescriptor(record.face_descriptor_encrypted);
                } catch {
                    // Fallback para caso esteja salvo em base64 simples de JSON
                    const rawJson = Buffer.from(record.face_descriptor_encrypted, 'base64').toString('utf-8');
                    const parsed = JSON.parse(rawJson);
                    if (Array.isArray(parsed) && parsed.length === 128) {
                        storedDescriptor = new Float32Array(parsed);
                    }
                }

                if (!storedDescriptor || storedDescriptor.length !== 128) continue;

                const distance = calculateFaceDistance(liveDescriptor, storedDescriptor);

                if (distance < THRESHOLD) {
                    const confidence = Math.max(50, Math.min(99, Math.round((1 - (distance / THRESHOLD)) * 50 + 50)));

                    if (!bestMatch || distance < bestMatch.distance) {
                        bestMatch = {
                            id: record.id,
                            person_type: record.person_type || 'patient',
                            person_name: record.person_name || null,
                            reference_image_url: record.reference_image_url || null,
                            distance,
                            confidence
                        };
                    }
                }
            } catch (err) {
                console.warn('[Biometrics Verify] Falha ao decriptar/comparar registro:', record.id, err);
            }
        }

        if (bestMatch) {
            return NextResponse.json({
                success: true,
                hasBiometrics: true,
                match: true,
                matchData: bestMatch,
                message: 'Identificação facial confirmada com sucesso'
            });
        }

        return NextResponse.json({
            success: true,
            hasBiometrics: true,
            match: false,
            message: 'Rosto posicionado não confere com os cadastros do paciente ou responsáveis'
        });

    } catch (error: any) {
        console.error('[Biometrics Verify API] Erro não tratado:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Erro interno na verificação biométrica'
        }, { status: 500 });
    }
}
