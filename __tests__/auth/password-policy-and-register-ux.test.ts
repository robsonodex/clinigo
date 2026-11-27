import fs from 'fs'
import path from 'path'
import {
    evaluatePasswordStrength,
    generateFriendlyStrongPassword,
    translateSupabaseAuthError,
} from '@/lib/auth/password-policy'

describe('Política de Senha e Tradução de Erros do Supabase Auth (Anti-Abandono /trial)', () => {
    describe('translateSupabaseAuthError', () => {
        it('traduz o erro exato AuthWeakPasswordError (weak_password / pwned) para orientação clara em pt-BR com HTTP 422', () => {
            const supabaseError = {
                __isAuthError: true,
                name: 'AuthWeakPasswordError',
                status: 422,
                code: 'weak_password',
                reasons: ['pwned'],
                message: 'Password is known to be weak and easy to guess, please choose a different one.',
            }

            const result = translateSupabaseAuthError(supabaseError)

            expect(result.status).toBe(422)
            expect(result.code).toBe('WEAK_PASSWORD')
            expect(result.isPasswordError).toBe(true)
            expect(result.message).toContain('muito comum')
            expect(result.message).toContain('8 caracteres')
            expect(result.message).not.toMatch(/Database error|easy to guess|weak_password/i)
        })

        it('traduz erro de tamanho mínimo de senha para pt-BR com HTTP 422', () => {
            const result = translateSupabaseAuthError({
                code: 'weak_password',
                reasons: ['length'],
                message: 'Password should be at least 8 characters.',
            })

            expect(result.status).toBe(422)
            expect(result.code).toBe('WEAK_PASSWORD')
            expect(result.isPasswordError).toBe(true)
            expect(result.message).toContain('no mínimo 8 caracteres')
        })

        it('traduz erro de mesma senha na redefinição com HTTP 422', () => {
            const result = translateSupabaseAuthError({
                code: 'same_password',
                message: 'New password should be different from the old password.',
            })

            expect(result.status).toBe(422)
            expect(result.code).toBe('SAME_PASSWORD')
            expect(result.isPasswordError).toBe(true)
        })

        it('traduz e-mail já existente respeitando duplicateMessage customizada', () => {
            const customDup = 'Já existe teste grátis com este e-mail.'
            const result = translateSupabaseAuthError(
                { message: 'User already registered' },
                { duplicateMessage: customDup }
            )

            expect(result.status).toBe(400)
            expect(result.code).toBe('EMAIL_ALREADY_EXISTS')
            expect(result.message).toBe(customDup)
        })

        it('nunca expõe inglês cru ou "Database error creating new user" no fallback', () => {
            const result = translateSupabaseAuthError({
                message: 'Unexpected database error creating new user',
            })

            expect(result.status).toBe(400)
            expect(result.message).not.toMatch(/Database error|creating new user/i)
            expect(result.message).toContain('Não foi possível')
        })
    })

    describe('evaluatePasswordStrength & generateFriendlyStrongPassword', () => {
        it('bloqueia senhas comuns/sequenciais previsíveis antes mesmo de ir ao Supabase', () => {
            for (const weak of ['123456', '12345678', 'senha123', 'qwerty123', 'clinigo123', '11111111']) {
                const ev = evaluatePasswordStrength(weak)
                expect(ev.isCommonWeak).toBe(true)
                expect(ev.isAcceptable).toBe(false)
                expect(ev.weakReason).toBeTruthy()
            }
        })

        it('aprova senha forte com letras, números e símbolo', () => {
            const ev = evaluatePasswordStrength('Clinica@2026Ab')
            expect(ev.isCommonWeak).toBe(false)
            expect(ev.hasMinLength).toBe(true)
            expect(ev.hasUppercase).toBe(true)
            expect(ev.hasNumber).toBe(true)
            expect(ev.hasSymbol).toBe(true)
            expect(ev.isAcceptable).toBe(true)
            expect(ev.score).toBe(4)
            expect(ev.label).toBe('Forte')
        })

        it('gera 20 senhas fortes válidas em sequência sem falhar critérios', () => {
            for (let i = 0; i < 20; i++) {
                const pwd = generateFriendlyStrongPassword()
                const ev = evaluatePasswordStrength(pwd)
                expect(pwd.length).toBeGreaterThanOrEqual(11)
                expect(ev.isCommonWeak).toBe(false)
                expect(ev.isAcceptable).toBe(true)
                expect(ev.score).toBe(4)
            }
        })
    })

    describe('Guardas Estáticas Anti-Regressão nas 4 Rotas de Auth e na Página /trial', () => {
        const root = process.cwd()

        const routesToGuard = [
            'app/api/auth/register/route.ts',
            'app/api/auth/signup/route.ts',
            'app/api/auth/reset-password/route.ts',
            'app/api/auth/activate-account/route.ts',
        ]

        it.each(routesToGuard)('%s usa translateSupabaseAuthError e não retorna inglês genérico', (relPath) => {
            const content = fs.readFileSync(path.join(root, relPath), 'utf8')
            expect(content).toContain('translateSupabaseAuthError')
            expect(content).not.toContain('Database error creating new user')
            expect(content).not.toContain('Failed to create user')
        })

        it('app/trial/page.tsx possui alerta inline role="alert", medidor de força e botão Sugerir senha forte', () => {
            const trialPage = fs.readFileSync(path.join(root, 'app/trial/page.tsx'), 'utf8')
            expect(trialPage).toContain('evaluatePasswordStrength')
            expect(trialPage).toContain('generateFriendlyStrongPassword')
            expect(trialPage).toContain('role="alert"')
            expect(trialPage).toContain('Sugerir senha forte')
            expect(trialPage).toContain("errorCode === 'WEAK_PASSWORD'")
        })
    })
})

