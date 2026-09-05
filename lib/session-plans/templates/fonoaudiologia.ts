/**
 * Configuração Oficial do Plano de Sessão: Fonoaudiologia
 * Fonte: Ficha de Acompanhamento Clínico + Plano de Sessão World Sensory
 */

import { SpecialtyTemplateConfig } from '../types'

export const FONOAUDIOLOGIA_TEMPLATE: SpecialtyTemplateConfig = {
    "id": "fonoaudiologia",
    "name": "Fonoaudiologia",
    "professionalRole": "Fonoaudiólogo(a)",
    "councilName": "CRFa",
    "minObjectives": 2,
    "maxObjectives": 4,
    "categories": [
        {
            "id": "LR",
            "label": "LR · LINGUAGEM RECEPTIVA",
            "objectives": [
                {
                    "code": "LR01",
                    "title": "Seguir instruções contendo uma ação.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "executar corretamente {param_1} de {param_2} instruções, sem pista gestual",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR02",
                    "title": "Executar duas ações apresentadas em sequência.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "executar corretamente {param_1} de {param_2} instruções de duas etapas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR03",
                    "title": "Seguir instruções contendo múltiplos elementos linguísticos.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "executar corretamente {param_1} de {param_2} instruções, com no máx. {param_3} repetição(ões",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_3",
                            "label": "Parâmetro 3",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR04",
                    "title": "Identificar objetos ou figuras mediante nomeação.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "selecionar corretamente {param_1} de {param_2} estímulos em campo de {param_3} itens",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_3",
                            "label": "Parâmetro 3",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR05",
                    "title": "Identificar ações representadas em figuras, vídeos ou situações naturais.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "identificar corretamente {param_1} de {param_2} ações",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR06",
                    "title": "Identificar objetos a partir de sua função.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "selecionar corretamente {param_1} de {param_2} itens apresentados pela função",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR07",
                    "title": "Identificar estímulos a partir de atributos.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "responder corretamente a {param_1} de {param_2} tent. (cor, tamanho, forma, categoria...",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR08",
                    "title": "Identificar elementos pertencentes a uma categoria.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "selecionar corretamente {param_1} de {param_2} estímulos da categoria-alvo",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR09",
                    "title": "Compreender dentro/fora, em cima/embaixo, frente/atrás, perto/longe.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "responder corretamente a {param_1} de {param_2} instruções",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR10",
                    "title": "Compreender antes/depois, primeiro/último, ontem/hoje/amanhã.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "responder corretamente a {param_1} de {param_2} situações apresentadas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR11",
                    "title": "Diferenciar pronomes pessoais e possessivos.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "responder corretamente a {param_1} de {param_2} estímulos",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR12",
                    "title": "Compreender perguntas com quem, o quê, onde, quando, como, por quê.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "responder adequadamente a {param_1} de {param_2} perguntas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR13",
                    "title": "Inferir informações a partir de pistas contextuais.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "responder corretamente a {param_1} de {param_2} questões inferenciais",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LR14",
                    "title": "Identificar relações entre palavras, objetos, ações ou situações.",
                    "category": "LR",
                    "categoryLabel": "LR · LINGUAGEM RECEPTIVA",
                    "templateText": "responder corretamente a {param_1} de {param_2} relações apresentadas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        },
        {
            "id": "LE",
            "label": "LE · LINGUAGEM EXPRESSIVA",
            "objectives": [
                {
                    "code": "LE01",
                    "title": "Nomear objetos ou figuras.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "nomear corretamente {param_1} de {param_2} estímulos, com no máx. {param_3}{param_4}_",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_3",
                            "label": "Parâmetro 3",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_4",
                            "label": "Parâmetro 4",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE02",
                    "title": "Nomear ações.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "nomear corretamente {param_1} de {param_2} ações",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE03",
                    "title": "Utilizar novas palavras em contexto funcional.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "utilizar espontaneamente pelo menos {param_1} palavras-alvo na sessão",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE04",
                    "title": "Combinar dois ou mais elementos em um enunciado.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "produzir {param_1} combinações de {param_2} elementos em situações comunicativas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE05",
                    "title": "Produzir frases com maior extensão.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "produzir enunciados com pelo menos {param_1} elementos em {param_2} de {param_3} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_3",
                            "label": "Parâmetro 3",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE06",
                    "title": "Produzir sentenças com estrutura sintática adequada.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "produzir sentenças estruturalmente adequadas em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE07",
                    "title": "Utilizar verbos adequados ao contexto.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "utilizar corretamente {param_1} de {param_2} verbos-alvo",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE08",
                    "title": "Utilizar adequadamente flexões de tempo, pessoa e número.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "utilizar flexão adequada em {param_1} de {param_2} enunciados",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE09",
                    "title": "Inserir elementos gramaticais",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "artigos/preposições/conectivos",
                    "fields": []
                },
                {
                    "code": "LE10",
                    "title": "Utilizar pronomes adequados ao contexto.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "utilizar corretamente pronomes em {param_1} de {param_2} enunciados",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE11",
                    "title": "Descrever objetos, pessoas, ações, cenas ou acontecimentos.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "produzir ≥ {param_1} informações relevantes em {param_2} de {param_3} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_3",
                            "label": "Parâmetro 3",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE12",
                    "title": "Responder perguntas sem modelo da resposta.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "responder adequadamente a {param_1} de {param_2} perguntas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE13",
                    "title": "Formular perguntas funcionalmente.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "produzir pelo menos {param_1} perguntas espontâneas na sessão",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE14",
                    "title": "Explicar o significado ou função de palavras.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "fornecer definição/característica relevante em {param_1} de {param_2} estímulos",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "LE15",
                    "title": "Estabelecer relações entre palavras e conceitos.",
                    "category": "LE",
                    "categoryLabel": "LE · LINGUAGEM EXPRESSIVA",
                    "templateText": "estabelecer corretamente {param_1} de {param_2} relações apresentadas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        },
        {
            "id": "PR",
            "label": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
            "objectives": [
                {
                    "code": "PR01",
                    "title": "Iniciar interação espontaneamente.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "apresentar pelo menos {param_1} iniciações espontâneas na sessão",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR02",
                    "title": "Solicitar objetos, atividades, informações ou ações.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "realizar solicitação funcional em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR03",
                    "title": "Recusar/indicar desejo de interromper atividade funcionalmente.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "comunicar recusa em {param_1} de {param_2} oport. antes de esquiva não comunicativa",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR04",
                    "title": "Pedir ajuda quando necessário.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "solicitar ajuda em {param_1} de {param_2} oport. em que necessitar",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR05",
                    "title": "Comunicar necessidade de interromper temporariamente a atividade.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "solicitar pausa funcionalmente em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR06",
                    "title": "Comentar espontaneamente sobre objetos, ações ou acontecimentos.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "emitir pelo menos {param_1} comentários espontâneos na sessão",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR07",
                    "title": "Compartilhar informações relevantes com o interlocutor.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "compartilhar espontaneamente {param_1} informações na interação",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR08",
                    "title": "Coordenar atenção entre interlocutor e referente.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "apresentar atenção compartilhada em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR09",
                    "title": "Participar de trocas comunicativas recíprocas.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "manter pelo menos {param_1} turnos consecutivos em {param_2} situações",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR10",
                    "title": "Manter o mesmo tópico durante conversação.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "manter o tópico por ≥ {param_1} turnos em {param_2} de {param_3} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_3",
                            "label": "Parâmetro 3",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR11",
                    "title": "Introduzir novo tópico de forma contextualizada.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "realizar mudança adequada de tópico em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR12",
                    "title": "Modificar a mensagem quando o interlocutor não compreender.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "apresentar reparo em {param_1} de {param_2} oport. após sinal de incompreensão",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR13",
                    "title": "Alternar adequadamente os papéis de falante e ouvinte.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "sustentar conversação por {param_1} turnos com participação recíproca",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR14",
                    "title": "Ajustar conteúdo, volume, detalhamento ou forma da mensagem.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "realizar ajuste adequado em {param_1} de {param_2} situações comunicativas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PR15",
                    "title": "Compreender/utilizar expressões figuradas, inferência, ironia.",
                    "category": "PR",
                    "categoryLabel": "PR · PRAGMÁTICA E COMUNICAÇÃO FUNCIONAL",
                    "templateText": "responder adequadamente a {param_1} de {param_2} situações apresentadas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        },
        {
            "id": "ND",
            "label": "ND · NARRATIVA E DISCURSO",
            "objectives": [
                {
                    "code": "ND01",
                    "title": "Organizar eventos em ordem temporal.",
                    "category": "ND",
                    "categoryLabel": "ND · NARRATIVA E DISCURSO",
                    "templateText": "ordenar corretamente {param_1} de {param_2} sequências com {param_3} eventos",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_3",
                            "label": "Parâmetro 3",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "ND02",
                    "title": "Recontar história ou acontecimento previamente apresentado.",
                    "category": "ND",
                    "categoryLabel": "ND · NARRATIVA E DISCURSO",
                    "templateText": "mencionar pelo menos {param_1} de {param_2} elementos essenciais",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "ND03",
                    "title": "Produzir narrativa com início, desenvolvimento e desfecho.",
                    "category": "ND",
                    "categoryLabel": "ND · NARRATIVA E DISCURSO",
                    "templateText": "incluir os componentes esperados em {param_1} de {param_2} narrativas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "ND04",
                    "title": "Manter relação lógica entre informações.",
                    "category": "ND",
                    "categoryLabel": "ND · NARRATIVA E DISCURSO",
                    "templateText": "produzir narrativa coerente em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "ND05",
                    "title": "Utilizar recursos linguísticos para conectar os eventos.",
                    "category": "ND",
                    "categoryLabel": "ND · NARRATIVA E DISCURSO",
                    "templateText": "utilizar corretamente ≥ {param_1} conectivos/marcadores discursivos",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "ND06",
                    "title": "Fornecer informações suficientes p/ compreensão do interlocutor.",
                    "category": "ND",
                    "categoryLabel": "ND · NARRATIVA E DISCURSO",
                    "templateText": "incluir {param_1} de {param_2} informações essenciais sem perguntas adicionais",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "ND07",
                    "title": "Relatar acontecimentos vivenciados.",
                    "category": "ND",
                    "categoryLabel": "ND · NARRATIVA E DISCURSO",
                    "templateText": "relatar evento com ≥ {param_1} elementos relevantes, sequência compreensível",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        },
        {
            "id": "FO",
            "label": "FO · FONOLOGIA",
            "objectives": [
                {
                    "code": "FO01",
                    "title": "Diferenciar auditivamente contrastes fonológicos relevantes.",
                    "category": "FO",
                    "categoryLabel": "FO · FONOLOGIA",
                    "templateText": "discriminar corretamente {param_1} de {param_2} pares apresentados",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "FO02",
                    "title": "Produzir o fonema-alvo isoladamente. Fonema: /___/",
                    "category": "FO",
                    "categoryLabel": "FO · FONOLOGIA",
                    "templateText": "produzir adequadamente em {param_1} de {param_2} tentativas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "FO03",
                    "title": "Produzir o fonema-alvo em estruturas silábicas.",
                    "category": "FO",
                    "categoryLabel": "FO · FONOLOGIA",
                    "templateText": "produzir corretamente {param_1} de {param_2} estímulos",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "FO04",
                    "title": "Produzir o fonema-alvo em palavras. Posição: ☐Inicial ☐Medial ☐Final ☐Dif.",
                    "category": "FO",
                    "categoryLabel": "FO · FONOLOGIA",
                    "templateText": "produzir corretamente {param_1} de {param_2} palavras",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "FO05",
                    "title": "Produzir o alvo durante frases.",
                    "category": "FO",
                    "categoryLabel": "FO · FONOLOGIA",
                    "templateText": "produzir adequadamente em {param_1} de {param_2} ocorrências",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "FO06",
                    "title": "Generalizar a produção-alvo para conversação.",
                    "category": "FO",
                    "categoryLabel": "FO · FONOLOGIA",
                    "templateText": "produzir o alvo em {param_1}% das ocorrências, amostra de {param_2} min",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "FO07",
                    "title": "Reduzir ocorrência do processo _____________________.",
                    "category": "FO",
                    "categoryLabel": "FO · FONOLOGIA",
                    "templateText": "produzir a forma- alvo em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "FO08",
                    "title": "Estabelecer contraste entre _____________________.",
                    "category": "FO",
                    "categoryLabel": "FO · FONOLOGIA",
                    "templateText": "produzir corretamente o contraste em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        },
        {
            "id": "PM",
            "label": "PM · PLANEJAMENTO E PROGRAMAÇÃO MOTORA DA FALA",
            "objectives": [
                {
                    "code": "PM01",
                    "title": "Produzir sequência articulatória-alvo com precisão.",
                    "category": "PM",
                    "categoryLabel": "PM · PLANEJAMENTO E PROGRAMAÇÃO MOTORA DA FALA",
                    "templateText": "produzir corretamente {param_1} de {param_2} estímulos",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PM02",
                    "title": "Produzir sequências silábicas de complexidade crescente.",
                    "category": "PM",
                    "categoryLabel": "PM · PLANEJAMENTO E PROGRAMAÇÃO MOTORA DA FALA",
                    "templateText": "produzir adequadamente {param_1} de {param_2} sequências-alvo",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PM03",
                    "title": "Aumentar precisão das transições entre sons e sílabas.",
                    "category": "PM",
                    "categoryLabel": "PM · PLANEJAMENTO E PROGRAMAÇÃO MOTORA DA FALA",
                    "templateText": "produzir transições adequadas em {param_1} de {param_2} estímulos",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PM04",
                    "title": "Produzir a mesma palavra de maneira consistente entre repetições.",
                    "category": "PM",
                    "categoryLabel": "PM · PLANEJAMENTO E PROGRAMAÇÃO MOTORA DA FALA",
                    "templateText": "manter padrão consistente em {param_1} de {param_2} repetições",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PM05",
                    "title": "Produzir palavras/enunciados com complexidade motora crescente.",
                    "category": "PM",
                    "categoryLabel": "PM · PLANEJAMENTO E PROGRAMAÇÃO MOTORA DA FALA",
                    "templateText": "produzir corretamente {param_1} de {param_2} estímulos no nível estabelecido",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PM06",
                    "title": "Melhorar ritmo, acento, duração e/ou entonação.",
                    "category": "PM",
                    "categoryLabel": "PM · PLANEJAMENTO E PROGRAMAÇÃO MOTORA DA FALA",
                    "templateText": "apresentar padrão prosódico adequado em {param_1} de {param_2} estímulos",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "PM07",
                    "title": "Utilizar padrões treinados em comunicação funcional.",
                    "category": "PM",
                    "categoryLabel": "PM · PLANEJAMENTO E PROGRAMAÇÃO MOTORA DA FALA",
                    "templateText": "produzir corretamente {param_1} de {param_2} palavras-alvo em fala espontânea",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        },
        {
            "id": "IF",
            "label": "IF · INTELIGIBILIDADE E PRODUÇÃO DE FALA",
            "objectives": [
                {
                    "code": "IF01",
                    "title": "Aumentar inteligibilidade de palavras isoladas.",
                    "category": "IF",
                    "categoryLabel": "IF · INTELIGIBILIDADE E PRODUÇÃO DE FALA",
                    "templateText": "apresentar produção compreensível em {param_1} de {param_2} estímulos",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "IF02",
                    "title": "Aumentar inteligibilidade em enunciados.",
                    "category": "IF",
                    "categoryLabel": "IF · INTELIGIBILIDADE E PRODUÇÃO DE FALA",
                    "templateText": "apresentar fala compreensível em {param_1}% das frases produzidas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "IF03",
                    "title": "Aumentar inteligibilidade da fala espontânea.",
                    "category": "IF",
                    "categoryLabel": "IF · INTELIGIBILIDADE E PRODUÇÃO DE FALA",
                    "templateText": "atingir {param_1}% de inteligibilidade, amostra de {param_2} min",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "IF04",
                    "title": "Ajustar a velocidade de fala às demandas comunicativas.",
                    "category": "IF",
                    "categoryLabel": "IF · INTELIGIBILIDADE E PRODUÇÃO DE FALA",
                    "templateText": "manter taxa funcional por {param_1} min, com no máx. {param_2} lembretes",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "IF05",
                    "title": "Identificar e modificar produções pouco compreensíveis.",
                    "category": "IF",
                    "categoryLabel": "IF · INTELIGIBILIDADE E PRODUÇÃO DE FALA",
                    "templateText": "realizar autorreparo em {param_1} de {param_2} oport. após incompreensão",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        },
        {
            "id": "MO",
            "label": "MO · MOTRICIDADE OROFACIAL",
            "objectives": [
                {
                    "code": "MO01",
                    "title": "Favorecer postura labial funcional",
                    "category": "MO",
                    "categoryLabel": "MO · MOTRICIDADE OROFACIAL",
                    "templateText": "repouso/função específica",
                    "fields": []
                },
                {
                    "code": "MO02",
                    "title": "Favorecer postura lingual funcional conforme achado clínico.",
                    "category": "MO",
                    "categoryLabel": "MO · MOTRICIDADE OROFACIAL",
                    "templateText": "apresentar posicionamento estabelecido em {param_1}% das observações",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "MO03",
                    "title": "Melhorar estabilidade mandibular durante função específica.",
                    "category": "MO",
                    "categoryLabel": "MO · MOTRICIDADE OROFACIAL",
                    "templateText": "manter estabilidade adequada em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "MO04",
                    "title": "Executar movimento labial necessário à função-alvo.",
                    "category": "MO",
                    "categoryLabel": "MO · MOTRICIDADE OROFACIAL",
                    "templateText": "executar adequadamente {param_1} de {param_2} oport. durante a função trabalhada",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "MO05",
                    "title": "Executar movimento lingual necessário à função-alvo.",
                    "category": "MO",
                    "categoryLabel": "MO · MOTRICIDADE OROFACIAL",
                    "templateText": "executar adequadamente {param_1} de {param_2} oport. durante a função trabalhada",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "MO06",
                    "title": "Coordenar movimentos necessários à fala ou função estomatognática.",
                    "category": "MO",
                    "categoryLabel": "MO · MOTRICIDADE OROFACIAL",
                    "templateText": "realizar adequadamente {param_1} de {param_2} sequências funcionais",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        },
        {
            "id": "MA",
            "label": "MA · MASTIGAÇÃO",
            "objectives": [
                {
                    "code": "MA01",
                    "title": "Realizar incisão funcional do alimento.",
                    "category": "MA",
                    "categoryLabel": "MA · MASTIGAÇÃO",
                    "templateText": "realizar em {param_1} de {param_2} oport. com consistência {param_3}{param_4}_",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_3",
                            "label": "Parâmetro 3",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_4",
                            "label": "Parâmetro 4",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "MA02",
                    "title": "Melhorar eficiência durante trituração do alimento.",
                    "category": "MA",
                    "categoryLabel": "MA · MASTIGAÇÃO",
                    "templateText": "apresentar trituração funcional em {param_1} de {param_2} ofertas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "MA03",
                    "title": "Favorecer lateralização funcional do alimento.",
                    "category": "MA",
                    "categoryLabel": "MA · MASTIGAÇÃO",
                    "templateText": "observar lateralização funcional em {param_1}% das oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "MA04",
                    "title": "Favorecer utilização bilateral durante mastigação.",
                    "category": "MA",
                    "categoryLabel": "MA · MASTIGAÇÃO",
                    "templateText": "apresentar padrão bilateral em {param_1}% da amostra observada",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "MA05",
                    "title": "Manter vedamento labial durante mastigação.",
                    "category": "MA",
                    "categoryLabel": "MA · MASTIGAÇÃO",
                    "templateText": "manter vedamento adequado em {param_1}% das oport. observadas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "MA06",
                    "title": "Melhorar processamento oral do alimento.",
                    "category": "MA",
                    "categoryLabel": "MA · MASTIGAÇÃO",
                    "templateText": "realizar mastigação funcional em {param_1} de {param_2} ofertas, sem {param_3}{param_4}_",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_3",
                            "label": "Parâmetro 3",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_4",
                            "label": "Parâmetro 4",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        },
        {
            "id": "DG",
            "label": "DG · DEGLUTIÇÃO E FUNÇÃO ORAL",
            "objectives": [
                {
                    "code": "DG01",
                    "title": "Melhorar controle do bolo alimentar ou líquido.",
                    "category": "DG",
                    "categoryLabel": "DG · DEGLUTIÇÃO E FUNÇÃO ORAL",
                    "templateText": "apresentar controle oral adequado em {param_1} de {param_2} ofertas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "DG02",
                    "title": "Reduzir escape anterior durante alimentação.",
                    "category": "DG",
                    "categoryLabel": "DG · DEGLUTIÇÃO E FUNÇÃO ORAL",
                    "templateText": "ausência de escape anterior em {param_1} de {param_2} ofertas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "DG03",
                    "title": "Melhorar organização oral antes da deglutição.",
                    "category": "DG",
                    "categoryLabel": "DG · DEGLUTIÇÃO E FUNÇÃO ORAL",
                    "templateText": "organizar adequadamente o bolo em {param_1} de {param_2} ofertas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "DG04",
                    "title": "Favorecer padrão funcional conforme achados da avaliação.",
                    "category": "DG",
                    "categoryLabel": "DG · DEGLUTIÇÃO E FUNÇÃO ORAL",
                    "templateText": "apresentar padrão estabelecido em {param_1} de {param_2} oport. observadas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "DG05",
                    "title": "Utilizar copo, colher ou outro utensílio funcionalmente. Utensílio: ___",
                    "category": "DG",
                    "categoryLabel": "DG · DEGLUTIÇÃO E FUNÇÃO ORAL",
                    "templateText": "utilizar adequadamente em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        },
        {
            "id": "RP",
            "label": "RP · RESPIRAÇÃO E VOZ",
            "objectives": [
                {
                    "code": "RP01",
                    "title": "Favorecer padrão respiratório funcional conforme avaliação.",
                    "category": "RP",
                    "categoryLabel": "RP · RESPIRAÇÃO E VOZ",
                    "templateText": "apresentar o padrão estabelecido em {param_1}% das observações",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "RP02",
                    "title": "Melhorar coordenação entre respiração, fonação e articulação.",
                    "category": "RP",
                    "categoryLabel": "RP · RESPIRAÇÃO E VOZ",
                    "templateText": "produzir enunciados de {param_1} palavras sem quebra resp. inadequada, {param_2}/{param_3}",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_3",
                            "label": "Parâmetro 3",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        },
        {
            "id": "CA",
            "label": "CA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA (CAA)",
            "objectives": [
                {
                    "code": "CA01",
                    "title": "Acessar adequadamente o sistema de comunicação.",
                    "category": "CA",
                    "categoryLabel": "CA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA (CAA)",
                    "templateText": "acessar corretamente o sistema em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "CA02",
                    "title": "Localizar palavras ou símbolos no sistema.",
                    "category": "CA",
                    "categoryLabel": "CA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA (CAA)",
                    "templateText": "localizar corretamente {param_1} de {param_2} palavras-alvo",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "CA03",
                    "title": "Solicitar utilizando CAA.",
                    "category": "CA",
                    "categoryLabel": "CA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA (CAA)",
                    "templateText": "produzir pelo menos {param_1} solicitações independentes na sessão",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "CA04",
                    "title": "Comunicar recusa utilizando CAA.",
                    "category": "CA",
                    "categoryLabel": "CA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA (CAA)",
                    "templateText": "comunicar recusa adequadamente em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "CA05",
                    "title": "Comentar utilizando CAA.",
                    "category": "CA",
                    "categoryLabel": "CA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA (CAA)",
                    "templateText": "produzir pelo menos {param_1} comentários em situações comunicativas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "CA06",
                    "title": "Combinar símbolos ou palavras para produzir mensagens.",
                    "category": "CA",
                    "categoryLabel": "CA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA (CAA)",
                    "templateText": "produzir mensagens com ≥ {param_1} elementos em {param_2} de {param_3} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_3",
                            "label": "Parâmetro 3",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "CA07",
                    "title": "Responder perguntas utilizando o sistema.",
                    "category": "CA",
                    "categoryLabel": "CA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA (CAA)",
                    "templateText": "responder adequadamente a {param_1} de {param_2} perguntas",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "CA08",
                    "title": "Iniciar comunicação utilizando CAA.",
                    "category": "CA",
                    "categoryLabel": "CA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA (CAA)",
                    "templateText": "apresentar pelo menos {param_1} iniciações independentes na sessão",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "CA09",
                    "title": "Integrar CAA, fala, gestos e/ou vocalizações funcionalmente.",
                    "category": "CA",
                    "categoryLabel": "CA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA (CAA)",
                    "templateText": "utilizar comunicação multimodal funcional em {param_1} de {param_2} oport.",
                    "fields": [
                        {
                            "id": "param_1",
                            "label": "Parâmetro 1",
                            "type": "text",
                            "placeholder": "Preencher"
                        },
                        {
                            "id": "param_2",
                            "label": "Parâmetro 2",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                }
            ]
        }
    ],
    "initialConditions": {
        "generalStates": [
            "Regulado e disponível para interação",
            "Agitado",
            "Sonolento / baixa ativação",
            "Irritado",
            "Choroso",
            "Dificuldade de transição",
            "Esquiva de demandas",
            "Baixa responsividade social",
            "Interesse restrito em determinado estímulo",
            "Outro"
        ],
        "recentChanges": [
            "Iniciou interação espontaneamente",
            "Respondeu ao cumprimento",
            "Utilizou fala espontânea",
            "Utilizou CAA espontaneamente",
            "Utilizou gestos/vocalizações",
            "Apresentou ecolalia",
            "Fala pouco inteligível",
            "Nenhuma alteração comunicativa recente",
            "Outro"
        ]
    },
    "assistanceLevels": [
        {
            "id": "independente",
            "label": "Independente",
            "description": "Realiza sem nenhuma ajuda ou modelo."
        },
        {
            "id": "pista_ambiental",
            "label": "Pista ambiental / visual",
            "description": "Estímulo visual ou apoio no ambiente."
        },
        {
            "id": "pista_gestual",
            "label": "Pista gestual",
            "description": "Apontar, gesticular ou indicar o alvo."
        },
        {
            "id": "pista_verbal",
            "label": "Pista verbal",
            "description": "Dica falada, fonêmica ou semântica."
        },
        {
            "id": "modelo",
            "label": "Modelo imediato",
            "description": "Profissional fornece o modelo vocal ou de sinalização."
        },
        {
            "id": "ajuda_fisica_parcial",
            "label": "Ajuda física parcial",
            "description": "Toque leve para direcionar o movimento articulatório ou gesto."
        },
        {
            "id": "ajuda_fisica_total",
            "label": "Ajuda física total",
            "description": "Condução física mão sobre mão."
        }
    ],
    "strategies": [
        {
            "category": "Organização da sessão",
            "items": [
                "Rotina visual",
                "Primeiro/depois",
                "Antecipação",
                "Oferta de escolha",
                "Timer visual",
                "Controle de estímulos distratores",
                "Pausas programadas",
                "Outro"
            ]
        },
        {
            "category": "Linguagem e Fala",
            "items": [
                "Modelagem linguística",
                "Expansão e extensão",
                "Reformulação / recast",
                "Estimulação focada",
                "Ensino incidental",
                "Espera expectante",
                "Bombardeamento auditivo",
                "Pistas multissensoriais",
                "Outro"
            ]
        },
        {
            "category": "Motricidade Orofacial e CAA",
            "items": [
                "Estimulação tátil-térmica",
                "Exercícios miofuncionais",
                "Modelagem em prancha/tablet de CAA",
                "Apoio físico para acionamento",
                "Outro"
            ]
        }
    ],
    "sessionStages": [
        {
            "id": 1,
            "name": "Acolhimento e interação inicial",
            "defaultMinutes": 10
        },
        {
            "id": 2,
            "name": "Atividades estruturadas de linguagem/fala",
            "defaultMinutes": 20
        },
        {
            "id": 3,
            "name": "Aplicação em brincadeira / contexto natural",
            "defaultMinutes": 15
        },
        {
            "id": 4,
            "name": "Fechamento e orientações à família",
            "defaultMinutes": 5
        }
    ],
    "nextSessionDecisions": [
        "Manter objetivos e nível de pista",
        "Avançar para critério mais complexo",
        "Esvaecer nível de pista/ajuda",
        "Aumentar número de oportunidades",
        "Trabalhar em contexto de generalização",
        "Reavaliar objetivo terapêutico"
    ],
    "generalizationContexts": [
        "Casa",
        "Escola",
        "Comunidade",
        "Parque",
        "Refeitório",
        "Rotina de sono",
        "Outro"
    ]
}
