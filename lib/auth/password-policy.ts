/**
 * Política de senha e tradução amigável de erros do Supabase Auth (pt-BR).
 * Evita mensagens técnicas em inglês (ex.: "Database error creating new user"
 * ou "AuthWeakPasswordError") durante cadastro no /trial, redefinição e ativação.
 */

export interface PasswordStrengthResult {
    hasMinLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
    hasSymbol: boolean
    isCommonWeak: boolean
    score: 0 | 1 | 2 | 3 | 4
    label: 'Muito fraca' | 'Fraca' | 'Boa' | 'Forte'
    isAcceptable: boolean
    weakReason: string | null
}

export interface TranslatedAuthError {
    status: number
    code: string
    message: string
    isPasswordError: boolean
}

const COMMON_WEAK_PASSWORDS = new Set([
    '123456',
    '1234567',
    '12345678',
    '123456789',
    '1234567890',
    '01234567',
    '012345678',
    '0123456789',
    '98765432',
    '987654321',
    '87654321',
    '654321',
    '000000',
    '00000000',
    '111111',
    '11111111',
    '22222222',
    '123123',
    '123123123',
    '12341234',
    '102030',
    '10203040',
    'qwerty',
    'qwerty123',
    'qwertyuiop',
    'password',
    'password1',
    'password123',
    'senha',
    'senha123',
    'senha1234',
    'senha12345',
    'mudar123',
    'admin',
    'admin123',
    'admin1234',
    'clinigo',
    'clinigo123',
    'clinica',
    'clinica123',
    'teste123',
    'teste1234',
    'abcdef',
    'abcdef12',
    'abcdef123',
    'abc123',
    'abc12345',
    'abc123456',
    'iloveyou',
    'letmein',
    'welcome',
    'brasil123',
    'saude123',
])

const SEQUENTIAL_PATTERNS = [
    '0123456789',
    '9876543210',
    'abcdefghijklmnopqrstuvwxyz',
    'qwertyuiopasdfghjklzxcvbnm',
]

function isObviousSequentialOrRepeated(value: string): boolean {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return false

    if (COMMON_WEAK_PASSWORDS.has(normalized)) {
        return true
    }

    // Todos os caracteres iguais (ex.: aaaaaaaa, 99999999)
    if (/^(.)\1+$/.test(normalized)) {
        return true
    }

    // Padrão curto repetido (ex.: 12121212, abababab)
    if (normalized.length >= 6 && /^(.{2,3})\1+$/.test(normalized)) {
        return true
    }

    // Apenas números com até 8 dígitos (datas/telefones/sequências simples quase sempre rejeitados pelo HIBP)
    if (/^\d{1,8}$/.test(normalized)) {
        return true
    }

    // Substring direta de sequências clássicas de teclado/alfabeto/números
    if (normalized.length >= 6) {
        for (const seq of SEQUENTIAL_PATTERNS) {
            if (seq.includes(normalized)) {
                return true
            }
        }
    }

    return false
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
    const value = password || ''
    const hasMinLength = value.length >= 8
    const hasUppercase = /[A-Z]/.test(value)
    const hasLowercase = /[a-z]/.test(value)
    const hasNumber = /\d/.test(value)
    const hasSymbol = /[^A-Za-z0-9]/.test(value)
    const isCommonWeak = value.length > 0 && isObviousSequentialOrRepeated(value)

    if (!value) {
        return {
            hasMinLength: false,
            hasUppercase: false,
            hasLowercase: false,
            hasNumber: false,
            hasSymbol: false,
            isCommonWeak: false,
            score: 0,
            label: 'Muito fraca',
            isAcceptable: false,
            weakReason: null,
        }
    }

    if (isCommonWeak) {
        return {
            hasMinLength,
            hasUppercase,
            hasLowercase,
            hasNumber,
            hasSymbol,
            isCommonWeak: true,
            score: 1,
            label: 'Muito fraca',
            isAcceptable: false,
            weakReason:
                'Esta senha é muito comum ou fácil de adivinhar e será bloqueada por segurança. Misture letras maiúsculas, minúsculas, números e um símbolo como @ ou #.',
        }
    }

    let rawPoints = 0
    if (hasMinLength) rawPoints += 1
    if (hasUppercase && hasLowercase) rawPoints += 1
    else if (hasUppercase || hasLowercase) rawPoints += 0.5
    if (hasNumber) rawPoints += 1
    if (hasSymbol) rawPoints += 1
    if (value.length >= 12) rawPoints += 0.5

    const score = Math.min(4, Math.max(1, Math.floor(rawPoints))) as 1 | 2 | 3 | 4

    const label: PasswordStrengthResult['label'] =
        !hasMinLength
            ? 'Muito fraca'
            : score <= 1
                ? 'Fraca'
                : score === 2
                    ? 'Fraca'
                    : score === 3
                        ? 'Boa'
                        : 'Forte'

    const hasLettersAndDigitsOrSymbols =
        (hasUppercase || hasLowercase) && (hasNumber || hasSymbol)

    const isAcceptable = hasMinLength && hasLettersAndDigitsOrSymbols

    const weakReason = !hasMinLength
        ? 'A senha precisa ter no mínimo 8 caracteres.'
        : !hasLettersAndDigitsOrSymbols
            ? 'Combine letras com números ou símbolos (como @, # ou !) para proteger o acesso da sua clínica.'
            : null

    return {
        hasMinLength,
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSymbol,
        isCommonWeak: false,
        score: hasMinLength ? score : 1,
        label,
        isAcceptable,
        weakReason,
    }
}

function getRandomInt(maxExclusive: number): number {
    if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
        const array = new Uint32Array(1)
        globalThis.crypto.getRandomValues(array)
        return array[0] % maxExclusive
    }
    return Math.floor(Math.random() * maxExclusive)
}

/**
 * Gera uma senha forte, legível e livre de caracteres ambíguos (I/l/1/O/0),
 * garantindo conformidade imediata com a proteção contra senhas vazadas do Supabase Auth.
 */
export function generateFriendlyStrongPassword(): string {
    const prefixes = ['Saude', 'Clinica', 'Cuidar', 'Atende', 'Agenda', 'Vida', 'Fluxo', 'Terapia']
    const symbols = ['@', '#', '!', '$', '%']
    const upperPool = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lowerPool = 'abcdefghjkmnpqrstuvwxyz'
    const digitPool = '23456789'

    const prefix = prefixes[getRandomInt(prefixes.length)]
    const symbol = symbols[getRandomInt(symbols.length)]
    let digits = ''
    for (let i = 0; i < 4; i++) {
        digits += digitPool[getRandomInt(digitPool.length)]
    }
    const suffixUpper = upperPool[getRandomInt(upperPool.length)]
    const suffixLower = lowerPool[getRandomInt(lowerPool.length)]

    return `${prefix}${symbol}${digits}${suffixUpper}${suffixLower}`
}

/**
 * Traduz qualquer erro retornado pelo Supabase Auth (createUser / updateUserById)
 * para uma resposta clara, acionável e 100% em português brasileiro.
 */
export function translateSupabaseAuthError(
    error: unknown,
    options?: {
        duplicateMessage?: string
        fallbackMessage?: string
    }
): TranslatedAuthError {
    const errObj = (error && typeof error === 'object' ? error : {}) as {
        code?: string
        name?: string
        message?: string
        status?: number
        reasons?: string[]
    }

    const code = String(errObj.code || '').toLowerCase()
    const name = String(errObj.name || '').toLowerCase()
    const message = String(errObj.message || '').toLowerCase()
    const reasons = Array.isArray(errObj.reasons)
        ? errObj.reasons.map((r) => String(r).toLowerCase())
        : []

    // 1. Mesma senha na alteração/redefinição (checar antes de weak_password pois a msg contém "password should be")
    if (code === 'same_password' || message.includes('different from the old password')) {
        return {
            status: 422,
            code: 'SAME_PASSWORD',
            isPasswordError: true,
            message: 'A nova senha precisa ser diferente da senha anterior.',
        }
    }

    // 2. Senha fraca, vazada (HIBP / pwned) ou fora dos critérios mínimos
    const isWeakPassword =
        code === 'weak_password' ||
        name === 'authweakpassworderror' ||
        message.includes('weak') ||
        message.includes('easy to guess') ||
        message.includes('pwned') ||
        message.includes('leaked') ||
        message.includes('password should be') ||
        message.includes('password must') ||
        (message.includes('password') && message.includes('at least'))

    if (isWeakPassword) {
        const isLeakedOrCommon =
            reasons.includes('pwned') ||
            message.includes('known to be weak') ||
            message.includes('easy to guess') ||
            message.includes('pwned') ||
            message.includes('leaked')

        if (isLeakedOrCommon) {
            return {
                status: 422,
                code: 'WEAK_PASSWORD',
                isPasswordError: true,
                message:
                    'Esta senha é muito comum ou já apareceu em vazamentos na internet e foi bloqueada por segurança. Crie uma senha diferente com pelo menos 8 caracteres, misturando letras maiúsculas, minúsculas, números e um símbolo (como @, # ou !).',
            }
        }

        if (reasons.includes('length') || message.includes('at least') || message.includes('characters')) {
            return {
                status: 422,
                code: 'WEAK_PASSWORD',
                isPasswordError: true,
                message:
                    'A senha informada é muito curta. Use no mínimo 8 caracteres, combinando letras maiúsculas, minúsculas, números e um símbolo (como @ ou #).',
            }
        }

        return {
            status: 422,
            code: 'WEAK_PASSWORD',
            isPasswordError: true,
            message:
                'A senha escolhida não atende aos critérios de segurança. Use pelo menos 8 caracteres misturando letras maiúsculas, minúsculas, números e um símbolo (como @, # ou !).',
        }
    }

    // 3. E-mail já cadastrado
    if (
        code === 'email_exists' ||
        code === 'user_already_exists' ||
        message.includes('already') ||
        message.includes('exists') ||
        message.includes('registered')
    ) {
        return {
            status: 400,
            code: 'EMAIL_ALREADY_EXISTS',
            isPasswordError: false,
            message:
                options?.duplicateMessage ||
                'Já existe uma conta cadastrada com este e-mail. Tente fazer login ou recuperar sua senha.',
        }
    }

    // 4. E-mail inválido
    if (
        code === 'email_address_invalid' ||
        message.includes('invalid email') ||
        message.includes('unable to validate email')
    ) {
        return {
            status: 400,
            code: 'INVALID_EMAIL',
            isPasswordError: false,
            message:
                'O endereço de e-mail informado é inválido. Verifique se há espaços extras ou erros de digitação e tente novamente.',
        }
    }

    // 5. Rate limit
    if (
        errObj.status === 429 ||
        code === 'over_request_rate_limit' ||
        message.includes('rate limit') ||
        message.includes('too many requests')
    ) {
        return {
            status: 429,
            code: 'RATE_LIMITED',
            isPasswordError: false,
            message: 'Muitas tentativas em sequência. Aguarde cerca de 1 minuto e tente novamente.',
        }
    }

    // 6. Fallback seguro — nunca expõe inglês cru ("Database error creating new user")
    return {
        status: 400,
        code: 'AUTH_ERROR',
        isPasswordError: false,
        message:
            options?.fallbackMessage ||
            'Não foi possível concluir seu acesso agora. Verifique os dados informados e tente novamente em instantes.',
    }
}

