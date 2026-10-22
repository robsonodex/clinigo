import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
// app/api/face-biometrics/encrypt/route.ts
// CliniGo - API para criptografar face descriptor (server-side)

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptFaceDescriptor } from '@/lib/utils/face-encryption';

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient();

        // Verifica autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { descriptor } = await request.json();

        if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
            return NextResponse.json(
                { error: 'Descriptor inválido. Esperado array de 128 floats.' },
                { status: 400 }
            );
        }

        // Converte para Float32Array e criptografa
        const float32 = new Float32Array(descriptor);
        const encrypted = encryptFaceDescriptor(float32);

        return NextResponse.json({ encrypted });

    } catch (error: any) {
        request.log.error('face-biometrics/encrypt', { error: error instanceof Error ? error.message : String(error) })
        console.error('Face encryption error:', error);
        return NextResponse.json(
            { error: 'Erro interno ao criptografar' },
            { status: 500 }
        );
    }
})
