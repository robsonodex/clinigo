/**
 * Clin Chatbot — Templates de Mensagens por Step
 *
 * Posicionamento: Plataforma operacional e clínica para clínicas de terapias multidisciplinares
 * (Psicologia, ABA e Neurodesenvolvimento, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia).
 *
 * Cada step mapeia para um array de mensagens.
 * No WhatsApp, cada item do array é enviado separadamente com delay de 1.5s.
 * No Web, são renderizados como bolhas sequenciais.
 */

// ========== MENU INICIAL ==========
export const MSG_MENU = [
  `Olá! Seja bem-vindo(a) ao *CliniGo* — plataforma especializada em *clínicas de terapias multidisciplinares*.

Sou a *Clin*, assistente virtual do CliniGo. Como posso ajudar sua clínica hoje?

Escolha o assunto digitando o número correspondente:

*1* — O que é o CliniGo e especialidades atendidas
*2* — Planos e preços (a partir de R$ 149/mês)
*3* — Teste grátis de 7 dias ou demonstração guiada
*4* — Conhecer módulos (Agenda, ABA, Sigilo CRP, TISS, Repasse)
*5* — Falar com um especialista agora
*6* — Problema de acesso / Conta bloqueada ou suspensa

_(Responda com o número da opção desejada ou escreva sua dúvida)_`,
]

// ========== FLUXO 1 — O QUE É O CLINIGO ==========
export const MSG_FLUXO_1_INTRO = [
  `O *CliniGo* é a plataforma operacional e clínica criada especialmente para *clínicas de terapias multidisciplinares e centros de neurodesenvolvimento*.

Diferente de softwares médicos genéricos (feitos para consultas avulsas), o CliniGo resolve nativamente a rotina de terapias seriadas para:
• *Psicologia* (evolução SOAP e sigilo rigoroso CRP)
• *ABA e Neurodesenvolvimento (TEA)* (planos terapêuticos, metas e níveis de ajuda)
• *Fonoaudiologia* (planos por domínio CRFa e anexos privados)
• *Terapia Ocupacional* (integração sensorial, AVD e reserva de salas sensoriais)
• *Psicomotricidade* (catálogo de objetivos e gráfico evolutivo automático)
• *Fisioterapia* (avaliação funcional, pacotes e convênios TISS)

Tudo em um só sistema: agenda recorrente com co-terapia, prontuário isolado por perfil (LGPD/RBAC), WhatsApp automático, biometria facial, TISS ANS e repasse por profissional.`,

  `Para eu te indicar exatamente o que faz sentido para a sua realidade, *qual é o perfil da sua operação hoje?*

*A* — Sou terapeuta autônomo(a) (atendo sozinho)
*B* — Tenho uma clínica de terapias com equipe (2 a 5 profissionais)
*C* — Tenho clínica multidisciplinar maior ou atendo convênios TISS (6 a 30+ profissionais)

*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_1A_SOLO = [
  `Perfeito! Para quem atende de forma autônoma ou está estruturando a própria operação, o plano *Básico (R$ 149/mês — 1 licença)* já entrega tudo o que você precisa:

• *Atendimentos ilimitados e agenda recorrente* — séries semanais, quinzenais ou mensais com duração real (40, 45, 50 ou 120 min) e controle de faltas/reposições.
• *Prontuário por especialidade e planos ABA* — evolução estruturada, assinatura com registro de conselho (CRP, CRFa, CREFITO) e sigilo LGPD no servidor.
• *Teleconsulta WebRTC nativa* — atenda online sem pagar ferramenta externa.
• *Pré-cadastro e assinatura eletrônica no celular* — termos e contratos com validade jurídica (Lei 14.063/2020 e SHA-256).
• *Agendamento online e check-in por QR Code.*

Sem fidelidade e com *7 dias de teste gratuito* sem cartão de crédito.`,

  `Como prefere continuar?

*1* — Quero testar grátis por 7 dias agora
*2* — Quero falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_1B_EQUIPE = [
  `Excelente! Quando a clínica de terapias cresce em equipe, planilhas e controles soltos começam a gerar choques de sala, evoluções atrasadas e horas perdidas no fechamento de repasses.

O plano *Avançado (R$ 249/mês — até 5 licenças)* é o mais escolhido por clínicas em estruturação:

• *Tudo do Básico* + até 5 profissionais incluídos (licença extra a R$ 49,90/mês)
• *Agenda recorrente com co-terapia e reserva de salas sensoriais*
• *BI de Terapia* — retenção, risco de evasão, fila de espera e auditoria de evoluções pendentes
• *Motor de repasse automático com sigilo RBAC* — regras por terapeuta, convênio ou paciente (cada terapeuta vê só o próprio extrato)
• *WhatsApp integrado por setores*, CRM, DRE gerencial e importação via Excel/CSV

Para eu confirmar o plano exato: *quantos profissionais atendem na sua clínica hoje?* (digite o número)`,
]

export const MSG_FLUXO_1C_REDE = [
  `Para clínicas multidisciplinares com equipe completa e operação com convênios, o *CliniGo Professional (R$ 449/mês — até 30 licenças)* cobre a operação de ponta a ponta:

• *Tudo do Avançado* + até 30 profissionais incluídos em 1 unidade operacional
• *Faturamento TISS completo no padrão ANS* — autorizações prévias, controle de saldo de sessões, lotes XML e gestão de glosas e recursos
• *Check-in biométrico facial multi-superfície* — na sala, totem, webcam ou celular, vinculado às guias TISS para blindar contra glosas
• *Totem de autoatendimento e Painel de TV* com chamada na sala de espera
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
  `Os planos do *CliniGo* são objetivos, sem fidelidade e com atendimentos ilimitados. Todas as assinaturas contemplam 1 unidade operacional, contam com taxa única de implantação e treinamento autônomo pelo Guia de Uso integrado:

------------------
*BÁSICO — R$ 149/mês*
------------------
• 1 licença de profissional | Atendimentos ilimitados
• Agenda recorrente e controle de faltas, reposições e pacotes
• Prontuário por especialidade e planos terapêuticos ABA
• Teleconsulta WebRTC integrada e fila de espera multidisciplinar
• Pré-cadastro, termos eletrônicos (Lei 14.063/2020) e check-in QR Code

------------------
*AVANÇADO — R$ 249/mês* _(Mais escolhido)_
------------------
• Até 5 licenças incluídas
• Tudo do Básico +
• BI de Terapia (retenção, risco de evasão, supervisão e conformidade)
• Motor de repasse automático por regra individual com sigilo RBAC
• WhatsApp integrado por setores, CRM e assinatura ICP-Brasil A1
• DRE gerencial, auditoria de produção e importação via Excel/CSV`,

  `------------------
*PROFESSIONAL — R$ 449/mês*
------------------
• Até 30 licenças incluídas
• Tudo do Avançado +
• Faturamento TISS completo, lotes XML ANS e gestão de glosas
• Check-in biométrico facial multi-superfície vinculado às guias TISS
• Autorizações prévias e controle de saldo de sessões
• Totem de autoatendimento, Painel de TV, NPS, API/Webhooks e SLA 99,5%

_Precisa de mais usuários? Licenças adicionais avulsas custam R$ 49,90/mês._
Detalhes completos em: https://clinigo.app/planos

Para eu indicar o plano ideal para o seu caso: *quantos profissionais atendem na sua clínica hoje?* (digite um número)`,
]

// ========== FLUXO 3 — DEMO ==========
export const MSG_FLUXO_3_DEMO = [
  `A melhor forma de avaliar o CliniGo é vendo na prática com a rotina da sua clínica de terapias.

Você tem *duas opções*:

*A* — *Demonstração guiada com especialista*
Apresentamos os fluxos adaptados às especialidades da sua clínica (ABA, Psicologia, Fono, TO, Psicomotricidade, Fisioterapia ou TISS) e tiramos suas dúvidas ao vivo.

*B* — *Teste grátis imediato por 7 dias*
Crie sua conta em 2 minutos sem cartão de crédito e explore o sistema com sua equipe.

*Qual você prefere?*

*A* — Quero demonstração com especialista
*B* — Quero criar minha conta de teste grátis agora
*0* — Voltar ao menu principal`,
]

// ========== TRIAL ==========
export const MSG_ENVIAR_TRIAL = [
  `O teste do CliniGo é *100% gratuito por 7 dias*, sem cartão de crédito e sem fidelidade.

Crie sua conta agora em menos de 2 minutos:
https://clinigo.app/trial

Você informa apenas nome, e-mail, telefone, CPF/CNPJ, nome da clínica e senha — e já acessa o sistema na hora.`,
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

*A* — Agenda recorrente, co-terapia e reserva de salas sensoriais
*B* — Prontuário por especialidade, planos ABA e sigilo CRP/CRFa/CREFITO
*C* — Motor de repasse automático por profissional, DRE e financeiro
*D* — WhatsApp automático por setores, CRM e teleconsulta WebRTC
*E* — Pré-cadastro no celular (Lei 14.063/2020), biometria facial, Totem e TV
*F* — Faturamento TISS padrão ANS, lotes XML e redução de glosas
*G* — BI de Terapia (retenção, risco de evasão, fila de espera e conformidade)
*H* — Governança LGPD, RBAC/RLS no servidor e importação Excel/CSV

*0* — Voltar ao menu principal`,
]

export const MSG_FUNC_FOOTER = `\n\n*1* — Ver outro módulo
*2* — Testar grátis por 7 dias
*3* — Falar com um especialista
*0* — Voltar ao menu principal`

export const MSG_FUNC_4A = [
  `*Agenda Recorrente, Co-terapia e Salas Sensoriais*

• *Séries flexíveis minuto a minuto:* agendamentos semanais, quinzenais ou mensais com durações reais (40, 45, 50 ou 120 min).
• *Co-terapia nativa:* dois profissionais no mesmo paciente (dupla de terapeutas ou supervisão em sala) sem gerar falso conflito de agenda.
• *Reserva de salas temáticas:* bloqueio físico de Sala Sensorial, AVD ou Sala Motora impedindo choques entre terapeutas.
• *Faltas, reposições e pacotes:* controle de motivo da ausência, créditos de reposição e saldo de sessões integrado à grade.
• *Fila de espera multidisciplinar:* preencha horários liberados rapidamente.

Veja mais: https://clinigo.app/solucoes/clinica-multidisciplinar${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4B = [
  `*Prontuário por Especialidade, Planos ABA e Sigilo Clínico*

• *ABA e Neurodesenvolvimento:* planos terapêuticos, metas de pareamento, critérios de aquisição, níveis de ajuda (independente, gestual, parcial, total) e supervisão.
• *Psicologia (CRP):* evolução estruturada SOAP, histórico comparativo e sigilo rigoroso RBAC/RLS no servidor.
• *Fonoaudiologia (CRFa):* planos por domínio fonológico, pragmático e orofacial com anexos privados criptografados.
• *Terapia Ocupacional (CREFITO):* objetivos de integração sensorial e AVD integrados às salas.
• *Psicomotricidade e Fisioterapia:* catálogo de objetivos psicomotores com gráfico evolutivo automático e avaliação funcional.
• *Assinatura com registro de conselho* e auditoria em tempo real de evoluções pendentes.

Veja todas as especialidades: https://clinigo.app/solucoes${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4C = [
  `*Motor de Repasse por Profissional, DRE e Financeiro*

• *Regras individuais de repasse:* configure valores por terapeuta, contrato, tabela de convênio ou exceção por paciente específico.
• *Apuração automática real:* contabiliza apenas sessões realizadas ou reposições válidas conforme a regra da clínica.
• *Sigilo financeiro (RBAC):* cada terapeuta consulta exclusivamente seu próprio extrato de produção, sem visualizar financeiro geral ou dados de colegas.
• *DRE gerencial e auditoria de produção:* controle completo de receitas, despesas, convênios e fechamento mensal sem planilhas.

Disponível a partir do plano *Avançado (R$ 249/mês)*.${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4D = [
  `*WhatsApp Integrado por Setores, CRM e Teleconsulta WebRTC*

• *Confirmação automática no WhatsApp:* lembretes enviados às famílias e respostas refletidas direto na agenda da clínica.
• *Atendimento por setores e CRM:* organize leads comerciais, recepção e acompanhamento sem perder contatos.
• *Teleconsulta WebRTC nativa:* incluída desde o plano Básico (R$ 149/mês), integrada ao prontuário e à agenda recorrente, sem precisar de Zoom ou Meet.

WhatsApp integrado disponível a partir do plano *Avançado (R$ 249/mês)*.${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4E = [
  `*Pré-cadastro Online, Assinatura Lei 14.063/2020 e Biometria Facial*

• *Pré-cadastro e termos no celular:* a família preenche ficha, envia carteirinha e assina termos LGPD e contratos pelo link ou QR Code (sem login), com IP, data/hora e hash SHA-256.
• *Check-in biométrico facial multi-superfície:* validação do paciente ou responsável no dispositivo da sala, totem, webcam da terapeuta ou link temporário no celular (sem derrubar o acesso do computador).
• *Totem de autoatendimento e Painel de TV:* emissão de senhas e chamadas na sala de espera. _(Plano Professional)_${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4F = [
  `*Faturamento TISS Padrão ANS e Redução de Glosas*

• *Autorizações prévias e saldo de sessões:* valide códigos TUSS, vigência da senha e saldo disponível antes da realização da sessão.
• *Dupla comprovação de presença:* vincule a biometria facial do paciente ou responsável diretamente às guias TISS para evitar glosas por contestação de comparecimento.
• *Lotes XML no padrão ANS:* geração estruturada e controle completo de retornos, glosas e prazos de recurso.

Disponível no plano *Professional (R$ 449/mês — até 30 licenças)*.
Detalhes: https://clinigo.app/solucoes/faturamento-tiss-terapias${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4G = [
  `*BI de Terapia e Conformidade Clínica*

• *Conformidade de evoluções em tempo real:* a coordenação vê imediatamente quem atendeu e ainda não fechou a evolução, sem violar o sigilo clínico dos prontuários.
• *Risco de evasão e retenção:* identifique faltas consecutivas e quedas de aderência antes que a família abandone o tratamento.
• *Carga de trabalho, receita por modalidade e NPS:* indicadores objetivos para tomar decisões de escala e contratação.

Disponível a partir do plano *Avançado (R$ 249/mês)*.${MSG_FUNC_FOOTER}`,
]

export const MSG_FUNC_4H = [
  `*Governança LGPD, RBAC/RLS no Servidor e Migração*

• *Isolamento real no banco de dados (RBAC + RLS):* recepção, coordenação, financeiro, terapeutas e perfil Somente Leitura enxergam estritamente o que compete à sua função.
• *Sessão única auditada:* impede compartilhamento indevido de senhas entre dispositivos e mantém trilha completa de auditoria LGPD.
• *Documentos privados:* prontuários e anexos isolados por clínica com URLs temporárias criptografadas e exportação para portabilidade.
• *Importação em lote via Excel e CSV:* traga cadastros da sua planilha ou sistema anterior com validação prévia. _(Avançado+)_${MSG_FUNC_FOOTER}`,
]

// ========== RESPOSTAS DIRETAS POR ESPECIALIDADE / INTENÇÃO (PERGUNTAS LIVRES) ==========
export const MSG_INTENT_ABA = [
  `Sim! O CliniGo tem um módulo dedicado para *clínicas ABA e Neurodesenvolvimento (TEA)*:

• Planos terapêuticos ABA com metas de pareamento, critérios de aquisição e níveis de ajuda (independente, gestual, parcial ou total).
• Agenda recorrente com *co-terapia* (dupla de terapeutas e supervisão em sala sem conflito).
• Painel de conformidade de evoluções para a supervisão acompanhar pendências em tempo real.
• Faturamento *TISS ANS* e *check-in por biometria facial* vinculado às guias para reduzir glosas em alta frequência.

Veja a página completa: https://clinigo.app/solucoes/clinica-aba

O que você prefere agora?
*1* — Testar grátis por 7 dias
*2* — Ver planos e preços
*3* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_INTENT_PSICO = [
  `Sim! O CliniGo foi estruturado respeitando integralmente a rotina e o *sigilo ético da Psicologia (CRP e LGPD)*:

• *Isolamento real no servidor (RBAC + RLS):* apenas o psicólogo responsável visualiza suas evoluções; recepção, financeiro e outros colegas não têm acesso.
• Evolução estruturada *SOAP*, metas terapêuticas e assinatura com registro de CRP.
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

• *Fonoaudiologia (CRFa):* planos por domínio fonológico, pragmático e orofacial + anexos privados criptografados para áudios e relatórios.
• *Terapia Ocupacional (CREFITO):* planos de integração sensorial e AVD + *reserva de Sala Sensorial* bloqueando choques de horário.
• *Psicomotricidade:* catálogo de objetivos psicomotores, capa clínica e *gráfico evolutivo automático*.
• *Fisioterapia (CREFITO):* avaliação funcional, controle de pacotes/reposições, agenda por sala e TISS.
• Além de *Psicologia (CRP)* e *ABA / Neurodesenvolvimento*, tudo com co-terapia e repasse individual.

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
• *Biometria facial multi-superfície* (sala, totem, webcam da terapeuta ou link temporário no celular — sem derrubar o login do computador) como dupla comprovação de presença para operadoras.
• Geração de guias e lotes XML ANS + gestão completa de glosas e recursos.
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
*B* — Prontuário por especialidade, planos ABA e sigilo CRP/CRFa/CREFITO
*C* — Automatizar financeiro e repasse por profissional sem planilhas
*D* — Faturamento TISS (convênios) e redução de glosas com biometria facial
*E* — Outro assunto

*0* — Voltar ao menu principal`,
]

// ========== OBJEÇÕES ==========
export const MSG_OBJECAO_PRECO = [
  `Faz todo sentido avaliar o retorno com calma.

Na prática de clínicas de terapias, basta evitar algumas faltas mensais com a confirmação automática no WhatsApp, eliminar horas fechando repasses na planilha ou evitar uma única glosa de convênio TISS para o CliniGo se pagar já no primeiro mês.

Os planos começam em *R$ 149/mês* (sem fidelidade), e você tem *7 dias gratuitos sem cartão de crédito* para testar com a sua própria rotina antes de decidir.

Como prefere seguir?

*1* — Testar grátis por 7 dias agora
*2* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_OBJECAO_LGPD = [
  `Privacidade e sigilo clínico são pilares estruturais do CliniGo:

• *RBAC + RLS no servidor e banco de dados:* cada terapeuta acessa exclusivamente seus próprios pacientes — recepção, financeiro e colegas não visualizam prontuários sigilosos (CRP, CRFa e CREFITO).
• *Sessão única auditada:* bloqueia compartilhamento indevido de login e registra trilha completa de auditoria LGPD.
• *Documentos privados:* armazenamento isolado por clínica com URLs temporárias criptografadas e exportação para portabilidade.
• *Assinatura eletrônica Lei 14.063/2020:* termos LGPD e contratos com data/hora, IP e hash SHA-256.

Como prefere continuar?

*1* — Testar grátis por 7 dias
*2* — Falar com um especialista
*0* — Voltar ao menu principal`,
]

export const MSG_INATIVIDADE = [
  `Ainda estou por aqui caso precise!

Se quiser continuar de onde paramos, é só responder por esta conversa.
O *teste grátis de 7 dias sem cartão* está disponível em: https://clinigo.app/trial

Até breve — _Clin, Assistente CliniGo_`,
]

export const MSG_ENVIAR_INFO_ENTERPRISE = [
  `Sem problemas! Aqui está o resumo do *CliniGo Professional (R$ 449/mês)* para equipes multidisciplinares maiores:

• Até 30 licenças incluídas em 1 unidade operacional (licenças extras avulsas a R$ 49,90/mês)
• Workspaces nativos para Psicologia, ABA, Fonoaudiologia, TO, Psicomotricidade e Fisioterapia
• Faturamento TISS padrão ANS, lotes XML e gestão de glosas
• Check-in biométrico facial multi-superfície, Totem e Painel de TV
• BI de Terapia, motor de repasse com sigilo RBAC, API/Webhooks e SLA 99,5%

Compare todos os detalhes em https://clinigo.app/comparativo ou inicie seu teste gratuito em https://clinigo.app/trial.

_Clin, Assistente CliniGo_`,
]

// ========== DORES MAPEADAS ==========
export const DOR_MAP: Record<string, string> = {
  'a': 'Agenda recorrente, co-terapia, salas e redução de faltas',
  'b': 'Prontuário por especialidade, planos ABA e sigilo CRP/CRFa/CREFITO',
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

Você terá *7 dias completos sem cartão de crédito* para testar agenda recorrente, workspaces por especialidade (Psicologia, ABA, Fono, TO, Psicomotricidade e Fisioterapia), prontuário com sigilo RBAC, pré-cadastro e repasses.

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

Vi que você conversou conosco sobre o *CliniGo* para sua clínica de terapias. Se ainda ficou alguma dúvida sobre especialidades, planos ou implantação, posso te conectar agora com um especialista sem compromisso:

*1* — Falar com um especialista
*2* — Criar minha conta de teste grátis (7 dias)
*0* — Ver o menu novamente`,
]

// ========== FLUXO 6 — PROBLEMA DE ACESSO / SUSPENSÃO / BLOQUEIO (PRESERVADO) ==========
export const MSG_FLUXO_6_BLOQUEIO_MENU = [
  `*Central de Acesso e Situação Cadastral — CliniGo*

Identificamos que seu contato é sobre *problema de acesso, suspensão ou bloqueio de conta*.

Escolha abaixo a opção correspondente ao seu caso (digite o número):

*1* — Problema de acesso (não consigo entrar no sistema)
*2* — Suspensão / Bloqueio da clínica (consultar motivo)
*3* — Sou da direção/financeiro e quero regularizar a mensalidade
*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_6_PROBLEMA_ACESSO = [
  `*Diagnóstico Automático de Acesso — CliniGo*

Informamos que a restrição de acesso que aparece na sua tela *não é um erro no seu celular, computador ou senha*.

A conta da sua clínica foi *bloqueada/suspensa automaticamente porque está com a mensalidade atrasada* junto ao CliniGo.

• Enquanto a fatura mensal estiver em aberto, o login de todos os profissionais, terapeutas, recepção, agenda, evoluções e emissão de PDFs permanece bloqueado.
• Todos os prontuários e evoluções já registrados permanecem salvos e protegidos.
• Orientamos que entre em contato diretamente com a direção/administração da sua clínica para que regularizem a mensalidade em atraso.

Deseja consultar outra opção?

*2* — Ver detalhes sobre a suspensão / bloqueio da clínica
*3* — Sou da direção/financeiro e quero quitar a mensalidade atrasada
*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_6_MOTIVO_BLOQUEIO = [
  `*Motivo do Bloqueio / Suspensão da Clínica — CliniGo*

Informamos que a clínica encontra-se com o acesso *bloqueado e suspenso por inadimplência (mensalidade atrasada)*.

• Todos os logins vinculados à unidade (profissionais, equipe clínica, recepção e administração) ficam suspensos automaticamente até a confirmação do pagamento.
• Nenhuma evolução ou prontuário foi perdido — os dados permanecem sob guarda segura.
• Assim que a administração da clínica quitar a mensalidade vencida, o acesso de toda a equipe é restabelecido imediatamente.

Escolha uma opção caso deseje prosseguir:

*1* — Ver orientação para profissionais / equipe da clínica
*3* — Sou responsável financeiro e quero quitar a mensalidade para desbloquear
*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_6_GESTOR_FINANCEIRO = [
  `*Regularização Financeira — Desbloqueio de Clínica*

O acesso de toda a sua clínica (agenda, prontuários, evoluções e relatórios em PDF) encontra-se *bloqueado/suspenso por falta de pagamento da mensalidade em atraso*.

Assim que a fatura em aberto for quitada, a liberação do acesso de todos os profissionais e da recepção ocorre imediatamente.

O que você deseja fazer agora?

*1* — Falar com o Financeiro CliniGo para pagar a mensalidade atrasada e desbloquear
*2* — Voltar às informações sobre o bloqueio
*0* — Voltar ao menu principal`,
]

export const MSG_FLUXO_6_TRANSFERENCIA_FINANCEIRO = [
  `*Solicitação de Regularização Financeira Registrada*

Encaminhamos seu atendimento para o setor financeiro do CliniGo referente ao *pagamento da mensalidade em atraso e desbloqueio da clínica*.

Por favor, aguarde um instante ou envie o comprovante de quitação nesta conversa para agilizar a liberação do acesso.`,
]
