/**
 * Configuração Oficial do Plano de Sessão: Intervenção Precoce (ABA)
 * Fonte: Ficha de Acompanhamento Clínico + Plano de Sessão World Sensory
 */

import { SpecialtyTemplateConfig } from '../types'

export const INTERVENCAO_PRECOCE_ABA_TEMPLATE: SpecialtyTemplateConfig = {
    "id": "intervencao_precoce_aba",
    "name": "Intervenção Precoce (ABA)",
    "professionalRole": "Terapeuta ABA / BCBA",
    "councilName": "ABPMC",
    "minObjectives": 2,
    "maxObjectives": 4,
    "categories": [
        {
            "id": "PAR",
            "label": "PAR · PAREAMENTO E RELAÇÃO TERAPÊUTICA",
            "objectives": [
                {
                    "code": "PAR01",
                    "title": "Permanecer próximo ao terapeuta sem sinais relevantes de esquiva.",
                    "category": "PAR",
                    "categoryLabel": "PAR · PAREAMENTO E RELAÇÃO TERAPÊUTICA",
                    "templateText": "permanecer em proximidade por {param_1} min em contexto lúdico, sem contenção de acesso/demandas frequentes",
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
                    "code": "PAR02",
                    "title": "Aproximar-se espontaneamente do terapeuta.",
                    "category": "PAR",
                    "categoryLabel": "PAR · PAREAMENTO E RELAÇÃO TERAPÊUTICA",
                    "templateText": "realizar pelo menos {param_1} aproximações espontâneas durante a sessão",
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
                    "code": "PAR03",
                    "title": "Permitir que o terapeuta participe de uma atividade preferida.",
                    "category": "PAR",
                    "categoryLabel": "PAR · PAREAMENTO E RELAÇÃO TERAPÊUTICA",
                    "templateText": "aceitar participação por {param_1} min sem abandono em {param_2} de {param_3} oport.",
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
                    "code": "PAR04",
                    "title": "Aceitar que o acesso a itens/atividades preferidas ocorra em interação com o terapeuta.",
                    "category": "PAR",
                    "categoryLabel": "PAR · PAREAMENTO E RELAÇÃO TERAPÊUTICA",
                    "templateText": "permanecer engajado em {param_1} de {param_2} oport. sem esquiva significativa",
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
                    "code": "PAR05",
                    "title": "Buscar o terapeuta para continuidade de atividade, ajuda ou interação.",
                    "category": "PAR",
                    "categoryLabel": "PAR · PAREAMENTO E RELAÇÃO TERAPÊUTICA",
                    "templateText": "emitir {param_1} respostas espontâneas direcionadas ao terapeuta durante a sessão",
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
            "id": "CIN",
            "label": "CIN · CONTROLE INSTRUCIONAL E PRONTIDÃO PARA APRENDER",
            "objectives": [
                {
                    "code": "CIN01",
                    "title": "Orientar-se para o terapeuta diante de uma instrução.",
                    "category": "CIN",
                    "categoryLabel": "CIN · CONTROLE INSTRUCIONAL E PRONTIDÃO PARA APRENDER",
                    "templateText": "orientar corpo/cabeça/atenção em até {param_1} segundos em {param_2} de {param_3} oport.",
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
                    "code": "CIN02",
                    "title": "Permanecer no contexto de atividade.",
                    "category": "CIN",
                    "categoryLabel": "CIN · CONTROLE INSTRUCIONAL E PRONTIDÃO PARA APRENDER",
                    "templateText": "permanecer por {param_1} min, no máx. {param_2} redirecionamentos",
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
                    "code": "CIN03",
                    "title": "Responder a instruções já adquiridas.",
                    "category": "CIN",
                    "categoryLabel": "CIN · CONTROLE INSTRUCIONAL E PRONTIDÃO PARA APRENDER",
                    "templateText": "responder corretamente a {param_1} de {param_2} instruções, no máx. uma repetição",
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
                    "code": "CIN04",
                    "title": "Iniciar atividade após apresentação da instrução.",
                    "category": "CIN",
                    "categoryLabel": "CIN · CONTROLE INSTRUCIONAL E PRONTIDÃO PARA APRENDER",
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
                    "code": "CIN05",
                    "title": "Permanecer na atividade até a conclusão.",
                    "category": "CIN",
                    "categoryLabel": "CIN · CONTROLE INSTRUCIONAL E PRONTIDÃO PARA APRENDER",
                    "templateText": "concluir {param_1} de {param_2} atividades iniciadas, nível máx. de ajuda {param_3}{param_4}_",
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
                    "code": "CIN06",
                    "title": "Participar de sequência simples de demanda e acesso ao reforçador.",
                    "category": "CIN",
                    "categoryLabel": "CIN · CONTROLE INSTRUCIONAL E PRONTIDÃO PARA APRENDER",
                    "templateText": "completar {param_1} ciclos consecutivos sem tentativa relevante de fuga",
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
                    "code": "CIN07",
                    "title": "Tolerar aumento progressivo do número de respostas antes do reforço.",
                    "category": "CIN",
                    "categoryLabel": "CIN · CONTROLE INSTRUCIONAL E PRONTIDÃO PARA APRENDER",
                    "templateText": "completar até {param_1} respostas por bloco mantendo engajamento adequado",
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
                    "code": "CIN08",
                    "title": "Encerrar uma atividade e iniciar outra.",
                    "category": "CIN",
                    "categoryLabel": "CIN · CONTROLE INSTRUCIONAL E PRONTIDÃO PARA APRENDER",
                    "templateText": "realizar {param_1} de {param_2} transições, no máx. {param_3} prompts",
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
            "id": "ACS",
            "label": "ACS · ATENÇÃO COMPARTILHADA E ENGAJAMENTO SOCIAL",
            "objectives": [
                {
                    "code": "ACS01",
                    "title": "Orientar-se para outra pessoa durante interação.",
                    "category": "ACS",
                    "categoryLabel": "ACS · ATENÇÃO COMPARTILHADA E ENGAJAMENTO SOCIAL",
                    "templateText": "orientar-se em {param_1} de {param_2} oport.",
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
                    "code": "ACS02",
                    "title": "Alternar atenção entre objeto/evento e parceiro.",
                    "category": "ACS",
                    "categoryLabel": "ACS · ATENÇÃO COMPARTILHADA E ENGAJAMENTO SOCIAL",
                    "templateText": "realizar alternância em {param_1} de {param_2} situações de interesse compartilhado",
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
                    "code": "ACS03",
                    "title": "Seguir gesto de apontar do adulto.",
                    "category": "ACS",
                    "categoryLabel": "ACS · ATENÇÃO COMPARTILHADA E ENGAJAMENTO SOCIAL",
                    "templateText": "localizar corretamente o referente em {param_1} de {param_2} oport.",
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
                    "code": "ACS04",
                    "title": "Orientar-se para objeto/evento indicado pelo olhar do adulto.",
                    "category": "ACS",
                    "categoryLabel": "ACS · ATENÇÃO COMPARTILHADA E ENGAJAMENTO SOCIAL",
                    "templateText": "responder corretamente em {param_1} de {param_2} oport.",
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
                    "code": "ACS05",
                    "title": "Direcionar item ou evento ao parceiro para compartilhar interesse.",
                    "category": "ACS",
                    "categoryLabel": "ACS · ATENÇÃO COMPARTILHADA E ENGAJAMENTO SOCIAL",
                    "templateText": "emitir pelo menos {param_1} respostas espontâneas de mostrar/apontar/compartilhar",
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
                    "code": "ACS06",
                    "title": "Permanecer em atividade conjunta.",
                    "category": "ACS",
                    "categoryLabel": "ACS · ATENÇÃO COMPARTILHADA E ENGAJAMENTO SOCIAL",
                    "templateText": "sustentar interação compartilhada por {param_1} min",
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
                    "code": "ACS07",
                    "title": "Alternar turnos em atividade simples.",
                    "category": "ACS",
                    "categoryLabel": "ACS · ATENÇÃO COMPARTILHADA E ENGAJAMENTO SOCIAL",
                    "templateText": "realizar pelo menos {param_1} turnos consecutivos em {param_2} oport.",
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
            "id": "IMI",
            "label": "IMI · IMITAÇÃO",
            "objectives": [
                {
                    "code": "IMI01",
                    "title": "Imitar ação simples utilizando objeto.",
                    "category": "IMI",
                    "categoryLabel": "IMI · IMITAÇÃO",
                    "templateText": "imitar corretamente {param_1} de {param_2} ações sem ajuda física",
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
                    "code": "IMI02",
                    "title": "Imitar movimentos corporais amplos.",
                    "category": "IMI",
                    "categoryLabel": "IMI · IMITAÇÃO",
                    "templateText": "reproduzir corretamente {param_1} de {param_2} movimentos",
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
                    "code": "IMI03",
                    "title": "Imitar movimentos manuais.",
                    "category": "IMI",
                    "categoryLabel": "IMI · IMITAÇÃO",
                    "templateText": "imitar {param_1} de {param_2} ações, no máx. pista gestual",
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
                    "code": "IMI04",
                    "title": "Imitar movimentos faciais funcionalmente relevantes.",
                    "category": "IMI",
                    "categoryLabel": "IMI · IMITAÇÃO",
                    "templateText": "reproduzir {param_1} de {param_2} movimentos apresentados",
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
                    "code": "IMI05",
                    "title": "Imitar vocalizações, sons ou aproximações vocais.",
                    "category": "IMI",
                    "categoryLabel": "IMI · IMITAÇÃO",
                    "templateText": "imitar {param_1} de {param_2} modelos apresentados",
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
                    "code": "IMI06",
                    "title": "Reproduzir duas ou mais ações em sequência.",
                    "category": "IMI",
                    "categoryLabel": "IMI · IMITAÇÃO",
                    "templateText": "executar sequência de {param_1} ações em {param_2} de {param_3} oport.",
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
                    "code": "IMI07",
                    "title": "Imitar ações sem instrução direta.",
                    "category": "IMI",
                    "categoryLabel": "IMI · IMITAÇÃO",
                    "templateText": "apresentar pelo menos {param_1} episódios de imitação espontânea em brincadeiras naturais",
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
            "id": "OUV",
            "label": "OUV · HABILIDADES DE OUVINTE / LINGUAGEM RECEPTIVA",
            "objectives": [
                {
                    "code": "OUV01",
                    "title": "Orientar-se após ser chamado.",
                    "category": "OUV",
                    "categoryLabel": "OUV · HABILIDADES DE OUVINTE / LINGUAGEM RECEPTIVA",
                    "templateText": "responder em até {param_1} segundos em {param_2} de {param_3} oport.",
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
                    "code": "OUV02",
                    "title": "Selecionar objeto após instrução verbal.",
                    "category": "OUV",
                    "categoryLabel": "OUV · HABILIDADES DE OUVINTE / LINGUAGEM RECEPTIVA",
                    "templateText": "selecionar corretamente {param_1} de {param_2} estímulos em campo de {param_3}",
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
                    "code": "OUV03",
                    "title": "Identificar pessoas familiares.",
                    "category": "OUV",
                    "categoryLabel": "OUV · HABILIDADES DE OUVINTE / LINGUAGEM RECEPTIVA",
                    "templateText": "responder corretamente em {param_1} de {param_2} oport.",
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
                    "code": "OUV04",
                    "title": "Localizar partes do corpo.",
                    "category": "OUV",
                    "categoryLabel": "OUV · HABILIDADES DE OUVINTE / LINGUAGEM RECEPTIVA",
                    "templateText": "identificar corretamente {param_1} de {param_2} partes solicitadas",
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
                    "code": "OUV05",
                    "title": "Executar ações simples após instrução.",
                    "category": "OUV",
                    "categoryLabel": "OUV · HABILIDADES DE OUVINTE / LINGUAGEM RECEPTIVA",
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
                    "code": "OUV06",
                    "title": "Executar ação solicitada utilizando objeto.",
                    "category": "OUV",
                    "categoryLabel": "OUV · HABILIDADES DE OUVINTE / LINGUAGEM RECEPTIVA",
                    "templateText": "completar {param_1} de {param_2} instruções sem modelo",
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
                    "code": "OUV07",
                    "title": "Selecionar item a partir de sua função.",
                    "category": "OUV",
                    "categoryLabel": "OUV · HABILIDADES DE OUVINTE / LINGUAGEM RECEPTIVA",
                    "templateText": "responder corretamente a {param_1} de {param_2} tentativas",
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
                    "code": "OUV08",
                    "title": "Selecionar item por atributo.",
                    "category": "OUV",
                    "categoryLabel": "OUV · HABILIDADES DE OUVINTE / LINGUAGEM RECEPTIVA",
                    "templateText": "responder corretamente a {param_1} de {param_2} oport. (cor/forma/tamanho/categoria",
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
                    "code": "OUV09",
                    "title": "Executar sequência de duas ações. (completar corretamente ___ de ___ instruções",
                    "category": "OUV",
                    "categoryLabel": "OUV · HABILIDADES DE OUVINTE / LINGUAGEM RECEPTIVA",
                    "templateText": "Executar sequência de duas ações. (completar corretamente {param_1} de {param_2} instruções",
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
            "id": "COM",
            "label": "COM · COMUNICAÇÃO EXPRESSIVA / ECOICO / TATO / MANDO",
            "objectives": [
                {
                    "code": "COM01",
                    "title": "Solicitar objeto desejado.",
                    "category": "COM",
                    "categoryLabel": "COM · COMUNICAÇÃO EXPRESSIVA / ECOICO / TATO / MANDO",
                    "templateText": "realizar {param_1} solicitações independentes durante a sessão",
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
                    "code": "COM02",
                    "title": "Pedir continuidade ou início de atividade.",
                    "category": "COM",
                    "categoryLabel": "COM · COMUNICAÇÃO EXPRESSIVA / ECOICO / TATO / MANDO",
                    "templateText": "emitir {param_1} solicitações espontâneas",
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
                    "code": "COM03",
                    "title": "Pedir ajuda diante de dificuldade.",
                    "category": "COM",
                    "categoryLabel": "COM · COMUNICAÇÃO EXPRESSIVA / ECOICO / TATO / MANDO",
                    "templateText": "solicitar ajuda em {param_1} de {param_2} oport. antes de abandonar a tarefa",
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
                    "code": "COM04",
                    "title": "Comunicar necessidade de interromper temporariamente uma atividade.",
                    "category": "COM",
                    "categoryLabel": "COM · COMUNICAÇÃO EXPRESSIVA / ECOICO / TATO / MANDO",
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
                    "code": "COM05",
                    "title": "Comunicar “não”, “acabou”, “não quero” ou equivalente funcional.",
                    "category": "COM",
                    "categoryLabel": "COM · COMUNICAÇÃO EXPRESSIVA / ECOICO / TATO / MANDO",
                    "templateText": "utilizar recusa adequada em {param_1} de {param_2} situações antes de fuga/oposição",
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
                    "code": "COM06",
                    "title": "Escolher entre duas ou mais opções.",
                    "category": "COM",
                    "categoryLabel": "COM · COMUNICAÇÃO EXPRESSIVA / ECOICO / TATO / MANDO",
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
                    "code": "COM07",
                    "title": "Direcionar comunicação ao adulto para obter atenção.",
                    "category": "COM",
                    "categoryLabel": "COM · COMUNICAÇÃO EXPRESSIVA / ECOICO / TATO / MANDO",
                    "templateText": "realizar pelo menos {param_1} iniciações espontâneas",
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
                    "code": "COM08",
                    "title": "Produzir comentário sobre objeto, evento ou ação.",
                    "category": "COM",
                    "categoryLabel": "COM · COMUNICAÇÃO EXPRESSIVA / ECOICO / TATO / MANDO",
                    "templateText": "emitir {param_1} comentários espontâneos durante a sessão",
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
                    "code": "COM09",
                    "title": "Responder a perguntas conhecidas.",
                    "category": "COM",
                    "categoryLabel": "COM · COMUNICAÇÃO EXPRESSIVA / ECOICO / TATO / MANDO",
                    "templateText": "responder corretamente a {param_1} de {param_2} perguntas sem modelo imediato",
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
                    "code": "COM10",
                    "title": "Produzir resposta comunicativa contendo dois ou mais elementos.",
                    "category": "COM",
                    "categoryLabel": "COM · COMUNICAÇÃO EXPRESSIVA / ECOICO / TATO / MANDO",
                    "templateText": "produzir {param_1} mensagens de {param_2} elementos de forma independente",
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
            "id": "CAA",
            "label": "CAA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA",
            "objectives": [
                {
                    "code": "CAA01",
                    "title": "Localizar e acessar o recurso de comunicação.",
                    "category": "CAA",
                    "categoryLabel": "CAA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA",
                    "templateText": "acessar o sistema em {param_1} de {param_2} oport. sem ajuda física",
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
                    "code": "CAA02",
                    "title": "Solicitar item ou ação utilizando o sistema.",
                    "category": "CAA",
                    "categoryLabel": "CAA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA",
                    "templateText": "realizar {param_1} solicitações independentes",
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
                    "code": "CAA03",
                    "title": "Utilizar o sistema para recusar.",
                    "category": "CAA",
                    "categoryLabel": "CAA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA",
                    "templateText": "realizar resposta funcional em {param_1} de {param_2} oport.",
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
                    "code": "CAA04",
                    "title": "Produzir comentário utilizando símbolos.",
                    "category": "CAA",
                    "categoryLabel": "CAA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA",
                    "templateText": "emitir {param_1} comentários durante contextos naturais",
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
                    "code": "CAA05",
                    "title": "Navegar entre páginas/categorias.",
                    "category": "CAA",
                    "categoryLabel": "CAA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA",
                    "templateText": "localizar corretamente {param_1} de {param_2} palavras- alvo",
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
                    "code": "CAA06",
                    "title": "Construir mensagem com múltiplos elementos.",
                    "category": "CAA",
                    "categoryLabel": "CAA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA",
                    "templateText": "produzir {param_1} mensagens contendo pelo menos {param_2} símbolos",
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
                    "code": "CAA07",
                    "title": "Utilizar o sistema sem prompt direto do adulto.",
                    "category": "CAA",
                    "categoryLabel": "CAA · COMUNICAÇÃO AUMENTATIVA E ALTERNATIVA",
                    "templateText": "apresentar pelo menos {param_1} usos espontâneos durante a sessão",
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
            "id": "DIS",
            "label": "DIS · HABILIDADES VISUAIS E DISCRIMINAÇÃO",
            "objectives": [
                {
                    "code": "DIS01",
                    "title": "Parear estímulos iguais.",
                    "category": "DIS",
                    "categoryLabel": "DIS · HABILIDADES VISUAIS E DISCRIMINAÇÃO",
                    "templateText": "responder corretamente a {param_1} de {param_2} tentativas em campo de {param_3}",
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
                    "code": "DIS02",
                    "title": "Parear estímulos relacionados.",
                    "category": "DIS",
                    "categoryLabel": "DIS · HABILIDADES VISUAIS E DISCRIMINAÇÃO",
                    "templateText": "responder corretamente a {param_1} de {param_2} tentativas",
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
                    "code": "DIS03",
                    "title": "Agrupar objetos por característica comum.",
                    "category": "DIS",
                    "categoryLabel": "DIS · HABILIDADES VISUAIS E DISCRIMINAÇÃO",
                    "templateText": "classificar corretamente {param_1} de {param_2} estímulos",
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
                    "code": "DIS04",
                    "title": "Diferenciar cores.",
                    "category": "DIS",
                    "categoryLabel": "DIS · HABILIDADES VISUAIS E DISCRIMINAÇÃO",
                    "templateText": "selecionar corretamente {param_1} de {param_2} oport.",
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
                    "code": "DIS05",
                    "title": "Discriminar formas básicas.",
                    "category": "DIS",
                    "categoryLabel": "DIS · HABILIDADES VISUAIS E DISCRIMINAÇÃO",
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
                    "code": "DIS06",
                    "title": "Diferenciar grande/pequeno ou outras dimensões.",
                    "category": "DIS",
                    "categoryLabel": "DIS · HABILIDADES VISUAIS E DISCRIMINAÇÃO",
                    "templateText": "responder corretamente em {param_1} de {param_2} oport.",
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
                    "code": "DIS07",
                    "title": "Posicionar peças de acordo com correspondência visual.",
                    "category": "DIS",
                    "categoryLabel": "DIS · HABILIDADES VISUAIS E DISCRIMINAÇÃO",
                    "templateText": "completar {param_1} de {param_2} encaixes independentemente",
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
                    "code": "DIS08",
                    "title": "Completar quebra-cabeça simples.",
                    "category": "DIS",
                    "categoryLabel": "DIS · HABILIDADES VISUAIS E DISCRIMINAÇÃO",
                    "templateText": "posicionar corretamente {param_1} de {param_2} peças, no máx. {param_3} prompts",
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
            "id": "BRI",
            "label": "BRI · BRINCAR",
            "objectives": [
                {
                    "code": "BRI01",
                    "title": "Utilizar brinquedos de acordo com sua função.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR",
                    "templateText": "utilizar funcionalmente {param_1} de {param_2} brinquedos apresentados",
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
                    "title": "Permanecer brincando sem mediação contínua.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR",
                    "templateText": "manter brincadeira funcional por {param_1} min",
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
                    "code": "BRI03",
                    "title": "Utilizar o mesmo brinquedo de diferentes formas funcionais.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR",
                    "templateText": "produzir pelo menos {param_1} ações diferentes",
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
                    "title": "Utilizar brinquedos que produzem resultado previsível.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR",
                    "templateText": "completar {param_1} de {param_2} ações independentemente",
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
                    "code": "BRI05",
                    "title": "Montar ou construir estruturas simples.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR",
                    "templateText": "completar estrutura contendo {param_1} elementos",
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
                    "code": "BRI06",
                    "title": "Realizar ações de faz-de-conta.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR",
                    "templateText": "emitir pelo menos {param_1} ações simbólicas diferentes",
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
                    "code": "BRI07",
                    "title": "Produzir duas ou mais ações relacionadas em brincadeira.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR",
                    "templateText": "executar sequência de {param_1} ações em {param_2} oport.",
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
                    "code": "BRI08",
                    "title": "Participar de brincadeira com adulto ou criança.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR",
                    "templateText": "permanecer por {param_1} min ou {param_2} turnos consecutivos",
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
                    "code": "BRI09",
                    "title": "Aceitar variação introduzida pelo parceiro.",
                    "category": "BRI",
                    "categoryLabel": "BRI · BRINCAR",
                    "templateText": "aceitar {param_1} de {param_2} mudanças sem abandonar a atividade",
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
            "label": "SOC · HABILIDADES SOCIAIS INICIAIS",
            "objectives": [
                {
                    "code": "SOC01",
                    "title": "Responder ou iniciar cumprimento.",
                    "category": "SOC",
                    "categoryLabel": "SOC · HABILIDADES SOCIAIS INICIAIS",
                    "templateText": "responder adequadamente em {param_1} de {param_2} oport.",
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
                    "code": "SOC02",
                    "title": "Orientar-se para outra criança/adulto durante interação.",
                    "category": "SOC",
                    "categoryLabel": "SOC · HABILIDADES SOCIAIS INICIAIS",
                    "templateText": "apresentar resposta em {param_1} de {param_2} oport.",
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
                    "code": "SOC03",
                    "title": "Permitir uso alternado de objeto.",
                    "category": "SOC",
                    "categoryLabel": "SOC · HABILIDADES SOCIAIS INICIAIS",
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
                    "title": "Esperar a vez em atividade.",
                    "category": "SOC",
                    "categoryLabel": "SOC · HABILIDADES SOCIAIS INICIAIS",
                    "templateText": "aguardar {param_1} segundos em {param_2} de {param_3} oport.",
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
                    "code": "SOC05",
                    "title": "Entregar objeto solicitado.",
                    "category": "SOC",
                    "categoryLabel": "SOC · HABILIDADES SOCIAIS INICIAIS",
                    "templateText": "realizar {param_1} de {param_2} respostas corretamente",
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
                    "code": "SOC06",
                    "title": "Imitar ação realizada por outra criança.",
                    "category": "SOC",
                    "categoryLabel": "SOC · HABILIDADES SOCIAIS INICIAIS",
                    "templateText": "imitar corretamente {param_1} de {param_2} oport.",
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
                    "code": "SOC07",
                    "title": "Permanecer próximo a outra criança realizando atividade semelhante.",
                    "category": "SOC",
                    "categoryLabel": "SOC · HABILIDADES SOCIAIS INICIAIS",
                    "templateText": "permanecer por {param_1} min",
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
                    "code": "SOC08",
                    "title": "Realizar ação simples com objetivo compartilhado.",
                    "category": "SOC",
                    "categoryLabel": "SOC · HABILIDADES SOCIAIS INICIAIS",
                    "templateText": "completar {param_1} turnos/etapas com parceiro",
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
            "id": "PRE",
            "label": "PRE · HABILIDADES PRÉ-ACADÊMICAS E ATENÇÃO SUSTENTADA",
            "objectives": [
                {
                    "code": "PRE01",
                    "title": "Permanecer em tarefa estruturada.",
                    "category": "PRE",
                    "categoryLabel": "PRE · HABILIDADES PRÉ-ACADÊMICAS E ATENÇÃO SUSTENTADA",
                    "templateText": "permanecer por {param_1} min, no máx. {param_2} redirecionamentos",
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
                    "code": "PRE02",
                    "title": "Reproduzir resposta após demonstração.",
                    "category": "PRE",
                    "categoryLabel": "PRE · HABILIDADES PRÉ-ACADÊMICAS E ATENÇÃO SUSTENTADA",
                    "templateText": "responder corretamente a {param_1} de {param_2} modelos",
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
                    "code": "PRE03",
                    "title": "Realizar traçados simples.",
                    "category": "PRE",
                    "categoryLabel": "PRE · HABILIDADES PRÉ-ACADÊMICAS E ATENÇÃO SUSTENTADA",
                    "templateText": "completar {param_1} de {param_2} traçados dentro dos limites estabelecidos",
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
                    "code": "PRE04",
                    "title": "Identificar letras-alvo.",
                    "category": "PRE",
                    "categoryLabel": "PRE · HABILIDADES PRÉ-ACADÊMICAS E ATENÇÃO SUSTENTADA",
                    "templateText": "selecionar corretamente {param_1} de {param_2} letras",
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
                    "code": "PRE05",
                    "title": "Identificar numerais.",
                    "category": "PRE",
                    "categoryLabel": "PRE · HABILIDADES PRÉ-ACADÊMICAS E ATENÇÃO SUSTENTADA",
                    "templateText": "responder corretamente em {param_1} de {param_2} oport.",
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
                    "code": "PRE06",
                    "title": "Contar objetos.",
                    "category": "PRE",
                    "categoryLabel": "PRE · HABILIDADES PRÉ-ACADÊMICAS E ATENÇÃO SUSTENTADA",
                    "templateText": "contar corretamente conjuntos de até {param_1} elementos em {param_2} de {param_3} tentativas",
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
                    "code": "PRE07",
                    "title": "Relacionar numeral à quantidade.",
                    "category": "PRE",
                    "categoryLabel": "PRE · HABILIDADES PRÉ-ACADÊMICAS E ATENÇÃO SUSTENTADA",
                    "templateText": "responder corretamente a {param_1} de {param_2} conjuntos",
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
                    "code": "PRE08",
                    "title": "Responder a conceitos como igual/diferente, maior/menor, primeiro/último.",
                    "category": "PRE",
                    "categoryLabel": "PRE · HABILIDADES PRÉ-ACADÊMICAS E ATENÇÃO SUSTENTADA",
                    "templateText": "responder corretamente em {param_1} de {param_2} oport.",
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
            "label": "AUT · AUTONOMIA E HABILIDADES ADAPTATIVAS",
            "objectives": [
                {
                    "code": "AUT01",
                    "title": "Guardar objetos após uso.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E HABILIDADES ADAPTATIVAS",
                    "templateText": "guardar {param_1} de {param_2} itens, no máx. pista verbal",
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
                    "title": "Consultar e seguir sequência de atividades.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E HABILIDADES ADAPTATIVAS",
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
                    "code": "AUT03",
                    "title": "Participar da lavagem das mãos.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E HABILIDADES ADAPTATIVAS",
                    "templateText": "completar {param_1} de {param_2} etapas, nível máx. de ajuda {param_3}{param_4}_",
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
                    "code": "AUT04",
                    "title": "Participar de atividade alimentar compatível com sua rotina.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E HABILIDADES ADAPTATIVAS",
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
                    "code": "AUT05",
                    "title": "Participar de vestir ou retirar peças.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E HABILIDADES ADAPTATIVAS",
                    "templateText": "completar {param_1}% da tarefa, assistência máx. {param_2}{param_3}_",
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
                    "code": "AUT06",
                    "title": "Participar de etapas da rotina de toileting.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E HABILIDADES ADAPTATIVAS",
                    "templateText": "completar {param_1} de {param_2} etapas conforme plano individual",
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
                    "code": "AUT07",
                    "title": "Levar, guardar ou localizar seus pertences.",
                    "category": "AUT",
                    "categoryLabel": "AUT · AUTONOMIA E HABILIDADES ADAPTATIVAS",
                    "templateText": "completar {param_1} de {param_2} oport., no máx. pista {param_3}{param_4}_",
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
            "id": "TOL",
            "label": "TOL · TOLERÂNCIA A NEGATIVAS E FLEXIBILIDADE",
            "objectives": [
                {
                    "code": "TOL01",
                    "title": "Aguardar acesso a reforçador ou atividade.",
                    "category": "TOL",
                    "categoryLabel": "TOL · TOLERÂNCIA A NEGATIVAS E FLEXIBILIDADE",
                    "templateText": "esperar {param_1} seg/min em {param_2} de {param_3} oport.",
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
                    "code": "TOL02",
                    "title": "Aceitar indisponibilidade temporária de item.",
                    "category": "TOL",
                    "categoryLabel": "TOL · TOLERÂNCIA A NEGATIVAS E FLEXIBILIDADE",
                    "templateText": "permanecer regulado em {param_1} de {param_2} situações usando resposta alternativa ensinada",
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
                    "code": "TOL03",
                    "title": "Tolerar término de atividade.",
                    "category": "TOL",
                    "categoryLabel": "TOL · TOLERÂNCIA A NEGATIVAS E FLEXIBILIDADE",
                    "templateText": "finalizar em até {param_1} segundos após sinalização em {param_2} de {param_3} oport.",
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
                    "code": "TOL04",
                    "title": "Aceitar alteração previamente sinalizada.",
                    "category": "TOL",
                    "categoryLabel": "TOL · TOLERÂNCIA A NEGATIVAS E FLEXIBILIDADE",
                    "templateText": "realizar {param_1} de {param_2} mudanças sem comportamento interferente intenso",
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
                    "code": "TOL05",
                    "title": "Permanecer em atividade após resposta incorreta.",
                    "category": "TOL",
                    "categoryLabel": "TOL · TOLERÂNCIA A NEGATIVAS E FLEXIBILIDADE",
                    "templateText": "continuar tarefa em {param_1} de {param_2} oport. sem abandonar o contexto",
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
                    "code": "TOL06",
                    "title": "Permitir suporte do terapeuta diante de dificuldade.",
                    "category": "TOL",
                    "categoryLabel": "TOL · TOLERÂNCIA A NEGATIVAS E FLEXIBILIDADE",
                    "templateText": "aceitar ajuda em {param_1} de {param_2} oport.",
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
                    "code": "TOL07",
                    "title": "Utilizar resposta alternativa previamente ensinada.",
                    "category": "TOL",
                    "categoryLabel": "TOL · TOLERÂNCIA A NEGATIVAS E FLEXIBILIDADE",
                    "templateText": "utilizar {param_1}{param_2}_ em {param_3} de {param_4} oport. diante de sinais de desorganização",
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
            "id": "FCT",
            "label": "FCT · TREINO DE COMUNICAÇÃO FUNCIONAL (FCT)",
            "objectives": [
                {
                    "code": "FCT01",
                    "title": "Substituir resposta interferente por solicitação de ajuda.",
                    "category": "FCT",
                    "categoryLabel": "FCT · TREINO DE COMUNICAÇÃO FUNCIONAL (FCT)",
                    "templateText": "emitir resposta funcional em {param_1} de {param_2} oport. antes do comportamento-alvo",
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
                    "code": "FCT02",
                    "title": "Solicitar interrupção temporária da demanda.",
                    "category": "FCT",
                    "categoryLabel": "FCT · TREINO DE COMUNICAÇÃO FUNCIONAL (FCT)",
                    "templateText": "utilizar solicitação em {param_1} de {param_2} oport.",
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
                    "code": "FCT03",
                    "title": "Solicitar atenção de forma socialmente funcional.",
                    "category": "FCT",
                    "categoryLabel": "FCT · TREINO DE COMUNICAÇÃO FUNCIONAL (FCT)",
                    "templateText": "utilizar resposta alternativa em {param_1} de {param_2} oport.",
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
                    "code": "FCT04",
                    "title": "Pedir item ou atividade.",
                    "category": "FCT",
                    "categoryLabel": "FCT · TREINO DE COMUNICAÇÃO FUNCIONAL (FCT)",
                    "templateText": "utilizar resposta comunicativa em {param_1} de {param_2} oport. antes de pegar/chorar/interferente",
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
                    "code": "FCT05",
                    "title": "Comunicar que não deseja determinado item ou atividade.",
                    "category": "FCT",
                    "categoryLabel": "FCT · TREINO DE COMUNICAÇÃO FUNCIONAL (FCT)",
                    "templateText": "emitir resposta funcional em {param_1} de {param_2} oport.",
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
                    "code": "FCT06",
                    "title": "Solicitar extensão breve de atividade.",
                    "category": "FCT",
                    "categoryLabel": "FCT · TREINO DE COMUNICAÇÃO FUNCIONAL (FCT)",
                    "templateText": "utilizar resposta ensinada em {param_1} de {param_2} oport.",
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
            "Regulado e cooperativo",
            "Agitado / hiperativo",
            "Baixo engajamento",
            "Irritado / desregulado",
            "Esquiva e fuga de demandas",
            "Comportamento autoestimulatório elevado",
            "Choro / birra na transição",
            "Outro"
        ],
        "recentChanges": [
            "Mudança na rotina familiar",
            "Alteração medicamentosa",
            "Sono inadequado na noite anterior",
            "Sintomas gripais / dor",
            "Nenhuma intercorrência relatada",
            "Outro"
        ]
    },
    "assistanceLevels": [
        {
            "id": "independente",
            "label": "Independente (IND)",
            "description": "Emite a resposta sem qualquer ajuda."
        },
        {
            "id": "ajuda_gestual",
            "label": "Ajuda Gestual (GES)",
            "description": "Apontar ou gesticular em direção ao estímulo."
        },
        {
            "id": "ajuda_visual",
            "label": "Ajuda Visual / Posicional (POS)",
            "description": "Estímulo mais próximo ou dica visual destacada."
        },
        {
            "id": "ajuda_verbal",
            "label": "Ajuda Verbal (VER)",
            "description": "Pista verbal parcial ou total."
        },
        {
            "id": "modelo",
            "label": "Modelo (MOD)",
            "description": "Demonstração completa da resposta esperada."
        },
        {
            "id": "ajuda_fisica_parcial",
            "label": "Ajuda Física Parcial (AFP)",
            "description": "Toque no cotovelo/braço guiando o movimento."
        },
        {
            "id": "ajuda_fisica_total",
            "label": "Ajuda Física Total (AFT)",
            "description": "Mão sobre mão conduzindo completamente a ação."
        }
    ],
    "strategies": [
        {
            "category": "Estratégias Comportamentais",
            "items": [
                "Pareamento terapeuta-reforçador",
                "Momentum comportamental (alta densidade de demandas fáceis)",
                "Reforçamento diferencial (DRA/DRI/DRO)",
                "Extinção de fuga",
                "Economia de fichas / token",
                "Contrato comportamental",
                "Outro"
            ]
        },
        {
            "category": "Estratégias de Ensino",
            "items": [
                "Ensino por Tentativas Discretas (DTT)",
                "Ensino em Ambiente Natural (NET)",
                "Prompting e fading (ajuda e esvanecimento)",
                "Espera estruturada (delay)",
                "Encadeamento para frente/trás",
                "Modelação e imitação",
                "Outro"
            ]
        }
    ],
    "sessionStages": [
        {
            "id": 1,
            "name": "Pareamento e estabelecimento de controle instrucional",
            "defaultMinutes": 10
        },
        {
            "id": 2,
            "name": "Bloco de ensino DTT / demandas estruturadas",
            "defaultMinutes": 20
        },
        {
            "id": 3,
            "name": "Treino em ambiente naturalístico (NET)",
            "defaultMinutes": 15
        },
        {
            "id": 4,
            "name": "Devolutiva e registro de dados com a família",
            "defaultMinutes": 5
        }
    ],
    "nextSessionDecisions": [
        "Manter alvo e reforçador atual",
        "Esvaecer ajuda (passar para nível menor)",
        "Introduzir novos estímulos distratores",
        "Critério de maestria atingido (manutenção)",
        "Ajustar esquema de reforçamento",
        "Substituir resposta de FCT"
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
