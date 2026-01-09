import { type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'clinigo-patient-portal-secret-key-2026'
)

export interface PatientTokenPayload {
    sub: string // patient_id
    cpf: string
    name: string
    type: 'patient'
    iat: number
    exp: number
}

/**
 * Verifica e decodifica o token JWT do paciente
 */
export async function verifyPatientToken(
    request: NextRequest
): Promise<PatientTokenPayload | null> {
    try {
        // Primeiro tenta cookie
        const cookieToken = request.cookies.get('patient_token')?.value

        // Depois tenta header Authorization
        const authHeader = request.headers.get('Authorization')
        const headerToken = authHeader?.startsWith('Bearer ')
            ? authHeader.substring(7)
            : null

        const token = cookieToken || headerToken

        if (!token) {
            return null
        }

        const { payload } = await jwtVerify(token, JWT_SECRET)

        // Verificar se é token de paciente
        if (payload.type !== 'patient') {
            return null
        }

        return payload as unknown as PatientTokenPayload

    } catch (error) {
        console.error('Erro ao verificar token do paciente:', error)
        return null
    }
}

/**
 * Middleware helper para proteger rotas de paciente
 */
export function requirePatientAuth(
    handler: (request: NextRequest, patient: PatientTokenPayload) => Promise<Response>
) {
    return async (request: NextRequest) => {
        const patient = await verifyPatientToken(request)

        if (!patient) {
            return new Response(
                JSON.stringify({ error: 'Não autorizado' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        }

        return handler(request, patient)
    }
}

