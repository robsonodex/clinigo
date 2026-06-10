'use client'

/**
 * SessionGuardProvider
 * Componente que monitora a sessão única do usuário.
 * Deve ser incluído em layouts protegidos (dashboard, mobile).
 * Não renderiza nada visual — apenas executa o hook de polling.
 */
import { useSessionGuard } from '@/lib/hooks/use-session-guard'

export function SessionGuardProvider() {
    useSessionGuard()
    return null
}
