import fs from 'fs';
import path from 'path';
import {
    KNOWLEDGE_BASE_ARTICLES,
    searchKnowledgeArticles,
} from '@/lib/help/knowledge-base';

describe('Knowledge Base (/dashboard/help) & Corporate UI Compliance', () => {
    it('deve possuir ao menos 8 guias passo a passo na trilha TISS & Controle de Glosas', () => {
        const tissArticles = KNOWLEDGE_BASE_ARTICLES.filter((a) => a.module === 'tiss-glosas');
        expect(tissArticles.length).toBeGreaterThanOrEqual(8);

        const requiredAnchors = [
            'tiss-configuracao-convenios',
            'tiss-recepcao-autorizacoes',
            'tiss-elaboracao-contas',
            'tiss-remessas-xml',
            'tiss-retorno-dryrun',
            'tiss-controle-glosas',
            'tiss-recursos-dossie',
            'tiss-repasse-glosas',
        ];
        const anchors = tissArticles.map((a) => a.anchor);
        for (const req of requiredAnchors) {
            expect(anchors).toContain(req);
        }
    });

    it('deve conter o guia explícito de Relatório de Evolução por Paciente/Período em Excel', () => {
        const guide = KNOWLEDGE_BASE_ARTICLES.find((a) => a.id === 'prontuarios-relatorio-evolucao-excel');
        expect(guide).toBeDefined();
        expect(guide!.route).toBe('/dashboard/prontuarios');
        expect(guide!.steps.length).toBeGreaterThanOrEqual(4);
        const joinedSteps = guide!.steps.map((s) => s.description).join(' ');
        expect(joinedSteps).toMatch(/Exportar Excel/i);
        expect(joinedSteps).toMatch(/Paciente/i);
    });

    it('busca por intenção deve localizar guias chave corretamente', () => {
        expect(searchKnowledgeArticles({ query: 'excel evolucao' }).some((a) => a.id === 'prontuarios-relatorio-evolucao-excel')).toBe(true);
        expect(searchKnowledgeArticles({ query: 'ctrl+l' }).some((a) => a.id === 'tiss-elaboracao-contas')).toBe(true);
        expect(searchKnowledgeArticles({ query: '3 niveis' }).some((a) => a.id === 'tiss-controle-glosas')).toBe(true);
        expect(searchKnowledgeArticles({ query: 'dossie' }).some((a) => a.id === 'tiss-recursos-dossie')).toBe(true);
    });

    it('não deve conter emojis, ícones proibidos (Sparkles/PartyPopper) ou termos comerciais proibidos', () => {
        const filesToCheck = [
            'lib/help/knowledge-base.ts',
            'app/dashboard/(clinic)/help/page.tsx',
            'components/tiss/tiss-contextual-help.tsx',
            'components/tiss/account-elaboration-tab.tsx',
            'components/tiss/glosa-level1-batches.tsx',
            'components/tiss/glosa-level2-accounts.tsx',
            'components/tiss/glosa-level3-account-editor.tsx',
            'components/tiss/batch-ans-attachments-panel.tsx',
        ];

        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
        const forbiddenIconRegex = /\b(Sparkles|PartyPopper)\b/;
        const forbiddenTermsRegex = /(controle de caixa|dinheiro|nota fiscal)/i;

        for (const relPath of filesToCheck) {
            const fullPath = path.join(process.cwd(), relPath);
            const content = fs.readFileSync(fullPath, 'utf8');
            expect({ file: relPath, hasEmoji: emojiRegex.test(content) }).toEqual({ file: relPath, hasEmoji: false });
            expect({ file: relPath, hasForbiddenIcon: forbiddenIconRegex.test(content) }).toEqual({ file: relPath, hasForbiddenIcon: false });
            expect({ file: relPath, hasForbiddenTerms: forbiddenTermsRegex.test(content) }).toEqual({ file: relPath, hasForbiddenTerms: false });
        }
    });
});

