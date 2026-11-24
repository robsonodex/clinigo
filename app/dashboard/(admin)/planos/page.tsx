import { redirect } from 'next/navigation'

/**
 * Rota legada de administração de planos (API /api/admin/plans descontinuada).
 * Redireciona para o Master Hub oficial de mudanças de plano.
 */
export default function LegacyAdminPlansRedirectPage() {
    redirect('/system-master-hub/plan-changes')
}
