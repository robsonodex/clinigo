import {
    getAccessibleHelpArticles,
    getHelpAnchorForMenuHref,
    resolveHelpHashToAnchor,
} from '@/lib/help/help-access'
import { KNOWLEDGE_BASE_ARTICLES } from '@/lib/help/knowledge-base'

describe('Cobertura Completa de /dashboard/help — Todas as Entregas CliniGo 2.0 + RBAC Estrito', () => {
    const requiredNewIds = [
        'busca-global-acoes-rapidas',
        'biblioteca-objetivos-psicomotricidade',
        'meu-dia-clinico-clonar-sessao',
        'mesa-supervisao-aba-pei',
        'tiss-operadoras-dossie-probatorio',
        'clinigo-familia-2-escola-antichurn',
        'configuracoes-modulos-clinicos',
        'modo-tatame-curvas-aprendizagem-aba',
        'relatorio-renovacao-convenio-1-clique',
        'radar-operacional-meu-repasse-ao-vivo',
    ]

    it('deve conter todos os 10 guias dedicados das entregas recentes no catálogo do Help', () => {
        const ids = new Set(KNOWLEDGE_BASE_ARTICLES.map((a) => a.id))
        for (const reqId of requiredNewIds) {
            expect(ids.has(reqId)).toBe(true)
        }
    })

    it('deve mapear /dashboard/meu-dia e aliases para o anchor exato meu-dia-clinico-clonar-sessao', () => {
        expect(getHelpAnchorForMenuHref('/dashboard/meu-dia')).toBe('meu-dia-clinico-clonar-sessao')
        expect(resolveHelpHashToAnchor('#meu-dia')).toBe('meu-dia-clinico-clonar-sessao')
        expect(resolveHelpHashToAnchor('#meu-dia-clinico')).toBe('meu-dia-clinico-clonar-sessao')
        expect(resolveHelpHashToAnchor('#modulos-clinicos')).toBe('configuracoes-modulos-clinicos')
        expect(resolveHelpHashToAnchor('#modo-tatame')).toBe('modo-tatame-curvas-aprendizagem-aba')
        expect(resolveHelpHashToAnchor('#renovacao-convenio')).toBe('relatorio-renovacao-convenio-1-clique')
    })

    it('deve segregar estritamente os novos artigos do Help por perfil (RBAC)', () => {
        const doctorIds = getAccessibleHelpArticles({
            role: 'DOCTOR',
            planType: 'PROFESSIONAL',
            clinicId: '99999999-9999-4999-8999-999999999999',
        }).map((a) => a.id)

        expect(doctorIds).toContain('meu-dia-clinico-clonar-sessao')
        expect(doctorIds).toContain('modo-tatame-curvas-aprendizagem-aba')
        expect(doctorIds).toContain('biblioteca-objetivos-psicomotricidade')
        expect(doctorIds).toContain('mesa-supervisao-aba-pei')
        expect(doctorIds).toContain('clinigo-familia-2-escola-antichurn')
        expect(doctorIds).toContain('relatorio-renovacao-convenio-1-clique')
        expect(doctorIds).toContain('radar-operacional-meu-repasse-ao-vivo')
        expect(doctorIds).toContain('busca-global-acoes-rapidas')
        // Bloqueados para DOCTOR
        expect(doctorIds).not.toContain('tiss-operadoras-dossie-probatorio')
        expect(doctorIds).not.toContain('configuracoes-modulos-clinicos')

        const receptionIds = getAccessibleHelpArticles({
            role: 'RECEPTIONIST',
            planType: 'PROFESSIONAL',
            clinicId: '99999999-9999-4999-8999-999999999999',
        }).map((a) => a.id)

        expect(receptionIds).toContain('busca-global-acoes-rapidas')
        expect(receptionIds).toContain('clinigo-familia-2-escola-antichurn')
        expect(receptionIds).toContain('relatorio-renovacao-convenio-1-clique')
        // Bloqueados para RECEPTIONIST (sigilo clínico + TISS + módulos admin)
        expect(receptionIds).not.toContain('meu-dia-clinico-clonar-sessao')
        expect(receptionIds).not.toContain('modo-tatame-curvas-aprendizagem-aba')
        expect(receptionIds).not.toContain('biblioteca-objetivos-psicomotricidade')
        expect(receptionIds).not.toContain('mesa-supervisao-aba-pei')
        expect(receptionIds).not.toContain('tiss-operadoras-dossie-probatorio')
        expect(receptionIds).not.toContain('configuracoes-modulos-clinicos')
        expect(receptionIds).not.toContain('radar-operacional-meu-repasse-ao-vivo')

        const financialIds = getAccessibleHelpArticles({
            role: 'FINANCIAL',
            planType: 'PROFESSIONAL',
            clinicId: '99999999-9999-4999-8999-999999999999',
        }).map((a) => a.id)

        expect(financialIds).toContain('tiss-operadoras-dossie-probatorio')
        expect(financialIds).toContain('busca-global-acoes-rapidas')
        // Bloqueados para FINANCIAL
        expect(financialIds).not.toContain('meu-dia-clinico-clonar-sessao')
        expect(financialIds).not.toContain('modo-tatame-curvas-aprendizagem-aba')
        expect(financialIds).not.toContain('clinigo-familia-2-escola-antichurn')
        expect(financialIds).not.toContain('relatorio-renovacao-convenio-1-clique')
        expect(financialIds).not.toContain('configuracoes-modulos-clinicos')
    })
})

