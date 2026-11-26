/**
 * Clin Chatbot 2.0 — Templates de Mensagens por Step
 *
 * Posicionamento: Plataforma operacional e clínica brasileira especializada em clínicas
 * de terapias multidisciplinares (Psicologia, ABA e Neurodesenvolvimento, Fonoaudiologia,
 * Terapia Ocupacional, Psicomotricidade e Fisioterapia).
 *
 * Regras comerciais invioláveis:
 * - Apenas 3 planos oficiais: Básico (R$ 149 / 1 licença), Avançado (R$ 249 / até 5 licenças),
 *   Professional (R$ 449 / até 30 licenças). Licença extra avulsa: R$ 49,90/mês.
 * - 1 unidade operacional por assinatura, taxa única de implantação e capacitação digital
 *   pelo Guia de Uso Integrado e CliniGo Academy.
 * - Totem enxuto com Check-in Facial e QR Code + Painel de TV (sem emissão de senhas).
 * - Zero emojis, zero "&", zero promessas fora do escopo.
 */

// ========== MENU INICIAL ==========
export const MSG_MENU = [
  `Olá! Seja bem-vindo(a) ao *CliniGo* — plataforma especializada em *clínicas de terapias multidisciplinares*.

Sou a *Clin*, assistente virtual do CliniGo. Como posso ajudar sua clínica hoje?

Escolha o assunto digitando o número correspondente:

*1* — O que é o CliniGo e especialidades atendidas
*2* — Planos, preços e Simulador de Economia (a partir de R$ 149/mês)
*3* — Teste grátis de 7 dias ou demonstração consultiva
*4* — Conhecer módulos (ABA/Tatame, CliniGo IA, Família, TISS, Repasse)
*5* — Falar com um especialista agora
*6* — Problema de acesso, suspensão ou conta encerrada

_(Responda com o número da opção desejada ou escreva sua dúvida)_`,
]

// ========== FLUXO 1 — O QUE É O CLINIGO ==========
export const MSG_FLUXO_1_INTRO = [
  `O *CliniGo* é a plataforma operacional e clínica criada especialmente para *clínicas de terapias multidisciplinares e centros de neurodesenvolvimento*.

Diferente de softwares médicos genéricos (feitos para consultas avulsas), o CliniGo resolve nativamente a rotina de terapias seriadas para:
• *Psicologia* (evolução SOAP e sigilo rigoroso CRP no servidor)
• *ABA e Neurodesenvolvimento (TEA)* (Modo Tatame DTT/NET 1-toque, Curvas ABA com domínio automático >= 80% x 3 e Mesa de Supervisão)
• *Fonoaudiologia* (planos por domínio CRFa e anexos privados criptografados)
• *Terapia Ocupacional* (integração sensorial, AVD e reserva de salas sensoriais)
• *Psicomotricidade* (biblioteca visual com 55 objetivos A-K e gráfico evolutivo automático)
• *Fisioterapia* (avaliação funcional, pacotes, reposições e convênios TISS)

Tudo integrado em um só sistema: agenda recorrente com co-terapia, *CliniGo IA com Escudo LGPD*, *CliniGo Família 2.0* (sem app para os pais), check-in biométrico facial, faturamento TISS ANS com Dossiê Anti-Glosa e repasse por profissional.`,

  `Para eu te indicar exatamente o que faz sentido para a sua realidade, *qual é o perfil da sua operação hoje?*

*A* — Sou terapeuta autônomo(a) (atendo sozinho)
*B* — Tenho uma clínica de terapias com equipe (2 a 5 profissionais)
*C* — Tenho clínica multidisciplinar maior ou atendo convênios TISS (6 a 30+ profissionais)

*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_1A_SOLO = [
  `Perfeito! Para quem atende de forma autônoma ou está estruturando a própria operação, o plano *Básico (R$ 149/mês — 1 licença)* já entrega tudo o que você precisa:

• *Atendimentos ilimitados e agenda recorrente* — séries semanais, quinzenais ou mensais com duração real (40, 45, 50 ou 120 min) e controle de faltas/reposições.
• *Prontuário por especialidade, planos ABA e Modo Tatame* — evolução estruturada, assinatura com registro de conselho (CRP, CRFa, CREFITO) e sigilo LGPD no servidor.
• *CliniGo IA com Escudo LGPD* — estruturador instantâneo de evolução e redator de laudos sem enviar dados sensíveis de pacientes.
• *CliniGo Família 2.0* — boletim das famílias e tarefas em casa por link seguro, sem baixar aplicativo.
• *Teleconsulta WebRTC nativa*, pré-cadastro no celular, assinatura eletrônica (Lei 14.063/2020) e Guia de Uso + CliniGo Academy.

Você tem *7 dias de teste gratuito* sem cartão de crédito.`,

  `Como prefere continuar?

*1* — Quero testar grátis por 7 dias agora
*2* — Quero falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_1B_EQUIPE = [
  `Excelente! Quando a clínica de terapias cresce em equipe, planilhas e controles soltos começam a gerar choques de sala, evoluções atrasadas e horas perdidas no fechamento de repasses.

O plano *Avançado (R$ 249/mês — até 5 licenças)* é o mais escolhido por clínicas em estruturação:

• *Tudo do Básico* (incluindo CliniGo IA, CliniGo Família 2.0 e Modo Tatame) + até 5 profissionais incluídos (licença extra a R$ 49,90/mês)
• *Agenda recorrente com co-terapia e reserva de salas sensoriais*
• *BI de Terapia e Mesa de Supervisão ABA/PEI* — semáforo de estagnação, retenção, risco de evasão, fila de espera e conformidade de evoluções
• *Motor de repasse automático com sigilo RBAC* — cada terapeuta acompanha o próprio *Meu Repasse em Tempo Real*
• *WhatsApp integrado por setores*, CRM Kanban, DRE gerencial e importação via Excel/CSV

Para eu confirmar o plano exato e simular a economia: *quantos profissionais atendem na sua clínica hoje?* (digite o número)`,
]

export const MSG_FLUXO_1C_REDE = [
  `Para clínicas multidisciplinares com equipe completa e operação com convênios, o *CliniGo Professional (R$ 449/mês — até 30 licenças)* cobre a operação de ponta a ponta:

• *Tudo do Avançado* + até 30 profissionais incluídos em 1 unidade operacional
• *Faturamento TISS completo no padrão ANS* — autorizações prévias, controle de saldo de sessões, lotes XML, Score de Saúde do Lote e Relatório de Renovação de Convênio em 1 clique
• *Blindagem contra glosas* — Dossiê Probatório 1-Clique (Biometria Facial + Evolução Assinada + Guia TISS) e Carta ANS gerada pela CliniGo IA
• *Check-in biométrico facial multi-superfície* (sala, totem, webcam ou celular), *Totem de autoatendimento (Facial e QR Code)* e *Painel de TV*
• *Pesquisa de satisfação NPS, API, webhooks e SLA de 99,5%*
• Precisa de mais de 30 usuários? Adicione *licenças avulsas a R$ 49,90/mês* sem travar sua equipe.

*Quantos profissionais atendem na sua clínica hoje?* (digite o número)`,
]

export const MSG_FLUXO_1C_RECOMENDACAO_ENTERPRISE = [
  `Para essa estrutura, vale uma conversa rápida com nosso especialista para desenhar a parametrização ideal de licenças, especialidades, salas e convênios TISS.

Posso te conectar com um especialista agora?

*1* — Sim, quero falar com um especialista
*2* — Quero testar grátis por 7 dias primeiro
*0* — Voltar ao menu principal`,
]

// ========== FLUXO 2 — PLANOS ==========
export const MSG_FLUXO_2_PLANOS = [
  `Os planos do *CliniGo* são objetivos e com atendimentos ilimitados. Todas as assinaturas contemplam 1 unidade operacional, contam com taxa única de implantação e capacitação digital pelo Guia de Uso Integrado e CliniGo Academy:

------------------
*BÁSICO — R$ 149/mês*
------------------
• 1 licença de profissional | Atendimentos ilimitados
• Agenda recorrente, Meu Dia Clínico e controle de faltas/reposições
• Prontuário por especialidade, planos ABA, Modo Tatame e Curvas ABA
• CliniGo IA com Escudo LGPD e CliniGo Família 2.0 (sem app)
• Teleconsulta WebRTC, pré-cadastro e assinatura eletrônica (Lei 14.063/2020)

------------------
*AVANÇADO — R$ 249/mês* _(Mais escolhido)_
------------------
• Até 5 licenças incluídas
• Tudo do Básico +
• BI de Terapia, Radar Operacional e Mesa de Supervisão ABA/PEI
• Motor de repasse automático com Meu Repasse em Tempo Real e sigilo RBAC
• WhatsApp integrado por setores, CRM Kanban e assinatura ICP-Brasil A1
• DRE gerencial, auditoria de produção e importação via Excel/CSV`,

  `------------------
*PROFESSIONAL — R$ 449/mês*
------------------
• Até 30 licenças incluídas
• Tudo do Avançado +
• Faturamento TISS completo, lotes XML ANS, Score do Lote e Dossiê Anti-Glosa 1-Clique
• Relatório de Renovação de Convênio em 1 clique e Carta ANS via CliniGo IA
• Check-in biométrico facial multi-superfície vinculado às guias TISS
• Totem de autoatendimento (Facial e QR Code), Painel de TV, NPS, API/Webhooks e SLA 99,5%

_Precisa de mais usuários? Licenças adicionais avulsas custam R$ 49,90/mês._
Detalhes completos em: https://clinigo.app/planos

Para eu indicar o plano ideal e calcular o retorno da sua clínica: *quantos profissionais atendem hoje?* (digite um número)`,
]

// ========== FLUXO 3 — DEMO ==========
export const MSG_FLUXO_3_DEMO = [
  `A melhor forma de avaliar o CliniGo é vendo na prática com a rotina da sua clínica de terapias.

Você tem *duas opções*:

*A* — *Avaliação consultiva com especialista*
Apresentamos os fluxos adaptados às especialidades da sua clínica (ABA, Psicologia, Fono, TO, Psicomotricidade, Fisioterapia, CliniGo IA ou TISS) e tiramos todas as dúvidas comerciais e operacionais.

*B* — *Teste grátis imediato por 7 dias*
Crie sua conta em 2 minutos sem cartão de crédito e explore o sistema com o Guia de Uso Integrado e a CliniGo Academy.

*Qual você prefere?*

*A* — Quero falar com especialista para avaliação consultiva
*B* — Quero criar minha conta de teste grátis agora
*0* — Voltar ao menu principal`,
]

// ========== TRIAL ==========
export const MSG_ENVIAR_TRIAL = [
  `O teste do CliniGo é *100% gratuito por 7 dias*, sem precisar de cartão de crédito.

Crie sua conta agora em menos de 2 minutos:
https://clinigo.app/trial

Você informa apenas nome, e-mail, telefone, CPF/CNPJ, nome da clínica e senha — e já acessa o sistema completo com o Guia de Uso Integrado e a CliniGo Academy.`,
]

export const MSG_TRIAL_FOLLOWUP = [
  `Conseguiu criar sua conta de teste?

Se surgir qualquer dúvida durante a avaliação, é só me chamar por aqui:

*1* — Já entrei, mas tenho dúvidas sobre como configurar
*2* — Tive dificuldade no cadastro
*0* — Voltar ao menu principal`,
]

// ========== FLUXO 4 — FUNCIONALIDADES ==========
export const MSG_FLUXO_4_FUNCIONALIDADES = [
  `O CliniGo foi projetado de ponta a ponta para clínicas de terapias multidisciplinares. *Qual módulo você quer conhecer primeiro?*

*A* — Agenda recorrente, Meu Dia Clínico, co-terapia e salas sensoriais
*B* — Prontuário, Modo Tatame DTT/NET, Curvas ABA e Mesa de Supervisão
*C* — Motor de repasse automático, Meu Repasse em Tempo Real e DRE
*D* — WhatsApp por setores, CRM Kanban e teleconsulta WebRTC
*E* — Pré-cadastro (Lei 14.063/2020), Biometria Facial, Totem e Painel de TV
*F* — Faturamento TISS ANS, Dossiê Anti-Glosa 1-Clique e Renovação de Convênio
*G* — CliniGo IA (Escudo LGPD) e CliniGo Família 2.0 (Portal dos Pais sem app)
*H* — BI de Terapia, Governança LGPD/RBAC e importação Excel/CSV

*0* — Voltar ao menu principal`,
]

export const MSG_FUNC_FOOTER = `\n\n*1* — Ver outro módulo
*2* — Testar grátis por 7 dias
*3* — Falar com um especialista
*0* — Voltar ao menu principal`

export const MSG_FUNC_4A = [
  `*Agenda Recorrente, Meu Dia Clínico, Co-terapia e Salas Sensoriais*

• *Séries flexíveis minuto a minuto:* agendamentos semanais, quinzenais ou mensais com durações reais (40, 45, 50 ou 120 min).
• *Meu Dia Clínico + Clonar Última Sessão:* o terapeuta vê o dia completo em um painel limpo e registra evoluções em segundos.
• *Co-terapia nativa:* dois profissionais no mesmo paciente (dupla de terapeutas ou supervisão em sala) sem gerar falso conflito de agenda.
• *Reserva de salas temáticas:* bloqueio físico de Sala Sensorial, AVD ou Sala Motora impedindo choques entre terapeutas.
• *Faltas, reposições, pacotes e fila de espera multidisciplinar.*

Veja mais: https://clinigo.app/solucoes/clinica-multidisciplinar${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4B = [
  `*Prontuário, Modo Tatame DTT/NET, Curvas ABA e Mesa de Supervisão*

• *ABA e Neurodesenvolvimento:* planos terapêuticos, *Modo Tatame 1-toque* (coleta DTT/NET durante a sessão), *Curvas de Aprendizagem com regra automática de domínio (>= 80% em 3 sessões)* e *Mesa de Supervisão* (semáforo de estagnação e calibração entre aplicadores).
• *Psicologia (CRP):* evolução estruturada SOAP, histórico comparativo e sigilo rigoroso RBAC/RLS no servidor.
• *Fonoaudiologia (CRFa) e Terapia Ocupacional (CREFITO):* planos por domínio, integração sensorial, AVD e anexos privados criptografados.
• *Psicomotricidade e Fisioterapia:* biblioteca visual com 55 objetivos psicomotores (A-K) com gráfico evolutivo automático e avaliação funcional.
• *Assinatura com registro de conselho* e auditoria em tempo real de evoluções pendentes.

Veja todas as especialidades: https://clinigo.app/solucoes${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4C = [
  `*Motor de Repasse por Profissional, Meu Repasse e DRE*

• *Regras individuais de repasse:* configure valores por terapeuta, contrato, tabela de convênio ou exceção por paciente específico.
• *Meu Repasse em Tempo Real:* cada profissional acompanha exatamente o que já está liberado vs o que aguarda evolução assinada — eliminando dúvidas no fechamento.
• *Sigilo financeiro (RBAC):* cada terapeuta consulta exclusivamente seu próprio extrato, sem visualizar financeiro geral ou valores de colegas.
• *DRE gerencial e Raio-X de Rentabilidade por Operadora.*

Disponível a partir do plano *Avançado (R$ 249/mês)*.${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4D = [
  `*WhatsApp Integrado por Setores, CRM Kanban e Teleconsulta WebRTC*

• *Confirmação automática no WhatsApp:* lembretes enviados às famílias e respostas refletidas direto na agenda da clínica.
• *Atendimento por setores e CRM Kanban:* organize leads comerciais, recepção e acompanhamento de novas famílias sem perder contatos.
• *Teleconsulta WebRTC nativa:* incluída desde o plano Básico (R$ 149/mês), integrada ao prontuário e à agenda recorrente, sem precisar de Zoom ou Meet.

WhatsApp integrado disponível a partir do plano *Avançado (R$ 249/mês)*.${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4E = [
  `*Pré-cadastro Online, Assinatura Lei 14.063/2020, Biometria Facial, Totem e TV*

• *Pré-cadastro e termos no celular:* a família preenche ficha, envia carteirinha e assina termos LGPD e contratos pelo link ou QR Code (sem login), com IP, data/hora e hash SHA-256.
• *Check-in biométrico facial multi-superfície:* validação do paciente ou responsável no dispositivo da sala, totem, webcam da terapeuta ou link temporário no celular (sem derrubar o acesso do computador).
• *Totem de autoatendimento e Painel de TV:* fluxos limpos de Check-in Facial e QR Code com logotipo da sua clínica e chamada na sala de espera. _(Plano Professional)_${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4F = [
  `*Faturamento TISS Padrão ANS e Blindagem Anti-Glosa*

• *Autorizações prévias e saldo de sessões:* valide códigos TUSS, vigência da senha e saldo disponível antes da sessão.
• *Score de Saúde do Lote TISS (0 a 100%) e Memória Anti-Glosa:* detecte inconsistências antes de enviar o XML à operadora.
• *Dossiê Probatório 1-Clique:* reúne Biometria Facial + Evolução Assinada + Guia TISS + Carta ANS redigida pela CliniGo IA para recorrer de glosas em segundos.
• *Relatório de Renovação de Convênio em 1 clique* consolidando evolução multidisciplinar do paciente.

Disponível no plano *Professional (R$ 449/mês — até 30 licenças)*.
Detalhes: https://clinigo.app/solucoes/faturamento-tiss-terapias${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4G = [
  `*CliniGo IA (com Escudo LGPD) e CliniGo Família 2.0*

• *CliniGo IA com Escudo LGPD:* anonimiza automaticamente qualquer dado identificável antes do processamento e acelera a clínica com:
  - Estruturador instantâneo de evolução + Check Anti-Glosa no prontuário
  - Redator de Laudos Multidisciplinares em 3 tons (técnico, escolar e família)
  - Tradutor empático para famílias e Advogado Anti-Glosa TISS (Carta ANS)
• *CliniGo Família 2.0 (sem precisar baixar app):*
  - Boletim seguro LGPD com Mural de Conquistas do paciente
  - Atividades para casa com confirmação dos pais, correlação Casa x Clínica e micro-retorno estruturado da escola

Disponíveis desde o plano *Básico (R$ 149/mês)*.${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4H = [
  `*BI de Terapia, Governança LGPD/RBAC e Importação Excel/CSV*

• *BI de Terapia e Radar Operacional:* conformidade de evoluções em tempo real, risco de evasão, retenção, carga de trabalho, receita por modalidade e NPS.
• *Isolamento real no banco (RBAC + RLS) e sessão única auditada:* cada perfil acessa estritamente o que compete à sua função, com trilha completa LGPD.
• *Importação em lote via Excel e CSV:* traga cadastros da sua planilha ou sistema anterior com validação prévia. _(Avançado+)_
• *Capacitação autoguiada:* Guia de Uso Integrado e CliniGo Academy disponíveis nativamente dentro do sistema.${MSG_FUNC_FOOTER}`,
]

// ========== RESPOSTAS DIRETAS POR ESPECIALIDADE / INTENÇÃO (PERGUNTAS LIVRES) ==========
export const MSG_INTENT_ABA = [
  `Sim! O CliniGo tem uma suíte completa dedicada para *clínicas ABA e Neurodesenvolvimento (TEA)*:

• *Modo Tatame DTT/NET 1-toque:* registre tentativas, acertos e níveis de ajuda durante a sessão sem burocracia.
• *Curvas de Aprendizagem automáticas:* gráficos evolutivos com regra automática de domínio (>= 80% em 3 sessões consecutivas).
• *Mesa de Supervisão ABA/PEI:* semáforo de estagnação, metas prontas para promoção, calibração entre aplicadores e prompt fading.
• *Co-terapia nativa* na agenda + *Faturamento TISS ANS com biometria facial* e Dossiê Anti-Glosa 1-Clique.

Veja a página completa: https://clinigo.app/solucoes/clinica-aba

O que você prefere agora?
*1* — Testar grátis por 7 dias
*2* — Ver planos e simular economia
*3* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_INTENT_PSICO = [
  `Sim! O CliniGo foi estruturado respeitando integralmente a rotina e o *sigilo ético da Psicologia (CRP e LGPD)*:

• *Isolamento real no servidor (RBAC + RLS):* apenas o psicólogo responsável visualiza suas evoluções; recepção, financeiro e colegas não têm acesso.
• Evolução estruturada *SOAP*, *CliniGo IA com Escudo LGPD* para organizar notas e laudos, e assinatura com registro de CRP.
• *Teleconsulta WebRTC nativa* integrada ao prontuário e agenda recorrente semanal ou quinzenal.
• Assinatura eletrônica de contrato terapêutico e termo LGPD no celular do paciente (Lei 14.063/2020).
• Planos a partir de *R$ 149/mês* (autônomo) ou *R$ 249/mês* (até 5 profissionais com WhatsApp e repasse automático).

Veja os detalhes: https://clinigo.app/solucoes/psicologia

Como prefere seguir?
*1* — Testar grátis por 7 dias
*2* — Ver planos e preços
*3* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_INTENT_TERAPIAS_ESPEC = [
  `Sim! O CliniGo atende nativamente todas as principais disciplinas de uma *clínica de terapias multidisciplinar*:

• *Fonoaudiologia (CRFa):* planos por domínio fonológico, pragmático e orofacial + anexos privados criptografados.
• *Terapia Ocupacional (CREFITO):* planos de integração sensorial e AVD + *reserva de Sala Sensorial* bloqueando choques de horário.
• *Psicomotricidade:* biblioteca visual com 55 objetivos psicomotores (A-K), capa clínica e *gráfico evolutivo automático*.
• *Fisioterapia (CREFITO):* avaliação funcional, controle de pacotes/reposições, agenda por sala e TISS.
• Além de *Psicologia (CRP)* e *ABA / Neurodesenvolvimento* (Modo Tatame + Curvas ABA), tudo com co-terapia e repasse individual.

Explore cada especialidade em: https://clinigo.app/solucoes

Como prefere continuar?
*1* — Testar grátis por 7 dias
*2* — Ver planos e preços
*3* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_INTENT_TISS_BIOMETRIA = [
  `Sim! O CliniGo une *faturamento TISS padrão ANS* e *check-in por biometria facial* especificamente para terapias seriadas:

• Controle de autorizações prévias, códigos TUSS, vigência de senhas e saldo de sessões antes do atendimento.
• *Score de Saúde do Lote (0 a 100%)* e *Biometria facial multi-superfície* (sala, totem, webcam ou celular) como dupla comprovação de presença.
• *Dossiê Probatório 1-Clique Anti-Glosa* (Biometria + Evolução Assinada + Guia TISS + Carta ANS via CliniGo IA) e *Relatório de Renovação de Convênio em 1 clique*.
• Integrado ao plano *Professional (R$ 449/mês — até 30 licenças)*.

Detalhes completos: https://clinigo.app/solucoes/faturamento-tiss-terapias

Como prefere seguir?
*1* — Testar grátis por 7 dias
*2* — Ver todos os planos
*3* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_INTENT_TELECONSULTA = [
  `Sim! O CliniGo já inclui *Teleconsulta WebRTC nativa* desde o plano *Básico (R$ 149/mês)*, sem precisar pagar Zoom ou Google Meet por fora.

A sala de vídeo fica integrada ao agendamento recorrente e ao prontuário com sigilo clínico (CRP/CRFa/CREFITO), e o paciente acessa direto pelo link seguro.

Como prefere seguir?
*1* — Testar grátis por 7 dias
*2* — Ver planos e preços
*3* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_INTENT_CLINIGO_IA = [
  `Sim! O CliniGo conta com a *CliniGo IA com Escudo LGPD nativo* — nenhum dado identificável do paciente (nome, CPF, telefone ou carteirinha) sai do servidor:

• *Estruturador Instantâneo de Evolução + Check Anti-Glosa:* transforma anotações rápidas em evolução clínica estruturada e aponta campos que evitam glosas.
• *Redator Multidisciplinar de Laudos em 3 Tons:* gera versões técnica, escolar e empática para os pais em segundos.
• *Tradutor Empático no CliniGo Família:* explica o progresso das metas em linguagem acolhedora para os responsáveis.
• *Advogado Anti-Glosa TISS:* redige a Carta de Recurso ANS no Dossiê Probatório.

Como prefere seguir?
*1* — Testar grátis por 7 dias
*2* — Ver planos e preços
*3* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_INTENT_FAMILIA = [
  `Sim! O *CliniGo Família 2.0* foi criado para engajar pais e responsáveis sem que precisem instalar aplicativo ou criar senha:

• *Boletim LGPD por link seguro* com *Mural de Conquistas* do paciente.
• *Atividades para casa* com confirmação dos pais e registro automático de volta no prontuário.
• *Correlação Casa x Clínica* e *Micro-retorno estruturado da escola* para a equipe multidisciplinar acompanhar a evolução real.
• Ajuda diretamente a reduzir faltas e aumentar a retenção das famílias na clínica.

Como prefere seguir?
*1* — Testar grátis por 7 dias
*2* — Ver planos e preços
*3* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_INTENT_MIGRACAO = [
  `A migração para o CliniGo é simples e guiada:

• *Importação em lote via Excel e CSV* (a partir do plano Avançado) com validação prévia para trazer pacientes e cadastros sem retrabalho manual.
• *Capacitação 100% digital e autoguiada* dentro do próprio sistema pelo *Guia de Uso Integrado* e pela *CliniGo Academy* (trilhas práticas para recepção, terapeutas e gestores).
• Você pode ativar ou ocultar módulos clínicos por clínica em *Configurações -> Módulos Clínicos* para começar no ritmo exato da sua equipe.

Como prefere seguir?
*1* — Testar grátis por 7 dias
*2* — Ver planos e preços
*3* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_INTENT_CONTRATO_IMPLANTACAO = [
  `Sobre as condições comerciais do *CliniGo*:

• Trabalhamos com *3 planos oficiais* para 1 unidade operacional: *Básico (R$ 149/mês — 1 licença)*, *Avançado (R$ 249/mês — até 5 licenças)* e *Professional (R$ 449/mês — até 30 licenças)*.
• Licenças extras avulsas custam *R$ 49,90/mês* cada.
• Contamos com taxa única de implantação e formalização comercial clara (incluindo contratos formais B2B com assinatura eletrônica válida pela Lei 14.063/2020).
• O foco da plataforma é gestão clínica, agenda, prontuários, planos terapêuticos, TISS e repasses gerenciais.

Como prefere seguir?
*1* — Testar grátis por 7 dias
*2* — Ver planos e simular economia
*3* — Falar com um especialista comercial
*0* — Voltar ao menu principal`,
]

// ========== SIMULADOR DE ROI NO WHATSAPP ==========
export const MSG_ROI_PERGUNTA_NUM = [
  `*Simulador Rápido de Economia (ROI) — CliniGo*

Em 10 segundos eu estimo quanto sua clínica economiza em tempo de fechamento de repasses, faltas evitadas e blindagem contra glosas.

*Quantos profissionais/terapeutas atendem na sua clínica hoje?* (digite apenas o número)

*0* — Voltar ao menu principal`,
]

export function buildRoiCalculationMessage(numProfissionais: number, planoIndicado: string): string[] {
  const safeNum = Math.max(1, Math.min(200, Math.round(numProfissionais)))
  const precoMensal = safeNum === 1 ? 149 : safeNum <= 5 ? 249 : safeNum <= 30 ? 449 : 449 + (safeNum - 30) * 49.9
  const horasEconomizadasMes = Math.max(8, Math.round(safeNum * 3.5))
  const receitaProtegidaMes = safeNum * 150
  const sessoesParaPagar = Math.max(1, Math.ceil(precoMensal / 150))
  const precoFmt = precoMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const protegidaFmt = receitaProtegidaMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return [
    `*Estimativa Conservadora para ${safeNum} ${safeNum > 1 ? 'profissionais' : 'profissional'} — CliniGo*

• *Plano indicado:* ${planoIndicado} (${precoFmt}/mês)
• *Tempo devolvido à gestão e equipe:* cerca de *${horasEconomizadasMes} horas/mês* (fechamento automático de repasses, evoluções agilizadas com CliniGo IA e agenda recorrente)
• *Receita mensal protegida (cenário conservador):* se o CliniGo evitar apenas *1 falta ou 1 glosa* por profissional no mês, isso protege aproximadamente *${protegidaFmt}/mês*
• *Ponto de equilíbrio:* basta evitar *${sessoesParaPagar} falta${sessoesParaPagar > 1 ? 's' : ''}/glosa${sessoesParaPagar > 1 ? 's' : ''} no mês inteiro* para o sistema se pagar com folga.

Como prefere seguir agora?

*1* — Criar minha conta de teste grátis (7 dias sem cartão)
*2* — Falar com um especialista para alinhar a implantação
*0* — Voltar ao menu principal`,
  ]
}

// ========== FLUXO 5 — COLETA DE DADOS ==========
export const MSG_FLUXO_5_NOME = [
  `Vou te conectar com um especialista do CliniGo agora.

Antes de transferir, me informe rapidamente:

*Qual é o seu nome?*

*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_5_CLINICA = [
  `*Qual é o nome da sua clínica ou consultório?*

*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_5_NUM = [
  `*Quantos profissionais/terapeutas atendem na sua clínica hoje?* (digite o número)

*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_5_DOR = [
  `*Qual é a principal prioridade da sua clínica hoje?* (escolha a letra)

*A* — Organizar agenda recorrente, co-terapia, salas sensoriais e reduzir faltas
*B* — Prontuário por especialidade, Modo Tatame, Curvas ABA e sigilo CRP/CRFa/CREFITO
*C* — Automatizar financeiro e repasse por profissional sem planilhas
*D* — Faturamento TISS (convênios) e redução de glosas com biometria facial
*E* — Outro assunto

*0* — Voltar ao menu principal`,
]

// ========== OBJEÇÕES ==========
export const MSG_OBJECAO_PRECO = [
  `Faz todo sentido avaliar o retorno com calma.

Na prática de clínicas de terapias, basta evitar poucas faltas mensais com a confirmação automática no WhatsApp, eliminar horas fechando repasses na planilha ou evitar uma única glosa de convênio TISS para o CliniGo se pagar já no primeiro mês.

Os planos começam em *R$ 149/mês*, e você tem *7 dias gratuitos sem cartão de crédito* para testar com a sua própria rotina antes de decidir.

Como prefere seguir?

*1* — Testar grátis por 7 dias agora
*2* — Simular economia (ROI) para minha equipe
*3* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_OBJECAO_LGPD = [
  `Privacidade e sigilo clínico são pilares estruturais do CliniGo:

• *RBAC + RLS no servidor e banco de dados:* cada terapeuta acessa exclusivamente seus próprios pacientes — recepção, financeiro e colegas não visualizam prontuários sigilosos (CRP, CRFa e CREFITO).
• *Escudo LGPD na CliniGo IA:* nenhum nome, CPF, telefone ou carteirinha do paciente é enviado a modelos externos.
• *Sessão única auditada:* bloqueia compartilhamento indevido de login e registra trilha completa de auditoria LGPD.
• *Assinatura eletrônica Lei 14.063/2020:* termos LGPD e contratos com data/hora, IP e hash SHA-256.

Como prefere continuar?

*1* — Testar grátis por 7 dias
*2* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_INATIVIDADE = [
  `Olá! Passando apenas para lembrar que continuo por aqui caso tenha ficado alguma dúvida sobre o *CliniGo* para sua clínica de terapias.

Se quiser continuar de onde paramos, basta responder esta mensagem.
O *teste grátis de 7 dias sem cartão* segue liberado em: https://clinigo.app/trial

_Clin, Assistente CliniGo_`,
]

export const MSG_ENVIAR_INFO_ENTERPRISE = [
  `Sem problemas! Aqui está o resumo do *CliniGo Professional (R$ 449/mês)* para equipes multidisciplinares maiores:

• Até 30 licenças incluídas em 1 unidade operacional (licenças extras avulsas a R$ 49,90/mês)
• Workspaces nativos para Psicologia, ABA (Modo Tatame + Curvas + Mesa de Supervisão), Fonoaudiologia, TO, Psicomotricidade e Fisioterapia
• CliniGo IA com Escudo LGPD e CliniGo Família 2.0 (sem app)
• Faturamento TISS padrão ANS, lotes XML, Score do Lote e Dossiê Anti-Glosa 1-Clique
• Check-in biométrico facial multi-superfície, Totem (Facial e QR Code) e Painel de TV
• BI de Terapia, motor de repasse com sigilo RBAC, API/Webhooks e SLA 99,5%

Compare todos os detalhes em https://clinigo.app/comparativo ou inicie seu teste gratuito em https://clinigo.app/trial.

_Clin, Assistente CliniGo_`,
]

// ========== DORES MAPEADAS ==========
export const DOR_MAP: Record<string, string> = {
  'a': 'Agenda recorrente, co-terapia, salas e redução de faltas',
  'b': 'Prontuário por especialidade, Modo Tatame, planos ABA e sigilo CRP/CRFa/CREFITO',
  'c': 'Financeiro e repasse automático por profissional',
  'd': 'Faturamento TISS e redução de glosas com biometria facial',
  'e': 'Outro assunto',
}

// ========== SAUDAÇÕES E FALLBACKS ==========
export const MSG_SAUDACAO_ACOLHIMENTO = [
  `Olá! Que bom falar com você.

Sou a *Clin*, assistente virtual do *CliniGo* — a plataforma feita especialmente para *clínicas de terapias multidisciplinares* (Psicologia, ABA, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia).`,
  ...MSG_MENU,
]

export const MSG_FALLBACK_SIMPATICO = [
  `Não consegui identificar essa opção, mas posso te ajudar agora mesmo. Escolha um número abaixo ou escreva sua dúvida:`,
  ...MSG_MENU,
]

// ========== FLUXO 3 DETALHADO ==========
export const MSG_TRIAL_DIRETO_FLUXO3 = [
  `Seu acesso de avaliação gratuita está liberado aqui:

https://clinigo.app/trial

Você terá *7 dias completos sem cartão de crédito* para testar agenda recorrente, workspaces por especialidade (Psicologia, ABA, Fono, TO, Psicomotricidade e Fisioterapia), CliniGo IA com Escudo LGPD, CliniGo Família 2.0, prontuário com sigilo RBAC, pré-cadastro e repasses.

*1* — Já criei minha conta e preciso de ajuda
*2* — Tenho uma dúvida antes de começar
*0* — Voltar ao menu principal`,
]

// ========== OPÇÃO E — OUTRO ASSUNTO ==========
export const MSG_FLUXO_5_OUTRO_ASSUNTO = [
  `Sem problema! Pode escrever com suas palavras o que sua clínica precisa.

Vou registrar o contexto e conectar você com um especialista humano do CliniGo.`,
]

export const MSG_FLUXO_5_OUTRO_ASSUNTO_CONFIRMACAO = [
  `Perfeito, já registrei sua solicitação para nossa equipe.

Posso transferir você para um especialista agora?

*1* — Sim, falar com especialista
*0* — Voltar ao menu principal`,
]

// ========== RECUPERAÇÃO 24H ==========
export const MSG_RECUPERACAO_24H = [
  `Olá! Tudo bem?

Vi que você conversou conosco ontem sobre o *CliniGo* para sua clínica de terapias. Se ainda ficou alguma dúvida sobre especialidades, CliniGo IA, planos ou implantação, posso te conectar agora com um especialista sem compromisso:

*1* — Falar com um especialista
*2* — Criar minha conta de teste grátis (7 dias)
*3* — Simular economia (ROI) da minha clínica
*0* — Ver o menu novamente`,
]

// ========== FLUXO CONTA ENCERRADA / NOVA CONTRATAÇÃO ==========
export const MSG_CONTA_ENCERRADA_INTRO = [
  `*Administração Comercial — Avaliação de Nova Contratação (CliniGo)*

Identificamos que seu contato refere-se a uma *conta anteriormente encerrada* e à avaliação de uma *nova contratação* na plataforma.

Como contas encerradas não são reativadas automaticamente, o retorno é analisado diretamente pela administração comercial mediante novo contrato formal.

Para que nossa diretoria localize o histórico e dê andamento, por gentileza informe primeiro:

*Qual é o nome da clínica?*`,
]

export const MSG_CONTA_ENCERRADA_RESPONSAVEL = [
  `Obrigado. Agora informe por gentileza o *seu nome completo* e a sua *função ou cargo* na clínica (ex.: Diretora, Sócia, Administradora).`,
]

export function buildContaEncerradaHandoff(clinica: string, responsavelCargo: string): string[] {
  return [
    `*Protocolo de Nova Contratação Registrado*

------------------
*Clínica:* ${clinica}
*Solicitante / Cargo:* ${responsavelCargo}
*Assunto:* Avaliação de nova contratação (conta encerrada)
------------------

Sua solicitação foi encaminhada com prioridade para a *Administração Comercial do CliniGo*.

Nosso responsável comercial entrará em contato diretamente por aqui para apresentar as condições do novo contrato e os próximos passos. Este atendimento automático foi pausado para não interferir na conversa humana.`,
  ]
}

// ========== FLUXO 6 — PROBLEMA DE ACESSO / SUSPENSÃO / BLOQUEIO ==========
export const MSG_FLUXO_6_BLOQUEIO_MENU = [
  `*Central de Acesso e Situação Cadastral — CliniGo*

Identificamos que seu contato é sobre *problema de acesso, suspensão, bloqueio ou conta encerrada*.

Escolha abaixo a opção correspondente ao seu caso (digite o número):

*1* — Problema de acesso (não consigo entrar no sistema)
*2* — Suspensão / Bloqueio por pendência financeira (consultar motivo)
*3* — Sou da direção/financeiro e quero regularizar a mensalidade
*4* — Minha conta foi encerrada definitivamente e quero avaliar nova contratação
*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_6_PROBLEMA_ACESSO = [
  `*Diagnóstico Automático de Acesso — CliniGo*

Informamos que a restrição de acesso que aparece na sua tela *não é um erro no seu celular, computador ou senha*.

Quando o sistema bloqueia todos os acessos da unidade, isso ocorre por *pendência financeira* ou por *encerramento cadastral da conta*.

• Orientamos que verifique diretamente com a direção/administração da sua clínica a situação cadastral junto ao CliniGo.
• Se você representa a direção da clínica, escolha abaixo o motivo correspondente:

*2* — Suspensão por mensalidade em aberto (ver detalhes)
*3* — Sou da direção/financeiro e quero regularizar a mensalidade
*4* — A conta foi encerrada e quero avaliar uma nova contratação
*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_6_MOTIVO_BLOQUEIO = [
  `*Motivo do Bloqueio / Suspensão Financeira — CliniGo*

Quando a clínica encontra-se com o acesso *suspenso por inadimplência (mensalidade atrasada)*:

• Todos os logins vinculados à unidade (profissionais, equipe clínica, recepção e administração) ficam suspensos automaticamente até a confirmação do pagamento.
• Nenhuma evolução ou prontuário é perdido — os dados permanecem sob guarda segura.
• Assim que a administração da clínica quitar a mensalidade vencida, o acesso de toda a equipe é restabelecido.

Escolha uma opção caso deseje prosseguir:

*1* — Ver orientação para profissionais / equipe da clínica
*3* — Sou responsável financeiro e quero quitar a mensalidade para desbloquear
*4* — A conta foi encerrada definitivamente e quero avaliar nova contratação
*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_6_GESTOR_FINANCEIRO = [
  `*Regularização Financeira — Desbloqueio de Clínica*

Caso o acesso da sua clínica esteja suspenso por pendência de mensalidade em aberto, assim que a fatura for quitada o acesso da equipe é regularizado.

O que você deseja fazer agora?

*1* — Falar com o Financeiro CliniGo para regularizar e desbloquear
*2* — Voltar às informações sobre o bloqueio
*4* — Na verdade a conta foi encerrada e quero nova contratação
*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_6_TRANSFERENCIA_FINANCEIRO = [
  `*Solicitação de Regularização Financeira Registrada*

Encaminhamos seu atendimento para o setor financeiro do CliniGo referente à *regularização de mensalidade e desbloqueio da clínica*.

Por favor, aguarde um instante ou envie o nome da clínica e o comprovante nesta conversa para agilizar o atendimento.`,
]
