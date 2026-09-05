/**
 * Configuração Oficial do Plano de Sessão: Terapia Ocupacional
 * Fonte: Ficha de Acompanhamento Clínico + Plano de Sessão World Sensory
 */

import { SpecialtyTemplateConfig } from '../types'

export const TERAPIA_OCUPACIONAL_TEMPLATE: SpecialtyTemplateConfig = {
    "id": "terapia_ocupacional",
    "name": "Terapia Ocupacional",
    "professionalRole": "Terapeuta Ocupacional",
    "councilName": "CREFITO",
    "minObjectives": 2,
    "maxObjectives": 4,
    "categories": [
        {
            "id": "PER",
            "label": "PER · DESEMPENHO OCUPACIONAL E ENGAJAMENTO",
            "objectives": [
                {
                    "code": "PER01",
                    "title": "Permanecer envolvido em atividade funcional ou lúdica.",
                    "category": "PER",
                    "categoryLabel": "PER · DESEMPENHO OCUPACIONAL E ENGAJAMENTO",
                    "templateText": "permanecer engajado por {param_1} min, com no máx. {param_2} redirecionamentos",
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
                    "code": "PER02",
                    "title": "Iniciar atividade após orientação ou apresentação do contexto.",
                    "category": "PER",
                    "categoryLabel": "PER · DESEMPENHO OCUPACIONAL E ENGAJAMENTO",
                    "templateText": "iniciar em até {param_1} segundos em {param_2} de {param_3} oport.",
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
                    "code": "PER03",
                    "title": "Permanecer na atividade até sua conclusão.",
                    "category": "PER",
                    "categoryLabel": "PER · DESEMPENHO OCUPACIONAL E ENGAJAMENTO",
                    "templateText": "finalizar {param_1} de {param_2} atividades iniciadas com no máx. {param_3}{param_4}_ ajuda",
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
                    "code": "PER04",
                    "title": "Realizar transição entre tarefas ou ambientes.",
                    "category": "PER",
                    "categoryLabel": "PER · DESEMPENHO OCUPACIONAL E ENGAJAMENTO",
                    "templateText": "completar {param_1} de {param_2} transições com no máx. {param_3} prompts",
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
                    "code": "PER05",
                    "title": "Aceitar mudança de material, atividade ou sequência.",
                    "category": "PER",
                    "categoryLabel": "PER · DESEMPENHO OCUPACIONAL E ENGAJAMENTO",
                    "templateText": "tolerar {param_1} mudanças planejadas sem abandono da atividade",
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
                    "code": "PER06",
                    "title": "Aguardar antes de acessar objeto ou atividade.",
                    "category": "PER",
                    "categoryLabel": "PER · DESEMPENHO OCUPACIONAL E ENGAJAMENTO",
                    "templateText": "aguardar {param_1} segundos/min em {param_2} de {param_3} oport.",
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
                    "code": "PER07",
                    "title": "Manter participação diante de erro, dificuldade ou impedimento.",
                    "category": "PER",
                    "categoryLabel": "PER · DESEMPENHO OCUPACIONAL E ENGAJAMENTO",
                    "templateText": "permanecer funcionalmente engajado em {param_1} de {param_2} situações de dificuldade",
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
                    "code": "PER08",
                    "title": "Comunicar necessidade de pausa antes de abandonar a atividade.",
                    "category": "PER",
                    "categoryLabel": "PER · DESEMPENHO OCUPACIONAL E ENGAJAMENTO",
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
                }
            ]
        },
        {
            "id": "SEN",
            "label": "SEN · PROCESSAMENTO SENSORIAL E REGULAÇÃO",
            "objectives": [
                {
                    "code": "SEN01",
                    "title": "Aumentar participação funcional diante de estímulos táteis relevantes.",
                    "category": "SEN",
                    "categoryLabel": "SEN · PROCESSAMENTO SENSORIAL E REGULAÇÃO",
                    "templateText": "permanecer na atividade por {param_1} min diante de {param_2}{param_3}_, sem interrupção significativa",
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
                    "code": "SEN02",
                    "title": "Manipular materiais com diferentes características táteis.",
                    "category": "SEN",
                    "categoryLabel": "SEN · PROCESSAMENTO SENSORIAL E REGULAÇÃO",
                    "templateText": "interagir funcionalmente com {param_1} de {param_2} texturas durante {param_3} seg/min",
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
                    "code": "SEN03",
                    "title": "Manter participação em ambientes com estímulos sonoros.",
                    "category": "SEN",
                    "categoryLabel": "SEN · PROCESSAMENTO SENSORIAL E REGULAÇÃO",
                    "templateText": "permanecer engajado por {param_1} min com ruído de {param_2}{param_3}_, no máx. {param_4}{param_5}_ estratégia",
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
                        },
                        {
                            "id": "param_5",
                            "label": "Parâmetro 5",
                            "type": "text",
                            "placeholder": "Preencher"
                        }
                    ]
                },
                {
                    "code": "SEN04",
                    "title": "Manter desempenho diante de estímulos visuais ambientais.",
                    "category": "SEN",
                    "categoryLabel": "SEN · PROCESSAMENTO SENSORIAL E REGULAÇÃO",
                    "templateText": "completar {param_1} de {param_2} tarefas em ambiente com {param_3}{param_4}_ sem perda de desempenho",
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
                    "code": "SEN05",
                    "title": "Utilizar estratégias funcionais de regulação diante de necessidade de movimento.",
                    "category": "SEN",
                    "categoryLabel": "SEN · PROCESSAMENTO SENSORIAL E REGULAÇÃO",
                    "templateText": "utilizar estratégia ensinada em {param_1} de {param_2} oport. antes de abandonar a atividade",
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
                    "code": "SEN06",
                    "title": "Retornar a atividade dirigida após experiência de movimento.",
                    "category": "SEN",
                    "categoryLabel": "SEN · PROCESSAMENTO SENSORIAL E REGULAÇÃO",
                    "templateText": "realizar transição p/ atividade de mesa em até {param_1} min, no máx. {param_2} prompts",
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
                    "code": "SEN07",
                    "title": "Reconhecer sinais corporais associados à necessidade de regulação.",
                    "category": "SEN",
                    "categoryLabel": "SEN · PROCESSAMENTO SENSORIAL E REGULAÇÃO",
                    "templateText": "identificar corretamente seu estado corporal em {param_1} de {param_2} situações",
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
                    "code": "SEN08",
                    "title": "Escolher estratégia adequada para retornar à participação.",
                    "category": "SEN",
                    "categoryLabel": "SEN · PROCESSAMENTO SENSORIAL E REGULAÇÃO",
                    "templateText": "selecionar e utilizar estratégia funcional em {param_1} de {param_2} oport.",
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
                    "code": "SEN09",
                    "title": "Aumentar participação em atividades envolvendo toque relevante à rotina. Contexto: ☐cabelo ☐unha ☐rosto ☐higiene oral ☐vestir ☐outro",
                    "category": "SEN",
                    "categoryLabel": "SEN · PROCESSAMENTO SENSORIAL E REGULAÇÃO",
                    "templateText": "participar durante {param_1}% da rotina, no máx. {param_2}{param_3}_ ajuda",
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
            "id": "AVD",
            "label": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
            "objectives": [
                {
                    "code": "AVD01",
                    "title": "Retirar camiseta seguindo sequência funcional.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "completar {param_1} de {param_2} etapas de forma independente",
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
                    "code": "AVD02",
                    "title": "Vestir camiseta com orientação adequada.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "completar {param_1} de {param_2} etapas com no máx. {param_3}{param_4}_ ajuda",
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
                    "code": "AVD03",
                    "title": "Vestir peça inferior",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "calça/short",
                    "fields": []
                },
                {
                    "code": "AVD04",
                    "title": "Calçar sapatos ou sandálias.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "completar {param_1} de {param_2} etapas independentemente",
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
                    "code": "AVD05",
                    "title": "Manipular fechamentos",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "☐zíper ☐botão ☐velcro ☐cadarço ☐fivela",
                    "fields": []
                },
                {
                    "code": "AVD06",
                    "title": "Identificar frente/verso e posição adequada das peças.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "orientar corretamente {param_1} de {param_2} peças",
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
                    "code": "AVD07",
                    "title": "Realizar sequência funcional de lavagem das mãos.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "completar {param_1} de {param_2} etapas sem ajuda física",
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
                    "code": "AVD08",
                    "title": "Participar funcionalmente da higiene oral.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "completar {param_1} de {param_2} etapas com no máx. pista {param_3}{param_4}_",
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
                    "code": "AVD09",
                    "title": "Realizar cuidado básico com os cabelos.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "completar tarefa durante {param_1} min ou {param_2} de {param_3} etapas",
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
                    "code": "AVD10",
                    "title": "Realizar lavagem e secagem do rosto.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "completar {param_1}% da rotina independentemente",
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
                    "code": "AVD11",
                    "title": "Realizar etapas da rotina de toileting.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "completar {param_1} de {param_2} etapas da sequência estabelecida",
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
                    "code": "AVD12",
                    "title": "Participar da higiene após evacuação/micção.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "realizar {param_1} de {param_2} etapas com nível de ajuda {param_3}{param_4}_",
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
                    "code": "AVD13",
                    "title": "Utilizar colher durante alimentação.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "realizar {param_1} de {param_2} porções sem derramamento significativo",
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
                    "code": "AVD14",
                    "title": "Utilizar garfo funcionalmente.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "completar {param_1} de {param_2} oport. independentemente",
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
                    "code": "AVD15",
                    "title": "Utilizar copo funcionalmente.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "realizar {param_1} goles com controle adequado e nível de ajuda {param_2}{param_3}_",
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
                    "code": "AVD16",
                    "title": "Permanecer funcionalmente na rotina de alimentação.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "permanecer à mesa por {param_1} min, c/ no máx. {param_2} redirecionamentos",
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
                    "code": "AVD17",
                    "title": "Participar de tarefas simples relacionadas à alimentação.",
                    "category": "AVD",
                    "categoryLabel": "AVD · ATIVIDADES DE VIDA DIÁRIA (AVD)",
                    "templateText": "completar {param_1} de {param_2} etapas com no máx. {param_3}{param_4}_ ajuda",
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
            "id": "AIV",
            "label": "AIV · ATIVIDADES INSTRUMENTAIS DE VIDA DIÁRIA (AIVD)",
            "objectives": [
                {
                    "code": "AIV01",
                    "title": "Guardar materiais e objetos pessoais.",
                    "category": "AIV",
                    "categoryLabel": "AIV · ATIVIDADES INSTRUMENTAIS DE VIDA DIÁRIA (AIVD)",
                    "templateText": "guardar corretamente {param_1} de {param_2} itens",
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
                    "code": "AIV02",
                    "title": "Organizar materiais necessários à rotina.",
                    "category": "AIV",
                    "categoryLabel": "AIV · ATIVIDADES INSTRUMENTAIS DE VIDA DIÁRIA (AIVD)",
                    "templateText": "selecionar e guardar corretamente {param_1} de {param_2} itens previstos",
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
                    "code": "AIV03",
                    "title": "Participar de tarefas simples de organização.",
                    "category": "AIV",
                    "categoryLabel": "AIV · ATIVIDADES INSTRUMENTAIS DE VIDA DIÁRIA (AIVD)",
                    "templateText": "completar {param_1} de {param_2} etapas independentemente",
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
                    "code": "AIV04",
                    "title": "Preparar lanche simples.",
                    "category": "AIV",
                    "categoryLabel": "AIV · ATIVIDADES INSTRUMENTAIS DE VIDA DIÁRIA (AIVD)",
                    "templateText": "completar sequência de {param_1} etapas com no máx. {param_2}{param_3}_ ajuda",
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
                    "code": "AIV05",
                    "title": "Utilizar utensílios domésticos compatíveis com idade e segurança.",
                    "category": "AIV",
                    "categoryLabel": "AIV · ATIVIDADES INSTRUMENTAIS DE VIDA DIÁRIA (AIVD)",
                    "templateText": "realizar tarefa com uso seguro em {param_1} de {param_2} oport.",
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
                    "code": "AIV06",
                    "title": "Utilizar dinheiro em situação simulada ou natural.",
                    "category": "AIV",
                    "categoryLabel": "AIV · ATIVIDADES INSTRUMENTAIS DE VIDA DIÁRIA (AIVD)",
                    "templateText": "selecionar valor adequado em {param_1} de {param_2} oport.",
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
                    "code": "AIV07",
                    "title": "Seguir lista simples para aquisição de itens.",
                    "category": "AIV",
                    "categoryLabel": "AIV · ATIVIDADES INSTRUMENTAIS DE VIDA DIÁRIA (AIVD)",
                    "templateText": "localizar {param_1} de {param_2} itens sem assistência direta",
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
                    "code": "AIV08",
                    "title": "Utilizar agenda, checklist ou suporte visual.",
                    "category": "AIV",
                    "categoryLabel": "AIV · ATIVIDADES INSTRUMENTAIS DE VIDA DIÁRIA (AIVD)",
                    "templateText": "completar {param_1} de {param_2} atividades consultando o suporte independentemente",
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
            "id": "CMF",
            "label": "CMF · COORDENAÇÃO MOTORA FINA E DESTREZA MANUAL",
            "objectives": [
                {
                    "code": "CMF01",
                    "title": "Utilizar padrão de preensão adequado à tarefa.",
                    "category": "CMF",
                    "categoryLabel": "CMF · COORDENAÇÃO MOTORA FINA E DESTREZA MANUAL",
                    "templateText": "manter preensão funcional durante {param_1}% da atividade",
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
                    "code": "CMF02",
                    "title": "Manipular objetos pequenos utilizando pinça.",
                    "category": "CMF",
                    "categoryLabel": "CMF · COORDENAÇÃO MOTORA FINA E DESTREZA MANUAL",
                    "templateText": "transferir/manipular {param_1} objetos em {param_2} de {param_3} oport.",
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
                    "code": "CMF03",
                    "title": "Realizar translação, rotação ou deslocamento de objetos na mão.",
                    "category": "CMF",
                    "categoryLabel": "CMF · COORDENAÇÃO MOTORA FINA E DESTREZA MANUAL",
                    "templateText": "realizar corretamente {param_1} de {param_2} tentativas",
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
                    "code": "CMF04",
                    "title": "Utilizar as duas mãos de maneira coordenada.",
                    "category": "CMF",
                    "categoryLabel": "CMF · COORDENAÇÃO MOTORA FINA E DESTREZA MANUAL",
                    "templateText": "completar {param_1} de {param_2} tarefas bilaterais sem ajuda física",
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
                    "code": "CMF05",
                    "title": "Utilizar uma mão para estabilizar enquanto a outra executa.",
                    "category": "CMF",
                    "categoryLabel": "CMF · COORDENAÇÃO MOTORA FINA E DESTREZA MANUAL",
                    "templateText": "apresentar padrão funcional em {param_1} de {param_2} oport.",
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
                    "code": "CMF06",
                    "title": "Aplicar força suficiente durante atividade manipulativa.",
                    "category": "CMF",
                    "categoryLabel": "CMF · COORDENAÇÃO MOTORA FINA E DESTREZA MANUAL",
                    "templateText": "completar {param_1} repetições sem perda funcional do desempenho",
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
                    "code": "CMF07",
                    "title": "Manipular objetos pequenos com maior precisão.",
                    "category": "CMF",
                    "categoryLabel": "CMF · COORDENAÇÃO MOTORA FINA E DESTREZA MANUAL",
                    "templateText": "concluir {param_1} de {param_2} tentativas sem queda ou erro de posicionamento",
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
            "id": "GRA",
            "label": "GRA · HABILIDADES GRAFOMOTORAS",
            "objectives": [
                {
                    "code": "GRA01",
                    "title": "Utilizar preensão funcional durante atividade gráfica.",
                    "category": "GRA",
                    "categoryLabel": "GRA · HABILIDADES GRAFOMOTORAS",
                    "templateText": "manter padrão funcional durante {param_1} min",
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
                    "code": "GRA02",
                    "title": "Realizar traçado dentro de limites estabelecidos.",
                    "category": "GRA",
                    "categoryLabel": "GRA · HABILIDADES GRAFOMOTORAS",
                    "templateText": "permanecer dentro do limite em {param_1}% do percurso",
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
                    "code": "GRA03",
                    "title": "Copiar traçados básicos.",
                    "category": "GRA",
                    "categoryLabel": "GRA · HABILIDADES GRAFOMOTORAS",
                    "templateText": "reproduzir corretamente {param_1} de {param_2} modelos",
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
                    "code": "GRA04",
                    "title": "Copiar formas geométricas.",
                    "category": "GRA",
                    "categoryLabel": "GRA · HABILIDADES GRAFOMOTORAS",
                    "templateText": "reproduzir {param_1} de {param_2} formas com organização espacial adequada",
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
                    "code": "GRA05",
                    "title": "Produzir letras/palavras com legibilidade compatível com o objetivo.",
                    "category": "GRA",
                    "categoryLabel": "GRA · HABILIDADES GRAFOMOTORAS",
                    "templateText": "produzir corretamente {param_1} de {param_2} itens",
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
                    "code": "GRA06",
                    "title": "Utilizar adequadamente o espaço gráfico.",
                    "category": "GRA",
                    "categoryLabel": "GRA · HABILIDADES GRAFOMOTORAS",
                    "templateText": "respeitar margens, linha e espaçamento em {param_1}% da produção",
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
                    "code": "GRA07",
                    "title": "Recortar seguindo linha ou forma delimitada.",
                    "category": "GRA",
                    "categoryLabel": "GRA · HABILIDADES GRAFOMOTORAS",
                    "templateText": "permanecer dentro de margem de {param_1} mm em {param_2} de {param_3} tentativas",
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
            "id": "VIS",
            "label": "VIS · HABILIDADES VISUOPERCEPTIVAS E VISUOMOTORAS",
            "objectives": [
                {
                    "code": "VIS01",
                    "title": "Diferenciar estímulos visuais semelhantes.",
                    "category": "VIS",
                    "categoryLabel": "VIS · HABILIDADES VISUOPERCEPTIVAS E VISUOMOTORAS",
                    "templateText": "identificar corretamente {param_1} de {param_2} estímulos",
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
                    "code": "VIS02",
                    "title": "Localizar estímulo relevante em campo visual complexo.",
                    "category": "VIS",
                    "categoryLabel": "VIS · HABILIDADES VISUOPERCEPTIVAS E VISUOMOTORAS",
                    "templateText": "localizar {param_1} de {param_2} alvos em até {param_3} segundos",
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
                    "code": "VIS03",
                    "title": "Reconhecer formas em diferentes posições, tamanhos ou contextos.",
                    "category": "VIS",
                    "categoryLabel": "VIS · HABILIDADES VISUOPERCEPTIVAS E VISUOMOTORAS",
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
                    "code": "VIS04",
                    "title": "Identificar posição relativa entre objetos.",
                    "category": "VIS",
                    "categoryLabel": "VIS · HABILIDADES VISUOPERCEPTIVAS E VISUOMOTORAS",
                    "templateText": "responder corretamente a {param_1} de {param_2} situações",
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
                    "code": "VIS05",
                    "title": "Recordar estímulos visuais previamente apresentados.",
                    "category": "VIS",
                    "categoryLabel": "VIS · HABILIDADES VISUOPERCEPTIVAS E VISUOMOTORAS",
                    "templateText": "recuperar corretamente {param_1} de {param_2} itens após intervalo de {param_3} seg",
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
                    "code": "VIS06",
                    "title": "Reproduzir modelo visual por resposta motora.",
                    "category": "VIS",
                    "categoryLabel": "VIS · HABILIDADES VISUOPERCEPTIVAS E VISUOMOTORAS",
                    "templateText": "reproduzir corretamente {param_1} de {param_2} modelos",
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
                    "code": "VIS07",
                    "title": "Montar estrutura a partir de modelo.",
                    "category": "VIS",
                    "categoryLabel": "VIS · HABILIDADES VISUOPERCEPTIVAS E VISUOMOTORAS",
                    "templateText": "reproduzir modelo com {param_1} elementos e {param_2}% de precisão",
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
            "id": "PRX",
            "label": "PRX · PRÁXIS E PLANEJAMENTO MOTOR",
            "objectives": [
                {
                    "code": "PRX01",
                    "title": "Reproduzir gesto ou ação apresentada.",
                    "category": "PRX",
                    "categoryLabel": "PRX · PRÁXIS E PLANEJAMENTO MOTOR",
                    "templateText": "imitar corretamente {param_1} de {param_2} movimentos",
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
                    "code": "PRX02",
                    "title": "Gerar uma ação funcional a partir dos materiais disponíveis.",
                    "category": "PRX",
                    "categoryLabel": "PRX · PRÁXIS E PLANEJAMENTO MOTOR",
                    "templateText": "produzir pelo menos {param_1} formas funcionais de uso sem modelo direto",
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
                    "code": "PRX03",
                    "title": "Organizar sequência de movimentos para alcançar objetivo.",
                    "category": "PRX",
                    "categoryLabel": "PRX · PRÁXIS E PLANEJAMENTO MOTOR",
                    "templateText": "completar tarefa de {param_1} etapas com no máx. {param_2} prompts",
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
                    "code": "PRX04",
                    "title": "Executar ações na ordem funcional.",
                    "category": "PRX",
                    "categoryLabel": "PRX · PRÁXIS E PLANEJAMENTO MOTOR",
                    "templateText": "completar corretamente {param_1} de {param_2} sequências",
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
                    "code": "PRX05",
                    "title": "Adquirir novo padrão motor.",
                    "category": "PRX",
                    "categoryLabel": "PRX · PRÁXIS E PLANEJAMENTO MOTOR",
                    "templateText": "realizar ação-alvo em {param_1} de {param_2} tentativas, ajuda máx. {param_3}{param_4}_",
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
                    "code": "PRX06",
                    "title": "Realizar habilidade aprendida em situação diferente.",
                    "category": "PRX",
                    "categoryLabel": "PRX · PRÁXIS E PLANEJAMENTO MOTOR",
                    "templateText": "executar habilidade em {param_1} diferentes contextos/materiais",
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
            "id": "BRI",
            "label": "BRI · BRINCAR E LAZER",
            "objectives": [
                {
                    "code": "BRI01",
                    "title": "Utilizar brinquedo de acordo com sua função.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR E LAZER",
                    "templateText": "utilizar adequadamente {param_1} de {param_2} brinquedos",
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
                    "code": "BRI02",
                    "title": "Sustentar sequência simples de brincadeira.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR E LAZER",
                    "templateText": "permanecer durante {param_1} min, realizando pelo menos {param_2} ações relacionadas",
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
                    "code": "BRI03",
                    "title": "Produzir ações de faz-de-conta.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR E LAZER",
                    "templateText": "realizar espontaneamente {param_1} ações simbólicas diferentes",
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
                    "code": "BRI04",
                    "title": "Variar ações durante brincadeira.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR E LAZER",
                    "templateText": "produzir pelo menos {param_1} variações sem modelo direto",
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
                    "code": "BRI05",
                    "title": "Participar de brincadeira com outra pessoa.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR E LAZER",
                    "templateText": "sustentar interação compartilhada por {param_1} turnos ou {param_2} min",
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
                    "code": "BRI06",
                    "title": "Participar de jogo simples respeitando regras.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR E LAZER",
                    "templateText": "seguir {param_1} de {param_2} regras durante {param_3} partidas",
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
                    "code": "BRI07",
                    "title": "Escolher atividade recreativa entre alternativas.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR E LAZER",
                    "templateText": "escolha funcional entre {param_1} opções, permanecer na atividade por {param_2} min",
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
            "id": "FEX",
            "label": "FEX · FUNÇÕES EXECUTIVAS",
            "objectives": [
                {
                    "code": "FEX01",
                    "title": "Interromper resposta diante de instrução.",
                    "category": "FEX",
                    "categoryLabel": "FEX · FUNÇÕES EXECUTIVAS",
                    "templateText": "interromper ação em até {param_1} seg em {param_2} de {param_3} oport.",
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
                    "code": "FEX02",
                    "title": "Manter informação necessária durante uma tarefa.",
                    "category": "FEX",
                    "categoryLabel": "FEX · FUNÇÕES EXECUTIVAS",
                    "templateText": "completar corretamente {param_1} de {param_2} instruções com {param_3} elementos",
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
                    "code": "FEX03",
                    "title": "Organizar ações em sequência.",
                    "category": "FEX",
                    "categoryLabel": "FEX · FUNÇÕES EXECUTIVAS",
                    "templateText": "ordenar corretamente {param_1} de {param_2} etapas",
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
                    "code": "FEX04",
                    "title": "Antecipar etapas necessárias para completar tarefa.",
                    "category": "FEX",
                    "categoryLabel": "FEX · FUNÇÕES EXECUTIVAS",
                    "templateText": "identificar corretamente {param_1} de {param_2} etapas antes de iniciar",
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
                    "code": "FEX05",
                    "title": "Alterar estratégia quando a regra muda.",
                    "category": "FEX",
                    "categoryLabel": "FEX · FUNÇÕES EXECUTIVAS",
                    "templateText": "adaptar resposta em {param_1} de {param_2} mudanças de regra",
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
                    "code": "FEX06",
                    "title": "Identificar erro durante execução.",
                    "category": "FEX",
                    "categoryLabel": "FEX · FUNÇÕES EXECUTIVAS",
                    "templateText": "identificar espontaneamente {param_1} de {param_2} erros",
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
                    "code": "FEX07",
                    "title": "Corrigir desempenho após identificar erro.",
                    "category": "FEX",
                    "categoryLabel": "FEX · FUNÇÕES EXECUTIVAS",
                    "templateText": "realizar autocorreção em {param_1} de {param_2} oport.",
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
                    "code": "FEX08",
                    "title": "Completar atividade dentro de intervalo previamente definido.",
                    "category": "FEX",
                    "categoryLabel": "FEX · FUNÇÕES EXECUTIVAS",
                    "templateText": "concluir tarefa em até {param_1} min com no máx. {param_2} lembretes",
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
            "id": "ESC",
            "label": "ESC · PARTICIPAÇÃO ESCOLAR",
            "objectives": [
                {
                    "code": "ESC01",
                    "title": "Permanecer em tarefa pedagógica.",
                    "category": "ESC",
                    "categoryLabel": "ESC · PARTICIPAÇÃO ESCOLAR",
                    "templateText": "permanecer por {param_1} min com no máx. {param_2} redirecionamentos",
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
                    "code": "ESC02",
                    "title": "Preparar os materiais necessários.",
                    "category": "ESC",
                    "categoryLabel": "ESC · PARTICIPAÇÃO ESCOLAR",
                    "templateText": "selecionar corretamente {param_1} de {param_2} itens",
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
                    "code": "ESC03",
                    "title": "Acompanhar rotina escolar utilizando suporte disponível.",
                    "category": "ESC",
                    "categoryLabel": "ESC · PARTICIPAÇÃO ESCOLAR",
                    "templateText": "completar {param_1} de {param_2} etapas de forma independente",
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
                    "code": "ESC04",
                    "title": "Copiar informação do quadro/material para o papel.",
                    "category": "ESC",
                    "categoryLabel": "ESC · PARTICIPAÇÃO ESCOLAR",
                    "templateText": "copiar {param_1} de {param_2} elementos com organização adequada",
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
                    "code": "ESC05",
                    "title": "Realizar transição entre ambientes/atividades.",
                    "category": "ESC",
                    "categoryLabel": "ESC · PARTICIPAÇÃO ESCOLAR",
                    "templateText": "completar {param_1} de {param_2} transições, ajuda máx. {param_3}{param_4}_",
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
                    "code": "ESC06",
                    "title": "Pedir assistência diante de dificuldade acadêmica ou funcional.",
                    "category": "ESC",
                    "categoryLabel": "ESC · PARTICIPAÇÃO ESCOLAR",
                    "templateText": "solicitar ajuda funcionalmente em {param_1} de {param_2} oport.",
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
                    "code": "ESC07",
                    "title": "Guardar e localizar materiais escolares.",
                    "category": "ESC",
                    "categoryLabel": "ESC · PARTICIPAÇÃO ESCOLAR",
                    "templateText": "realizar corretamente {param_1} de {param_2} oport.",
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
            "id": "SOC",
            "label": "SOC · PARTICIPAÇÃO SOCIAL",
            "objectives": [
                {
                    "code": "SOC01",
                    "title": "Participar de atividade em proximidade com outras crianças.",
                    "category": "SOC",
                    "categoryLabel": "SOC · PARTICIPAÇÃO SOCIAL",
                    "templateText": "permanecer por {param_1} min sem abandonar o contexto",
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
                    "code": "SOC02",
                    "title": "Alternar turnos em atividade compartilhada.",
                    "category": "SOC",
                    "categoryLabel": "SOC · PARTICIPAÇÃO SOCIAL",
                    "templateText": "realizar {param_1} turnos consecutivos",
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
                    "code": "SOC03",
                    "title": "Compartilhar materiais durante atividade.",
                    "category": "SOC",
                    "categoryLabel": "SOC · PARTICIPAÇÃO SOCIAL",
                    "templateText": "compartilhar em {param_1} de {param_2} oport.",
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
                    "code": "SOC04",
                    "title": "Participar de tarefa com objetivo compartilhado.",
                    "category": "SOC",
                    "categoryLabel": "SOC · PARTICIPAÇÃO SOCIAL",
                    "templateText": "completar {param_1} de {param_2} etapas cooperativas",
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
                    "code": "SOC05",
                    "title": "Permanecer e participar de atividade coletiva.",
                    "category": "SOC",
                    "categoryLabel": "SOC · PARTICIPAÇÃO SOCIAL",
                    "templateText": "permanecer {param_1} min e responder a pelo menos {param_2} oport. de participação",
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
            "id": "AUT",
            "label": "AUT · AUTONOMIA E AUTODETERMINAÇÃO",
            "objectives": [
                {
                    "code": "AUT01",
                    "title": "Escolher entre alternativas disponíveis.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E AUTODETERMINAÇÃO",
                    "templateText": "realizar escolha funcional em {param_1} de {param_2} oport.",
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
                    "code": "AUT02",
                    "title": "Identificar necessidade de suporte e pedir ajuda.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E AUTODETERMINAÇÃO",
                    "templateText": "solicitar ajuda em {param_1} de {param_2} situações sem abandono da tarefa",
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
                    "code": "AUT03",
                    "title": "Comunicar recusa ou desconforto de forma apropriada.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E AUTODETERMINAÇÃO",
                    "templateText": "utilizar comunicação funcional em {param_1} de {param_2} oport.",
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
                    "code": "AUT04",
                    "title": "Avaliar se conseguiu completar determinada tarefa.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E AUTODETERMINAÇÃO",
                    "templateText": "identificar corretamente seu desempenho em {param_1} de {param_2} situações",
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
                    "code": "AUT05",
                    "title": "Escolher estratégia adequada diante de problema simples.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E AUTODETERMINAÇÃO",
                    "templateText": "selecionar solução funcional em {param_1} de {param_2} situações",
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
            "id": "ROT",
            "label": "ROT · ROTINAS, HÁBITOS E PAPÉIS OCUPACIONAIS",
            "objectives": [
                {
                    "code": "ROT01",
                    "title": "Seguir rotina de preparação para o sono.",
                    "category": "ROT",
                    "categoryLabel": "ROT · ROTINAS, HÁBITOS E PAPÉIS OCUPACIONAIS",
                    "templateText": "completar {param_1} de {param_2} etapas com nível de ajuda {param_3}{param_4}_",
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
                    "code": "ROT02",
                    "title": "Seguir sequência de atividades ao acordar.",
                    "category": "ROT",
                    "categoryLabel": "ROT · ROTINAS, HÁBITOS E PAPÉIS OCUPACIONAIS",
                    "templateText": "completar {param_1}% da rotina independentemente",
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
                    "code": "ROT03",
                    "title": "Consultar agenda para organizar atividades do dia.",
                    "category": "ROT",
                    "categoryLabel": "ROT · ROTINAS, HÁBITOS E PAPÉIS OCUPACIONAIS",
                    "templateText": "verificar o recurso de maneira independente em {param_1} de {param_2} transições",
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
            "Alerta e modulado",
            "Hiporesponsivo / baixa energia",
            "Hiperresponsivo / defensividade tátil-auditiva",
            "Busca sensorial intensa",
            "Desorganização postural / motora",
            "Resistência ao contato / demandas",
            "Outro"
        ],
        "recentChanges": [
            "Troca de calçado/roupa incômoda",
            "Agitação na escola/creche",
            "Fadiga por rotina cheia",
            "Nenhuma alteração recente",
            "Outro"
        ]
    },
    "assistanceLevels": [
        {
            "id": "independente",
            "label": "Independente",
            "description": "Realiza a atividade com total autonomia no tempo esperado."
        },
        {
            "id": "supervisao",
            "label": "Supervisão / Alerta verbal",
            "description": "Orientação ou lembrete verbal sem intervenção física."
        },
        {
            "id": "assistencia_minima",
            "label": "Assistência mínima (25%)",
            "description": "Pequeno auxílio no início ou ajuste motor leve."
        },
        {
            "id": "assistencia_moderada",
            "label": "Assistência moderada (50%)",
            "description": "Auxílio substancial na condução da tarefa."
        },
        {
            "id": "assistencia_maxima",
            "label": "Assistência máxima (75%)",
            "description": "Realiza parte mínima com condução física direta."
        },
        {
            "id": "dependente",
            "label": "Totalmente dependente (100%)",
            "description": "Terapeuta executa a totalidade da tarefa pelo paciente."
        }
    ],
    "strategies": [
        {
            "category": "Integração Sensorial e Modulação",
            "items": [
                "Input proprioceptivo profundo",
                "Estimulação vestibular linear / angular",
                "Adaptação do ambiente sensorial (luz/som)",
                "Escovação terapêutica / pressão profunda",
                "Transições sensoriais preparatórias",
                "Outro"
            ]
        },
        {
            "category": "Práxis, Coordenação e AVDs",
            "items": [
                "Análise e quebra da atividade em etapas",
                "Adaptação de utensílios (engrossadores, velcro)",
                "Pistas biomecânicas de estabilidade proximal",
                "Atividades grafomotoras e recorte adaptado",
                "Treino de vestuário e calçamento",
                "Outro"
            ]
        }
    ],
    "sessionStages": [
        {
            "id": 1,
            "name": "Preparação e modulação sensorial inicial",
            "defaultMinutes": 10
        },
        {
            "id": 2,
            "name": "Desafio motor / práxis / coordenação",
            "defaultMinutes": 20
        },
        {
            "id": 3,
            "name": "Aplicação em AVD / atividade funcional",
            "defaultMinutes": 15
        },
        {
            "id": 4,
            "name": "Organização de materiais e encerramento",
            "defaultMinutes": 5
        }
    ],
    "nextSessionDecisions": [
        "Manter adaptações atuais",
        "Reduzir gradativamente o nível de assistência",
        "Introduzir nova textura ou demanda sensorial",
        "Avançar na independência da AVD",
        "Orientar adaptação de ambiente escolar/doméstico"
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
