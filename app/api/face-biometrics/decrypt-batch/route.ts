import { withAxiom, AxiomRequest } from 'next-axiom'
// app/api/face-biometrics/decrypt-batch/route.ts
// CliniGo - API para descriptografar múltiplos face descriptors

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decryptFaceDescriptor } from '@/lib/utils/face-encryption';

export const POST = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient();

        // Verifica autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        // Verifica se usuário pertence a uma clínica
        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single();

        if (!userData?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 });
        }

        const { encrypted } = await request.json();

        if (!encrypted || !Array.isArray(encrypted)) {
            return NextResponse.json(
                { error: 'Formato inválido. Esperado array de objetos {id, data}.' },
                { status: 400 }
            );
        }

        // Descriptografa todos os descriptors
        const decrypted = encrypted.map((item: { id: string; data: string }) => {
            try {
                const descriptor = decryptFaceDescriptor(item.data);
                return Array.from(descriptor);
            } catch (error) {
        request.log.error('face-biometrics/decrypt-batch', { error: error instanceof Error ? error.message : String(error) })
                console.error(`Failed to decrypt descriptor for ${item.id}:`, error);
                return null;
            }
        });

        return NextResponse.json({ decrypted });

    } catch (error: any) {
        request.log.error('face-biometrics/decrypt-batch', { error: error instanceof Error ? error.message : String(error) })
        console.error('Face decryption batch error:', error);
        return NextResponse.json(
            { error: 'Erro interno ao descriptografar' },
            { status: 500 }
        );
    }
})
