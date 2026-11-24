import { redirect } from 'next/navigation'

/**
 * Rota legada de escolha de plano — redireciona para a tela oficial de Assinatura & Planos.
 */
export default function LegacyPlanRedirectPage() {
    redirect('/dashboard/configuracoes/assinatura')
}
