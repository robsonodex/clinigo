/**
 * Configuração Oficial do Plano de Sessão: Psicologia
 * Fonte: Ficha de Acompanhamento Clínico + Plano de Sessão World Sensory
 */

import { SpecialtyTemplateConfig } from '../types'

export const PSICOLOGIA_TEMPLATE: SpecialtyTemplateConfig = {
    "id": "psicologia",
    "name": "Psicologia",
    "professionalRole": "Psicólogo(a)",
    "councilName": "CFP",
    "minObjectives": 2,
    "maxObjectives": 4,
    "categories": [
        {
            "id": "EP",
            "label": "EP · ENGAJAMENTO E PARTICIPAÇÃO TERAPÊUTICA",
            "objectives": [
                {
                    "code": "EP01",
                    "title": "Permanecer envolvido em atividade terapêutica.",
                    "category": "EP",
                    "categoryLabel": "EP · ENGAJAMENTO E PARTICIPAÇÃO TERAPÊUTICA",
                    "templateText": "permanecer por {param_1} min, com no máx. {param_2} redirecionamentos",
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
                    "code": "EP02",
                    "title": "Acompanhar a sequência planejada da sessão.",
                    "category": "EP",
                    "categoryLabel": "EP · ENGAJAMENTO E PARTICIPAÇÃO TERAPÊUTICA",
                    "templateText": "concluir {param_1} de {param_2} etapas com no máx. {param_3}{param_4}_ de ajuda",
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
                    "code": "EP03",
                    "title": "Iniciar tarefa após apresentação da instrução.",
                    "category": "EP",
                    "categoryLabel": "EP · ENGAJAMENTO E PARTICIPAÇÃO TERAPÊUTICA",
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
                    "code": "EP04",
                    "title": "Permanecer na atividade até sua finalização.",
                    "category": "EP",
                    "categoryLabel": "EP · ENGAJAMENTO E PARTICIPAÇÃO TERAPÊUTICA",
                    "templateText": "concluir {param_1} de {param_2} atividades sem abandono",
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
                    "code": "EP05",
                    "title": "Realizar transição entre atividades.",
                    "category": "EP",
                    "categoryLabel": "EP · ENGAJAMENTO E PARTICIPAÇÃO TERAPÊUTICA",
                    "templateText": "realizar {param_1} de {param_2} transições em até {param_3} seg/min, no máx. {param_4} pistas",
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
                    "code": "EP06",
                    "title": "Participar de atividade de menor preferência.",
                    "category": "EP",
                    "categoryLabel": "EP · ENGAJAMENTO E PARTICIPAÇÃO TERAPÊUTICA",
                    "templateText": "permanecer engajado durante {param_1} min em {param_2} de {param_3} oport.",
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
            "id": "EM",
            "label": "EM · IDENTIFICAÇÃO E COMPREENSÃO DE EMOÇÕES",
            "objectives": [
                {
                    "code": "EM01",
                    "title": "Identificar alegria, tristeza, raiva, medo e outras emoções básicas.",
                    "category": "EM",
                    "categoryLabel": "EM · IDENTIFICAÇÃO E COMPREENSÃO DE EMOÇÕES",
                    "templateText": "identificar corretamente {param_1} de {param_2} emoções apresentadas",
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
                    "code": "EM02",
                    "title": "Identificar verbalmente ou por CAA a própria emoção.",
                    "category": "EM",
                    "categoryLabel": "EM · IDENTIFICAÇÃO E COMPREENSÃO DE EMOÇÕES",
                    "templateText": "nomear adequadamente o próprio estado emocional em {param_1} de {param_2} situações",
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
                    "code": "EM03",
                    "title": "Inferir estados emocionais de outras pessoas.",
                    "category": "EM",
                    "categoryLabel": "EM · IDENTIFICAÇÃO E COMPREENSÃO DE EMOÇÕES",
                    "templateText": "identificar corretamente a emoção do outro em {param_1} de {param_2} situações",
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
                    "code": "EM04",
                    "title": "Relacionar acontecimentos a possíveis emoções.",
                    "category": "EM",
                    "categoryLabel": "EM · IDENTIFICAÇÃO E COMPREENSÃO DE EMOÇÕES",
                    "templateText": "estabelecer relação adequada em {param_1} de {param_2} situações apresentadas",
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
                    "code": "EM05",
                    "title": "Diferenciar níveis de intensidade emocional.",
                    "category": "EM",
                    "categoryLabel": "EM · IDENTIFICAÇÃO E COMPREENSÃO DE EMOÇÕES",
                    "templateText": "classificar corretamente a intensidade em {param_1} de {param_2} situações",
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
                    "code": "EM06",
                    "title": "Identificar alterações corporais relacionadas aos estados emocionais.",
                    "category": "EM",
                    "categoryLabel": "EM · IDENTIFICAÇÃO E COMPREENSÃO DE EMOÇÕES",
                    "templateText": "identificar pelo menos {param_1} sinais corporais associados a {param_2} emoções",
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
                    "code": "EM07",
                    "title": "Identificar eventos que contribuíram para determinado estado emocional.",
                    "category": "EM",
                    "categoryLabel": "EM · IDENTIFICAÇÃO E COMPREENSÃO DE EMOÇÕES",
                    "templateText": "identificar adequadamente possíveis causas em {param_1} de {param_2} situações",
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
                    "code": "EM08",
                    "title": "Comunicar estado emocional de maneira funcional.",
                    "category": "EM",
                    "categoryLabel": "EM · IDENTIFICAÇÃO E COMPREENSÃO DE EMOÇÕES",
                    "templateText": "comunicar o estado emocional em {param_1} de {param_2} oport. antes de comportamento desadaptativo",
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
            "id": "RE",
            "label": "RE · REGULAÇÃO EMOCIONAL",
            "objectives": [
                {
                    "code": "RE01",
                    "title": "Utilizar estratégia previamente ensinada diante de ativação emocional.",
                    "category": "RE",
                    "categoryLabel": "RE · REGULAÇÃO EMOCIONAL",
                    "templateText": "utilizar a estratégia em {param_1} de {param_2} oport., no máx. {param_3}{param_4}_ de ajuda",
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
                    "code": "RE02",
                    "title": "Solicitar pausa antes de abandonar ou escalar comportamento.",
                    "category": "RE",
                    "categoryLabel": "RE · REGULAÇÃO EMOCIONAL",
                    "templateText": "solicitar pausa funcionalmente em {param_1} de {param_2} situações",
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
                    "code": "RE03",
                    "title": "Pedir ajuda diante de dificuldade.",
                    "category": "RE",
                    "categoryLabel": "RE · REGULAÇÃO EMOCIONAL",
                    "templateText": "solicitar ajuda em {param_1} de {param_2} oport. antes de abandonar a atividade",
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
                    "code": "RE04",
                    "title": "Retornar a estado de participação após evento frustrante.",
                    "category": "RE",
                    "categoryLabel": "RE · REGULAÇÃO EMOCIONAL",
                    "templateText": "retomar atividade em até {param_1} min em {param_2} de {param_3} situações",
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
                    "code": "RE05",
                    "title": "Utilizar estratégia de autorregulação ensinada",
                    "category": "RE",
                    "categoryLabel": "RE · REGULAÇÃO EMOCIONAL",
                    "templateText": "respiratória/relaxamento",
                    "fields": []
                },
                {
                    "code": "RE06",
                    "title": "Selecionar estratégia adequada de regulação.",
                    "category": "RE",
                    "categoryLabel": "RE · REGULAÇÃO EMOCIONAL",
                    "templateText": "selecionar funcionalmente uma estratégia em {param_1} de {param_2} situações apresentadas",
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
                    "code": "RE07",
                    "title": "Utilizar estratégia de regulação em contexto diferente daquele em que foi ensinada.",
                    "category": "RE",
                    "categoryLabel": "RE · REGULAÇÃO EMOCIONAL",
                    "templateText": "utilizar a estratégia em {param_1} de {param_2} situações novas",
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
            "id": "TF",
            "label": "TF · TOLERÂNCIA À FRUSTRAÇÃO E FLEXIBILIDADE",
            "objectives": [
                {
                    "code": "TF01",
                    "title": "Aceitar indisponibilidade de item ou atividade.",
                    "category": "TF",
                    "categoryLabel": "TF · TOLERÂNCIA À FRUSTRAÇÃO E FLEXIBILIDADE",
                    "templateText": "aceitar o limite em {param_1} de {param_2} oport. sem escalada definida no plano terapêutico",
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
                    "code": "TF02",
                    "title": "Aguardar acesso a reforçador, atividade ou atenção.",
                    "category": "TF",
                    "categoryLabel": "TF · TOLERÂNCIA À FRUSTRAÇÃO E FLEXIBILIDADE",
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
                    "code": "TF03",
                    "title": "Aceitar encerramento de atividade preferida.",
                    "category": "TF",
                    "categoryLabel": "TF · TOLERÂNCIA À FRUSTRAÇÃO E FLEXIBILIDADE",
                    "templateText": "realizar transição em até {param_1} min em {param_2} de {param_3} oport.",
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
                    "code": "TF04",
                    "title": "Continuar atividade após resposta incorreta.",
                    "category": "TF",
                    "categoryLabel": "TF · TOLERÂNCIA À FRUSTRAÇÃO E FLEXIBILIDADE",
                    "templateText": "retomar a tarefa em {param_1} de {param_2} situações de erro",
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
                    "code": "TF05",
                    "title": "Receber feedback corretivo sem abandonar a atividade.",
                    "category": "TF",
                    "categoryLabel": "TF · TOLERÂNCIA À FRUSTRAÇÃO E FLEXIBILIDADE",
                    "templateText": "permanecer engajado após correção em {param_1} de {param_2} oport.",
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
                    "code": "TF06",
                    "title": "Aceitar alteração previamente sinalizada.",
                    "category": "TF",
                    "categoryLabel": "TF · TOLERÂNCIA À FRUSTRAÇÃO E FLEXIBILIDADE",
                    "templateText": "realizar {param_1} de {param_2} mudanças planejadas, no máx. {param_3}{param_4}_ de ajuda",
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
                    "code": "TF07",
                    "title": "Adaptar comportamento quando uma regra da atividade muda.",
                    "category": "TF",
                    "categoryLabel": "TF · TOLERÂNCIA À FRUSTRAÇÃO E FLEXIBILIDADE",
                    "templateText": "ajustar-se corretamente a {param_1} de {param_2} mudanças",
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
                    "code": "TF08",
                    "title": "Aceitar alternativa diferente da inicialmente desejada.",
                    "category": "TF",
                    "categoryLabel": "TF · TOLERÂNCIA À FRUSTRAÇÃO E FLEXIBILIDADE",
                    "templateText": "selecionar alternativa disponível em {param_1} de {param_2} oport.",
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
            "id": "CF",
            "label": "CF · COMUNICAÇÃO FUNCIONAL DE SENTIMENTOS E NECESSIDADES",
            "objectives": [
                {
                    "code": "CF01",
                    "title": "Solicitar objeto, atividade ou atenção de maneira funcional.",
                    "category": "CF",
                    "categoryLabel": "CF · COMUNICAÇÃO FUNCIONAL DE SENTIMENTOS E NECESSIDADES",
                    "templateText": "emitir solicitação adequada em {param_1} de {param_2} oport.",
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
                    "code": "CF02",
                    "title": "Recusar atividade ou estímulo funcionalmente.",
                    "category": "CF",
                    "categoryLabel": "CF · COMUNICAÇÃO FUNCIONAL DE SENTIMENTOS E NECESSIDADES",
                    "templateText": "utilizar resposta de recusa em {param_1} de {param_2} oport. antes de fuga/esquiva",
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
                    "code": "CF03",
                    "title": "Pedir ajuda diante de tarefa difícil.",
                    "category": "CF",
                    "categoryLabel": "CF · COMUNICAÇÃO FUNCIONAL DE SENTIMENTOS E NECESSIDADES",
                    "templateText": "solicitar ajuda em {param_1} de {param_2} oport.",
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
                    "code": "CF04",
                    "title": "Obter atenção de maneira socialmente adequada.",
                    "category": "CF",
                    "categoryLabel": "CF · COMUNICAÇÃO FUNCIONAL DE SENTIMENTOS E NECESSIDADES",
                    "templateText": "utilizar resposta funcional em {param_1} de {param_2} oport.",
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
                    "code": "CF05",
                    "title": "Comunicar necessidade de interromper temporariamente uma atividade.",
                    "category": "CF",
                    "categoryLabel": "CF · COMUNICAÇÃO FUNCIONAL DE SENTIMENTOS E NECESSIDADES",
                    "templateText": "solicitar pausa em {param_1} de {param_2} oport. antes de abandonar a tarefa",
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
                    "code": "CF06",
                    "title": "Utilizar comunicação para negociar alternativas.",
                    "category": "CF",
                    "categoryLabel": "CF · COMUNICAÇÃO FUNCIONAL DE SENTIMENTOS E NECESSIDADES",
                    "templateText": "apresentar resposta adequada em {param_1} de {param_2} situações de conflito",
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
            "id": "HS",
            "label": "HS · HABILIDADES SOCIAIS",
            "objectives": [
                {
                    "code": "HS01",
                    "title": "Iniciar interação com outra pessoa.",
                    "category": "HS",
                    "categoryLabel": "HS · HABILIDADES SOCIAIS",
                    "templateText": "apresentar pelo menos {param_1} iniciações sociais durante a sessão",
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
                    "code": "HS02",
                    "title": "Responder adequadamente quando outra pessoa inicia interação.",
                    "category": "HS",
                    "categoryLabel": "HS · HABILIDADES SOCIAIS",
                    "templateText": "responder a {param_1} de {param_2} iniciações apresentadas",
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
                    "code": "HS03",
                    "title": "Aguardar e respeitar alternância de turnos.",
                    "category": "HS",
                    "categoryLabel": "HS · HABILIDADES SOCIAIS",
                    "templateText": "respeitar turnos em {param_1} de {param_2} oport.",
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
                    "code": "HS04",
                    "title": "Compartilhar objetos, materiais ou espaço.",
                    "category": "HS",
                    "categoryLabel": "HS · HABILIDADES SOCIAIS",
                    "templateText": "compartilhar adequadamente em {param_1} de {param_2} oport.",
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
                    "code": "HS05",
                    "title": "Participar de atividade com objetivo compartilhado.",
                    "category": "HS",
                    "categoryLabel": "HS · HABILIDADES SOCIAIS",
                    "templateText": "colaborar em {param_1} de {param_2} etapas da atividade",
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
                    "code": "HS06",
                    "title": "Solicitar entrada em atividade social.",
                    "category": "HS",
                    "categoryLabel": "HS · HABILIDADES SOCIAIS",
                    "templateText": "utilizar resposta social apropriada em {param_1} de {param_2} oport.",
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
                    "code": "HS07",
                    "title": "Manter distância interpessoal adequada ao contexto.",
                    "category": "HS",
                    "categoryLabel": "HS · HABILIDADES SOCIAIS",
                    "templateText": "manter distância adequada durante {param_1}% das oport. observadas",
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
                    "code": "HS08",
                    "title": "Finalizar interação de maneira socialmente adequada.",
                    "category": "HS",
                    "categoryLabel": "HS · HABILIDADES SOCIAIS",
                    "templateText": "utilizar resposta de encerramento em {param_1} de {param_2} situações",
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
                    "code": "HS09",
                    "title": "Demonstrar interesse pelo conteúdo trazido pelo outro.",
                    "category": "HS",
                    "categoryLabel": "HS · HABILIDADES SOCIAIS",
                    "templateText": "emitir pelo menos {param_1} respostas relacionadas ao interesse do interlocutor",
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
                    "code": "HS10",
                    "title": "Manter troca conversacional com alternância de participação.",
                    "category": "HS",
                    "categoryLabel": "HS · HABILIDADES SOCIAIS",
                    "templateText": "manter pelo menos {param_1} turnos consecutivos em {param_2} oport.",
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
            "id": "CS",
            "label": "CS · COGNIÇÃO SOCIAL E TOMADA DE PERSPECTIVA",
            "objectives": [
                {
                    "code": "CS01",
                    "title": "Identificar que diferentes pessoas podem visualizar informações diferentes.",
                    "category": "CS",
                    "categoryLabel": "CS · COGNIÇÃO SOCIAL E TOMADA DE PERSPECTIVA",
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
                    "code": "CS02",
                    "title": "Diferenciar o que o próprio paciente sabe do que outra pessoa sabe.",
                    "category": "CS",
                    "categoryLabel": "CS · COGNIÇÃO SOCIAL E TOMADA DE PERSPECTIVA",
                    "templateText": "responder adequadamente em {param_1} de {param_2} situações",
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
                    "code": "CS03",
                    "title": "Inferir intenção provável de outra pessoa.",
                    "category": "CS",
                    "categoryLabel": "CS · COGNIÇÃO SOCIAL E TOMADA DE PERSPECTIVA",
                    "templateText": "identificar adequadamente a intenção em {param_1} de {param_2} situações",
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
                    "code": "CS04",
                    "title": "Identificar que diferentes pessoas podem ter pensamentos/crenças diferentes.",
                    "category": "CS",
                    "categoryLabel": "CS · COGNIÇÃO SOCIAL E TOMADA DE PERSPECTIVA",
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
                    "code": "CS05",
                    "title": "Identificar pistas faciais, corporais, verbais ou contextuais.",
                    "category": "CS",
                    "categoryLabel": "CS · COGNIÇÃO SOCIAL E TOMADA DE PERSPECTIVA",
                    "templateText": "identificar corretamente {param_1} de {param_2} pistas sociais",
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
                    "code": "CS06",
                    "title": "Antecipar possível comportamento de outra pessoa a partir do contexto.",
                    "category": "CS",
                    "categoryLabel": "CS · COGNIÇÃO SOCIAL E TOMADA DE PERSPECTIVA",
                    "templateText": "realizar previsão adequada em {param_1} de {param_2} situações",
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
                    "code": "CS07",
                    "title": "Identificar possíveis efeitos de determinado comportamento sobre outras pessoas.",
                    "category": "CS",
                    "categoryLabel": "CS · COGNIÇÃO SOCIAL E TOMADA DE PERSPECTIVA",
                    "templateText": "identificar adequadamente consequências em {param_1} de {param_2} situações",
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
            "id": "PS",
            "label": "PS · RESOLUÇÃO DE PROBLEMAS SOCIAIS",
            "objectives": [
                {
                    "code": "PS01",
                    "title": "Identificar qual é o problema em uma situação social.",
                    "category": "PS",
                    "categoryLabel": "PS · RESOLUÇÃO DE PROBLEMAS SOCIAIS",
                    "templateText": "identificar corretamente o problema em {param_1} de {param_2} situações",
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
                    "code": "PS02",
                    "title": "Produzir diferentes respostas possíveis.",
                    "category": "PS",
                    "categoryLabel": "PS · RESOLUÇÃO DE PROBLEMAS SOCIAIS",
                    "templateText": "gerar pelo menos {param_1} alternativas em {param_2} de {param_3} situações",
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
                    "code": "PS03",
                    "title": "Antecipar consequências prováveis de diferentes escolhas.",
                    "category": "PS",
                    "categoryLabel": "PS · RESOLUÇÃO DE PROBLEMAS SOCIAIS",
                    "templateText": "identificar consequências adequadamente em {param_1} de {param_2} alternativas",
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
                    "code": "PS04",
                    "title": "Escolher alternativa socialmente funcional.",
                    "category": "PS",
                    "categoryLabel": "PS · RESOLUÇÃO DE PROBLEMAS SOCIAIS",
                    "templateText": "selecionar resposta adequada em {param_1} de {param_2} situações",
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
                    "code": "PS05",
                    "title": "Colocar em prática estratégia previamente selecionada.",
                    "category": "PS",
                    "categoryLabel": "PS · RESOLUÇÃO DE PROBLEMAS SOCIAIS",
                    "templateText": "executar adequadamente a solução em {param_1} de {param_2} simulações/situações naturais",
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
                    "code": "PS06",
                    "title": "Identificar quando uma estratégia não funcionou e tentar alternativa.",
                    "category": "PS",
                    "categoryLabel": "PS · RESOLUÇÃO DE PROBLEMAS SOCIAIS",
                    "templateText": "modificar a estratégia em {param_1} de {param_2} oport. necessárias",
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
            "id": "CI",
            "label": "CI · AUTOCONTROLE E CONTROLE INIBITÓRIO",
            "objectives": [
                {
                    "code": "CI01",
                    "title": "Reduzir respostas impulsivas.",
                    "category": "CI",
                    "categoryLabel": "CI · AUTOCONTROLE E CONTROLE INIBITÓRIO",
                    "templateText": "aguardar pelo menos {param_1} segundos antes de responder em {param_2} de {param_3} oport.",
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
                    "code": "CI02",
                    "title": "Interromper comportamento mediante comando previamente ensinado.",
                    "category": "CI",
                    "categoryLabel": "CI · AUTOCONTROLE E CONTROLE INIBITÓRIO",
                    "templateText": "interromper em até {param_1} segundos em {param_2} de {param_3} oport.",
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
                    "code": "CI03",
                    "title": "Aguardar oportunidade de participar.",
                    "category": "CI",
                    "categoryLabel": "CI · AUTOCONTROLE E CONTROLE INIBITÓRIO",
                    "templateText": "aguardar por {param_1} segundos/min em {param_2} de {param_3} situações",
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
                    "code": "CI04",
                    "title": "Seguir regra previamente estabelecida durante atividade.",
                    "category": "CI",
                    "categoryLabel": "CI · AUTOCONTROLE E CONTROLE INIBITÓRIO",
                    "templateText": "cumprir a regra em {param_1} de {param_2} oport.",
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
                    "code": "CI05",
                    "title": "Selecionar comportamento alternativo diante de estímulo evocativo.",
                    "category": "CI",
                    "categoryLabel": "CI · AUTOCONTROLE E CONTROLE INIBITÓRIO",
                    "templateText": "emitir resposta alternativa em {param_1} de {param_2} oport.",
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
            "id": "AU",
            "label": "AU · AUTONOMIA E AUTOGESTÃO",
            "objectives": [
                {
                    "code": "AU01",
                    "title": "Preparar materiais necessários para atividade.",
                    "category": "AU",
                    "categoryLabel": "AU · AUTONOMIA E AUTOGESTÃO",
                    "templateText": "organizar {param_1} de {param_2} itens de forma independente",
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
                    "code": "AU02",
                    "title": "Cumprir sequência previamente definida.",
                    "category": "AU",
                    "categoryLabel": "AU · AUTONOMIA E AUTOGESTÃO",
                    "templateText": "concluir {param_1} de {param_2} etapas com no máx. {param_3} pistas",
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
                    "code": "AU03",
                    "title": "Identificar se realizou adequadamente determinado comportamento.",
                    "category": "AU",
                    "categoryLabel": "AU · AUTONOMIA E AUTOGESTÃO",
                    "templateText": "avaliar corretamente o próprio desempenho em {param_1} de {param_2} oport.",
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
                    "code": "AU04",
                    "title": "Utilizar recurso visual para acompanhar tarefas.",
                    "category": "AU",
                    "categoryLabel": "AU · AUTONOMIA E AUTOGESTÃO",
                    "templateText": "completar {param_1} de {param_2} itens do checklist de forma independente",
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
                    "code": "AU05",
                    "title": "Escolher entre alternativas considerando consequências.",
                    "category": "AU",
                    "categoryLabel": "AU · AUTONOMIA E AUTOGESTÃO",
                    "templateText": "realizar escolha funcional em {param_1} de {param_2} situações",
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
                    "code": "AU06",
                    "title": "Comunicar necessidade, limite ou preferência de maneira adequada.",
                    "category": "AU",
                    "categoryLabel": "AU · AUTONOMIA E AUTOGESTÃO",
                    "templateText": "utilizar resposta funcional em {param_1} de {param_2} oport.",
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
            "id": "AC",
            "label": "AC · AUTOCONHECIMENTO E IDENTIDADE",
            "objectives": [
                {
                    "code": "AC01",
                    "title": "Reconhecer características próprias.",
                    "category": "AC",
                    "categoryLabel": "AC · AUTOCONHECIMENTO E IDENTIDADE",
                    "templateText": "identificar pelo menos {param_1} características pessoais de forma coerente",
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
                    "code": "AC02",
                    "title": "Reconhecer habilidades e competências pessoais.",
                    "category": "AC",
                    "categoryLabel": "AC · AUTOCONHECIMENTO E IDENTIDADE",
                    "templateText": "identificar pelo menos {param_1} habilidades próprias",
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
                    "code": "AC03",
                    "title": "Reconhecer situações em que necessita de ajuda ou desenvolvimento.",
                    "category": "AC",
                    "categoryLabel": "AC · AUTOCONHECIMENTO E IDENTIDADE",
                    "templateText": "identificar adequadamente {param_1} dificuldades ou necessidades",
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
                    "code": "AC04",
                    "title": "Descrever desempenho sem generalizações excessivamente negativas/positivas.",
                    "category": "AC",
                    "categoryLabel": "AC · AUTOCONHECIMENTO E IDENTIDADE",
                    "templateText": "produzir avaliação compatível com a situação em {param_1} de {param_2} exemplos",
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
                    "code": "AC05",
                    "title": "Reconhecer diferenças individuais sem atribuição depreciativa.",
                    "category": "AC",
                    "categoryLabel": "AC · AUTOCONHECIMENTO E IDENTIDADE",
                    "templateText": "responder adequadamente a {param_1} de {param_2} situações",
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
            "id": "AN",
            "label": "AN · ANSIEDADE E MANEJO DE ESTRESSE",
            "objectives": [
                {
                    "code": "AN01",
                    "title": "Reconhecer sinais emocionais, cognitivos ou corporais associados à ansiedade.",
                    "category": "AN",
                    "categoryLabel": "AN · ANSIEDADE E MANEJO DE ESTRESSE",
                    "templateText": "identificar pelo menos {param_1} sinais pessoais",
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
                    "code": "AN02",
                    "title": "Identificar situações associadas ao aumento da ansiedade.",
                    "category": "AN",
                    "categoryLabel": "AN · ANSIEDADE E MANEJO DE ESTRESSE",
                    "templateText": "identificar adequadamente {param_1} situações desencadeadoras",
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
                    "code": "AN03",
                    "title": "Classificar intensidade da ansiedade.",
                    "category": "AN",
                    "categoryLabel": "AN · ANSIEDADE E MANEJO DE ESTRESSE",
                    "templateText": "classificar adequadamente {param_1} de {param_2} situações em escala previamente definida",
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
                    "code": "AN04",
                    "title": "Utilizar estratégia funcional diante de situação ansiogênica.",
                    "category": "AN",
                    "categoryLabel": "AN · ANSIEDADE E MANEJO DE ESTRESSE",
                    "templateText": "aplicar a estratégia em {param_1} de {param_2} oport.",
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
                    "code": "AN05",
                    "title": "Permanecer ou aproximar-se de situação previamente evitada",
                    "category": "AN",
                    "categoryLabel": "AN · ANSIEDADE E MANEJO DE ESTRESSE",
                    "templateText": "plano terapêutico",
                    "fields": []
                },
                {
                    "code": "AN06",
                    "title": "Comunicar aumento de desconforto antes de abandonar a situação.",
                    "category": "AN",
                    "categoryLabel": "AN · ANSIEDADE E MANEJO DE ESTRESSE",
                    "templateText": "comunicar adequadamente em {param_1} de {param_2} oport.",
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
            "id": "HC",
            "label": "HC · HABILIDADES COGNITIVAS E RESOLUÇÃO DE PROBLEMAS",
            "objectives": [
                {
                    "code": "HC01",
                    "title": "Identificar pensamentos associados a determinada situação.",
                    "category": "HC",
                    "categoryLabel": "HC · HABILIDADES COGNITIVAS E RESOLUÇÃO DE PROBLEMAS",
                    "templateText": "identificar pensamento relevante em {param_1} de {param_2} situações",
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
                    "code": "HC02",
                    "title": "Relacionar situação, pensamento, emoção e comportamento.",
                    "category": "HC",
                    "categoryLabel": "HC · HABILIDADES COGNITIVAS E RESOLUÇÃO DE PROBLEMAS",
                    "templateText": "completar corretamente {param_1} de {param_2} análises apresentadas",
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
                    "code": "HC03",
                    "title": "Gerar outra interpretação possível para uma situação.",
                    "category": "HC",
                    "categoryLabel": "HC · HABILIDADES COGNITIVAS E RESOLUÇÃO DE PROBLEMAS",
                    "templateText": "produzir pelo menos {param_1} alternativa(s",
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
                    "code": "HC04",
                    "title": "Identificar informações que apoiam ou contradizem determinado pensamento.",
                    "category": "HC",
                    "categoryLabel": "HC · HABILIDADES COGNITIVAS E RESOLUÇÃO DE PROBLEMAS",
                    "templateText": "identificar adequadamente evidências em {param_1} de {param_2} situações",
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
                    "code": "HC05",
                    "title": "Formular interpretação mais equilibrada ou funcional.",
                    "category": "HC",
                    "categoryLabel": "HC · HABILIDADES COGNITIVAS E RESOLUÇÃO DE PROBLEMAS",
                    "templateText": "produzir alternativa adequada em {param_1} de {param_2} situações",
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
                    "code": "HC06",
                    "title": "Utilizar estratégia cognitiva em situação espontaneamente relatada.",
                    "category": "HC",
                    "categoryLabel": "HC · HABILIDADES COGNITIVAS E RESOLUÇÃO DE PROBLEMAS",
                    "templateText": "aplicar a estratégia em {param_1} de {param_2} situações naturais discutidas",
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
            "id": "BI",
            "label": "BI · MANEJO DE COMPORTAMENTOS DESAFIADORES",
            "objectives": [
                {
                    "code": "BI01",
                    "title": "Reduzir comportamento de fuga mediante ensino de resposta alternativa.",
                    "category": "BI",
                    "categoryLabel": "BI · MANEJO DE COMPORTAMENTOS DESAFIADORES",
                    "templateText": "resposta alternativa: {param_1}{param_2}_ · utilizar em {param_3} de {param_4} oport. diante da condição identificada",
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
                    "code": "BI02",
                    "title": "Aumentar solicitação funcional de atenção.",
                    "category": "BI",
                    "categoryLabel": "BI · MANEJO DE COMPORTAMENTOS DESAFIADORES",
                    "templateText": "solicitar atenção funcionalmente em {param_1} de {param_2} oport. antes do comportamento-alvo",
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
                    "code": "BI03",
                    "title": "Solicitar acesso ou tolerar indisponibilidade adequadamente.",
                    "category": "BI",
                    "categoryLabel": "BI · MANEJO DE COMPORTAMENTOS DESAFIADORES",
                    "templateText": "utilizar resposta funcional em {param_1} de {param_2} oport.",
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
                    "code": "BI04",
                    "title": "Aumentar resposta alternativa incompatível ou funcional",
                    "category": "BI",
                    "categoryLabel": "BI · MANEJO DE COMPORTAMENTOS DESAFIADORES",
                    "templateText": "comportamento agressivo",
                    "fields": []
                },
                {
                    "code": "BI05",
                    "title": "Aumentar resposta alternativa de comunicação, regulação ou segurança",
                    "category": "BI",
                    "categoryLabel": "BI · MANEJO DE COMPORTAMENTOS DESAFIADORES",
                    "templateText": "autoagressivo",
                    "fields": []
                },
                {
                    "code": "BI06",
                    "title": "Aumentar respostas funcionais diante das condições relacionadas ao comportamento disruptivo.",
                    "category": "BI",
                    "categoryLabel": "BI · MANEJO DE COMPORTAMENTOS DESAFIADORES",
                    "templateText": "utilizar comportamento alternativo em {param_1} de {param_2} oport.",
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
            "Calmo e receptivo",
            "Ansioso / apreensivo",
            "Triste / deprimido",
            "Raiva / irritabilidade",
            "Comportamento opositor",
            "Hipervigilante",
            "Inibido / silencioso",
            "Outro"
        ],
        "recentChanges": [
            "Conflito recente em casa/escola",
            "Evento estressor na semana",
            "Dificuldade no sono",
            "Mudança na medicação psiquiátrica",
            "Nenhum evento relevante relatado",
            "Outro"
        ]
    },
    "assistanceLevels": [
        {
            "id": "independente",
            "label": "Espontâneo / Independente",
            "description": "Apresenta a resposta ou regulação sem necessidade de intervenção externa."
        },
        {
            "id": "autorregulacao_pista",
            "label": "Autorregulação com pista",
            "description": "Utiliza recurso visual ou pista sutil previamente acordada."
        },
        {
            "id": "corregulacao_minima",
            "label": "Corregulação mínima",
            "description": "Terapeuta atua com validação verbal e presença tranquilizadora."
        },
        {
            "id": "corregulacao_estruturada",
            "label": "Corregulação estruturada",
            "description": "Terapeuta guia passo a passo a estratégia de enfrentamento ou respiração."
        },
        {
            "id": "suporte_intensivo",
            "label": "Suporte intensivo",
            "description": "Necessita acolhimento total e redução imediata de demandas do ambiente."
        }
    ],
    "strategies": [
        {
            "category": "Intervenção Cognitivo-Comportamental",
            "items": [
                "Identificação e rotulação emocional",
                "Termômetro das emoções",
                "Reestruturação cognitiva / pensamentos automáticos",
                "Role-play e ensaio comportamental",
                "Treino de resolução de problemas",
                "Outro"
            ]
        },
        {
            "category": "Regulação Emocional e Somática",
            "items": [
                "Respiração diafragmática / 4-7-8",
                "Relaxamento muscular progressivo",
                "Aterramento 5-4-3-2-1",
                "Uso do cantinho da calma / caixa de alívio",
                "Técnicas de mindfulness infantil",
                "Outro"
            ]
        }
    ],
    "sessionStages": [
        {
            "id": 1,
            "name": "Checagem de humor e conexão inicial",
            "defaultMinutes": 10
        },
        {
            "id": 2,
            "name": "Desenvolvimento da temática / atividade reflexiva",
            "defaultMinutes": 25
        },
        {
            "id": 3,
            "name": "Integração lúdica e prática de habilidade",
            "defaultMinutes": 10
        },
        {
            "id": 4,
            "name": "Fechamento e combinados para a semana",
            "defaultMinutes": 5
        }
    ],
    "nextSessionDecisions": [
        "Manter aprofundamento na temática",
        "Trabalhar regulação em contexto simulado",
        "Incluir os pais na sessão seguinte",
        "Articulação com coordenação escolar",
        "Avaliar avanço de objetivos do PTI"
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
