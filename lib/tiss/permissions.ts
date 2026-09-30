// lib/tiss/permissions.ts
/**
 * CLINIGO - Matriz de Permissões por Ação do Módulo de Faturamento e TISS
 * 
 * Regra do Menor Privilégio (Seção 5 da Especificação Oficial):
 * - RECEPTIONIST: apenas criar/salvar/validar/duplicar/imprimir guias e excluir rascunho próprio.
 * - FINANCIAL: faturamento completo, lotes, xml, retornos, conciliação, recursos e visualização de tabelas de preços/TUSS.
 * - CLINIC_ADMIN / SUPER_ADMIN: todas as ações, incluindo ações destrutivas (desfazer retorno, editar pricing/tuss, ativar demo).
 * - READONLY: somente leitura geral e imprimir guias.
 * - DOCTOR: BLOQUEADO (NUNCA acessa nada deste módulo).
 */

export type TissUserRole = 'SUPER_ADMIN' | 'CLINIC_ADMIN' | 'FINANCIAL' | 'RECEPTIONIST' | 'READONLY' | 'DOCTOR' | string;

export type TissAction =
    // Guias
    | 'guia.ver'
    | 'guia.criar'
    | 'guia.salvar_rascunho'
    | 'guia.validar'
    | 'guia.duplicar'
    | 'guia.imprimir'
    | 'guia.excluir_rascunho'
    | 'guia.cancelar'
    | 'guia.criar_em_massa'
    // Lotes
    | 'lote.ver'
    | 'lote.criar'
    | 'lote.vincular_guias'
    | 'lote.remover_guias'
    | 'lote.fechar'
    | 'lote.reabrir'
    | 'lote.gerar_xml'
    | 'lote.baixar_xml'
    | 'lote.registrar_envio'
    | 'lote.transmitir'
    | 'lote.assinar'
    // Retorno e Conciliação
    | 'retorno.ver'
    | 'retorno.importar'
    | 'retorno.conciliar'
    | 'retorno.lancar_glosa_manual'
    | 'retorno.desfazer'
    // Recurso de Glosa
    | 'recurso.ver'
    | 'recurso.criar'
    | 'recurso.justificar'
    | 'recurso.anexar'
    | 'recurso.gerar_lote_recurso'
    | 'recurso.liberar_envio'
    | 'recurso.registrar_resultado'
    // Configurações & Tabelas
    | 'config.tabelas_preco.ver'
    | 'config.tabelas_preco.editar'
    | 'config.tuss.ver'
    | 'config.tuss.editar'
    | 'config.operadoras.ver'
    | 'config.operadoras.editar'
    | 'config.demonstracao.ativar'
    | 'config.premium.ver'
    | 'config.premium.editar'
    // Convênios de Pacientes e Autorizações
    | 'paciente_convenio.ver'
    | 'paciente_convenio.editar'
    | 'autorizacao.ver'
    | 'autorizacao.solicitar'
    | 'autorizacao.enviar';

export const TISS_ACTION_MATRIX: Record<TissAction, string[]> = {
    // Guias
    'guia.ver': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST', 'READONLY'],
    'guia.criar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
    'guia.salvar_rascunho': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
    'guia.validar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
    'guia.duplicar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
    'guia.imprimir': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST', 'READONLY'],
    'guia.excluir_rascunho': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
    'guia.cancelar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'guia.criar_em_massa': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],

    // Lotes
    'lote.ver': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST', 'READONLY'],
    'lote.criar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'lote.vincular_guias': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'lote.remover_guias': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'lote.fechar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'lote.reabrir': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'lote.gerar_xml': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'lote.baixar_xml': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'lote.registrar_envio': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'lote.transmitir': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'lote.assinar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],

    // Retorno e Conciliação
    'retorno.ver': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST', 'READONLY'],
    'retorno.importar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'retorno.conciliar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'retorno.lancar_glosa_manual': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'retorno.desfazer': ['SUPER_ADMIN', 'CLINIC_ADMIN'], // Apenas ADMIN pode desfazer retorno financeiro

    // Recurso de Glosa
    'recurso.ver': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST', 'READONLY'],
    'recurso.criar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'recurso.justificar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'recurso.anexar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'recurso.gerar_lote_recurso': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'recurso.liberar_envio': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'recurso.registrar_resultado': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],

    // Configurações & Tabelas
    'config.tabelas_preco.ver': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'config.tabelas_preco.editar': ['SUPER_ADMIN', 'CLINIC_ADMIN'],
    'config.tuss.ver': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST', 'READONLY'],
    'config.tuss.editar': ['SUPER_ADMIN', 'CLINIC_ADMIN'],
    'config.operadoras.ver': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST', 'READONLY'],
    'config.operadoras.editar': ['SUPER_ADMIN', 'CLINIC_ADMIN'],
    'config.demonstracao.ativar': ['SUPER_ADMIN'],
    'config.premium.ver': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL'],
    'config.premium.editar': ['SUPER_ADMIN', 'CLINIC_ADMIN'],

    // Convênios de Pacientes e Autorizações
    'paciente_convenio.ver': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST', 'READONLY'],
    'paciente_convenio.editar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
    'autorizacao.ver': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST', 'READONLY'],
    'autorizacao.solicitar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
    'autorizacao.enviar': ['SUPER_ADMIN', 'CLINIC_ADMIN', 'FINANCIAL', 'RECEPTIONIST'],
};

/**
 * Avalia se um papel tem permissão para executar uma ação específica
 */
export function canPerformTissAction(role: string | null | undefined, action: TissAction): boolean {
    if (!role) return false;
    // DOCTOR NUNCA tem acesso a nenhuma ação TISS
    if (role === 'DOCTOR') return false;

    const allowedRoles = TISS_ACTION_MATRIX[action];
    if (!allowedRoles) return false;

    return allowedRoles.includes(role);
}
