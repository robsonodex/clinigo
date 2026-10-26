import { notFound } from 'next/navigation'

/**
 * Rota /lgpd temporariamente desativada a pedido do usuário
 * (em processo de atualização de conteúdo).
 * Retorna 404 para impedir qualquer acesso via barra de endereço ou navegação.
 * Conteúdo anterior preservado em app/lgpd/page.tsx.bak.
 */
export default function LGPDPage() {
    notFound()
}
