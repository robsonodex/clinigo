/**
 * Configuração Oficial do Plano de Sessão: Fisioterapia
 * Fonte: Ficha de Acompanhamento Clínico + Plano de Sessão World Sensory (Páginas 19 a 23)
 */

import { SpecialtyTemplateConfig } from '../types'

export const FISIOTERAPIA_TEMPLATE: SpecialtyTemplateConfig = {
    id: 'fisioterapia',
    name: 'Fisioterapia',
    professionalRole: 'Fisioterapeuta',
    councilName: 'CREFITO',
    minObjectives: 2,
    maxObjectives: 4,
    initialConditions: {
        generalStates: [
            'Disponível para a sessão',
            'Agitação',
            'Sonolência',
            'Fadiga',
            'Dor/desconforto',
            'Irritabilidade',
            'Dificuldade de transição',
            'Esquiva de demandas',
            'Outro',
        ],
        recentChanges: [
            'Nenhuma',
            'Queda',
            'Dor',
            'Alteração de marcha',
            'Redução da mobilidade',
            'Alteração de tônus',
            'Alteração ortopédica',
            'Mudança de órtese/equipamento',
            'Procedimento médico recente',
            'Alteração medicamentosa relatada',
            'Outro',
        ],
    },
    assistanceLevels: [
        {
            id: 'independente',
            label: 'Independente',
            description: 'Realiza sem assistência ou supervisão.',
        },
        {
            id: 'supervisao',
            label: 'Supervisão',
            description: 'Não necessita contato físico, mas requer monitoramento por segurança ou orientação.',
        },
        {
            id: 'contato_seguranca',
            label: 'Contato de segurança',
            description: 'Contato físico sem auxílio relevante à execução.',
        },
        {
            id: 'assistencia_minima',
            label: 'Assistência mínima',
            description: 'Paciente realiza a maior parte da tarefa, necessitando pequena assistência.',
        },
        {
            id: 'assistencia_moderada',
            label: 'Assistência moderada',
            description: 'Paciente realiza parte relevante da tarefa, mas necessita assistência física consistente.',
        },
        {
            id: 'assistencia_maxima',
            label: 'Assistência máxima',
            description: 'Paciente participa parcialmente, necessitando assistência física substancial.',
        },
        {
            id: 'dependente',
            label: 'Dependente',
            description: 'Profissional/cuidador realiza a maior parte ou totalidade da tarefa.',
        },
    ],
    strategies: [
        {
            category: 'Treino orientado à tarefa',
            items: [
                'Prática funcional específica',
                'Repetição',
                'Prática variável',
                'Aumento gradual da complexidade',
                'Treino em contexto natural',
                'Generalização planejada',
                'Dupla tarefa quando indicada',
                'Outro',
            ],
        },
        {
            category: 'Facilitação e suporte',
            items: [
                'Pista verbal',
                'Pista visual',
                'Pista gestual',
                'Demonstração',
                'Facilitação manual',
                'Estabilização proximal',
                'Transferência de peso',
                'Posicionamento',
                'Suporte parcial',
                'Assistência física',
                'Outro',
            ],
        },
        {
            category: 'Progressão',
            items: [
                'Aumentar distância',
                'Aumentar tempo',
                'Aumentar repetições',
                'Reduzir apoio',
                'Reduzir assistência',
                'Reduzir base de suporte',
                'Aumentar velocidade',
                'Introduzir obstáculos',
                'Variar superfície',
                'Aumentar altura do desnível',
                'Introduzir ambiente mais natural',
                'Outro',
            ],
        },
        {
            category: 'Engajamento',
            items: [
                'Rotina visual',
                'Oferta de escolhas',
                'Atividade de interesse',
                'Reforçamento positivo',
                'Alternância entre demandas',
                'Pausas programadas',
                'Redução temporária da complexidade',
                'Outro',
            ],
        },
    ],
    sessionStages: [
        { id: 1, name: 'Observação funcional / preparação', defaultMinutes: 10 },
        { id: 2, name: 'Treino motor 1', defaultMinutes: 15 },
        { id: 3, name: 'Treino motor 2', defaultMinutes: 15 },
        { id: 4, name: 'Aplicação funcional / generalização', defaultMinutes: 10 },
        { id: 5, name: 'Encerramento', defaultMinutes: 5 },
    ],
    movementQualityOptions: [
        'Simétrico',
        'Assimétrico',
        'Compensações',
        'Instabilidade',
        'Base de suporte aumentada',
        'Dificuldade de transferência de peso',
        'Redução de controle seletivo',
        'Alteração de alinhamento',
        'Fadiga progressiva',
        'Redução da qualidade com repetição',
        'Medo/insegurança',
        'Dor',
        'Outro',
    ],
    clinicalLimiters: [
        'Força',
        'Controle postural',
        'Equilíbrio',
        'Coordenação',
        'Controle seletivo',
        'Mobilidade articular',
        'Dor',
        'Fadiga',
        'Resistência',
        'Planejamento motor',
        'Medo/insegurança',
        'Compreensão da tarefa',
        'Engajamento',
        'Ambiente',
        'Equipamento',
        'Outro',
    ],
    nextSessionDecisions: [
        'Manter objetivo e dose',
        'Aumentar repetições',
        'Aumentar tempo',
        'Aumentar distância',
        'Aumentar velocidade',
        'Reduzir assistência',
        'Reduzir apoio',
        'Aumentar desafio postural',
        'Aumentar complexidade',
        'Introduzir obstáculos',
        'Variar superfície',
        'Trabalhar em ambiente funcional',
        'Trabalhar generalização',
        'Modificar equipamento',
        'Reduzir temporariamente a dificuldade',
        'Reavaliar objetivo',
        'Discutir em supervisão/equipe',
        'Considerar objetivo adquirido',
    ],
    generalizationContexts: [
        'Casa',
        'Escola',
        'Parque',
        'Escadas',
        'Transferências',
        'Brincadeira',
        'Mobilidade comunitária',
        'Posicionamento',
        'Uso de equipamento',
        'Outro',
    ],
    categories: [
        // 1. MOB · MOBILIDADE E TRANSFERÊNCIAS
        {
            id: 'MOB',
            label: 'MOB · Mobilidade e Transferências',
            objectives: [
                {
                    code: 'MOB01',
                    title: 'Realizar rotação de decúbito de forma funcional.',
                    category: 'MOB',
                    categoryLabel: 'Mobilidade e Transferências',
                    templateText: 'realizar p/ {lado} em {oport_realizadas} de {oport_totais} oport. com {assistencia} assistência',
                    fields: [
                        {
                            id: 'lado',
                            label: 'Lado',
                            type: 'radio',
                            options: [
                                { label: 'Direita', value: 'direita' },
                                { label: 'Esquerda', value: 'esquerda' },
                                { label: 'Bilateral', value: 'bilateral' },
                            ],
                            defaultValue: 'direita',
                        },
                        { id: 'oport_realizadas', label: 'Em quantas oport.', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'oport_totais', label: 'De quantas oport.', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'assistencia', label: 'Com assistência', type: 'text', placeholder: 'Ex: mínima' },
                    ],
                },
                {
                    code: 'MOB02',
                    title: 'Realizar transição de decúbito para sedestação.',
                    category: 'MOB',
                    categoryLabel: 'Mobilidade e Transferências',
                    templateText: 'completar {transf_realizadas} de {transf_totais} transferências, assistência máx. {assistencia_max}',
                    fields: [
                        { id: 'transf_realizadas', label: 'Transferências completadas', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'transf_totais', label: 'Total de transferências', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'assistencia_max', label: 'Assistência máxima', type: 'text', placeholder: 'Ex: contato de segurança' },
                    ],
                },
                {
                    code: 'MOB03',
                    title: 'Realizar transferência de sedestação para ortostatismo.',
                    category: 'MOB',
                    categoryLabel: 'Mobilidade e Transferências',
                    templateText: '{repeticoes} repetições ({apoio}), assist. máx. {assistencia_max}',
                    fields: [
                        { id: 'repeticoes', label: 'Repetições', type: 'number', placeholder: 'Ex: 5' },
                        {
                            id: 'apoio',
                            label: 'Apoio de MMSS',
                            type: 'radio',
                            options: [
                                { label: 'Sem apoio MMSS', value: 'sem apoio MMSS' },
                                { label: 'Apoio unilateral', value: 'apoio unilateral' },
                                { label: 'Apoio bilateral', value: 'apoio bilateral' },
                            ],
                            defaultValue: 'sem apoio MMSS',
                        },
                        { id: 'assistencia_max', label: 'Assistência máxima', type: 'text', placeholder: 'Ex: mínima' },
                    ],
                },
                {
                    code: 'MOB04',
                    title: 'Controlar a descida para sedestação.',
                    category: 'MOB',
                    categoryLabel: 'Mobilidade e Transferências',
                    templateText: '{repeticoes_adequadas} de {repeticoes_totais} repetições sem queda abrupta, controle postural adequado',
                    fields: [
                        { id: 'repeticoes_adequadas', label: 'Repetições sem queda', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'repeticoes_totais', label: 'Total de repetições', type: 'number', placeholder: 'Ex: 5' },
                    ],
                },
                {
                    code: 'MOB05',
                    title: 'Levantar-se do solo.',
                    category: 'MOB',
                    categoryLabel: 'Mobilidade e Transferências',
                    templateText: '{transf_realizadas} de {transf_totais} transferências ({modo_apoio})',
                    fields: [
                        { id: 'transf_realizadas', label: 'Transferências concluídas', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'transf_totais', label: 'Total de tentativas', type: 'number', placeholder: 'Ex: 4' },
                        {
                            id: 'modo_apoio',
                            label: 'Modo de apoio',
                            type: 'radio',
                            options: [
                                { label: 'Sem apoio externo', value: 'sem apoio externo' },
                                { label: 'Com apoio em superfície', value: 'com apoio em superfície' },
                                { label: 'Com assistência física', value: 'com assistência física' },
                            ],
                            defaultValue: 'sem apoio externo',
                        },
                    ],
                },
                {
                    code: 'MOB06',
                    title: 'Transferir-se entre cadeira, cama, banco ou outro equipamento.',
                    category: 'MOB',
                    categoryLabel: 'Mobilidade e Transferências',
                    templateText: 'completar {transf_realizadas} de {transf_totais} transferências, assistência máx. {assistencia_max}',
                    fields: [
                        { id: 'transf_realizadas', label: 'Transferências completadas', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'transf_totais', label: 'Total de transferências', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'assistencia_max', label: 'Assistência máxima', type: 'text', placeholder: 'Ex: supervisão' },
                    ],
                },
                {
                    code: 'MOB07',
                    title: 'Deslocar-se funcionalmente no solo.',
                    category: 'MOB',
                    categoryLabel: 'Mobilidade e Transferências',
                    templateText: 'percorrer {metros} metros por meio de {modo_deslocamento}, {assistencia}',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 5' },
                        { id: 'modo_deslocamento', label: 'Por meio de', type: 'text', placeholder: 'Ex: engatinhar / arrastar' },
                        { id: 'assistencia', label: 'Nível de assistência', type: 'text', placeholder: 'Ex: independente' },
                    ],
                },
            ],
        },

        // 2. POS · CONTROLE POSTURAL
        {
            id: 'POS',
            label: 'POS · Controle Postural',
            objectives: [
                {
                    code: 'POS01',
                    title: 'Manter cabeça alinhada durante postura ou tarefa funcional.',
                    category: 'POS',
                    categoryLabel: 'Controle Postural',
                    templateText: 'manter controle cefálico durante {duracao} seg/min em {percentual}% da atividade',
                    fields: [
                        { id: 'duracao', label: 'Duração (seg/min)', type: 'text', placeholder: 'Ex: 30 seg' },
                        { id: 'percentual', label: 'Percentual da atividade (%)', type: 'number', placeholder: 'Ex: 80' },
                    ],
                },
                {
                    code: 'POS02',
                    title: 'Manter estabilidade de tronco.',
                    category: 'POS',
                    categoryLabel: 'Controle Postural',
                    templateText: 'permanecer em {posicao} por {duracao} seg/min, assistência máx. {assistencia_max}',
                    fields: [
                        { id: 'posicao', label: 'Posição', type: 'text', placeholder: 'Ex: sedestação no banco' },
                        { id: 'duracao', label: 'Duração (seg/min)', type: 'text', placeholder: 'Ex: 2 min' },
                        { id: 'assistencia_max', label: 'Assistência máxima', type: 'text', placeholder: 'Ex: mínima' },
                    ],
                },
                {
                    code: 'POS03',
                    title: 'Manter sedestação funcional.',
                    category: 'POS',
                    categoryLabel: 'Controle Postural',
                    templateText: 'permanecer sentado por {minutos} min {apoio}',
                    fields: [
                        { id: 'minutos', label: 'Minutos', type: 'number', placeholder: 'Ex: 5' },
                        { id: 'apoio', label: 'Condição de apoio', type: 'text', placeholder: 'Ex: sem apoio de MMSS / com encosto' },
                    ],
                },
                {
                    code: 'POS04',
                    title: 'Manter posição em pé.',
                    category: 'POS',
                    categoryLabel: 'Controle Postural',
                    templateText: 'permanecer por {duracao} seg/min ({tipo_apoio})',
                    fields: [
                        { id: 'duracao', label: 'Duração', type: 'text', placeholder: 'Ex: 60 seg' },
                        {
                            id: 'tipo_apoio',
                            label: 'Tipo de apoio',
                            type: 'radio',
                            options: [
                                { label: 'Sem apoio', value: 'sem apoio' },
                                { label: 'Apoio unilateral', value: 'apoio unilateral' },
                                { label: 'Apoio bilateral', value: 'apoio bilateral' },
                                { label: 'Com dispositivo', value: 'com dispositivo' },
                            ],
                            defaultValue: 'sem apoio',
                        },
                    ],
                },
                {
                    code: 'POS05',
                    title: 'Manter alinhamento durante atividade funcional.',
                    category: 'POS',
                    categoryLabel: 'Controle Postural',
                    templateText: 'manter alinhamento adequado em pelo menos {percentual}% do período observado',
                    fields: [
                        { id: 'percentual', label: 'Percentual do tempo (%)', type: 'number', placeholder: 'Ex: 75' },
                    ],
                },
                {
                    code: 'POS06',
                    title: 'Transferir peso entre os lados durante tarefa.',
                    category: 'POS',
                    categoryLabel: 'Controle Postural',
                    templateText: 'realizar transferência funcional em {oport_realizadas} de {oport_totais} oport. sem perda significativa de equilíbrio',
                    fields: [
                        { id: 'oport_realizadas', label: 'Oportunidades com êxito', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'oport_totais', label: 'Total de oportunidades', type: 'number', placeholder: 'Ex: 5' },
                    ],
                },
                {
                    code: 'POS07',
                    title: 'Apresentar respostas de endireitamento, equilíbrio ou proteção.',
                    category: 'POS',
                    categoryLabel: 'Controle Postural',
                    templateText: 'responder adequadamente a {respostas_adequadas} de {perturbacoes_totais} perturbações controladas',
                    fields: [
                        { id: 'respostas_adequadas', label: 'Respostas adequadas', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'perturbacoes_totais', label: 'Perturbações controladas', type: 'number', placeholder: 'Ex: 5' },
                    ],
                },
            ],
        },

        // 3. EQU · EQUILÍBRIO
        {
            id: 'EQU',
            label: 'EQU · Equilíbrio',
            objectives: [
                {
                    code: 'EQU01',
                    title: 'Manter postura sem apoio.',
                    category: 'EQU',
                    categoryLabel: 'Equilíbrio',
                    templateText: 'permanecer por {segundos} segundos sem perda de equilíbrio',
                    fields: [
                        { id: 'segundos', label: 'Segundos', type: 'number', placeholder: 'Ex: 30' },
                    ],
                },
                {
                    code: 'EQU02',
                    title: 'Manter apoio em um membro inferior.',
                    category: 'EQU',
                    categoryLabel: 'Equilíbrio',
                    templateText: 'direita: {segundos_direita} s | esquerda: {segundos_esquerda} s',
                    fields: [
                        { id: 'segundos_direita', label: 'Segundos (Direita)', type: 'number', placeholder: 'Ex: 5' },
                        { id: 'segundos_esquerda', label: 'Segundos (Esquerda)', type: 'number', placeholder: 'Ex: 5' },
                    ],
                },
                {
                    code: 'EQU03',
                    title: 'Manter estabilidade durante deslocamento.',
                    category: 'EQU',
                    categoryLabel: 'Equilíbrio',
                    templateText: 'percorrer {metros} metros sem queda ou necessidade de assistência',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 10' },
                    ],
                },
                {
                    code: 'EQU04',
                    title: 'Manter postura ou caminhar em base reduzida.',
                    category: 'EQU',
                    categoryLabel: 'Equilíbrio',
                    templateText: 'completar {metros} m / permanecer {segundos} s com no máx. {max_perdas} perdas de equilíbrio',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'segundos', label: 'Segundos', type: 'number', placeholder: 'Ex: 15' },
                        { id: 'max_perdas', label: 'Máximo de perdas de equilíbrio', type: 'number', placeholder: 'Ex: 1' },
                    ],
                },
                {
                    code: 'EQU05',
                    title: 'Manter estabilidade em diferentes superfícies.',
                    category: 'EQU',
                    categoryLabel: 'Equilíbrio',
                    templateText: 'realizar tarefa em {superficie}, assistência máx. {assistencia_max}',
                    fields: [
                        { id: 'superficie', label: 'Superfície', type: 'text', placeholder: 'Ex: colchonete / disco proprioceptivo' },
                        { id: 'assistencia_max', label: 'Assistência máxima', type: 'text', placeholder: 'Ex: contato de segurança' },
                    ],
                },
                {
                    code: 'EQU06',
                    title: 'Recuperar estabilidade após perturbação ou mudança de direção.',
                    category: 'EQU',
                    categoryLabel: 'Equilíbrio',
                    templateText: 'recuperar equilíbrio sem assistência em {recuperadas} de {situacoes_totais} situações',
                    fields: [
                        { id: 'recuperadas', label: 'Situações recuperadas', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'situacoes_totais', label: 'Total de situações', type: 'number', placeholder: 'Ex: 4' },
                    ],
                },
            ],
        },

        // 4. MAR · MARCHA
        {
            id: 'MAR',
            label: 'MAR · Marcha',
            objectives: [
                {
                    code: 'MAR01',
                    title: 'Aumentar distância percorrida.',
                    category: 'MAR',
                    categoryLabel: 'Marcha',
                    templateText: 'caminhar {metros} metros, assistência máx. {assistencia_max}',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 20' },
                        { id: 'assistencia_max', label: 'Assistência máxima', type: 'text', placeholder: 'Ex: supervisão' },
                    ],
                },
                {
                    code: 'MAR02',
                    title: 'Realizar deslocamento sem assistência física.',
                    category: 'MAR',
                    categoryLabel: 'Marcha',
                    templateText: 'percorrer {metros} metros sem queda, apoio externo ou assistência física',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 15' },
                    ],
                },
                {
                    code: 'MAR03',
                    title: 'Utilizar dispositivo de mobilidade com segurança.',
                    category: 'MAR',
                    categoryLabel: 'Marcha',
                    templateText: 'dispositivo: {dispositivo} (percorrer {metros} metros, assistência máx. {assistencia_max})',
                    fields: [
                        { id: 'dispositivo', label: 'Dispositivo', type: 'text', placeholder: 'Ex: andador posterior' },
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 15' },
                        { id: 'assistencia_max', label: 'Assistência máxima', type: 'text', placeholder: 'Ex: mínima' },
                    ],
                },
                {
                    code: 'MAR04',
                    title: 'Alterar direção durante marcha.',
                    category: 'MAR',
                    categoryLabel: 'Marcha',
                    templateText: 'realizar {mudancas_direcao} mudanças de direção sem perda de equilíbrio em {tent_exito} de {tent_totais} tent.',
                    fields: [
                        { id: 'mudancas_direcao', label: 'Nº de mudanças de direção', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'tent_exito', label: 'Tentativas com êxito', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'tent_totais', label: 'Total de tentativas', type: 'number', placeholder: 'Ex: 4' },
                    ],
                },
                {
                    code: 'MAR05',
                    title: 'Transpor/desviar de obstáculos.',
                    category: 'MAR',
                    categoryLabel: 'Marcha',
                    templateText: 'completar percurso com {obstaculos} obstáculos, no máx. {max_erros} erros/contatos',
                    fields: [
                        { id: 'obstaculos', label: 'Nº de obstáculos', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'max_erros', label: 'Máx. de toques/erros', type: 'number', placeholder: 'Ex: 1' },
                    ],
                },
                {
                    code: 'MAR06',
                    title: 'Caminhar em superfícies com características variadas.',
                    category: 'MAR',
                    categoryLabel: 'Marcha',
                    templateText: 'percorrer {metros} m em {superficie}, assistência máx. {assistencia_max}',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 10' },
                        { id: 'superficie', label: 'Superfície', type: 'text', placeholder: 'Ex: grama / rampa / piso irregular' },
                        { id: 'assistencia_max', label: 'Assistência máxima', type: 'text', placeholder: 'Ex: supervisão' },
                    ],
                },
                {
                    code: 'MAR07',
                    title: 'Interromper e retomar marcha com controle.',
                    category: 'MAR',
                    categoryLabel: 'Marcha',
                    templateText: 'realizar adequadamente em {oport_realizadas} de {oport_totais} oport.',
                    fields: [
                        { id: 'oport_realizadas', label: 'Oportunidades com êxito', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'oport_totais', label: 'Total de oportunidades', type: 'number', placeholder: 'Ex: 5' },
                    ],
                },
                {
                    code: 'MAR08',
                    title: 'Aumentar eficiência do deslocamento.',
                    category: 'MAR',
                    categoryLabel: 'Marcha',
                    templateText: 'percorrer {metros} metros em até {segundos} segundos mantendo segurança',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 10' },
                        { id: 'segundos', label: 'Tempo máximo (s)', type: 'number', placeholder: 'Ex: 12' },
                    ],
                },
                {
                    code: 'MAR09',
                    title: 'Aumentar tolerância ao deslocamento.',
                    category: 'MAR',
                    categoryLabel: 'Marcha',
                    templateText: 'caminhar por {minutos} min / {metros} metros sem necessidade de pausa',
                    fields: [
                        { id: 'minutos', label: 'Minutos', type: 'number', placeholder: 'Ex: 5' },
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 50' },
                    ],
                },
            ],
        },

        // 5. DES · ESCADAS, RAMPAS E DESNÍVEIS
        {
            id: 'DES',
            label: 'DES · Escadas, Rampas e Desníveis',
            objectives: [
                {
                    code: 'DES01',
                    title: 'Subir degraus.',
                    category: 'DES',
                    categoryLabel: 'Escadas, Rampas e Desníveis',
                    templateText: '{degraus} degraus ({padrao}; {corrimao}), assist. máx. {assistencia_max}',
                    fields: [
                        { id: 'degraus', label: 'Nº de degraus', type: 'number', placeholder: 'Ex: 4' },
                        {
                            id: 'padrao',
                            label: 'Padrão de subida',
                            type: 'radio',
                            options: [
                                { label: 'Alternado', value: 'alternado' },
                                { label: 'Passo-a-passo', value: 'passo-a-passo' },
                            ],
                            defaultValue: 'alternado',
                        },
                        {
                            id: 'corrimao',
                            label: 'Apoio em corrimão',
                            type: 'radio',
                            options: [
                                { label: 'Sem corrimão', value: 'sem corrimão' },
                                { label: 'Corrimão unilateral', value: 'corrimão unilateral' },
                                { label: 'Corrimão bilateral', value: 'corrimão bilateral' },
                            ],
                            defaultValue: 'corrimão unilateral',
                        },
                        { id: 'assistencia_max', label: 'Assistência máxima', type: 'text', placeholder: 'Ex: supervisão' },
                    ],
                },
                {
                    code: 'DES02',
                    title: 'Descer degraus com controle.',
                    category: 'DES',
                    categoryLabel: 'Escadas, Rampas e Desníveis',
                    templateText: 'descer {degraus} degraus nas condições {condicoes}',
                    fields: [
                        { id: 'degraus', label: 'Nº de degraus', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'condicoes', label: 'Condições / auxílio', type: 'text', placeholder: 'Ex: corrimão unilateral, passo-a-passo' },
                    ],
                },
                {
                    code: 'DES03',
                    title: 'Transpor pequeno desnível.',
                    category: 'DES',
                    categoryLabel: 'Escadas, Rampas e Desníveis',
                    templateText: 'subir/descer altura de {altura_cm} cm em {tent_exito} de {tent_totais} tentativas',
                    fields: [
                        { id: 'altura_cm', label: 'Altura do desnível (cm)', type: 'number', placeholder: 'Ex: 10' },
                        { id: 'tent_exito', label: 'Tentativas com êxito', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'tent_totais', label: 'Total de tentativas', type: 'number', placeholder: 'Ex: 4' },
                    ],
                },
                {
                    code: 'DES04',
                    title: 'Realizar marcha em inclinação.',
                    category: 'DES',
                    categoryLabel: 'Escadas, Rampas e Desníveis',
                    templateText: 'percorrer {metros} metros em subida/descida, assistência {assistencia}',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 8' },
                        { id: 'assistencia', label: 'Assistência', type: 'text', placeholder: 'Ex: independente / supervisão' },
                    ],
                },
            ],
        },

        // 6. FOR · FORÇA E CAPACIDADE MUSCULAR FUNCIONAL
        {
            id: 'FOR',
            label: 'FOR · Força e Capacidade Muscular Funcional',
            objectives: [
                {
                    code: 'FOR01',
                    title: 'Melhorar capacidade funcional de MMII.',
                    category: 'FOR',
                    categoryLabel: 'Força Muscular',
                    templateText: '{repeticoes} repetições em {duracao} seg/min, com {apoio} apoio',
                    fields: [
                        { id: 'repeticoes', label: 'Repetições', type: 'number', placeholder: 'Ex: 10' },
                        { id: 'duracao', label: 'Tempo', type: 'text', placeholder: 'Ex: 45 seg' },
                        { id: 'apoio', label: 'Tipo de apoio', type: 'text', placeholder: 'Ex: sem apoio' },
                    ],
                },
                {
                    code: 'FOR02',
                    title: 'Realizar agachamento e retorno ao ortostatismo.',
                    category: 'FOR',
                    categoryLabel: 'Força Muscular',
                    templateText: 'completar {repeticoes} repetições mantendo alinhamento funcional',
                    fields: [
                        { id: 'repeticoes', label: 'Repetições', type: 'number', placeholder: 'Ex: 8' },
                    ],
                },
                {
                    code: 'FOR03',
                    title: 'Utilizar força de MMII para vencer desnível.',
                    category: 'FOR',
                    categoryLabel: 'Força Muscular',
                    templateText: 'subir superfície de {altura_cm} cm em {tent_exito} de {tent_totais} tentativas',
                    fields: [
                        { id: 'altura_cm', label: 'Altura (cm)', type: 'number', placeholder: 'Ex: 15' },
                        { id: 'tent_exito', label: 'Tentativas com êxito', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'tent_totais', label: 'Total de tentativas', type: 'number', placeholder: 'Ex: 5' },
                    ],
                },
                {
                    code: 'FOR04',
                    title: 'Sustentar carga corporal sobre extremidades.',
                    category: 'FOR',
                    categoryLabel: 'Força Muscular',
                    templateText: 'manter posição por {segundos} segundos em {repeticoes} repetições',
                    fields: [
                        { id: 'segundos', label: 'Segundos', type: 'number', placeholder: 'Ex: 20' },
                        { id: 'repeticoes', label: 'Repetições', type: 'number', placeholder: 'Ex: 3' },
                    ],
                },
                {
                    code: 'FOR05',
                    title: 'Manter controle proximal durante tarefa funcional.',
                    category: 'FOR',
                    categoryLabel: 'Força Muscular',
                    templateText: 'completar {tarefas_exito} de {tarefas_totais} tarefas sem perda de alinhamento significativa',
                    fields: [
                        { id: 'tarefas_exito', label: 'Tarefas corretas', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'tarefas_totais', label: 'Total de tarefas', type: 'number', placeholder: 'Ex: 4' },
                    ],
                },
                {
                    code: 'FOR06',
                    title: 'Produzir força necessária ao deslocamento funcional.',
                    category: 'FOR',
                    categoryLabel: 'Força Muscular',
                    templateText: 'deslocar-se por {metros} m utilizando {equipamento_meio}, {assistencia}',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 10' },
                        { id: 'equipamento_meio', label: 'Utilizando', type: 'text', placeholder: 'Ex: triciclo / marcha' },
                        { id: 'assistencia', label: 'Nível de assistência', type: 'text', placeholder: 'Ex: independente' },
                    ],
                },
            ],
        },

        // 7. RES · RESISTÊNCIA E TOLERÂNCIA AO ESFORÇO
        {
            id: 'RES',
            label: 'RES · Resistência e Tolerância ao Esforço',
            objectives: [
                {
                    code: 'RES01',
                    title: 'Aumentar duração da atividade motora.',
                    category: 'RES',
                    categoryLabel: 'Resistência ao Esforço',
                    templateText: 'permanecer ativo por {minutos} min com no máx. {max_pausas} pausas',
                    fields: [
                        { id: 'minutos', label: 'Minutos ativo', type: 'number', placeholder: 'Ex: 12' },
                        { id: 'max_pausas', label: 'Máx. pausas', type: 'number', placeholder: 'Ex: 2' },
                    ],
                },
                {
                    code: 'RES02',
                    title: 'Aumentar distância total percorrida.',
                    category: 'RES',
                    categoryLabel: 'Resistência ao Esforço',
                    templateText: 'atingir {metros} metros antes da primeira pausa',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 40' },
                    ],
                },
                {
                    code: 'RES03',
                    title: 'Manter qualidade ao longo de repetições.',
                    category: 'RES',
                    categoryLabel: 'Resistência ao Esforço',
                    templateText: 'completar {repeticoes} repetições sem redução relevante da qualidade motora',
                    fields: [
                        { id: 'repeticoes', label: 'Repetições', type: 'number', placeholder: 'Ex: 8' },
                    ],
                },
                {
                    code: 'RES04',
                    title: 'Melhorar recuperação após atividade.',
                    category: 'RES',
                    categoryLabel: 'Resistência ao Esforço',
                    templateText: 'retornar à condição basal observável em até {minutos} minutos',
                    fields: [
                        { id: 'minutos', label: 'Minutos para recuperação', type: 'number', placeholder: 'Ex: 3' },
                    ],
                },
            ],
        },

        // 8. ADM · AMPLITUDE DE MOVIMENTO E MOBILIDADE ARTICULAR
        {
            id: 'ADM',
            label: 'ADM · Amplitude de Movimento e Mobilidade Articular',
            objectives: [
                {
                    code: 'ADM01',
                    title: 'Aumentar/manter amplitude ativa.',
                    category: 'ADM',
                    categoryLabel: 'Amplitude de Movimento',
                    templateText: 'amplitude ativa de {articulacao} (baseline: {baseline_graus}° · meta: {meta_graus}°)',
                    fields: [
                        { id: 'articulacao', label: 'Articulação / Movimento', type: 'text', placeholder: 'Ex: flexão dorsal tornozelo D' },
                        { id: 'baseline_graus', label: 'Baseline (°)', type: 'number', placeholder: 'Ex: 5' },
                        { id: 'meta_graus', label: 'Meta (°)', type: 'number', placeholder: 'Ex: 15' },
                    ],
                },
                {
                    code: 'ADM02',
                    title: 'Manter/aumentar amplitude passiva.',
                    category: 'ADM',
                    categoryLabel: 'Amplitude de Movimento',
                    templateText: 'amplitude passiva de {articulacao} (baseline: {baseline_graus}° · meta: {meta_graus}°)',
                    fields: [
                        { id: 'articulacao', label: 'Articulação / Movimento', type: 'text', placeholder: 'Ex: extensão de joelho E' },
                        { id: 'baseline_graus', label: 'Baseline (°)', type: 'number', placeholder: 'Ex: -10' },
                        { id: 'meta_graus', label: 'Meta (°)', type: 'number', placeholder: 'Ex: 0' },
                    ],
                },
                {
                    code: 'ADM03',
                    title: 'Utilizar amplitude disponível em tarefa funcional.',
                    category: 'ADM',
                    categoryLabel: 'Amplitude de Movimento',
                    templateText: 'completar {tarefa} em {oport_realizadas} de {oport_totais} oport. sem compensação relevante',
                    fields: [
                        { id: 'tarefa', label: 'Tarefa funcional', type: 'text', placeholder: 'Ex: alcance acima da cabeça' },
                        { id: 'oport_realizadas', label: 'Oportunidades com êxito', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'oport_totais', label: 'Total de oportunidades', type: 'number', placeholder: 'Ex: 5' },
                    ],
                },
                {
                    code: 'ADM04',
                    title: 'Manter amplitude necessária ao longo do período.',
                    category: 'ADM',
                    categoryLabel: 'Amplitude de Movimento',
                    templateText: 'manter amplitude necessária para {funcao_alvo} (manter medida em ≥ {graus_min}°)',
                    fields: [
                        { id: 'funcao_alvo', label: 'Função alvo', type: 'text', placeholder: 'Ex: ortostatismo alinhado' },
                        { id: 'graus_min', label: 'Graus mínimos (≥ °)', type: 'number', placeholder: 'Ex: 0' },
                    ],
                },
            ],
        },

        // 9. CTM · CONTROLE MOTOR E QUALIDADE DO MOVIMENTO
        {
            id: 'CTM',
            label: 'CTM · Controle Motor e Qualidade do Movimento',
            objectives: [
                {
                    code: 'CTM01',
                    title: 'Realizar movimento segmentado com redução de padrões associados.',
                    category: 'CTM',
                    categoryLabel: 'Controle Motor',
                    templateText: 'executar {tent_exito} de {tent_totais} tentativas sem {padrao_indesejado}',
                    fields: [
                        { id: 'tent_exito', label: 'Tentativas corretas', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'tent_totais', label: 'Total de tentativas', type: 'number', placeholder: 'Ex: 5' },
                        { id: 'padrao_indesejado', label: 'Sem padrão associado', type: 'text', placeholder: 'Ex: sincinesias / espasticidade' },
                    ],
                },
                {
                    code: 'CTM02',
                    title: 'Aumentar dissociação entre cintura escapular e pélvica.',
                    category: 'CTM',
                    categoryLabel: 'Controle Motor',
                    templateText: 'apresentar dissociação adequada durante {percentual}% das oport.',
                    fields: [
                        { id: 'percentual', label: 'Percentual de oportunidades (%)', type: 'number', placeholder: 'Ex: 70' },
                    ],
                },
                {
                    code: 'CTM03',
                    title: 'Reduzir assimetria durante atividade.',
                    category: 'CTM',
                    categoryLabel: 'Controle Motor',
                    templateText: 'realizar {atividade} com padrão simétrico em {tent_exito} de {tent_totais} tentativas',
                    fields: [
                        { id: 'atividade', label: 'Atividade', type: 'text', placeholder: 'Ex: propulsão / alcance' },
                        { id: 'tent_exito', label: 'Tentativas simétricas', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'tent_totais', label: 'Total de tentativas', type: 'number', placeholder: 'Ex: 4' },
                    ],
                },
                {
                    code: 'CTM04',
                    title: 'Controlar desaceleração/descida.',
                    category: 'CTM',
                    categoryLabel: 'Controle Motor',
                    templateText: 'executar {repeticoes} repetições sem queda abrupta ou perda significativa de alinhamento',
                    fields: [
                        { id: 'repeticoes', label: 'Repetições controladas', type: 'number', placeholder: 'Ex: 5' },
                    ],
                },
                {
                    code: 'CTM05',
                    title: 'Coordenar movimentos necessários à tarefa funcional.',
                    category: 'CTM',
                    categoryLabel: 'Controle Motor',
                    templateText: 'completar sequência de {etapas} etapas corretamente em {oport_realizadas} de {oport_totais} oport.',
                    fields: [
                        { id: 'etapas', label: 'Nº de etapas da sequência', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'oport_realizadas', label: 'Oportunidades com êxito', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'oport_totais', label: 'Total de oportunidades', type: 'number', placeholder: 'Ex: 4' },
                    ],
                },
            ],
        },

        // 10. HMG · DESENVOLVIMENTO DE HABILIDADES MOTORAS GROSSAS
        {
            id: 'HMG',
            label: 'HMG · Habilidades Motoras Grossas',
            objectives: [
                {
                    code: 'HMG01',
                    title: 'Correr com controle funcional.',
                    category: 'HMG',
                    categoryLabel: 'Habilidades Motoras Grossas',
                    templateText: 'percorrer {metros} metros sem queda e mantendo trajetória',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 15' },
                    ],
                },
                {
                    code: 'HMG02',
                    title: 'Saltar com decolagem e aterrissagem utilizando ambos os pés.',
                    category: 'HMG',
                    categoryLabel: 'Habilidades Motoras Grossas',
                    templateText: 'realizar {saltos} saltos consecutivos independentemente',
                    fields: [
                        { id: 'saltos', label: 'Nº de saltos consecutivos', type: 'number', placeholder: 'Ex: 4' },
                    ],
                },
                {
                    code: 'HMG03',
                    title: 'Saltar para frente.',
                    category: 'HMG',
                    categoryLabel: 'Habilidades Motoras Grossas',
                    templateText: 'atingir distância de pelo menos {distancia_cm} cm em {tent_exito} de {tent_totais} tentativas',
                    fields: [
                        { id: 'distancia_cm', label: 'Distância mínima (cm)', type: 'number', placeholder: 'Ex: 25' },
                        { id: 'tent_exito', label: 'Tentativas com êxito', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'tent_totais', label: 'Total de tentativas', type: 'number', placeholder: 'Ex: 4' },
                    ],
                },
                {
                    code: 'HMG04',
                    title: 'Saltar sobre um membro inferior.',
                    category: 'HMG',
                    categoryLabel: 'Habilidades Motoras Grossas',
                    templateText: 'realizar {saltos} saltos consecutivos em cada lado',
                    fields: [
                        { id: 'saltos', label: 'Nº de saltos em cada lado', type: 'number', placeholder: 'Ex: 3' },
                    ],
                },
                {
                    code: 'HMG05',
                    title: 'Chutar mantendo estabilidade.',
                    category: 'HMG',
                    categoryLabel: 'Habilidades Motoras Grossas',
                    templateText: 'realizar {chutes_exito} de {chutes_totais} chutes sem necessidade de apoio adicional',
                    fields: [
                        { id: 'chutes_exito', label: 'Chutes estáveis', type: 'number', placeholder: 'Ex: 4' },
                        { id: 'chutes_totais', label: 'Total de chutes', type: 'number', placeholder: 'Ex: 5' },
                    ],
                },
                {
                    code: 'HMG06',
                    title: 'Ultrapassar obstáculos de diferentes alturas.',
                    category: 'HMG',
                    categoryLabel: 'Habilidades Motoras Grossas',
                    templateText: 'completar percurso com {obstaculos} obstáculos, no máx. {max_erros} erros',
                    fields: [
                        { id: 'obstaculos', label: 'Nº de obstáculos', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'max_erros', label: 'Máximo de erros/derrubadas', type: 'number', placeholder: 'Ex: 0' },
                    ],
                },
            ],
        },

        // 11. PPR · POSTURA, POSICIONAMENTO E PREVENÇÃO DE COMPLICAÇÕES
        {
            id: 'PPR',
            label: 'PPR · Postura, Posicionamento e Prevenção',
            objectives: [
                {
                    code: 'PPR01',
                    title: 'Manter posicionamento funcional.',
                    category: 'PPR',
                    categoryLabel: 'Postura e Posicionamento',
                    templateText: 'permanecer na posição por {minutos} min sem dor, intolerância ou perda de alinhamento',
                    fields: [
                        { id: 'minutos', label: 'Minutos na posição', type: 'number', placeholder: 'Ex: 20' },
                    ],
                },
                {
                    code: 'PPR02',
                    title: 'Participar de programa de ortostatismo.',
                    category: 'PPR',
                    categoryLabel: 'Postura e Posicionamento',
                    templateText: 'permanecer no equipamento por {minutos} min conforme tolerância e prescrição',
                    fields: [
                        { id: 'minutos', label: 'Minutos no equipamento', type: 'number', placeholder: 'Ex: 30' },
                    ],
                },
                {
                    code: 'PPR03',
                    title: 'Favorecer utilização segura e funcional de órtese prescrita.',
                    category: 'PPR',
                    categoryLabel: 'Postura e Posicionamento',
                    templateText: 'utilizar por {tempo} conforme orientação, sem lesão cutânea ou intolerância',
                    fields: [
                        { id: 'tempo', label: 'Tempo de uso (h/min)', type: 'text', placeholder: 'Ex: 2 horas' },
                    ],
                },
                {
                    code: 'PPR04',
                    title: 'Utilizar cadeira, stander ou outro sistema com alinhamento funcional.',
                    category: 'PPR',
                    categoryLabel: 'Postura e Posicionamento',
                    templateText: 'manter posicionamento por {minutos} min, sem reposicionar mais de {max_repos} vezes',
                    fields: [
                        { id: 'minutos', label: 'Minutos', type: 'number', placeholder: 'Ex: 30' },
                        { id: 'max_repos', label: 'Máx. reposicionamentos', type: 'number', placeholder: 'Ex: 1' },
                    ],
                },
                {
                    code: 'PPR05',
                    title: 'Manter mobilidade e posicionamento de segmentos de risco.',
                    category: 'PPR',
                    categoryLabel: 'Postura e Posicionamento',
                    templateText: 'região: {regiao} (indicador: {indicador})',
                    fields: [
                        { id: 'regiao', label: 'Região anatômica', type: 'text', placeholder: 'Ex: quadril e tornozelos' },
                        { id: 'indicador', label: 'Indicador observado', type: 'text', placeholder: 'Ex: sem dor ou retração adicional' },
                    ],
                },
            ],
        },

        // 12. DOR · DOR E CONFORTO
        {
            id: 'DOR',
            label: 'DOR · Dor e Conforto',
            objectives: [
                {
                    code: 'DOR01',
                    title: 'Reduzir dor associada à atividade.',
                    category: 'DOR',
                    categoryLabel: 'Dor e Conforto',
                    templateText: 'reduzir dor em {atividade} · Escala: {escala} (baseline: {baseline} · meta: {meta})',
                    fields: [
                        { id: 'atividade', label: 'Atividade associada', type: 'text', placeholder: 'Ex: ortostatismo prolongado' },
                        { id: 'escala', label: 'Escala utilizada', type: 'text', placeholder: 'Ex: EVA / Faces' },
                        { id: 'baseline', label: 'Baseline', type: 'text', placeholder: 'Ex: 6/10' },
                        { id: 'meta', label: 'Meta', type: 'text', placeholder: 'Ex: ≤ 2/10' },
                    ],
                },
                {
                    code: 'DOR02',
                    title: 'Aumentar participação em atividade previamente limitada por desconforto.',
                    category: 'DOR',
                    categoryLabel: 'Dor e Conforto',
                    templateText: 'completar {oport_realizadas} de {oport_totais} oport. sem interrupção por dor',
                    fields: [
                        { id: 'oport_realizadas', label: 'Oportunidades completadas', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'oport_totais', label: 'Total de oportunidades', type: 'number', placeholder: 'Ex: 3' },
                    ],
                },
            ],
        },

        // 13. TEC · MOBILIDADE COM EQUIPAMENTOS E TECNOLOGIA ASSISTIVA
        {
            id: 'TEC',
            label: 'TEC · Tecnologia Assistiva e Mobilidade',
            objectives: [
                {
                    code: 'TEC01',
                    title: 'Realizar propulsão funcional (cadeira de rodas manual).',
                    category: 'TEC',
                    categoryLabel: 'Tecnologia Assistiva',
                    templateText: 'percorrer {metros} metros com nível de assistência {assistencia}',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 20' },
                        { id: 'assistencia', label: 'Assistência', type: 'text', placeholder: 'Ex: independente' },
                    ],
                },
                {
                    code: 'TEC02',
                    title: 'Controlar deslocamento com segurança (cadeira motorizada).',
                    category: 'TEC',
                    categoryLabel: 'Tecnologia Assistiva',
                    templateText: 'completar percurso c/ {obstaculos} curvas/obstáculos em {tent_exito} de {tent_totais} tentativas',
                    fields: [
                        { id: 'obstaculos', label: 'Nº de curvas/obstáculos', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'tent_exito', label: 'Tentativas seguras', type: 'number', placeholder: 'Ex: 3' },
                        { id: 'tent_totais', label: 'Total de tentativas', type: 'number', placeholder: 'Ex: 3' },
                    ],
                },
                {
                    code: 'TEC03',
                    title: 'Utilizar andador de maneira funcional.',
                    category: 'TEC',
                    categoryLabel: 'Tecnologia Assistiva',
                    templateText: 'percorrer {metros} metros mantendo posicionamento adequado',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 15' },
                    ],
                },
                {
                    code: 'TEC04',
                    title: 'Avaliar resposta funcional à adaptação.',
                    category: 'TEC',
                    categoryLabel: 'Tecnologia Assistiva',
                    templateText: 'equipamento: {equipamento} (resultado esperado: {resultado})',
                    fields: [
                        { id: 'equipamento', label: 'Equipamento adaptado', type: 'text', placeholder: 'Ex: apoio de pé customizado' },
                        { id: 'resultado', label: 'Resultado esperado', type: 'text', placeholder: 'Ex: simetria postural' },
                    ],
                },
            ],
        },

        // 14. PAR · PARTICIPAÇÃO FUNCIONAL
        {
            id: 'PAR',
            label: 'PAR · Participação Funcional',
            objectives: [
                {
                    code: 'PAR01',
                    title: 'Deslocar-se entre ambientes da casa.',
                    category: 'PAR',
                    categoryLabel: 'Participação Funcional',
                    templateText: 'percorrer trajeto entre {origem} e {destino}, assistência máx. {assistencia_max}',
                    fields: [
                        { id: 'origem', label: 'Ambiente de origem', type: 'text', placeholder: 'Ex: quarto' },
                        { id: 'destino', label: 'Ambiente de destino', type: 'text', placeholder: 'Ex: sala' },
                        { id: 'assistencia_max', label: 'Assistência máxima', type: 'text', placeholder: 'Ex: supervisão' },
                    ],
                },
                {
                    code: 'PAR02',
                    title: 'Deslocar-se funcionalmente no ambiente escolar.',
                    category: 'PAR',
                    categoryLabel: 'Participação Funcional',
                    templateText: 'completar {trajetos_exito} de {trajetos_totais} trajetos previstos, assistência {assistencia}',
                    fields: [
                        { id: 'trajetos_exito', label: 'Trajetos com êxito', type: 'number', placeholder: 'Ex: 2' },
                        { id: 'trajetos_totais', label: 'Total de trajetos', type: 'number', placeholder: 'Ex: 2' },
                        { id: 'assistencia', label: 'Assistência', type: 'text', placeholder: 'Ex: independente' },
                    ],
                },
                {
                    code: 'PAR03',
                    title: 'Utilizar habilidades motoras para participar de brincadeiras.',
                    category: 'PAR',
                    categoryLabel: 'Participação Funcional',
                    templateText: 'participar durante {minutos} min, assistência máx. {assistencia_max}',
                    fields: [
                        { id: 'minutos', label: 'Minutos de participação', type: 'number', placeholder: 'Ex: 10' },
                        { id: 'assistencia_max', label: 'Assistência máxima', type: 'text', placeholder: 'Ex: mínima' },
                    ],
                },
                {
                    code: 'PAR04',
                    title: 'Realizar mobilidade em ambiente comunitário.',
                    category: 'PAR',
                    categoryLabel: 'Participação Funcional',
                    templateText: 'percorrer {metros} metros em {local} mantendo segurança',
                    fields: [
                        { id: 'metros', label: 'Metros', type: 'number', placeholder: 'Ex: 30' },
                        { id: 'local', label: 'Local comunitário', type: 'text', placeholder: 'Ex: calçada / parque' },
                    ],
                },
                {
                    code: 'PAR05',
                    title: 'Acompanhar demandas motoras de atividade coletiva.',
                    category: 'PAR',
                    categoryLabel: 'Participação Funcional',
                    templateText: 'participar {minutos} min e completar {percentual}% das demandas motoras propostas',
                    fields: [
                        { id: 'minutos', label: 'Minutos', type: 'number', placeholder: 'Ex: 15' },
                        { id: 'percentual', label: 'Demandas completadas (%)', type: 'number', placeholder: 'Ex: 80' },
                    ],
                },
            ],
        },

        // 15. RSP · FUNÇÃO RESPIRATÓRIA — SOMENTE QUANDO CLINICAMENTE INDICADA
        {
            id: 'RSP',
            label: 'RSP · Função Respiratória (Quando Indicada)',
            objectives: [
                {
                    code: 'RSP01',
                    title: 'Manter atividade dentro dos parâmetros clínicos individualmente estabelecidos.',
                    category: 'RSP',
                    categoryLabel: 'Função Respiratória',
                    templateText: 'permanecer ativo por {minutos} min sem sinais de intolerância',
                    fields: [
                        { id: 'minutos', label: 'Minutos ativo', type: 'number', placeholder: 'Ex: 15' },
                    ],
                },
                {
                    code: 'RSP02',
                    title: 'Favorecer padrão respiratório funcional no contexto da condição clínica.',
                    category: 'RSP',
                    categoryLabel: 'Função Respiratória',
                    templateText: 'indicador: {indicador}',
                    fields: [
                        { id: 'indicador', label: 'Indicador observado', type: 'text', placeholder: 'Ex: padrão diafragmático mantido' },
                    ],
                },
                {
                    code: 'RSP03',
                    title: 'Favorecer higiene brônquica quando indicada.',
                    category: 'RSP',
                    categoryLabel: 'Função Respiratória',
                    templateText: 'resposta esperada / indicador: {resposta}',
                    fields: [
                        { id: 'resposta', label: 'Resposta esperada', type: 'text', placeholder: 'Ex: tosse eficaz e desobstrução' },
                    ],
                },
            ],
        },
    ],
}
