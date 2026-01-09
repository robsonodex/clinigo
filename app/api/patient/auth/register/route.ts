import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const registerSchema = z.object({
    cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { cpf, email, password } = registerSchema.parse(body)

        const supabase = await createClient()

        // 1. Verificar se paciente existe com esse CPF
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, email, full_name')
            .eq('cpf', cpf)
            .single()

        if (patientError || !patient) {
            return NextResponse.json(
                { error: 'CPF não encontrado. Você precisa ter sido atendido em uma clínica primeiro.' },
                { status: 404 }
            )
        }

        // 2. Verificar se já tem credenciais
        const { data: existingCred } = await supabase
            .from('patient_credentials')
            .select('id')
            .eq('patient_id', patient.id)
            .single()

        if (existingCred) {
            return NextResponse.json(
                { error: 'Você já possui uma conta. Faça login.' },
                { status: 409 }
            )
        }

        // 3. Criar hash da senha
        const passwordHash = await bcrypt.hash(password, 12)

        // 4. Criar credenciais
        const { error: createError } = await supabase
            .from('patient_credentials')
            .insert({
                patient_id: patient.id,
                password_hash: passwordHash,
            })

        if (createError) {
            console.error('Erro ao criar credenciais:', createError)
            return NextResponse.json(
                { error: 'Erro ao criar conta' },
                { status: 500 }
            )
        }

        // 5. Atualizar email do paciente se diferente
        if (email !== patient.email) {
            await supabase
                .from('patients')
                .update({ email })
                .eq('id', patient.id)
        }

        return NextResponse.json({
            success: true,
            message: 'Conta criada com sucesso! Faça login.',
            patient: {
                name: patient.full_name,
            }
        })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.errors[0].message },
                { status: 400 }
            )
        }
        console.error('Erro no registro:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

