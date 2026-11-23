import {
    buildFamilyHighlightsFromSessions,
    buildSessionIndicatorSummary,
    computeDttMetrics,
    computeSessionPlansAnalytics,
    extractPerformancePct,
    getPromptLevelMeta,
} from '@/lib/session-plans/learning-curve'

describe('Motor Clínico PEI — Curva de Aprendizagem, DTT/NET e Domínio Automático', () => {
    it('deve calcular corretamente percentual independente, sugestão de meta e texto formatado no DTT', () => {
        const res = computeDttMetrics({
            independent: 8,
            prompted: 1,
            error: 1,
            promptLevel: 'gestual',
            interfering: [{ type: 'Fuga / Esquiva', count: 2 }],
        })

        expect(res.totalTrials).toBe(10)
        expect(res.pctIndependent).toBe(80)
        expect(res.pctSuccessWithPrompt).toBe(90)
        expect(res.suggestedAchieved).toBe('sim')
        expect(res.interferingTotal).toBe(2)
        expect(res.promptMeta.score).toBe(2)
        expect(res.formattedResult).toContain('8/10 (80% indep.')
    })

    it('deve manter retrocompatibilidade extraindo % de sessões antigas sem objeto dtt', () => {
        expect(extractPerformancePct({ resultado: '75% de acerto', assistencia: 'Dica verbal' })).toEqual({
            pct: 75,
            trials: 0,
            helpScore: 3,
            interferingCount: 0,
        })

        expect(extractPerformancePct({ resultado: '7/10', assistencia: 'Independente' })).toEqual({
            pct: 70,
            trials: 10,
            helpScore: 1,
            interferingCount: 0,
        })

        expect(extractPerformancePct({ atingida: 'sim', assistencia: 'Independente' }).pct).toBe(85)
        expect(extractPerformancePct({ atingida: 'parcial', assistencia: 'Ajuda física parcial' })).toEqual({
            pct: 55,
            trials: 0,
            helpScore: 5,
            interferingCount: 0,
        })
    })

    it('deve marcar meta como DOMINADA automaticamente ao atingir >= 80% em 3 sessões consecutivas', () => {
        const sessoes = [
            {
                id: 's1',
                data_sessao: '2026-11-01',
                registro_desempenho: [
                    {
                        code: 'ABA01',
                        title: 'Contato visual funcional',
                        dtt: { independent: 5, prompted: 3, error: 2, promptLevel: 'verbal' },
                    },
                    {
                        code: 'ABA02',
                        title: 'Imitação motora grossa',
                        dtt: { independent: 8, prompted: 1, error: 1, promptLevel: 'gestual' },
                    },
                ],
            },
            {
                id: 's2',
                data_sessao: '2026-11-05',
                registro_desempenho: [
                    {
                        code: 'ABA01',
                        title: 'Contato visual funcional',
                        dtt: { independent: 8, prompted: 2, error: 0, promptLevel: 'gestual' },
                    },
                    {
                        code: 'ABA02',
                        title: 'Imitação motora grossa',
                        dtt: { independent: 4, prompted: 3, error: 3, promptLevel: 'fisica_parcial' },
                    },
                ],
            },
            {
                id: 's3',
                data_sessao: '2026-11-09',
                registro_desempenho: [
                    {
                        code: 'ABA01',
                        title: 'Contato visual funcional',
                        dtt: { independent: 9, prompted: 1, error: 0, promptLevel: 'independente' },
                    },
                ],
            },
            {
                id: 's4',
                data_sessao: '2026-11-13',
                registro_desempenho: [
                    {
                        code: 'ABA01',
                        title: 'Contato visual funcional',
                        dtt: { independent: 10, prompted: 0, error: 0, promptLevel: 'independente' },
                    },
                ],
            },
        ]

        const analytics = computeSessionPlansAnalytics(sessoes)
        expect(analytics.totalSessions).toBe(4)
        expect(analytics.totalTrials).toBe(60)
        expect(analytics.masteredCount).toBe(1)
        expect(analytics.attentionCount).toBe(1)

        const aba01 = analytics.objectives.find((o) => o.code === 'ABA01')
        expect(aba01?.status).toBe('dominada')
        expect(aba01?.consecutiveMasterySessions).toBe(3)
        expect(aba01?.baselinePct).toBe(50)
        expect(aba01?.latestPct).toBe(100)
        expect(aba01?.deltaPct).toBe(50)

        const aba02 = analytics.objectives.find((o) => o.code === 'ABA02')
        expect(aba02?.status).toBe('atencao')
    })

    it('deve resumir grafico_indicadores e gerar conquistas humanizadas para o CliniGo Família sem dados sensíveis', () => {
        const summary = buildSessionIndicatorSummary(
            [
                {
                    code: 'COM01',
                    title: 'Pedido funcional por troca de figura',
                    dtt: { independent: 9, prompted: 1, error: 0, promptLevel: 'gestual' },
                },
            ],
            [{ type: 'Fuga / Esquiva', count: 1 }]
        )

        expect(summary.avgIndependencePct).toBe(90)
        expect(summary.totalTrials).toBe(10)
        expect(summary.interferingTotal).toBe(1)

        const familyData = buildFamilyHighlightsFromSessions(
            [
                {
                    id: 's1',
                    data_sessao: '2026-11-10',
                    registro_desempenho: [
                        {
                            code: 'COM01',
                            title: 'Pedido funcional',
                            dtt: { independent: 6, prompted: 4, error: 0, promptLevel: 'verbal' },
                        },
                    ],
                },
                {
                    id: 's2',
                    data_sessao: '2026-11-17',
                    registro_desempenho: [
                        {
                            code: 'COM01',
                            title: 'Pedido funcional',
                            dtt: { independent: 9, prompted: 1, error: 0, promptLevel: 'independente' },
                        },
                    ],
                    orientacao_familia: {
                        habilidade_priorizada: 'Pedir o brinquedo favorito',
                        orientacao: 'Oferecer duas opções e aguardar 5 segundos antes de dar dica.',
                    },
                },
            ],
            'Intervenção Precoce / ABA'
        )

        expect(familyData.highlights.length).toBeGreaterThan(0)
        expect(familyData.highlights[0]).toContain('+30%')
        expect(familyData.homeActivityTitle).toContain('Pedir o brinquedo favorito')
        expect(familyData.homeActivityInstructions).toContain('5 segundos')
        expect(getPromptLevelMeta('modelacao').score).toBe(4)
    })
})
