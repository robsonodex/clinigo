import { redirect } from 'next/navigation'

/**
 * Rota legada de painel Super Admin (API /api/super/metrics descontinuada).
 * Redireciona para o Master Hub oficial.
 */
export default function LegacySuperDashboardRedirectPage() {
    redirect('/system-master-hub')
}
