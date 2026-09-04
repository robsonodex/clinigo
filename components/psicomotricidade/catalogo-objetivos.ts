export interface ObjetivoCatalogoItem {
    codigo: string;
    categoria: string;
    categoriaLetra: string;
    descricao: string;
}

export const OBJETIVOS_WORLD_SENSORY_CATALOGO: ObjetivoCatalogoItem[] = [
    // A · ENGAJAMENTO, REGULAÇÃO E PARTICIPAÇÃO
    {
        codigo: 'ERP01',
        categoria: 'Engajamento, Regulação e Participação',
        categoriaLetra: 'A · ENGAJAMENTO, REGULAÇÃO E PARTICIPAÇÃO',
        descricao: 'Permanência em atividade motora dirigida (___ min, máx. ___ redirecionamentos)'
    },
    {
        codigo: 'ERP02',
        categoria: 'Engajamento, Regulação e Participação',
        categoriaLetra: 'A · ENGAJAMENTO, REGULAÇÃO E PARTICIPAÇÃO',
        descricao: 'Seguir a sequência de atividades da rotina (___/___ etapas, máx. pista verbal/gestual/visual)'
    },
    {
        codigo: 'ERP03',
        categoria: 'Engajamento, Regulação e Participação',
        categoriaLetra: 'A · ENGAJAMENTO, REGULAÇÃO E PARTICIPAÇÃO',
        descricao: 'Transição entre duas atividades (___/___ sem fuga/choro/recusa, máx. ___ prompts)'
    },
    {
        codigo: 'ERP04',
        categoria: 'Engajamento, Regulação e Participação',
        categoriaLetra: 'A · ENGAJAMENTO, REGULAÇÃO E PARTICIPAÇÃO',
        descricao: 'Aceitar o encerramento de atividade preferida (interromper em até ___s, ___/___ oport.)'
    },
    {
        codigo: 'ERP05',
        categoria: 'Engajamento, Regulação e Participação',
        categoriaLetra: 'A · ENGAJAMENTO, REGULAÇÃO E PARTICIPAÇÃO',
        descricao: 'Aguardar antes de acessar atividade/material (esperar ___s/min, ___/___ oport.)'
    },
    {
        codigo: 'ERP06',
        categoria: 'Engajamento, Regulação e Participação',
        categoriaLetra: 'A · ENGAJAMENTO, REGULAÇÃO E PARTICIPAÇÃO',
        descricao: 'Aceitar mudança sinalizada na atividade/sequência (aceitar ___ mudanças sem oposição)'
    },

    // B · ESQUEMA CORPORAL E CONSCIÊNCIA CORPORAL
    {
        codigo: 'ECC01',
        categoria: 'Esquema Corporal e Consciência Corporal',
        categoriaLetra: 'B · ESQUEMA CORPORAL E CONSCIÊNCIA CORPORAL',
        descricao: 'Identificar partes do próprio corpo (___/___ partes corretas)'
    },
    {
        codigo: 'ECC02',
        categoria: 'Esquema Corporal e Consciência Corporal',
        categoriaLetra: 'B · ESQUEMA CORPORAL E CONSCIÊNCIA CORPORAL',
        descricao: 'Imitar movimentos apresentados pelo profissional (___/___ mov., máx. pista gestual)'
    },
    {
        codigo: 'ECC03',
        categoria: 'Esquema Corporal e Consciência Corporal',
        categoriaLetra: 'B · ESQUEMA CORPORAL E CONSCIÊNCIA CORPORAL',
        descricao: 'Reproduzir sequência de movimentos (seq. de ___ mov., ___/___ tentativas)'
    },
    {
        codigo: 'ECC04',
        categoria: 'Esquema Corporal e Consciência Corporal',
        categoriaLetra: 'B · ESQUEMA CORPORAL E CONSCIÊNCIA CORPORAL',
        descricao: 'Diferenciar/utilizar direita e esquerda (___/___ comandos corretos)'
    },
    {
        codigo: 'ECC05',
        categoria: 'Esquema Corporal e Consciência Corporal',
        categoriaLetra: 'B · ESQUEMA CORPORAL E CONSCIÊNCIA CORPORAL',
        descricao: 'Executar movimento cruzando a linha média (___ repetições consecutivas funcionais)'
    },

    // C · COORDENAÇÃO MOTORA GLOBAL
    {
        codigo: 'CMG01',
        categoria: 'Coordenação Motora Global',
        categoriaLetra: 'C · COORDENAÇÃO MOTORA GLOBAL',
        descricao: 'Correr com controle corporal e direção definida (___m sem queda/colisão, ___/___ tent.)'
    },
    {
        codigo: 'CMG02',
        categoria: 'Coordenação Motora Global',
        categoriaLetra: 'C · COORDENAÇÃO MOTORA GLOBAL',
        descricao: 'Saltar com os dois pés simultaneamente (___ saltos consecutivos bipodais)'
    },
    {
        codigo: 'CMG03',
        categoria: 'Coordenação Motora Global',
        categoriaLetra: 'C · COORDENAÇÃO MOTORA GLOBAL',
        descricao: 'Saltar utilizando apenas um membro inferior (___ saltos/perna, sem apoio externo)'
    },
    {
        codigo: 'CMG04',
        categoria: 'Coordenação Motora Global',
        categoriaLetra: 'C · COORDENAÇÃO MOTORA GLOBAL',
        descricao: 'Transpor obstáculos com organização motora (___ obstáculos, ___/___ tent., máx. ajuda gestual)'
    },
    {
        codigo: 'CMG05',
        categoria: 'Coordenação Motora Global',
        categoriaLetra: 'C · COORDENAÇÃO MOTORA GLOBAL',
        descricao: 'Combinar diferentes padrões motores em sequência (seq. de ___ ações, ___/___ oport.)'
    },

    // D · EQUILÍBRIO E CONTROLE POSTURAL
    {
        codigo: 'EQP01',
        categoria: 'Equilíbrio e Controle Postural',
        categoriaLetra: 'D · EQUILÍBRIO E CONTROLE POSTURAL',
        descricao: 'Manter postura corporal estável (equilíbrio estático) (___s sem apoio externo)'
    },
    {
        codigo: 'EQP02',
        categoria: 'Equilíbrio e Controle Postural',
        categoriaLetra: 'D · EQUILÍBRIO E CONTROLE POSTURAL',
        descricao: 'Permanecer em apoio sobre um membro inferior (___s cada lado)'
    },
    {
        codigo: 'EQP03',
        categoria: 'Equilíbrio e Controle Postural',
        categoriaLetra: 'D · EQUILÍBRIO E CONTROLE POSTURAL',
        descricao: 'Caminhar sobre superfície/trajeto delimitado (___m, ___/___ tentativas)'
    },
    {
        codigo: 'EQP04',
        categoria: 'Equilíbrio e Controle Postural',
        categoriaLetra: 'D · EQUILÍBRIO E CONTROLE POSTURAL',
        descricao: 'Manter equilíbrio em superfície instável (___s, máx. nenhuma/leve/moderada ajuda)'
    },
    {
        codigo: 'EQP05',
        categoria: 'Equilíbrio e Controle Postural',
        categoriaLetra: 'D · EQUILÍBRIO E CONTROLE POSTURAL',
        descricao: 'Manter estabilidade de tronco durante a atividade (___ repetições com alinhamento funcional)'
    },

    // E · COORDENAÇÃO ÓCULO-MANUAL E ÓCULO-PEDAL
    {
        codigo: 'COM01',
        categoria: 'Coordenação Óculo-Manual e Óculo-Pedal',
        categoriaLetra: 'E · COORDENAÇÃO ÓCULO-MANUAL E ÓCULO-PEDAL',
        descricao: 'Arremessar bola em direção a alvo (___/___ acertos a ___m)'
    },
    {
        codigo: 'COM02',
        categoria: 'Coordenação Óculo-Manual e Óculo-Pedal',
        categoriaLetra: 'E · COORDENAÇÃO ÓCULO-MANUAL E ÓCULO-PEDAL',
        descricao: 'Receber bola utilizando as mãos (___/___ recepções a ___m)'
    },
    {
        codigo: 'COM03',
        categoria: 'Coordenação Óculo-Manual e Óculo-Pedal',
        categoriaLetra: 'E · COORDENAÇÃO ÓCULO-MANUAL E ÓCULO-PEDAL',
        descricao: 'Chutar bola em direção a alvo (___/___ chutes direcionados)'
    },
    {
        codigo: 'COM04',
        categoria: 'Coordenação Óculo-Manual e Óculo-Pedal',
        categoriaLetra: 'E · COORDENAÇÃO ÓCULO-MANUAL E ÓCULO-PEDAL',
        descricao: 'Interceptar objeto em movimento (___/___ interceptações)'
    },
    {
        codigo: 'COM05',
        categoria: 'Coordenação Óculo-Manual e Óculo-Pedal',
        categoriaLetra: 'E · COORDENAÇÃO ÓCULO-MANUAL E ÓCULO-PEDAL',
        descricao: 'Acompanhar visualmente objeto em movimento (___/___ trajetórias apresentadas)'
    },

    // F · PLANEJAMENTO MOTOR / PRAXIA
    {
        codigo: 'PMP01',
        categoria: 'Planejamento Motor / Praxia',
        categoriaLetra: 'F · PLANEJAMENTO MOTOR / PRAXIA',
        descricao: 'Iniciar ação após instrução (em até ___s, ___/___ oport.)'
    },
    {
        codigo: 'PMP02',
        categoria: 'Planejamento Motor / Praxia',
        categoriaLetra: 'F · PLANEJAMENTO MOTOR / PRAXIA',
        descricao: 'Executar duas ações motoras em sequência (___/___ sem ajuda física)'
    },
    {
        codigo: 'PMP03',
        categoria: 'Planejamento Motor / Praxia',
        categoriaLetra: 'F · PLANEJAMENTO MOTOR / PRAXIA',
        descricao: 'Executar três ou mais ações em sequência (seq. de ___ etapas, ___/___ oport.)'
    },
    {
        codigo: 'PMP04',
        categoria: 'Planejamento Motor / Praxia',
        categoriaLetra: 'F · PLANEJAMENTO MOTOR / PRAXIA',
        descricao: 'Completar circuito motor previamente organizado (___ etapas, ___/___ tent., máx. pista)'
    },
    {
        codigo: 'PMP05',
        categoria: 'Planejamento Motor / Praxia',
        categoriaLetra: 'F · PLANEJAMENTO MOTOR / PRAXIA',
        descricao: 'Encontrar estratégia p/ superar desafio motor (___/___ com máx. ___ intervenções)'
    },

    // G · ORGANIZAÇÃO ESPACIAL E TEMPORAL
    {
        codigo: 'OET01',
        categoria: 'Organização Espacial e Temporal',
        categoriaLetra: 'G · ORGANIZAÇÃO ESPACIAL E TEMPORAL',
        descricao: 'Responder a dentro/fora, frente/atrás, em cima/embaixo (___/___ comandos corretos)'
    },
    {
        codigo: 'OET02',
        categoria: 'Organização Espacial e Temporal',
        categoriaLetra: 'G · ORGANIZAÇÃO ESPACIAL E TEMPORAL',
        descricao: 'Seguir trajeto previamente delimitado (___/___ percursos sem sair da sequência)'
    },
    {
        codigo: 'OET03',
        categoria: 'Organização Espacial e Temporal',
        categoriaLetra: 'G · ORGANIZAÇÃO ESPACIAL E TEMPORAL',
        descricao: 'Alterar direção mediante sinalização (___/___ mudanças corretas)'
    },
    {
        codigo: 'OET04',
        categoria: 'Organização Espacial e Temporal',
        categoriaLetra: 'G · ORGANIZAÇÃO ESPACIAL E TEMPORAL',
        descricao: 'Executar movimentos acompanhando ritmo apresentado (___s ou ___ repetições no ritmo)'
    },
    {
        codigo: 'OET05',
        categoria: 'Organização Espacial e Temporal',
        categoriaLetra: 'G · ORGANIZAÇÃO ESPACIAL E TEMPORAL',
        descricao: 'Diferenciar movimentos rápidos e lentos (___/___ comandos corretos)'
    },

    // H · AGILIDADE E TEMPO DE REAÇÃO
    {
        codigo: 'ATR01',
        categoria: 'Agilidade e Tempo de Reação',
        categoriaLetra: 'H · AGILIDADE E TEMPO DE REAÇÃO',
        descricao: 'Iniciar movimento diante de sinal visual/auditivo (em até ___s, ___/___ oport.)'
    },
    {
        codigo: 'ATR02',
        categoria: 'Agilidade e Tempo de Reação',
        categoriaLetra: 'H · AGILIDADE E TEMPO DE REAÇÃO',
        descricao: 'Interromper deslocamento mediante sinal (em até ___s, ___/___ oport.)'
    },
    {
        codigo: 'ATR03',
        categoria: 'Agilidade e Tempo de Reação',
        categoriaLetra: 'H · AGILIDADE E TEMPO DE REAÇÃO',
        descricao: 'Mudar rapidamente a direção do deslocamento (___/___ sem perda importante de equilíbrio)'
    },
    {
        codigo: 'ATR04',
        categoria: 'Agilidade e Tempo de Reação',
        categoriaLetra: 'H · AGILIDADE E TEMPO DE REAÇÃO',
        descricao: 'Desviar de obstáculos durante o deslocamento (___ obstáculos, ___/___ sem colisão)'
    },

    // I · FORÇA, RESISTÊNCIA E CAPACIDADE FUNCIONAL
    {
        codigo: 'FRC01',
        categoria: 'Força, Resistência e Capacidade Funcional',
        categoriaLetra: 'I · FORÇA, RESISTÊNCIA E CAPACIDADE FUNCIONAL',
        descricao: 'Manter participação em atividade física continuada (___ min, máx. ___ pausas)'
    },
    {
        codigo: 'FRC02',
        categoria: 'Força, Resistência e Capacidade Funcional',
        categoriaLetra: 'I · FORÇA, RESISTÊNCIA E CAPACIDADE FUNCIONAL',
        descricao: 'Realizar tarefa funcional de empurrar (deslocar objeto ___m, ___ repetições)'
    },
    {
        codigo: 'FRC03',
        categoria: 'Força, Resistência e Capacidade Funcional',
        categoriaLetra: 'I · FORÇA, RESISTÊNCIA E CAPACIDADE FUNCIONAL',
        descricao: 'Realizar tarefa funcional de puxar (___ repetições com execução funcional)'
    },
    {
        codigo: 'FRC04',
        categoria: 'Força, Resistência e Capacidade Funcional',
        categoriaLetra: 'I · FORÇA, RESISTÊNCIA E CAPACIDADE FUNCIONAL',
        descricao: 'Transportar objeto durante deslocamento (___m sem soltar, ___/___ tentativas)'
    },
    {
        codigo: 'FRC05',
        categoria: 'Força, Resistência e Capacidade Funcional',
        categoriaLetra: 'I · FORÇA, RESISTÊNCIA E CAPACIDADE FUNCIONAL',
        descricao: 'Manter determinada posição corporal — sustentação (___s, ___ repetições)'
    },

    // J · HABILIDADES SOCIAIS E PARTICIPAÇÃO EM JOGOS
    {
        codigo: 'HSP01',
        categoria: 'Habilidades Sociais e Participação em Jogos',
        categoriaLetra: 'J · HABILIDADES SOCIAIS E PARTICIPAÇÃO EM JOGOS',
        descricao: 'Aguardar turno em atividade compartilhada (___s, ___/___ oport.)'
    },
    {
        codigo: 'HSP02',
        categoria: 'Habilidades Sociais e Participação em Jogos',
        categoriaLetra: 'J · HABILIDADES SOCIAIS E PARTICIPAÇÃO EM JOGOS',
        descricao: 'Permitir uso compartilhado de materiais (___/___ sem oposição)'
    },
    {
        codigo: 'HSP03',
        categoria: 'Habilidades Sociais e Participação em Jogos',
        categoriaLetra: 'J · HABILIDADES SOCIAIS E PARTICIPAÇÃO EM JOGOS',
        descricao: 'Seguir regras simples de jogo (___/___ regras cumpridas)'
    },
    {
        codigo: 'HSP04',
        categoria: 'Habilidades Sociais e Participação em Jogos',
        categoriaLetra: 'J · HABILIDADES SOCIAIS E PARTICIPAÇÃO EM JOGOS',
        descricao: 'Participar de atividade motora com outra pessoa (___ min na atividade compartilhada)'
    },
    {
        codigo: 'HSP05',
        categoria: 'Habilidades Sociais e Participação em Jogos',
        categoriaLetra: 'J · HABILIDADES SOCIAIS E PARTICIPAÇÃO EM JOGOS',
        descricao: 'Aceitar diferentes resultados de atividade competitiva (___ jogos sem abandonar após perda)'
    },
    {
        codigo: 'HSP06',
        categoria: 'Habilidades Sociais e Participação em Jogos',
        categoriaLetra: 'J · HABILIDADES SOCIAIS E PARTICIPAÇÃO EM JOGOS',
        descricao: 'Cooperar com parceiro para objetivo comum (___/___ etapas da atividade cooperativa)'
    },

    // K · AUTONOMIA DURANTE A SESSÃO
    {
        codigo: 'AUT01',
        categoria: 'Autonomia Durante a Sessão',
        categoriaLetra: 'K · AUTONOMIA DURANTE A SESSÃO',
        descricao: 'Guardar materiais após o uso (___/___ com máx. pista verbal)'
    },
    {
        codigo: 'AUT02',
        categoria: 'Autonomia Durante a Sessão',
        categoriaLetra: 'K · AUTONOMIA DURANTE A SESSÃO',
        descricao: 'Solicitar ajuda de forma funcional (___/___ oport. em que necessitar)'
    },
    {
        codigo: 'AUT03',
        categoria: 'Autonomia Durante a Sessão',
        categoriaLetra: 'K · AUTONOMIA DURANTE A SESSÃO',
        descricao: 'Comunicar necessidade de pausa (resposta comunicativa antes de abandonar, ___/___ oport.)'
    },
    {
        codigo: 'AUT04',
        categoria: 'Autonomia Durante a Sessão',
        categoriaLetra: 'K · AUTONOMIA DURANTE A SESSÃO',
        descricao: 'Escolher entre atividades/materiais disponíveis (em até ___s entre ___ opções)'
    }
];

export const CATEGORIAS_OBJETIVOS_ORDEM = [
    'A · ENGAJAMENTO, REGULAÇÃO E PARTICIPAÇÃO',
    'B · ESQUEMA CORPORAL E CONSCIÊNCIA CORPORAL',
    'C · COORDENAÇÃO MOTORA GLOBAL',
    'D · EQUILÍBRIO E CONTROLE POSTURAL',
    'E · COORDENAÇÃO ÓCULO-MANUAL E ÓCULO-PEDAL',
    'F · PLANEJAMENTO MOTOR / PRAXIA',
    'G · ORGANIZAÇÃO ESPACIAL E TEMPORAL',
    'H · AGILIDADE E TEMPO DE REAÇÃO',
    'I · FORÇA, RESISTÊNCIA E CAPACIDADE FUNCIONAL',
    'J · HABILIDADES SOCIAIS E PARTICIPAÇÃO EM JOGOS',
    'K · AUTONOMIA DURANTE A SESSÃO'
];
