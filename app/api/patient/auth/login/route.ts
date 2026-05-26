import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const loginSchema = z.object({
    cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
    password: z.string().min(1, 'Senha é obrigatória'),
})

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'clinigo-patient-portal-secret-key-2026'
)

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { cpf, password } = loginSchema.parse(body)

        const supabase = await createClient()

        // 1. Buscar paciente pelo CPF
        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, full_name, email, cpf, date_of_birth')
            .eq('cpf', cpf)
            .single()

        if (patientError || !patient) {
            return NextResponse.json(
                { error: 'CPF ou senha incorretos' },
                { status: 401 }
            )
        }

        // 2. Buscar credenciais
        const { data: credentials } = await supabase
            .from('patient_credentials')
            .select('*')
            .eq('patient_id', patient.id)
            .maybeSingle()

        // Verificar se a senha inserida coincide com a data de nascimento (primeiro acesso)
        let isDOBValid = false
        if (patient.date_of_birth) {
            const [year, month, day] = patient.date_of_birth.split('-')
            const expectedDOBPassword = `${day}${month}${year}` // DDMMAAAA
            const cleanInputPassword = password.replace(/\D/g, '')
            if (cleanInputPassword === expectedDOBPassword && expectedDOBPassword.length === 8) {
                isDOBValid = true
            }
        }

        if (!credentials && !isDOBValid) {
            return NextResponse.json(
                { error: 'CPF ou senha incorretos' },
                { status: 401 }
            )
        }

        // 3. Verificar se está bloqueado
        if (credentials && credentials.locked_until && new Date(credentials.locked_until) > new Date()) {
            const minutesLeft = Math.ceil(
                (new Date(credentials.locked_until).getTime() - Date.now()) / 60000
            )
            return NextResponse.json(
                { error: `Conta bloqueada. Tente novamente em ${minutesLeft} minutos.` },
                { status: 423 }
            )
        }

        // 4. Verificar senha
        let isValid = false
        if (credentials) {
            isValid = await bcrypt.compare(password, credentials.password_hash)
        }

        // Se a senha por data de nascimento for válida, autentica o login
        if (isDOBValid) {
            isValid = true

            // Se for o primeiro acesso (sem registro em patient_credentials), inicializa as credenciais
            if (!credentials) {
                const passwordHash = await bcrypt.hash(password, 12)
                await supabase
                    .from('patient_credentials')
                    .insert({
                        patient_id: patient.id,
                        password_hash: passwordHash,
                    })
            }
        }

        if (!isValid) {
            if (credentials) {
                // Incrementar tentativas
                const newAttempts = (credentials.login_attempts || 0) + 1
                const updates: any = { login_attempts: newAttempts }

                // Bloquear após 5 tentativas
                if (newAttempts >= 5) {
                    updates.locked_until = new Date(Date.now() + 15 * 60 * 1000) // 15 min
                    updates.login_attempts = 0
                }

                await supabase
                    .from('patient_credentials')
                    .update(updates)
                    .eq('id', credentials.id)
            }

            return NextResponse.json(
                { error: 'CPF ou senha incorretos' },
                { status: 401 }
            )
        }

        // 5. Login bem sucedido - resetar tentativas
        if (credentials) {
            await supabase
                .from('patient_credentials')
                .update({
                    login_attempts: 0,
                    last_login: new Date().toISOString(),
                })
                .eq('id', credentials.id)
        }

        // 6. Gerar JWT token
        const token = await new SignJWT({
            sub: patient.id,
            cpf: patient.cpf,
            name: patient.full_name,
            type: 'patient',
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(JWT_SECRET)

        // 7. Salvar sessão
        const tokenHash = Buffer.from(token.slice(-32)).toString('base64')
        await supabase
            .from('patient_sessions')
            .insert({
                patient_id: patient.id,
                token_hash: tokenHash,
                ip_address: request.headers.get('x-forwarded-for') || 'unknown',
                user_agent: request.headers.get('user-agent') || 'unknown',
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })

        // 8. Resposta com cookie
        const response = NextResponse.json({
            success: true,
            patient: {
                id: patient.id,
                name: patient.full_name,
                email: patient.email,
            }
        })

        // Setar cookie seguro
        response.cookies.set('patient_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60, // 7 dias
            path: '/',
        })

        return response

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.errors[0].message },
                { status: 400 }
            )
        }
        console.error('Erro no login:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

