import { redirect } from 'next/navigation'

/**
 * Módulo Página Pública descontinuado a pedido (zero uso pelas clínicas e redução de superfície pública/CPU).
 * Redireciona favoritos antigos diretamente para Configurações da Clínica.
 */
export default function DeprecatedPublicPageRedirect() {
    redirect('/dashboard/configuracoes')
}
