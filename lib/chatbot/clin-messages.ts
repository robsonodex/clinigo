/**
 * Clin Chatbot — Templates de Mensagens por Step
 * 
 * Cada step mapeia para um array de mensagens.
 * No WhatsApp, cada item do array é enviado separadamente com delay de 1.5s.
 * No Web, são renderizados como bolhas sequenciais.
 */

// ========== MENU INICIAL ==========
export const MSG_MENU = [
  `👋 Olá! Seja bem-vindo(a) ao *CliniGo!*

Sou o *Clin*, seu assistente virtual. Estou aqui pra te mostrar como transformar a gestão da sua clínica de uma vez por todas. 🏥✨

Me diz, o que você quer explorar hoje?

1️⃣ — O que é o CliniGo?
2️⃣ — Planos e preços
3️⃣ — Quero uma demonstração gratuita
4️⃣ — Conhecer as funcionalidades
5️⃣ — Falar com um especialista agora

_(Responda com o número da opção desejada)_ 😊`
]

// ========== FLUXO 1 — O QUE É O CLINIGO ==========
export const MSG_FLUXO_1_INTRO = [
  `🚀 *O CliniGo é uma plataforma completa de gestão para clínicas e consultórios.* Em vez de usar 3, 4 sistemas diferentes pra agenda, prontuário, financeiro e WhatsApp... você tem *tudo em um único lugar.*

Funciona para:
🩺 Médicos solo em consultório particular
🏥 Clínicas multiprofissionais (psicólogos, fisioterapeutas, fonoaudiólogos...)
🧠 Espaços terapêuticos e centros de reabilitação
🏢 Redes de clínicas com gestão centralizada

Pensa assim: *você cuida dos pacientes, o CliniGo cuida de tudo o mais.* 💙`,

  `Mas deixa eu te perguntar uma coisa pra entender melhor o seu caso...

*Qual é o seu perfil?*

A — Sou médico(a) ou terapeuta solo (atendo sozinho)
B — Tenho uma clínica com equipe (2 a 10 profissionais)
C — Tenho uma clínica maior ou rede (mais de 10 profissionais)`
]

export const MSG_FLUXO_1A_SOLO = [
  `Perfeito! Pra quem atende sozinho, o CliniGo já vai fazer uma diferença enorme. 🎯

Com o plano *Básico* (de apenas *R$ 99/mês*), você terá:

📅 *Agenda inteligente* — Sem mais papelada ou planilha. Agendamentos online, bloqueio de horários, lembretes automáticos para o paciente via WhatsApp.

📋 *Prontuário eletrônico* — Evolução clínica com modelos SOAP, CIF e DAP. Assinatura digital com certificado ICP-Brasil.

💰 *Financeiro básico* — Controle de receitas, convênios, fechamento mensal.

🔒 *100% seguro e em conformidade com a LGPD.*

Tudo isso por menos do que você gasta numa consulta. 😄`,

  `O que você prefere agora?

✅ *1* — Quero testar grátis por 7 dias
💬 *2* — Quero falar com um especialista
🔙 *0* — Voltar ao menu principal`
]

export const MSG_FLUXO_1B_EQUIPE = [
  `Ótimo! Pra clínicas com equipe, o segredo é a *organização centralizada* — e é exatamente nisso que o CliniGo brilha. ✨

O plano *Avançado* (R$ 249/mês, até 5 profissionais) foi feito pra você:

📅 *Agenda por profissional* — Cada médico ou terapeuta tem sua agenda, mas você controla tudo de um só painel.
📱 *WhatsApp integrado* — Lembretes automáticos, confirmação de presença, avisos de reagendamento — sem digitar nada na mão.
💊 *Teleconsulta nativa* — Vídeo-chamada direto na plataforma, sem Zoom, sem Meet.
💰 *Repasse profissional* — Calcula automaticamente quanto cada médico gerou e o repasse. Fim das planilhas!
📊 *DRE completo* — Demonstrativo de resultado mensal com gráficos e comparativo.

Posso te fazer uma pergunta rápida? *Quantos profissionais atendem na sua clínica hoje?*

Assim consigo indicar o plano _exato_ pra você. 😊`
]

export const MSG_FLUXO_1C_REDE = [
  `Muito legal! Pra clínicas com essa estrutura, você precisa de algo que realmente *escale* com você. 💪

🔷 *Professional (R$ 449/mês, até 30 profissionais)*
→ Faturamento TISS completo (guias, lotes, glosas — padrão ANS)
→ Check-in facial (biometria na recepção)
→ Totem de autoatendimento para pacientes
→ Painel de TV na recepção com fila em tempo real
→ API e Webhooks para integração com outros sistemas

🔶 *Enterprise (R$ 699+/mês, profissionais ilimitados)*
→ Gestão de múltiplas clínicas num único painel
→ Analytics global entre unidades
→ SLA garantido de 99,5% de uptime
→ Suporte prioritário

Você opera em *quantas unidades* hoje?`
]

export const MSG_FLUXO_1C_RECOMENDACAO_ENTERPRISE = [
  `Com essa estrutura, essa decisão merece uma conversa mais detalhada com alguém da nossa equipe. 🤝

Posso te conectar com um especialista agora?

✅ *1* — Sim, quero falar com um especialista
🕐 *2* — Agora não, me manda mais informações
🔙 *0* — Voltar ao menu principal`
]

// ========== FLUXO 2 — PLANOS ==========
export const MSG_FLUXO_2_PLANOS = [
  `💰 Vou te mostrar os planos de forma bem direta. O CliniGo tem *4 opções* — e tem uma pra cada momento da sua clínica:

━━━━━━━━━━━━━━━━━━
🟢 *BÁSICO — R$ 99/mês*
━━━━━━━━━━━━━━━━━━
👤 1 profissional | 👥 até 200 pacientes
✔️ Agenda completa
✔️ Prontuário eletrônico
✔️ Financeiro e convênios
✔️ Fechamento mensal
✔️ Estoque básico

━━━━━━━━━━━━━━━━━━
🔵 *AVANÇADO — R$ 249/mês*
━━━━━━━━━━━━━━━━━━
👤 até 5 profissionais | 👥 Ilimitados
✔️ Tudo do Básico +
✔️ WhatsApp integrado (lembretes automáticos)
✔️ Teleconsulta nativa
✔️ Repasse profissional + DRE
✔️ CRM de pacientes
✔️ Check-in por QR Code`,

  `━━━━━━━━━━━━━━━━━━
🟣 *PROFESSIONAL — R$ 449/mês*
━━━━━━━━━━━━━━━━━━
👤 até 30 profissionais | 👥 Ilimitados
✔️ Tudo do Avançado +
✔️ Faturamento TISS completo (ANS 3.05.00)
✔️ Check-in facial (biometria)
✔️ Totem de autoatendimento
✔️ Painel de TV (fila de espera)
✔️ API e Webhooks

━━━━━━━━━━━━━━━━━━
🟠 *ENTERPRISE — A partir de R$ 699/mês*
━━━━━━━━━━━━━━━━━━
👤 Profissionais ilimitados
✔️ Tudo do Professional +
✔️ Múltiplas clínicas / rede
✔️ Analytics global centralizado
✔️ SLA 99,5% garantido + Suporte prioritário

Pra eu te indicar *exatamente* qual faz mais sentido pro seu caso — *quantos profissionais atendem na sua clínica?* 🤔`
]

// ========== FLUXO 3 — DEMO ==========
export const MSG_FLUXO_3_DEMO = [
  `🎉 Ótima escolha! A melhor forma de conhecer o CliniGo é colocar a mão na massa.

Você tem *duas opções de demonstração:*

🖥️ *A) Demonstração guiada com especialista*
Um profissional do CliniGo te mostra o sistema ao vivo, adaptado ao seu tipo de clínica. Você faz perguntas em tempo real.

🚀 *B) Acesso de teste direto (7 dias grátis)*
Cria sua conta agora mesmo, em 2 minutos, e explora tudo sem compromisso. Sem cartão de crédito.

*Qual prefere?*

A — Quero demonstração com especialista
B — Quero criar minha conta de teste agora`
]

// ========== TRIAL ==========
export const MSG_ENVIAR_TRIAL = [
  `🚀 O teste é *100% gratuito por 7 dias* — acesso completo à plataforma, sem precisar de cartão.

Clique no link abaixo e crie sua conta em menos de 2 minutos:

👉 *https://clinigo.app/trial*

Você vai preencher apenas: nome, e-mail, telefone, nome da clínica e uma senha. Depois do cadastro, você já entra direto no sistema. 💪`
]

export const MSG_TRIAL_FOLLOWUP = [
  `Conseguiu criar a conta? 😊

Se tiver qualquer dúvida durante o teste, é só me chamar aqui!

✅ *1* — Sim, entrei! Mas tenho dúvidas sobre como usar
💬 *2* — Tive um problema no cadastro`
]

// ========== FLUXO 4 — FUNCIONALIDADES ==========
export const MSG_FLUXO_4_FUNCIONALIDADES = [
  `🛠️ O CliniGo tem mais de 30 módulos integrados. Me conta: *o que é mais importante pra você agora?*

📅 *A* — Agendamento e agenda
📋 *B* — Prontuário eletrônico
💰 *C* — Financeiro e repasse
📱 *D* — WhatsApp e teleconsulta
🔵 *E* — Recepção, check-in e TV
📊 *F* — Faturamento TISS (convênios)
📦 *G* — Estoque
🤖 *H* — Automações e relatórios`
]

export const MSG_FUNC_FOOTER = `\n\n🔁 *1* — Ver outra funcionalidade
🚀 *2* — Testar grátis agora
💬 *3* — Falar com especialista
🔙 *0* — Voltar ao menu principal`

export const MSG_FUNC_4A = [
  `📅 O módulo de *Agendamento do CliniGo* é um dos mais completos do mercado:

✅ *Agenda visual por profissional* — Semana inteira de cada médico num calendário limpo.
✅ *Agendamento online* — Pacientes agendam pelo portal, direto pelo celular.
✅ *Anti-overbooking* — Bloqueia automaticamente horários já ocupados em tempo real.
✅ *Reagendamento por link* — Paciente clica e reagenda sozinho, sem precisar ligar.
✅ *Consultas recorrentes* — Sessões semanais ou quinzenais com um clique.
✅ *Lembretes automáticos via WhatsApp* — Enviados 24h antes. Chega de falta!
✅ *Encaixe rápido (walk-in)* — Fila de espera em tempo real para pacientes sem agendamento.
✅ *QR Code por consulta* — Cada agendamento gera um QR único para check-in.${MSG_FUNC_FOOTER}`
]

export const MSG_FUNC_4B = [
  `📋 O *Prontuário Eletrônico* do CliniGo: rápido, seguro e 100% digital.

✅ *Modelos SOAP, CIF e DAP* — Escolha o modelo ideal para sua especialidade.
✅ *Editor rico de texto* — Formata o prontuário com liberdade de um editor profissional.
✅ *Assinatura digital ICP-Brasil* — Juridicamente válida.
✅ *Auto-save a cada 30 segundos* — Nunca perde uma evolução.
✅ *Templates personalizados* — Crie seus próprios modelos com campos da sua especialidade.
✅ *Sigilo clínico* — Cada terapeuta vê apenas seus próprios pacientes.
✅ *Planos terapêuticos* — Metas, objetivos e evolução ao longo do tempo.
✅ *Exportação em PDF assinado* — Laudos e relatórios prontos.${MSG_FUNC_FOOTER}`
]

export const MSG_FUNC_4C = [
  `💰 O módulo *Financeiro* fecha o ciclo completo — do agendamento ao dinheiro no bolso.

✅ *Controle de receitas e despesas* — Tudo numa tela só.
✅ *Fechamento mensal* — 6 indicadores: receita, despesa, resultado, sessões, ticket médio, pendências.
✅ *Comparativo com mês anterior* — Veja se a clínica cresceu.
✅ *Gestão de convênios* — Operadoras, planos, tabelas e controle de pagamentos.
✅ *Repasse profissional automático* — Calcula o quanto é de cada médico. Chega de planilha! _(Avançado+)_
✅ *DRE completo* — Demonstrativo de Resultado com gráficos. _(Avançado+)_
✅ *Reembolso ao paciente* — Documentação para convênios de reembolso.
✅ *Conciliação bancária* — Cruza lançamentos com extratos.${MSG_FUNC_FOOTER}`
]

export const MSG_FUNC_4D = [
  `📱 Duas das funcionalidades que os clientes _mais amam_ no CliniGo. 🔥

━━━━ 💬 *WhatsApp Integrado* ━━━━
✅ Lembretes automáticos 24h antes da consulta
✅ Confirmação de presença do paciente
✅ Notificação de reagendamento ou cancelamento
✅ Aviso de falta e oferta de reposição automática
✅ Tudo isso sem você mandar uma mensagem na mão.

━━━━ 🎥 *Teleconsulta Nativa* ━━━━
✅ Vídeo-chamada direto na plataforma — sem Zoom, sem Meet
✅ Link enviado automaticamente pro paciente via WhatsApp
✅ Paciente entra sem precisar criar conta
✅ Chat em tempo real durante a consulta
✅ Compartilhamento de tela

Disponível a partir do *Plano Avançado (R$ 249/mês).* 💙${MSG_FUNC_FOOTER}`
]

export const MSG_FUNC_4E = [
  `🖥️ O CliniGo transforma completamente a *experiência de chegada do paciente.*

✅ *Painel da Recepção* — Visão completa: quem chegou, quem aguarda, quem está em atendimento.
✅ *Check-in por QR Code* — Paciente escaneia e já entra na fila, sem falar com ninguém.
✅ *Totem de Autoatendimento* — Tablet na recepção onde o paciente faz check-in sozinho. _(Professional+)_
✅ *Check-in Facial* — Reconhecimento por biometria na entrada. Sem ficha, sem senha. _(Professional+)_
✅ *Painel de TV* — Fila em tempo real na sala de espera, chamando pacientes pelo nome. _(Professional+)_
✅ *Triagem pré-consulta* — Preenchimento digital antes de entrar na sala.${MSG_FUNC_FOOTER}`
]

export const MSG_FUNC_4F = [
  `📊 O módulo *TISS do CliniGo* é o mais completo para clínicas que atendem convênios.

✅ *Guias TISS* — SP/SADT, consulta e internação conforme padrão *ANS 3.05.00*
✅ *Lotes para operadoras* — Agrupa guias e envia em lote
✅ *Validação XSD* — Valida o XML antes de enviar, evitando rejeições
✅ *Gestão de glosas* — Registra e contesta glosas com histórico completo
✅ *Análise de risco de glosa* — Aponta procedimentos com maior risco antes de enviar
✅ *Retornos das operadoras* — Importa XMLs e reconcilia automaticamente
✅ *Assinatura digital dos lotes* — Certificado ICP-Brasil nos XMLs
✅ *Dashboard TISS* — Guias, lotes, valores pendentes e histórico

Disponível a partir do *Plano Professional (R$ 449/mês).*

Se você ainda faz isso manualmente, o CliniGo vai te economizar _horas por semana._ ⏱️${MSG_FUNC_FOOTER}`
]

export const MSG_FUNC_4G = [
  `📦 O módulo de *Estoque* do CliniGo foi feito pra clínicas que gerenciam insumos e materiais.

✅ *Cadastro de produtos* — Com categorias, códigos e fornecedores
✅ *Controle FEFO* — First Expired, First Out — alerta de produtos próximos ao vencimento
✅ *Movimentações* — Entradas, saídas e ajustes com histórico completo
✅ *Badges de validade* — Visualiza de imediato quais itens estão vencendo
✅ *Importação em lote* — Cadastra vários produtos de uma vez via planilha
✅ *Relatórios de estoque* — Inventário atual, consumo por período e projeção

Disponível a partir do *Plano Básico.*${MSG_FUNC_FOOTER}`
]

export const MSG_FUNC_4H = [
  `🤖 *Automações e Relatórios* — o CliniGo trabalha pra você mesmo quando você não está olhando.

✅ *Regras de automação configuráveis* — "Se o paciente faltou 3 vezes, enviar follow-up automático"
✅ *Lembretes automáticos de consulta* — Via WhatsApp 24h antes, sem intervenção manual
✅ *Cancelamento automático de inadimplentes* — Cancela agendamentos não pagos após prazo configurável
✅ *Controle de faltas* — Dashboard com relatório de ausências por paciente e período
✅ *Relatórios completos* — Produção por profissional, receita por convênio, ticket médio, pacientes ativos/inativos
✅ *Exportação* — Todos os relatórios em Excel e PDF
✅ *Importação em lote* — Traz pacientes e agendamentos de outros sistemas via CSV/Excel${MSG_FUNC_FOOTER}`
]

// ========== FLUXO 5 — COLETA DE DADOS ==========
export const MSG_FLUXO_5_NOME = [
  `💙 Vou te conectar com um dos nossos especialistas agora.

Antes de transferir, me conta rapidinho:

*Qual é o seu nome?*`
]

export const MSG_FLUXO_5_CLINICA = [
  `*Qual é o nome da sua clínica?*`
]

export const MSG_FLUXO_5_NUM = [
  `*Quantos profissionais de saúde atendem na clínica?*`
]

export const MSG_FLUXO_5_DOR = [
  `*Qual é a sua principal dor hoje?* (escolha a que mais te representa)

A — Organizar a agenda e reduzir faltas
B — Controlar o financeiro e o repasse
C — Digitalizar o prontuário
D — Faturamento de convênios (TISS)
E — Outro assunto`
]

// ========== OBJEÇÕES ==========
export const MSG_OBJECAO_PRECO = [
  `Entendo! Essa é uma decisão importante. 🤝

Deixa eu colocar assim: *quanto você perde por mês* com agendamentos perdidos, pacientes que esquecem a consulta e horas em planilha?

A maioria das clínicas recupera *o custo do plano já na primeira semana* só com os lembretes automáticos de WhatsApp — que reduzem faltas em até 40%.

Mas eu entendo que antes de decidir, você quer ter certeza. Por isso o teste de *7 dias é totalmente gratuito* — você usa tudo, sem compromisso. 💙

Quer começar o teste ou prefere falar com um especialista?

✅ *1* — Testar grátis agora
💬 *2* — Falar com especialista
🔙 *0* — Voltar ao menu principal`
]

export const MSG_OBJECAO_LGPD = [
  `🔒 Segurança é uma das nossas maiores prioridades.

✅ *LGPD 100%* — Consentimentos, exclusão e exportação de dados conforme a lei
✅ *Criptografia AES-256* — Todos os arquivos armazenados criptografados
✅ *Row Level Security* — Cada clínica acessa apenas seus próprios dados
✅ *Autenticação multifator (MFA)* — Camada extra de proteção no login
✅ *Auditoria completa* — Registro de toda ação: quem acessou, o que alterou, quando
✅ *Infraestrutura Vercel + Supabase* — Data centers de alto nível com redundância

Pode confiar. 💙

*Mais alguma dúvida?*

✅ *1* — Quero testar grátis
💬 *2* — Falar com especialista
🔙 *0* — Voltar ao menu principal`
]

export const MSG_INATIVIDADE = [
  `Ei, ainda estou por aqui! 😊

Se quiser continuar de onde paramos, é só me chamar.

O *teste grátis de 7 dias* está te esperando:

👉 *https://clinigo.app/trial*

Até breve! 💙 — _Clin, Assistente CliniGo_`
]

export const MSG_ENVIAR_INFO_ENTERPRISE = [
  `Sem problemas! 😊

Aqui está um resumo do que o *CliniGo Enterprise* oferece:

🏢 Gestão centralizada de múltiplas clínicas
📊 Analytics global entre unidades
🔒 SLA 99,5% garantido
📞 Suporte prioritário com gerente de conta dedicado
🔗 API/Webhooks para integração com ERP e outros sistemas

Quando quiser conversar, é só me chamar aqui ou acessar:

👉 *https://clinigo.app/trial*

💙 — _Clin, Assistente CliniGo_`
]

// ========== DORES MAPEADAS ==========
export const DOR_MAP: Record<string, string> = {
  'a': 'Organizar a agenda e reduzir faltas',
  'b': 'Controlar o financeiro e o repasse',
  'c': 'Digitalizar o prontuário',
  'd': 'Faturamento de convênios (TISS)',
  'e': 'Outro assunto',
}

// ========== SAUDAÇÕES E FALLBACKS ==========
export const MSG_SAUDACAO_ACOLHIMENTO = [
  `👋 Olá! Que bom falar com você! 😊

Eu sou o *Clin*, o assistente virtual do *CliniGo*. Estou aqui para te ajudar a automatizar e organizar a gestão da sua clínica de ponta a ponta.

Para começarmos, escolha um dos assuntos abaixo digitando o número correspondente:`,
  ...MSG_MENU
]

export const MSG_FALLBACK_SIMPATICO = [
  `🤔 Hum, não consegui entender essa opção. Mas não se preocupe! 😊

Escolha uma das opções abaixo digitando o número correspondente para que eu possa te guiar:`,
  ...MSG_MENU
]
