import fs from 'fs';
import path from 'path';
import {
    HELP_SPOTLIGHT_CLASS,
    clearHelpSpotlight,
    resolveHelpSpotlightTarget,
} from '@/lib/help/in-page-spotlight';
import { PRESET_TOPICS } from '@/components/tiss/tiss-contextual-help';

describe('Ajuda Lateral Interativa com Orientação Visual (Pulsar In-Page) — Glosas TISS', () => {
    afterEach(() => {
        clearHelpSpotlight();
    });

    it('deve resolver alvo principal primeiro e marcar isFallback=true quando cair no pré-requisito', () => {
        const fakeElPrimary = { id: 'primary' } as unknown as HTMLElement;
        const fakeElFallback = { id: 'fallback' } as unknown as HTMLElement;

        const fakeDocPrimary = {
            querySelector: (sel: string) =>
                sel === '[data-help-target="glosas-l2-filters"]' ? fakeElPrimary : null,
        } as unknown as Document;

        const resPrimary = resolveHelpSpotlightTarget(
            ['glosas-l2-filters', 'glosas-l1-start-review'],
            fakeDocPrimary
        );
        expect(resPrimary.matchedTarget).toBe('glosas-l2-filters');
        expect(resPrimary.isFallback).toBe(false);

        const fakeDocFallback = {
            querySelector: (sel: string) =>
                sel === '[data-help-target="glosas-l1-start-review"]' ? fakeElFallback : null,
        } as unknown as Document;

        const resFallback = resolveHelpSpotlightTarget(
            ['glosas-l2-filters', 'glosas-l1-start-review'],
            fakeDocFallback
        );
        expect(resFallback.matchedTarget).toBe('glosas-l1-start-review');
        expect(resFallback.isFallback).toBe(true);
    });

    it('todos os alvos mapeados em tiss-controle-glosas e tiss-recursos-dossie devem existir fisicamente nas telas de Glosas', () => {
        const root = process.cwd();
        const combinedSources = [
            'app/dashboard/(clinic)/tiss/glosas/page.tsx',
            'components/tiss/glosa-level1-batches.tsx',
            'components/tiss/glosa-level2-accounts.tsx',
            'components/tiss/glosa-level3-account-editor.tsx',
        ]
            .map((rel) => fs.readFileSync(path.join(root, rel), 'utf8'))
            .join('\n');

        for (const topicKey of ['tiss-controle-glosas', 'tiss-recursos-dossie'] as const) {
            const topic = PRESET_TOPICS[topicKey];
            expect(topic.steps.length).toBeGreaterThanOrEqual(4);
            for (const s of topic.steps) {
                expect(Array.isArray(s.targetKeys)).toBe(true);
                expect((s.targetKeys || []).length).toBeGreaterThan(0);
                for (const key of s.targetKeys || []) {
                    expect(combinedSources).toContain(`data-help-target="${key}"`);
                }
            }
        }
    });

    it('deve manter o botão Abrir Manual Completo em /dashboard/help intacto e definir o CSS clinigo-help-spotlight', () => {
        const root = process.cwd();
        const helpComp = fs.readFileSync(
            path.join(root, 'components/tiss/tiss-contextual-help.tsx'),
            'utf8'
        );
        const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');

        expect(helpComp).toContain('Abrir Manual Completo em /dashboard/help');
        expect(helpComp).toContain('href={`/dashboard/help#${anchor}`}');
        expect(helpComp).toContain('triggerHelpSpotlight');
        expect(helpComp).not.toMatch(/\bSparkles\b|\bPartyPopper\b|bg-gradient-to-/);

        expect(css).toContain(`.${HELP_SPOTLIGHT_CLASS}`);
        expect(css).toContain('@keyframes clinigo-help-pulse');
        expect(css).toContain('prefers-reduced-motion');
    });

    it('alvos do Radar Dinheiro na Mesa, Blindagem TEA e Acato × Crédito devem existir nas telas TISS', () => {
        const root = process.cwd();
        const radarSrc = fs.readFileSync(
            path.join(root, 'components/tiss/TissRevenueRadarCard.tsx'),
            'utf8'
        );
        const glosasSrc = fs.readFileSync(
            path.join(root, 'app/dashboard/(clinic)/tiss/glosas/page.tsx'),
            'utf8'
        );

        expect(radarSrc).toContain('data-help-target="tiss-radar-receita"');
        expect(radarSrc).toContain('data-help-target="tiss-blindagem-tea"');
        expect(glosasSrc).toContain('data-help-target="glosas-acato-credito"');
    });
});

