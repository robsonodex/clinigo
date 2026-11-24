import { redirect } from 'next/navigation'

/**
 * Rota legada de configurações globais do sistema (API /api/admin/settings descontinuada).
 * Redireciona para as configurações oficiais do Master Hub.
 */
export default function LegacyAdminSystemRedirectPage() {
    redirect('/system-master-hub/configuracoes')
}
