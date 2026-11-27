# Documentação de Funcionalidades — CliniGo

> **Finalidade deste documento:** Catálogo funcional completo, atualizado e objetivo de **todas** as funcionalidades reais em produção no **CliniGo**, organizado módulo por módulo e item por item.  
> **Uso estratégico:** Documento de referência oficial para análise comparativa de mercado (benchmarking), evolução de roadmap e avaliação assistida por outras IAs.  
> **Regra de manutenção:** Atualizado obrigatoriamente ao final de **toda** nova implantação, melhoria ou correção funcional (Protocolo Global de Execução CliniGo v6.0 — Seção 17).  
> **Última atualização:** 27/11/2026

---

## 1. Posicionamento, Escopo e Regras Comerciais (Contexto para Benchmarking)

- **Categoria do produto:** Plataforma SaaS Healthtech all-in-one (Web + PWA Mobile), especializada em **clínicas de terapias multidisciplinares** (Psicologia, Intervenção Precoce / ABA, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia) e clínicas médicas/ambulatoriais no Brasil.
- **Modelo operacional:** Multi-clínica (multi-tenant com isolamento rigoroso por `clinic_id` e RLS), **100% White-Label** (identidade da própria clínica em portais, relatórios, PDFs e mensagens).
- **Planos comerciais ativos:**
  - **Básico:** R$ 149,00/mês (1 licença)
  - **Avançado:** R$ 249,00/mês (até 5 licenças)
  - **Professional:** R$ 449,00/mês (até 30 licenças)
  - **Licença avulsa adicional:** R$ 49,90/mês por usuário excedente
  - **Unidades:** 1 única unidade operacional por assinatura
  - **Implantação:** Taxa única de implantação e configuração inicial
  - **Treinamento:** 100% autônomo pelo Guia de Ajuda Integrado (`/dashboard/help` e atalhos contextuais `?`), sem aulas ou treinamento ao vivo
- **Exclusões explícitas de escopo (o que o CliniGo NÃO faz por decisão de produto):**
  - Não realiza controle de **caixa físico**, movimentação de **dinheiro em espécie** nem emissão de **nota fiscal**.
  - Não utiliza evolução clínica por voz com IA (decisão explícita de produto).

---

## 2. Resumo Executivo do Ecossistema (14 Pilares · 80+ Funcionalidades em Produção)

| Pilar | Foco Principal | Funcionalidades-Chave |
|---|---|---|
| **1. Núcleo Clínico, PEI, ABA & Psicomotricidade** | Evolução, protocolos e dados clínicos | 6 especialidades (456+ objetivos), Modo Tatame DTT/NET, curvas de aprendizagem, domínio automático, Biblioteca Visual 55 objetivos A–K + PDF, Relatório Renovação 1-clique |
| **2. Experiência da Família, Escola & Paciente** | Engajamento e transparência LGPD | CliniGo Família sem app/senha, atividades em casa com confirmação dos pais, retorno estruturado ao prontuário, link Escola/Neuropediatra, Portal do Paciente |
| **3. Agenda, Recorrência, Co-Terapia & Teleconsulta** | Gestão do tempo clínico | Agenda geral e individual, séries recorrentes, co-terapia simultânea, controle de faltas/reposições/pacotes, sala virtual + sala instantânea |
| **4. Recepção, Totem, Biometria Facial & Painel TV** | Experiência presencial e prova de presença | Check-in por biometria facial e QR Code, fluxo 4 ou 2 etapas configurável, alternância Particular/Convênio, Totem, Painel de TV |
| **5. Gestão de Pacientes & Produtividade (Menos Cliques)** | Velocidade no uso diário | Busca Global `Ctrl+K` com ações diretas por paciente, ações rápidas visíveis na lista, diretório A–Z, Ficha 360º, exclusão LGPD |
| **6. Convênios & Faturamento TISS-ANS** | Receita e prevenção de glosas | Operadoras/TUSS, elegibilidade, elaboração `Ctrl+L`, Escudo Anti-Glosa, Score de Saúde do Lote (0–100%), XML ANS, Dry-Run de retorno, Glosas 3 Níveis, Recursos C1–C8, BI de Perdas |
| **7. Financeiro, Repasses & Controladoria** | Margem e transparência de repasse | Lançamentos, fechamentos, créditos, Folha de Repasse (Produção vs Recebimento), Meu Repasse Ao Vivo (Liberado vs Aguardando Evolução), DRE, Metas, LTV, Reembolsos |
| **8. Inteligência Clínica & Gestão Terapêutica** | Coordenação e retenção | Radar Operacional, Fila de Espera com WhatsApp dinâmico, Encaminhamentos, Supervisão, Conformidade de Evoluções, Aderência, Retenção, Risco de Evasão, Desfechos, NPS |
| **9. Contratos Eletrônicos, Documentos & Termos** | Segurança jurídica sem papel | Modelos com variáveis e autopreenchimento, assinatura eletrônica por link, gestão documental com extração de texto, termos legais |
| **10. Comunicação, WhatsApp Multi-Setor & CRM** | Relacionamento e conversão | WhatsApp por setor via QR Code, Chat interno multi-tenant, FluxoMed CRM Kanban, Notificações, Automações |
| **11. Presença Institucional e Captação Online** | Aquisição e posicionamento | Landing page comercial (`clinigo.app`), agendamento online direto por clínica (`/[clinic_slug]/agendar`), páginas de soluções por especialidade e blog |
| **12. Gestão Operacional, Estoque & Onboarding** | Organização interna | Mural de Recados, Tarefas/Projetos, Estoque com ponto de reposição, Importação em lote, Relatórios, Onboarding guiado |
| **13. Segurança, Governança LGPD & White-Label** | Compliance e configurabilidade | Multi-tenant RLS, RBAC 8 perfis, Auditoria LGPD (CSV), 7 Módulos Clínicos configuráveis, trava CI White-Label, PWA Mobile, Guia Integrado |
| **14. Administração de Plataforma & Parceiros** | Escala SaaS | Master Hub global, gestão de clínicas/planos/cobranças, grupos, API Keys, Health Check, Portal de Parceiros |

---

## 3. Catálogo Detalhado — Todas as Funcionalidades Uma por Uma

---

### Pilar 1 — Núcleo Clínico Multidisciplinar, PEI, ABA & Psicomotricidade

#### 1.0 CliniGo IA com Escudo LGPD Nativo (Estruturador de Evolução, Boletim Família, Laudos em 3 Tons e Advogado Anti-Glosa TISS)
- **Status:** Em Produção (Arquitetura Híbrida Custo Zero com Escudo LGPD + Fallback Determinístico Local)
- **Perfis:** Profissionais de Saúde (`DOCTOR`) e Administração (`CLINIC_ADMIN`) para fluxos clínicos; Administração e Financeiro (`FINANCIAL`) exclusivamente para o Advogado Anti-Glosa TISS
- **O que faz:**
  - **Escudo LGPD Automático:** anonimiza obrigatoriamente nome completo, primeiro nome, CPF, telefone, e-mail, endereço e carteirinha no servidor antes de qualquer processamento de IA e reidrata apenas tokens seguros localmente, com cache SHA-256, cota diária por clínica, cascata multi-provedor gratuita (`Groq` → `OpenRouter` → `Cloudflare Workers AI`) e fallback determinístico local (zero erros 500).
  - **Estruturador Instantâneo de Evolução + Check Anti-Glosa:** transforma tópicos rápidos da sessão em evolução estruturada (`Terapia / ABA`, `Padrão SOAP`, `Psicologia CRP` ou `Eixos CIF`) com verificação automática dos 4 critérios anti-glosa, integrado diretamente ao Prontuário Eletrônico e aos Planos de Sessão.
  - **Tradutor Empático CliniGo Família:** gera em 1 clique o boletim acolhedor para pais (ou síntese técnica para escola/médico) e sugestão de atividade prática para casa a partir das sessões recentes dos últimos 21 dias.
  - **Redator Multidisciplinar de Laudos em 3 Tons:** compila frequência real, biometria facial, curvas PEI/ABA e evoluções assinadas em pareceres adaptados para **Convênio / Auditoria**, **Neuropediatra / Médico** ou **Escola / Família**.
  - **Advogado Anti-Glosa TISS (Carta Técnica ANS):** redige em 1 clique a contestação formal de glosa dentro do modal do Dossiê Probatório citando exclusivamente as provas reais presentes na conta, pronta para edição, cópia ou incorporação no PDF.
- **Valor competitivo:** Entrega IA prática e visível exatamente nos maiores gargalos diários de clínicas terapêuticas (evolução, comunicação familiar, laudos e recuperação de glosas) com blindagem LGPD real e validação humana obrigatória.
- **Acesso:** `/dashboard/prontuarios/[id]`, Planos de Sessão, `CliniGo Família`, `Relatório de Renovação` na Ficha do Paciente e `Dossiê PDF` em `/dashboard/tiss/glosas`

#### 1.1 Prontuário Eletrônico Estruturado e Multi-Modelo
- **Status:** Em Produção (Configurável por Clínica)
- **Perfis:** Profissionais de Saúde (`DOCTOR`), Coordenadores, Administradores (`CLINIC_ADMIN`)
- **O que faz:** Permite registrar atendimentos clínicos escolhendo entre o modelo de **Evolução Terapêutica Estruturada (7 Seções)**, Médico/Geral, Psicologia, Terapia Tradicional e formatos **SOAP, CIF e DAP**, com bloqueio automático configurável após prazo (48h), desbloqueio administrativo auditado, impressão e exportação em PDF white-label.
- **Valor competitivo:** Adapta-se tanto a clínicas médicas quanto a clínicas de terapia multidisciplinar sem forçar um formulário único rígido.
- **Acesso:** `/dashboard/prontuarios`, `/dashboard/prontuarios/[id]`, `/dashboard/evolucoes`

#### 1.2 Assinatura Digital de Evoluções e Certificado ICP-Brasil
- **Status:** Em Produção
- **Perfis:** Profissionais de Saúde
- **O que faz:** Permite assinar evoluções clínicas com captura de assinatura digital, registro de conselho profissional, carimbo de data/hora, hash criptográfico de integridade e suporte a assinatura com certificado ICP-Brasil.
- **Valor competitivo:** Garante validade jurídica do registro, alimenta provas contra glosas de convênio e desbloqueia automaticamente o repasse financeiro do profissional.
- **Acesso:** `/dashboard/prontuarios/[id]`, `/dashboard/evolucoes`

#### 1.3 Planos de Sessão Estruturados (6 Especialidades · 456+ Objetivos)
- **Status:** Em Produção (Configurável por Clínica em Módulos Clínicos)
- **Perfis:** Terapeutas, Coordenadores, Administradores
- **O que faz:** Disponibiliza planos de sessão estruturados para **Intervenção Precoce / ABA**, **Psicologia**, **Fonoaudiologia**, **Terapia Ocupacional**, **Fisioterapia** e **Psicomotricidade**, somando mais de **456 objetivos clínicos catalogados** por área/categoria, com acompanhamento longitudinal por paciente.
- **Valor competitivo:** Entrega biblioteca clínica pronta para operação imediata em clínicas multidisciplinares, eliminando planilhas paralelas.
- **Acesso:** `/dashboard/pacientes/[id]/planos-sessao/[especialidade]`

#### 1.4 Modo Tatame — Coleta Rápida DTT / NET em 1 Toque
- **Status:** Em Produção
- **Perfis:** Terapeutas / Aplicadores ABA
- **O que faz:** Interface tátil otimizada para tablet e celular (`QuickDttCollector`) que permite registrar tentativas em tempo real durante a sessão com 1 toque (Independente, Ajuda Verbal, Gestual, Física Parcial, Física Total, Erro), cálculo instantâneo de percentual de acerto e **contador dedicado de comportamentos interferentes**.
- **Valor competitivo:** Permite coleta ao vivo no tapete/sala de atendimento sem distrair o terapeuta nem depender de papel para digitação posterior.
- **Acesso:** Integrado ao formulário de Planos de Sessão (`/dashboard/pacientes/[id]/planos-sessao/[especialidade]`)

#### 1.5 Curvas de Aprendizagem PEI/ABA, Prompt Fading e Regra Automática de Domínio
- **Status:** Em Produção
- **Perfis:** Terapeutas, Supervisores, Coordenadores
- **O que faz:** Gera gráficos longitudinais (Recharts) de evolução por objetivo, acompanha redução de suporte (**Prompt Fading**), calcula automaticamente o critério de **domínio/aquisição** (`>= 80%` de acerto por 3 sessões consecutivas), sinaliza metas em aquisição, estagnação ou regressão, exibe a faixa de **Correlação Casa × Clínica** e exporta o painel em PDF white-label.
- **Valor competitivo:** Automatiza a análise quantitativa que antes exigia horas de Excel dos supervisores clínicos.
- **Acesso:** Painel de Análise dentro dos Planos de Sessão (`SessionPlansAnalyticsPanel`)

#### 1.5-A Mesa de Supervisão Clínica ABA/PEI (Semáforo, Promoção e Calibração de Equipe)
- **Status:** Em Produção
- **Perfis:** Supervisores, Coordenadores, Administradores, Profissionais
- **O que faz:** Consolida todas as sessões estruturadas da clínica em 30/60/90 dias identificando automaticamente **metas prontas para promoção** (`>= 80% × 3`), **semáforo de estagnação/regressão/alta dependência de dica**, **detector de descalibração entre aplicadores** (`>= 25 p.p.` de divergência no mesmo objetivo do mesmo paciente), comparativo de períodos/Prompt Fading e **rascunho técnico assistido** para revisão e decisão exclusiva do supervisor.
- **Valor competitivo:** Resolve a auditoria clínica de alto volume em clínicas ABA multidisciplinares sem abrir dezenas de prontuários um a um.
- **Acesso:** `/dashboard/terapia/supervisao` (`SupervisionRadarPanel`)

#### 1.5-B Integração Multidisciplinar Automática (Últimos 7 Dias de Outras Especialidades)
- **Status:** Em Produção
- **Perfis:** Profissionais de Saúde, Coordenadores
- **O que faz:** Exibe no topo do painel e da folha de sessão um resumo contextual dos registros feitos nos últimos 7 dias por **outras especialidades** para o mesmo paciente (incluindo comportamentos interferentes e condutas recentes), sem exigir troca de aba ou abertura manual de outros prontuários.
- **Valor competitivo:** Transforma o cuidado multidisciplinar em troca clínica viva no momento do atendimento.
- **Acesso:** Integrado em `SessionPlanFormClient` e `SpecialtyDashboardClient`

#### 1.5-C Clonagem da Estrutura da Última Sessão em 1 Clique
- **Status:** Em Produção
- **Perfis:** Profissionais de Saúde
- **O que faz:** Botão **Clonar Última Sessão** importa automaticamente objetivos selecionados, critérios, nível de suporte, estratégias e etapas da última sessão do paciente naquela especialidade, mantendo a coleta de desempenho limpa para o atendimento do dia.
- **Valor competitivo:** Economiza de 5 a 8 minutos por sessão em terapias contínuas.
- **Acesso:** Barra superior de qualquer Plano de Sessão (`/dashboard/pacientes/[id]/planos-sessao/[especialidade]/[sessaoId]`)

#### 1.6 Módulo Completo de Psicomotricidade (Capa, Objetivos, Sessões e Gráfico)
- **Status:** Em Produção (Configurável por Clínica)
- **Perfis:** Profissionais de Psicomotricidade / Educação Física Especial
- **O que faz:** Fluxo dedicado composto por **Ficha Capa** do paciente, gestão de **Objetivos do Paciente** (Ativo, Adquirido, Suspenso, Descontinuado), **Plano de Sessão completo** (condição inicial, até 4 objetivos prioritários, estratégias de organização/ensino/motivacionais, desempenho quantitativo, intercorrências e decisão para próxima sessão) e gráfico evolutivo.
- **Valor competitivo:** Fluxo nativo para uma especialidade raramente atendida por softwares médicos generalistas.
- **Acesso:** `/dashboard/pacientes/[id]/psicomotricidade`

#### 1.7 Biblioteca Visual de Objetivos de Psicomotricidade (55 Objetivos A–K + PDF + Auto-Seed)
- **Status:** Em Produção
- **Perfis:** Profissionais, Coordenadores, Administradores
- **O que faz:** Modal e seletor visual pesquisável que exibe **código, categoria (A a K) e descrição completa antes da seleção**, com filtro por letra/categoria, busca por palavra-chave, cópia em 1 clique, **autopreenchimento do critério** ao vincular ao paciente, botão **Imprimir / Salvar PDF** white-label com o nome da clínica e **auto-seed idempotente multi-clínica** (qualquer nova clínica recebe os 55 objetivos automaticamente).
- **Valor competitivo:** Elimina escolha "no escuro" por códigos, acelera o planejamento de metas e funciona out-of-the-box para toda clínica nova.
- **Acesso:** `/dashboard/pacientes/[id]/psicomotricidade` e `/dashboard/pacientes/[id]/psicomotricidade/objetivos`

#### 1.8 Planos Terapêuticos Individuais (PTI) com CID e Metas
- **Status:** Em Produção
- **Perfis:** Terapeutas, Coordenadores
- **O que faz:** Cadastro de planos terapêuticos com diagnóstico, código CID, metas com progresso percentual, folhas de registro comportamental/ABA e impressão em PDF.
- **Valor competitivo:** Centraliza o plano global do paciente junto ao histórico clínico.
- **Acesso:** `/dashboard/planos-terapeuticos`

#### 1.9 Relatório de Renovação de Convênio em 1 Clique (Multi-Especialidade)
- **Status:** Em Produção
- **Perfis:** Terapeutas, Coordenadores, Administradores
- **O que faz:** Consolida automaticamente em PDF white-label os atendimentos realizados, frequência, objetivos trabalhados, métricas de evolução entre especialidades e justificativa estruturada de continuidade para solicitação/renovação de autorização junto a planos de saúde.
- **Valor competitivo:** Reduz de horas para segundos a montagem de laudos evolutivos exigidos semestralmente por operadoras.
- **Acesso:** Ficha do Paciente (`/dashboard/pacientes/[id]`) → botão **Relatório Renovação**

#### 1.10 Prescrições Digitais
- **Status:** Em Produção
- **Perfis:** Médicos / Profissionais prescritores
- **O que faz:** Emissão, consulta e listagem de prescrições digitais organizadas por paciente.
- **Valor competitivo:** Mantém histórico prescritivo integrado ao prontuário.
- **Acesso:** `/dashboard/prescricoes`

#### 1.11 Manual Clínico de Evolução Integrado
- **Status:** Em Produção (Configurável por Clínica)
- **Perfis:** Toda a equipe clínica
- **O que faz:** Leitor embutido com diretrizes técnicas, boas práticas de escrita clínica, checklist de qualidade e estrutura de evolução multiprofissional (100% white-label).
- **Valor competitivo:** Padroniza a qualidade técnica das evoluções da equipe sem depender de PDFs externos soltos.
- **Acesso:** `/dashboard/manual-evolucao`

#### 1.12 Templates Personalizados de Prontuário e Anamnese
- **Status:** Em Produção
- **Perfis:** Administradores, Profissionais
- **O que faz:** Criação e edição de modelos padronizados de anamnese e fichas clínicas específicas de cada clínica.
- **Valor competitivo:** Flexibiliza o prontuário para especialidades e protocolos proprietários da clínica.
- **Acesso:** `/dashboard/configuracoes/templates-prontuario`

#### 1.13 Exportação de Evoluções Clínicas em Excel (`.xlsx`)
- **Status:** Em Produção
- **Perfis:** Administradores (`CLINIC_ADMIN`)
- **O que faz:** Filtra evoluções por paciente e período e exporta relatório estruturado em planilha Excel (`.xlsx`) normalizando tanto fichas estruturadas quanto prontuários tradicionais.
- **Valor competitivo:** Facilita auditorias clínicas, perícias e entregas de histórico a planos ou responsáveis mediante solicitação formal.
- **Acesso:** `/dashboard/prontuarios` → botão **Exportar Excel**

---

### Pilar 2 — Experiência da Família, Escola & Portal do Paciente

#### 2.1 CliniGo Família — Boletim Temporário LGPD sem App e sem Senha
- **Status:** Em Produção
- **Perfis:** Equipe Clínica (emissão e gestão) · Responsáveis Legais (visualização externa)
- **O que faz:** Gera link individual, criptografado, temporário e revogável (`/familia/[token]`, `noindex/nofollow`, minimização de dados LGPD sem expor CPF nem prontuário bruto) com resumo de avanços clínicos da semana e envio rápido pelo WhatsApp (API da clínica ou link `wa.me`), exibindo o nome da clínica no cabeçalho e logotipo clicável do CliniGo no rodapé.
- **Valor competitivo:** Entrega transparência contínua às famílias sem atrito de baixar aplicativo ou lembrar senha.
- **Acesso:** Ficha do Paciente (`/dashboard/pacientes/[id]`) → botão **CliniGo Família** · Link externo `/familia/[token]`

#### 2.2 Atividades Domiciliares, Contexto Semanal, Mural de Conquistas e Termômetro Anti-Churn
- **Status:** Em Produção
- **Perfis:** Terapeutas · Coordenadores · Responsáveis Legais
- **O que faz:** Além das orientações práticas para casa com confirmação dos pais, exibe **Mural de Conquistas** (metas dominadas `>= 80%`), chips rápidos de **contexto semanal** (sono, rotina, medicação, escola) correlacionados às curvas clínicas (`Correlação Casa × Clínica`) e um **Termômetro de Confiança (1 a 5)** que aciona alerta silencioso anti-churn no **Radar Operacional** da coordenação quando a família sinaliza nota `<= 2`.
- **Valor competitivo:** Estende a terapia para dentro de casa, comprova valor semanalmente e permite reter famílias antes de um pedido de desligamento.
- **Acesso:** `FamilyPortalManager` (clínica), `FamilyCorrelationStrip` (PEI), `ClinicOperationalRadar` (dashboard) e `/familia/[token]` (família)

#### 2.3 Compartilhamento Temporário + Micro-Retorno Estruturado da Escola (15s)
- **Status:** Em Produção
- **Perfis:** Equipe Clínica (com autorização dos responsáveis) · Escola / Mediadora / Neuropediatra
- **O que faz:** Modo específico do CliniGo Família para gerar relatório temporário resumido e imprimível para escola ou médico externo (com carimbo LGPD) somado a um formulário objetivo de **3 campos estruturados** (participação, regulação e observação da semana — sem chat aberto) que retorna diretamente ao histórico clínico do paciente.
- **Valor competitivo:** Fecha a integração entre Clínica, Família e Escola sem criar contas externas nem expor prontuário bruto.
- **Acesso:** Ficha do Paciente → **CliniGo Família** (tipo Escola / Equipe Médica) · `/familia/[token]`

#### 2.4 Portal do Paciente (Acesso Próprio)
- **Status:** Em Produção
- **Perfis:** Pacientes / Responsáveis
- **O que faz:** Área dedicada onde o paciente cria conta/acessa seu painel, consulta histórico de atendimentos, realiza triagem e agenda consultas.
- **Valor competitivo:** Autonomia do paciente reduzindo volume de mensagens repetitivas na recepção.
- **Acesso:** `/paciente/*` (`/paciente/entrar`, `/paciente/meu-painel`, `/paciente/agendar`, `/paciente/historico`, `/paciente/triagem`)

#### 2.5 Pré-Cadastro Remoto por Link e QR Code
- **Status:** Em Produção
- **Perfis:** Recepção, Administradores · Pacientes externos
- **O que faz:** Gera link ou QR Code para o paciente preencher dados cadastrais e de convênio antecipadamente pelo celular; a recepção revisa e aprova a entrada na base definitiva.
- **Valor competitivo:** Elimina filas no balcão e reduz erros de digitação de CPF e número de carteirinha.
- **Acesso:** `/dashboard/pre-cadastros` · Externo `/pre-cadastro/[token]`

#### 2.6 Reagendamento Autônomo e Pesquisa de Satisfação por Link
- **Status:** Em Produção
- **Perfis:** Pacientes externos
- **O que faz:** Links diretos e seguros para o paciente solicitar reagendamento (`/reschedule/[token]`) e responder pesquisas de satisfação pós-atendimento (`/survey/[token]`).
- **Valor competitivo:** Diminui no-show e captura percepção de qualidade de forma contínua.
- **Acesso:** `/reschedule/[token]`, `/survey/[token]`

---

### Pilar 3 — Agenda, Recorrência, Co-Terapia & Teleconsulta

#### 3.1 Agenda Geral Multiprofissional
- **Status:** Em Produção
- **Perfis:** Administradores, Recepção, Coordenadores, Profissionais autorizados
- **O que faz:** Grade visual interativa por dia/semana com filtro por profissional, sala/consultório, status de atendimento, criação manual, bloqueio de horários (individual ou equipe) e indicação de modalidade (Particular, Convênio, Online).
- **Valor competitivo:** Alta densidade informativa adaptada à rotina intensa de clínicas com dezenas de terapias simultâneas.
- **Acesso:** `/dashboard/agenda`, `/dashboard/agenda/balcao`

#### 3.2 Minha Agenda (Visão Isolada do Profissional)
- **Status:** Em Produção
- **Perfis:** Profissionais de Saúde (`DOCTOR`)
- **O que faz:** Exibe exclusivamente os agendamentos, pacientes do dia e sessões em co-terapia do profissional autenticado, preservando privacidade e foco operacional.
- **Valor competitivo:** Elimina ruído visual para o terapeuta e reforça governança LGPD.
- **Acesso:** `/dashboard/minha-agenda`

#### 3.3 Séries Recorrentes Terapêuticas e Co-Terapia Simultânea
- **Status:** Em Produção
- **Perfis:** Recepção, Coordenadores, Administradores
- **O que faz:** Criação e gestão em lote de sessões semanais recorrentes (comuns em ABA, Fono, TO e Psicologia) e vinculação de **co-terapeutas** na mesma sessão multidisciplinar.
- **Valor competitivo:** Essencial para clínicas de terapia onde o mesmo paciente tem 4 a 20 sessões por semana; softwares médicos comuns exigem agendar um a um.
- **Acesso:** `/dashboard/agenda` (Modal de Agendamento)

#### 3.4 Configuração de Grade Semanal e Múltiplos Turnos
- **Status:** Em Produção
- **Perfis:** Administradores, Recepção autorizada
- **O que faz:** Define dias de atendimento, múltiplos turnos por dia, duração padrão da sessão e intervalos por profissional.
- **Valor competitivo:** Evita conflitos de agenda e alimenta automaticamente a disponibilidade do agendamento online.
- **Acesso:** `/dashboard/horarios`

#### 3.5 Controle de Faltas, Reposições e Pacotes de Sessões
- **Status:** Em Produção
- **Perfis:** Recepção, Coordenadores, Administradores, Financeiro
- **O que faz:** Configura regras de tolerância de faltas, monitora créditos de reposição pendentes, pacotes contratados e sinais de alerta por excesso de ausências.
- **Valor competitivo:** Resolve uma das maiores fontes de atrito financeiro e operacional em clínicas de terapia recorrente.
- **Acesso:** `/dashboard/controle-faltas`

#### 3.6 Teleconsulta Nativa (Salas Agendadas + Sala Instantânea)
- **Status:** Em Produção (Configurável por Clínica)
- **Perfis:** Profissionais, Recepção, Pacientes externos
- **O que faz:** Sala de videochamada integrada para atendimentos agendados (links separados e tokenizados para paciente e profissional), termo de consentimento LGPD pré-chamada e geração de **Sala Instantânea** para atendimentos rápidos.
- **Valor competitivo:** Dispensa links externos de Meet/Zoom sem rastreabilidade e mantém o atendimento online dentro do fluxo clínico.
- **Acesso:** `/dashboard/teleconsulta`, `/dashboard/configuracoes/teleconsulta`, `/video/[roomId]`

---

### Pilar 4 — Recepção, Totem, Biometria Facial & Painel de TV

#### 4.1 Painel de Recepção com Fluxo Configurável (4 Etapas ou 2 Etapas Rápidas)
- **Status:** Em Produção (Configurável por Clínica)
- **Perfis:** Recepção, Administradores
- **O que faz:** Controla chegada, check-in, fila de espera, entrada em atendimento, conclusão e encaixes rápidos (**Walk-in**), permitindo escolher entre o fluxo completo de 4 etapas ou o fluxo ágil de 2 etapas (`Check-in → Concluído`) e alternar Particular/Convênio no próprio balcão.
- **Valor competitivo:** Adapta-se ao ritmo real de clínicas terapêuticas de alto giro.
- **Acesso:** `/dashboard/recepcao`, `/dashboard/recepcao/painel`

#### 4.2 Check-in por Biometria Facial (`face-api`) na Recepção e no Totem
- **Status:** Em Produção
- **Perfis:** Recepção, Pacientes (via Totem)
- **O que faz:** Cadastro facial do paciente na ficha (aba Biometria Facial) e reconhecimento facial no check-in da recepção ou do totem de autoatendimento, registrando presença auditável.
- **Valor competitivo:** Agiliza a chegada e gera **evidência robusta de comparecimento** contra glosas de convênios que contestam execução de sessões.
- **Acesso:** `/dashboard/recepcao/face-checkin`, `/totem/[clinicId]/face-checkin`, Ficha do Paciente (aba Biometria Facial)

#### 4.3 Totem de Autoatendimento e Check-in por QR Code
- **Status:** Em Produção
- **Perfis:** Pacientes presenciais
- **O que faz:** Interface dedicada para tablet/totem na recepção com check-in via QR Code, reconhecimento facial e tela de confirmação de chegada.
- **Valor competitivo:** Reduz fila no balcão em horários de troca de turno (cheia de famílias chegando ao mesmo tempo).
- **Acesso:** `/totem/[clinicId]`, `/totem/[clinicId]/qr-code`, `/checkin/[appointmentId]`

#### 4.4 Painel de TV de Chamada e Pareamento de Dispositivos + PIN Temporário
- **Status:** Em Produção
- **Perfis:** Administradores, Recepção
- **O que faz:** Tela dedicada para TV de sala de espera anunciando chamadas de pacientes por sala/consultório, gerenciamento de dispositivos pareados por código e PIN temporário de desbloqueio rápido na recepção.
- **Valor competitivo:** Experiência visual profissional de clínica estruturada sem exigir hardware proprietário caro.
- **Acesso:** `/painel-tv/[clinicId]`, `/dashboard/configuracoes/dispositivos`, `/terminal`

#### 4.5 Pré-cadastros Digitais via Link Seguro e QR Code da Recepção
- **Status:** Em Produção
- **Perfis:** Recepção, Administradores
- **O que faz:** Emite links individuais (validade 72h, envio direto por WhatsApp integrado ou WhatsApp Web, cópia rápida ou QR Code instantâneo) e **Link Fixo com QR Code imprimível** protegido por confirmação contra invalidação acidental; recebe fichas com consentimento LGPD e foto de carteirinha, permitindo edição inline, solicitação de correção via WhatsApp, detecção de CPF duplicado, aprovação em 1 clique e abertura direta da ficha do paciente.
- **Valor competitivo:** Elimina pranchetas de papel na recepção e agiliza o cadastro completo antes mesmo da chegada da família.
- **Acesso:** `/dashboard/pre-cadastros` · Público `/pre-cadastro/[token]`

---

### Pilar 5 — Gestão de Pacientes & Produtividade Diária (Redução de Cliques)

#### 5.1 Diretório de Pacientes e Lista de Profissionais/Terapeutas com Ações Rápidas Visíveis
- **Status:** Em Produção
- **Perfis:** Administradores, Recepção, Coordenadores, Profissionais (com isolamento)
- **O que faz:** Em **Pacientes** (`/dashboard/pacientes`), listagem em modos **Tabela** e **Cartões** com índice alfabético A–Z, linha inteira clicável e botões de ação direta sempre visíveis (**Abrir Ficha**, **Prontuário**, **Contratos** e **WhatsApp**). Em **Profissionais/Terapeutas** (`/dashboard/medicos`), mesmo padrão sem menu oculto `...`, com linha clicável e botões rotulados visíveis (**Abrir Ficha**, **Contratos**, **Valores**, **Horários**, **Editar**, **Indisponibilizar/Ativar** e **Excluir** com confirmação formal).
- **Valor competitivo:** Elimina ações escondidas em menus de três pontos e acelera tarefas repetitivas da recepção, gestão e coordenação.
- **Acesso:** `/dashboard/pacientes`, `/dashboard/medicos`

#### 5.2 Busca Global Universal e Paleta de Comandos (`Ctrl+K`) com RBAC Estrito
- **Status:** Em Produção
- **Perfis:** Todos os perfis autenticados (100% filtrado pela fonte única de RBAC, permissões customizadas da clínica e módulos ativos)
- **O que faz:** Atalho global `Ctrl+K` / `Cmd+K` (e botão no cabeçalho superior, inclusive no mobile) acessível de qualquer página do sistema. Exibe exclusivamente os módulos permitidos para o perfil logado (ex.: `Minha Agenda`, `Meu Dia Clínico` e `Meu Financeiro` para profissionais; `Recepção`, `Agenda` e `Contratos` para recepção; `TISS` e `Financeiro` para financeiro), busca pacientes somente para perfis autorizados e apresenta botões de ação direta respeitando estritamente cada perfil (`Abrir Ficha`, `Prontuário` apenas para corpo clínico/admin, `Contratos` apenas para recepção/admin quando módulo ativo, e `WhatsApp`), com dupla validação antes de navegar.
- **Valor competitivo:** Corta de 5–6 cliques para 2 segundos qualquer navegação ou abertura de paciente durante o expediente sem nunca expor telas ou dados de outro perfil.
- **Acesso:** Cabeçalho global de todo `/dashboard/*` (`GlobalCommandPalette`)

#### 5.3 Ficha 360º do Paciente com Segregação por Perfil
- **Status:** Em Produção
- **Perfis:** Equipe autorizada conforme RBAC
- **O que faz:** Centraliza em abas organizadas e estritamente filtradas pelo perfil logado: Informações civis/responsável/convênio, Agendamentos, Documentos, Contratos & Termos (apenas Administração/Recepção com módulo ativo), Evoluções e Planos de Sessão/Psicomotricidade (exclusivos do corpo clínico e Administração, em conformidade com sigilo CFM/CFP), Reembolso (oculto para profissionais), Biometria Facial, CliniGo Família e Relatório de Renovação.
- **Valor competitivo:** Visão completa do paciente em um único ponto de entrada com sigilo clínico e governança automática por perfil.
- **Acesso:** `/dashboard/pacientes/[id]`

#### 5.4 Meu Dia Clínico — Tela Única do Expediente do Terapeuta
- **Status:** Em Produção
- **Perfis:** Profissionais de Saúde (`DOCTOR`), Coordenadores, Administradores (`CLINIC_ADMIN`)
- **O que faz:** Fila cronológica dos atendimentos de hoje com filtros (Todas, Pendentes, Assinadas), indicadores de assinatura e biometria facial, e **3 botões diretos em cada card** (`Evoluir / Assinar`, `Planos / Tatame` e `Ficha / Família`), acessível pelo menu lateral (**Agendamento → Meu Dia Clínico**), no dashboard inicial do profissional e via `Ctrl+K`, protegido por Hard Gate no servidor contra acessos de outros perfis.
- **Valor competitivo:** Elimina navegação por múltiplos menus durante o expediente, inclusive em tablet e celular.
- **Acesso:** Menu lateral `Agendamento → Meu Dia Clínico` (`/dashboard/meu-dia`) e `/dashboard` (visão do profissional)

---

### Pilar 6 — Domínio de Convênios & Faturamento TISS-ANS

#### 6.1 Cadastro de Operadoras, Planos, Tabelas de Preços e TUSS
- **Status:** Em Produção
- **Perfis:** Administradores, Financeiro, Faturamento
- **O que faz:** Gestão de operadoras (registro ANS), planos vinculados, tabelas de preços/procedimentos TUSS, regime de repasse (produção vs recebimento) e política de absorção/repasse de glosas.
- **Valor competitivo:** Base estruturada que automatiza precificação de guias e cálculo de repasses.
- **Acesso:** `/dashboard/convenios`

#### 6.2 Verificação de Elegibilidade e Autorizações TISS
- **Status:** Em Produção
- **Perfis:** Recepção, Faturamento, Administradores
- **O que faz:** Validação de dados do beneficiário/carteirinha e controle de guias/senhas de autorização com alertas de vencimento.
- **Valor competitivo:** Previne atendimentos descobertos antes da realização da sessão.
- **Acesso:** `/dashboard/tiss/autorizacao` e `EligibilityCheckModal`

#### 6.3 Elaboração de Contas Médicas (`Ctrl+L`) e Escudo Anti-Glosa
- **Status:** Em Produção
- **Perfis:** Faturamento, Financeiro, Administradores
- **O que faz:** Tela de auditoria pré-faturamento com validação automática (Escudo Anti-Glosa), conferência/estorno de itens nos 4 grupos de conta e liberação rápida individual ou em lote via atalho `Ctrl+L`.
- **Valor competitivo:** Reduz erros manuais antes da montagem do lote XML.
- **Acesso:** `/dashboard/tiss`

#### 6.4 Score de Saúde do Lote TISS (0–100%) com Memória Anti-Glosa por Operadora
- **Status:** Em Produção
- **Perfis:** Faturamento, Financeiro, Administradores
- **O que faz:** Antes do fechamento da remessa XML, audita automaticamente carteirinhas, validades, códigos TUSS, valores e senhas exibindo nota de **0 a 100%** e injeta automaticamente **alertas aprendidos da Memória Anti-Glosa** com base nos motivos ANS recorrentes daquela mesma operadora no histórico da clínica.
- **Valor competitivo:** O sistema aprende com o histórico real de glosas de cada convênio e previne a repetição dos mesmos erros antes do envio XML.
- **Acesso:** `/dashboard/tiss/batches/[id]` (`BatchHealthScoreCard`)

#### 6.5 Montagem de Remessas XML TISS-ANS Oficial (`ISO-8859-1` + Epílogo MD5), Protocolo e Anexos
- **Status:** Em Produção
- **Perfis:** Faturamento, Financeiro, Administradores
- **O que faz:** Agrupa contas liberadas em lotes por operadora usando aritmética exata em centavos inteiros, gera arquivos XML de remessa (`SP/SADT` e `CONSULTA`) e de Recurso de Glosa no encoding oficial `ISO-8859-1` com `registroANS`, tabela TUSS 22 de 8 dígitos (catálogo pré-carregado com 55+ códigos de terapias), 140+ motivos oficiais ANS Tabela 38, cálculo criptográfico oficial do **Epílogo MD5** (Componente de Comunicação ANS), proteção Anti-XXE em importações e verificação real de assinatura X.509 A1.
- **Valor competitivo:** Conformidade estrutural ANS sem tags proprietárias e sem depender de faturador terceiro.
- **Acesso:** `/dashboard/tiss/batches`, `/dashboard/tiss/batches/[id]`, `/dashboard/tiss/glosas`

#### 6.5-A Radar de Receita e Blindagem Pré-Envio para Terapias Seriadas (TEA/ABA)
- **Status:** Em Produção
- **Perfis:** Faturamento, Financeiro, Administradores
- **O que faz:** Painel em tempo real no topo de `/dashboard/tiss` composto por três radares integrados: (1) **Sessões Sem Guia (`PRE-05`)**, localizando sessões concluídas de convênio nos últimos 90 dias ainda não faturadas e ordenadas pelo prazo contratual RN 503/2022; (2) **Blindagem Terapias e Subpagamento (`MOD-02` / `FIN-08`)**, barrando sobreposições de horário (`ANS 1720`), carteirinhas vencidas (`ANS 1017`), erros de conselho executante (`ANS 1218`) e subpagamentos silenciosos abaixo da tabela contratada; e (3) **Acato Sem Crédito Bancário (`KPI-06`)**, monitorando recursos deferidos pela operadora que ainda aguardam depósito efetivo em conta (com confirmação de crédito e registro contábil opcional de retenção tributária na fonte `ISS/IRRF/CSRF`, sem emissão fiscal, em subledger imutável `tiss_financial_events`). Inclui ajuda lateral com pulso visual (`Ajuda TISS` / `Ajuda Recursos`), guia em `/dashboard/help` e lições na CliniGo Academy.
- **Valor competitivo:** Evita perda de receita por sessões esquecidas, previne glosas específicas de clínicas de terapias seriadas e impede que acatos deferidos fiquem sem recebimento bancário real.
- **Acesso:** `/dashboard/tiss` (`TissRevenueRadarCard`), `/dashboard/tiss/glosas` (`Confirmar Crédito`) e `/api/tiss/revenue-leakage`

#### 6.6 Importação de Retorno XML em 2 Etapas (Simulação Dry-Run)
- **Status:** Em Produção
- **Perfis:** Faturamento, Financeiro, Administradores
- **O que faz:** Simula a leitura do demonstrativo de retorno da operadora (Dry-Run) mostrando divergências e prevenção de duplicidade antes de gravar no banco de dados.
- **Valor competitivo:** Elimina corrupção financeira por arquivos de retorno importados incorretamente ou em duplicidade.
- **Acesso:** `/dashboard/tiss/glosas`

#### 6.7 Controle de Glosas em 3 Níveis, Recursos (C1–C8) e Dossiê Probatório 1-Clique (Biometria + Evolução)
- **Status:** Em Produção
- **Perfis:** Faturamento, Financeiro, Administradores
- **O que faz:** Auditoria estruturada em **Nível 1 (Lote)**, **Nível 2 (Contas)** e **Nível 3 (Itens)** diferenciando glosa recuperável vs irrecuperável, geração de lote de recurso (etapas C1 a C8), XML oficial ANS e botão **Dossiê PDF em 1 clique** que compila Guia TISS + trilha de check-in + comprovante de **Biometria Facial** + **Evolução Assinada com hash criptográfico** e índice de força probatória (0–100%).
- **Valor competitivo:** Aproveita o diferencial único do CliniGo (biometria + prontuário assinado + TISS no mesmo banco) para recuperar receita glosada com prova auditável.
- **Acesso:** `/dashboard/tiss/glosas` (`GlosaEvidenceDossierButton`)

#### 6.8 BI de Análise de Perdas TISS e Raio-X de Rentabilidade por Operadora
- **Status:** Em Produção
- **Perfis:** Administradores, Financeiro
- **O que faz:** Painel analítico com faturamento total, taxa de glosa, valores recuperados, ranking de motivos ANS, **Raio-X comparativo por Operadora** (taxa real de glosa, prazo real de retorno DSO em dias, margem retida estimada, classificação de risco, top 3 motivos ANS e painel de Memória Anti-Glosa) com exportação CSV.
- **Valor competitivo:** Revela exatamente quais operadoras geram margem saudável e quais exigem ajuste operacional ou renegociação.
- **Acesso:** `/dashboard/tiss/reports/loss-analysis`, `/dashboard/tiss/audit` (`OperatorIntelligenceCard`)

---

### Pilar 7 — Gestão Financeira, Repasses & Controladoria

*(Escopo estrito: sem controle de caixa físico, dinheiro em espécie ou emissão de nota fiscal.)*

#### 7.1 Lançamentos Financeiros, Pagamentos e Links de Pagamento
- **Status:** Em Produção
- **Perfis:** Administradores, Financeiro
- **O que faz:** Registro de receitas e despesas, histórico de pagamentos recebidos, ticket médio, valores em aberto, exportação de relatórios e geração de links de cobrança digital (`/pagar/[token]`).
- **Valor competitivo:** Visão consolidada da receita de atendimentos particulares e de convênios.
- **Acesso:** `/dashboard/financeiro`, `/dashboard/pagamentos`, `/pagar/[token]`

#### 7.2 Fechamentos Financeiros, Conciliação e Inadimplência
- **Status:** Em Produção
- **Perfis:** Administradores, Financeiro
- **O que faz:** Consolidação periódica de receitas, despesas, resultado líquido, sessões realizadas, pendências de recebimento, conciliação e controle de inadimplência.
- **Valor competitivo:** Fecha o ciclo mensal administrativo sem planilhas paralelas.
- **Acesso:** `/dashboard/financeiro/fechamento`, `/dashboard/financeiro/conciliacao`, `/dashboard/financeiro/inadimplencia`

#### 7.3 Créditos de Pacientes (Saldos Pré-Pagos)
- **Status:** Em Produção
- **Perfis:** Administradores, Financeiro, Recepção autorizada
- **O que faz:** Controla saldos antecipados/créditos por paciente com histórico de consumo e exportação em Excel e PDF.
- **Valor competitivo:** Essencial para pacotes mensais de terapia e abatimentos controlados.
- **Acesso:** `/dashboard/financial/credits`

#### 7.4 Folha de Repasse Profissional (Produção vs Recebimento) e Contratos de Repasse
- **Status:** Em Produção
- **Perfis:** Administradores, Financeiro
- **O que faz:** Apura a produção mensal por profissional considerando regras individuais, taxas por paciente/terapia, impacto de glosas conforme política do convênio, fechamento de folha, histórico e emissão de demonstrativos.
- **Valor competitivo:** Automatiza o cálculo mais complexo e propenso a conflito em clínicas multidisciplinares.
- **Acesso:** `/dashboard/financial/payroll`, `/dashboard/financial/payroll/contracts`, `/dashboard/financial/payroll/historico`, `/dashboard/financial/producao`

#### 7.5 Meu Financeiro + Meu Repasse Ao Vivo (Liberado vs Aguardando Evolução Assinada)
- **Status:** Em Produção
- **Perfis:** Profissionais de Saúde (`DOCTOR`)
- **O que faz:** Painel individual onde o terapeuta acompanha em tempo real quanto já está **Liberado para repasse** (atendimentos com evolução assinada) vs quanto está **Aguardando Evolução Assinada** (com link direto para regularizar), além de comparativos anuais, histórico e download em Excel/PDF.
- **Valor competitivo:** Alinha incentivo financeiro com conformidade clínica — o próprio terapeuta mantém prontuários em dia para liberar seu repasse.
- **Acesso:** `/dashboard/meu-financeiro` (`DoctorLiveRepasseCard`)

#### 7.6 Controladoria: DRE Consolidada, Centro de Custo, Metas, Projeção, Mix e LTV
- **Status:** Em Produção
- **Perfis:** Administradores, Financeiro
- **O que faz:** Geração de DRE mensal consolidada e por centro de custo, definição de metas e projeção de faturamento, análise de mix de serviços, desempenho por operadora, cálculo de LTV (Lifetime Value) e auditoria financeira.
- **Valor competitivo:** Visão de gestão executiva (CFO) nativa para donos de clínicas em crescimento.
- **Acesso:** `/dashboard/financial/dre`, `/dashboard/financial/dre-costcenter`, `/dashboard/financial/goals`, `/dashboard/financial/ltv`, `/dashboard/financeiro/mix`, `/dashboard/financeiro/operadoras`, `/dashboard/financeiro/projecao`, `/dashboard/financial/audit`

#### 7.7 Regras de Reembolso (Geral por Terapia e Personalizada por Paciente)
- **Status:** Em Produção
- **Perfis:** Administradores, Financeiro, Recepção
- **O que faz:** Configura regras de documentação/valores para atendimento via reembolso de plano de saúde, tanto no nível geral da clínica quanto com exceções específicas por paciente.
- **Valor competitivo:** Atende modelo muito comum em clínicas de terapias de alto padrão que operam com reembolso assistido.
- **Acesso:** `/dashboard/configuracoes/reembolso`, `/dashboard/configuracoes/reembolso-paciente`, `/dashboard/financeiro/reembolsos`

---

### Pilar 8 — Inteligência Clínica & Gestão Terapêutica

#### 8.1 Radar Operacional da Clínica no Dashboard
- **Status:** Em Produção
- **Perfis:** Administradores, Coordenadores, Recepção/Financeiro conforme permissão
- **O que faz:** Painel proativo de alertas operacionais em tempo real na tela inicial consolidando pendências críticas (evoluções sem assinatura, autorizações/guias pendentes, contas ou riscos que exigem ação no dia).
- **Valor competitivo:** Transforma o dashboard de um painel passivo em uma central de ação imediata.
- **Acesso:** `/dashboard` (`ClinicOperationalRadar`)

#### 8.2 Fila de Espera Inteligente com Disparo WhatsApp Dinâmico
- **Status:** Em Produção
- **Perfis:** Comercial, Recepção, Coordenadores, Administradores
- **O que faz:** Organiza interessados aguardando vaga por especialidade/turno com contadores de funil (Na Fila, Contatados, Agendados), importação por planilha modelo, envio direto de WhatsApp com modelos comerciais usando dinamicamente o nome da clínica logada e log completo de contatos.
- **Valor competitivo:** Evita perder demanda reprimida quando surge horário livre na agenda.
- **Acesso:** `/dashboard/terapia/fila-espera`

#### 8.3 Gestão de Encaminhamentos e Supervisão Clínica
- **Status:** Em Produção
- **Perfis:** Coordenadores, Administradores, Profissionais
- **O que faz:** Controla encaminhamentos internos/externos (taxa de conversão e principais médicos/parceiros referenciadores) e registra horas de supervisão clínica por profissional.
- **Valor competitivo:** Estrutura a rede de indicação (neuropediatras/escolas) e o cumprimento de horas obrigatórias de supervisão ABA/clínica.
- **Acesso:** `/dashboard/terapia/encaminhamentos`, `/dashboard/terapia/supervisao`

#### 8.4 Painéis Analíticos de Terapia (10 Visões Especializadas)
- **Status:** Em Produção
- **Perfis:** Administradores, Coordenadores
- **O que faz:** Suite dedicada de indicadores terapêuticos: **Conformidade de Evoluções**, **Aderência ao Tratamento**, **Carga de Trabalho da Equipe**, **Retenção**, **Risco de Evasão**, **Desfechos Clínicos**, **Sazonalidade**, **Perfil Demográfico**, **Receita por Modalidade** e **NPS**.
- **Valor competitivo:** Inteligência de gestão desenhada especificamente para a dinâmica de terapias contínuas (muito além de "consultas avulsas").
- **Acesso:** `/dashboard/terapia/*`

---

### Pilar 9 — Contratos Eletrônicos, Documentos & Termos Legais

#### 9.1 Modelos Contratuais com Variáveis Dinâmicas e Autopreenchimento
- **Status:** Em Produção (Configurável por Clínica)
- **Perfis:** Administradores, Recepção/Comercial autorizado
- **O que faz:** Cadastro de modelos de contrato com variáveis automáticas que puxam dados do paciente, responsável e clínica via `/api/contracts/autofill`, prontos para emissão em segundos.
- **Valor competitivo:** Zera digitação manual e erros de dados em contratos de prestação de serviços terapêuticos.
- **Acesso:** `/dashboard/contratos/modelos`, `/dashboard/contratos/novo`

#### 9.2 Emissão e Assinatura Eletrônica por Link Externo
- **Status:** Em Produção (Configurável por Clínica)
- **Perfis:** Equipe da clínica · Responsáveis/Pacientes externos
- **O que faz:** Emite contratos com link seguro para assinatura remota pelo celular (`/assinar/[token]` e `/sign/[token]`), controle de status (pendente/assinado), trilha de auditoria e visualização/impressão do documento assinado.
- **Valor competitivo:** Fecha matrículas de novos pacientes à distância sem precisar contratar ferramentas externas (Clicksign/DocuSign).
- **Acesso:** `/dashboard/contratos`, `/dashboard/contratos/[id]`, `/assinar/[token]`, `/sign/[token]`

#### 9.3 Gestão de Documentos da Clínica e Termos Legais
- **Status:** Em Produção
- **Perfis:** Administradores, Recepção, Coordenadores conforme permissão
- **O que faz:** Upload, organização, edição de metadados e extração de texto de documentos (laudos, exames, anexos) + gestão de termos de consentimento legal e controle de assinaturas.
- **Valor competitivo:** Repositório centralizado e pesquisável com governança de acesso.
- **Acesso:** `/dashboard/documentos`, `/dashboard/termos`, `/dashboard/configuracoes/modelos-documentos`

---

### Pilar 10 — Comunicação, WhatsApp Multi-Setor, CRM & Automações

#### 10.1 Conexão de WhatsApp por Setor via QR Code
- **Status:** Em Produção
- **Perfis:** Administradores
- **O que faz:** Conecta e monitora múltiplos números de WhatsApp separados por setor da clínica (Recepção, Comercial, Financeiro) via pareamento por QR Code, integrados aos disparos de lembretes, fila de espera e CliniGo Família.
- **Valor competitivo:** Separa operação comercial, clínica e administrativa sem misturar contatos no mesmo aparelho.
- **Acesso:** `/dashboard/whatsapp`, `/dashboard/integracoes/whatsapp`

#### 10.2 Chat Interno Multi-Tenant da Equipe
- **Status:** Em Produção
- **Perfis:** Todos os colaboradores da clínica
- **O que faz:** Comunicação interna em tempo real entre recepção, terapeutas, coordenação e financeiro com notificação discreta em popup, 100% isolada dentro da clínica.
- **Valor competitivo:** Evita troca de dados de pacientes em grupos pessoais de WhatsApp (risco grave de LGPD).
- **Acesso:** `/dashboard/chat`

#### 10.3 FluxoMed CRM — Pipeline Kanban de Captação
- **Status:** Em Produção
- **Perfis:** Comercial, Recepção, Administradores
- **O que faz:** Gestão de leads e interessados em funis Kanban personalizáveis com etapas, cards, notas internas e acompanhamento de conversão.
- **Valor competitivo:** Transforma contatos de avaliação em pacientes ativos sem precisar de CRM externo.
- **Acesso:** `/dashboard/crm`, `/dashboard/crm/pipeline`

#### 10.4 Central de Notificações e Réguas de Automação Operacional
- **Status:** Em Produção
- **Perfis:** Administradores, Equipe conforme RBAC
- **O que faz:** Sino de notificações em tempo real consciente de RBAC, histórico centralizado de envios e painel de automações/réguas operacionais configuráveis.
- **Valor competitivo:** Mantém a equipe sincronizada e reduz tarefas manuais repetitivas.
- **Acesso:** `/dashboard/notificacoes`, `/dashboard/automacao`

---

### Pilar 11 — Presença Institucional e Captação Online

#### 11.1 Agendamento Online Direto por Clínica (Página Pública Descontinuada)
- **Status:** Agendamento direto ativo · **Página Pública institucional (`/[clinic_slug]` e `/dashboard/configuracoes/pagina-publica`) descontinuada e removida em 25/11/2026**
- **Perfis:** Pacientes externos (quando a clínica compartilha link direto de agendamento)
- **O que faz:** O fluxo de agendamento online direto (`/[clinic_slug]/agendar`) permanece protegido por validação estrita de slug na borda e no servidor (`isValidPublicClinicSlug`), enquanto a antiga Página Pública personalizável da clínica na raiz (`/[clinic_slug]`) e seu editor no menu Configurações foram removidos integralmente do sistema por não terem uso operacional e por exporem rota catch-all raiz a sondas de scanners.
- **Valor competitivo:** Menor superfície de ataque, economia superior a 60% em CPU de borda e navegação administrativa mais enxuta.
- **Acesso:** `/[clinic_slug]/agendar` (rota legada `/dashboard/configuracoes/pagina-publica` redireciona automaticamente para `/dashboard/configuracoes`)

#### 11.2 Diretório Público de Busca e Páginas Institucionais
- **Status:** Em Produção
- **Perfis:** Público externo
- **O que faz:** Portal de descoberta de clínicas e especialidades (`/buscar`), páginas de soluções por segmento (`/solucoes/[slug]`), comparativo e blog educativo.
- **Valor competitivo:** Canal adicional de descoberta orgânica e posicionamento de marca.
- **Acesso:** `/buscar`, `/solucoes`, `/blog`, `/comparativo`

#### 11.3 Landing Page Comercial de Alta Conversão (`clinigo.app`)
- **Status:** Em Produção
- **Perfis:** Visitantes, gestores e clínicas prospectando o sistema
- **O que faz:** Apresenta o posicionamento editorial do CliniGo com Hero interativo preservado (recorrência, WhatsApp e Modo Sigilo RBAC), 4 abas de dores reais com fotografia editorial, vitrine interativa da **CliniGo IA com Escudo LGPD** (4 fluxos + seletor de 3 tons de laudo), Raio-X por especialidade, visão do ecossistema por cargo (Gestora, Coordenação, Terapeuta e Recepção), faixa compacta de Governança/LGPD, simulador operacional, planos comerciais oficiais e barra fixa de contratação (`StickyCtaBar`) responsiva para desktop e mobile.
- **Valor competitivo:** Comunica todo o ecossistema clínico e de IA em jornada enxuta (~9 a 10 telas), com CTA permanente e provas visuais sem sobrecarregar a rolagem.
- **Acesso:** `/` (`https://clinigo.app`)

#### 11.4 Cadastro de Teste Grátis Assistido (`/trial`) e Proteção Anti-Abandono de Senha
- **Status:** Em Produção
- **Perfis:** Clínicas interessadas em iniciar avaliação gratuita de 7 dias
- **O que faz:** Oferece medidor em tempo real de força da senha, checklist visual de requisitos (8+ caracteres, maiúscula, número e símbolo), aviso imediato contra sequências comuns, botão **Sugerir senha forte** em 1 clique com cópia rápida, banner persistente de orientação clara em português em caso de senha bloqueada por vazamento (`HTTP 422 WEAK_PASSWORD`, eliminando mensagens técnicas em inglês) e alerta instantâneo via Push (`ntfy.sh`) para o Super Admin acompanhar novos leads e eventuais travamentos em tempo real.
- **Valor competitivo:** Impede perda de leads quentes na etapa mais crítica da conversão por erros técnicos obscuros de autenticação.
- **Acesso:** `/trial`, `/api/auth/register`, `/api/auth/reset-password`, `/api/auth/activate-account`

---

### Pilar 12 — Gestão Operacional, Estoque & Onboarding

#### 12.1 Mural de Recados e Tarefas / Projetos Internos
- **Status:** Em Produção
- **Perfis:** Toda a equipe da clínica
- **O que faz:** Quadro de comunicados internos no dashboard e módulo dedicado para organizar tarefas operacionais, responsáveis e prazos da clínica.
- **Valor competitivo:** Centraliza demandas internas sem depender de Trello ou bilhetes soltos.
- **Acesso:** `/dashboard`, `/dashboard/tarefas`

#### 12.2 Gestão de Estoque e Insumos
- **Status:** Em Produção
- **Perfis:** Administradores, Equipe operacional
- **O que faz:** Cadastro de produtos/materiais terapêuticos e insumos, estoque mínimo, ponto de reposição, alertas e histórico de movimentações.
- **Valor competitivo:** Evita ruptura de materiais essenciais de atendimento.
- **Acesso:** `/dashboard/estoque`

#### 12.3 Importação de Dados em Lote, Relatórios Gerenciais e Onboarding Guiado
- **Status:** Em Produção
- **Perfis:** Administradores
- **O que faz:** Importação em massa via planilhas com acompanhamento por lote, relatórios gerenciais/analytics consolidados (receita, agendamentos, no-show, frequência) e checklist guiado de implantação inicial da clínica.
- **Valor competitivo:** Reduz drasticamente o tempo de migração de clínicas vindas de concorrentes ou planilhas.
- **Acesso:** `/dashboard/importacao`, `/dashboard/relatorios`, `/dashboard/onboarding`

---

### Pilar 13 — Segurança, Governança LGPD, Multi-Clínica & White-Label

#### 13.1 Arquitetura Multi-Tenant com RLS e RBAC em 8 Perfis
- **Status:** Em Produção
- **Perfis:** Todos (governança de sistema)
- **O que faz:** Isolamento estrito de dados por `clinic_id` no banco PostgreSQL/Supabase (RLS) somado a controle de acesso baseado em papéis (`SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `FINANCIAL`, `DOCTOR`, `NURSE`, `STAFF`, `READONLY`), bloqueio automático de rotas clínicas para recepção e isolamento de pacientes para profissionais não-coordenadores.
- **Valor competitivo:** Conformidade real com sigilo profissional e LGPD, evitando vazamento entre clínicas ou entre setores internos.
- **Acesso:** `/dashboard/configuracoes/usuarios`, `/dashboard/seguranca`

#### 13.2 Central de Módulos Clínicos Configuráveis por Clínica (7 Módulos)
- **Status:** Em Produção
- **Perfis:** Administradores da Clínica (`CLINIC_ADMIN`)
- **O que faz:** Permite que cada clínica ative ou desative autonomamente seus módulos clínicos avançados (Planos de Sessão e especialidades habilitadas, Psicomotricidade, Manual de Evolução, Contratos Eletrônicos, Teleconsulta, Evolução Estruturada como padrão, Fluxo de Recepção e Gate de Assinatura) sem intervenção técnica.
- **Valor competitivo:** Escala comercial imediata — novas clínicas saem operando com os recursos que precisam, sem código hardcoded por cliente.
- **Acesso:** `/dashboard/configuracoes?tab=modulos`

#### 13.3 Logs de Auditoria LGPD e Trava Permanente White-Label em CI
- **Status:** Em Produção
- **Perfis:** Administradores
- **O que faz:** Trilha completa de auditoria de ações sensíveis com filtros e exportação CSV + proteção automatizada em CI garantindo zero vazamento de nomes de clínicas clientes em qualquer tela, PDF ou mensagem do produto.
- **Valor competitivo:** Maturidade corporativa e confiança jurídica para clínicas exigentes.
- **Acesso:** `/dashboard/logs-auditoria`

#### 13.4 PWA Responsivo + Modo Mobile Dedicado (`/m/*`)
- **Status:** Em Produção
- **Perfis:** Toda a equipe
- **O que faz:** Aplicação instalável como PWA em iOS e Android com navegação mobile dedicada, alvos de toque confortáveis e interface móvel simplificada para agenda, fila e prontuários (`/m/*`).
- **Valor competitivo:** Permite uso real no celular ou tablet dentro da sala de atendimento.
- **Acesso:** Web PWA global e `/m/agenda`, `/m/fila`, `/m/prontuarios`, `/m/perfil`

#### 13.5 Guia de Ajuda Integrado & CliniGo Academy Contextual por Perfil
- **Status:** Em Produção
- **Perfis:** Todos os perfis (100% filtrado por RBAC, plano, permissões customizadas e módulos ativos da clínica)
- **O que faz:** Central de treinamento nativo (`/dashboard/help` e ícones `?` em cada item do menu lateral) combinando **CliniGo Academy** (Mapa Vivo de 8 estações, 3 trilhas práticas por cargo com 23 lições filtradas por perfil e Simulador Glosa Zero) + **Manual Completo Passo a Passo** (71 guias com busca por intenção, caminhos de clique, dicas e FAQs cobrindo 100% dos recursos do sistema — incluindo `CliniGo IA com Escudo LGPD`, `Advogado Anti-Glosa TISS (IA)`, `Meu Dia Clínico`, `Clonar Sessão`, `Modo Tatame`, `Curvas ABA`, `Biblioteca Psicomotricidade`, `Mesa de Supervisão`, `Raio-X de Operadoras`, `Score do Lote`, `Dossiê PDF 1-Clique`, `CliniGo Família 2.0`, `Relatório de Renovação`, `Central de Módulos Clínicos`, `Radar Operacional` e `Busca Global Ctrl+K`).
- **Valor competitivo:** Substitui treinamento presencial caro e acelera autonomia de novos colaboradores sem expor guias de áreas restritas.
- **Acesso:** `/dashboard/help` e ícones `?` na barra lateral

#### 13.6 Configurações Gerais da Clínica, Terapias, Assinatura e Integrações
- **Status:** Em Produção
- **Perfis:** Administradores
- **O que faz:** Gestão de dados cadastrais, logotipo, salas/consultórios, terminologia dos profissionais, catálogo de terapias/especialidades, gestão da própria assinatura/licenças extras/boletos e integrações externas.
- **Valor competitivo:** Autonomia administrativa completa da clínica.
- **Acesso:** `/dashboard/configuracoes`, `/dashboard/configuracoes/terapias`, `/dashboard/configuracoes/assinatura`, `/dashboard/integracoes`

---

### Pilar 14 — Administração Global de Plataforma & Parceiros

#### 14.1 System Master Hub (Operação SaaS Super Admin)
- **Status:** Em Produção
- **Perfis:** Exclusivo `SUPER_ADMIN` (totalmente isolado e invisível para clínicas)
- **O que faz:** Gestão global de clínicas, aprovações pendentes, planos, cobranças SaaS, upgrades, permissões granulares por clínica, grupos empresariais, impersonação auditada para suporte, relatórios globais, API Keys, SMTP, chatbot e Health Check da plataforma.
- **Valor competitivo:** Infraestrutura pronta para escalar centenas de clínicas com governança operacional centralizada.
- **Acesso:** `/system-master-hub/*`, `/dashboard/super/*`

#### 14.2 Portal de Parceiros e Afiliados
- **Status:** Em Produção
- **Perfis:** Parceiros comerciais / Representantes
- **O que faz:** Cadastro, login, painel de acompanhamento de indicações/clínicas vinculadas e controle de comissões/pagamentos a parceiros.
- **Valor competitivo:** Motor estruturado de aquisição via canal de representantes e parceiros de saúde.
- **Acesso:** `/partners/*`, `/admin/partner-payments`

#### 14.3 HQ Privado de Prospecção B2B (CRM, Gerador de PDFs, Scripts e Cofre)
- **Status:** Em Produção (Exclusivo Super Admin — oculto com HTTP 404 + `noindex`)
- **Perfis:** Exclusivo `SUPER_ADMIN`
- **O que faz:** Central comercial interna com fluxo guiado em 1 tela (escolha da clínica e situação → Passo A copiar e-mail pronto → Passo B baixar exatamente os anexos PDF indicados com preview real A4 na tela → Passo C marcar enviado e agendar follow-up D+3), 3 PDFs renderizados em HTML/CSS/SVG 2x com logo oficial redondo, gráficos SVG, QR Code real e zero `&` (Relatório de Continuidade 2p, Apresentação Executiva 1p e Proposta Comercial 1p com ROI e timeline 7 dias), CRM com exportação Excel, editor de modelos de texto e cofre privado em bucket dedicado com URLs assinadas temporárias.
- **Valor competitivo:** Acelera a operação comercial B2B diária com envio de materiais personalizados em segundos, sem expor dados reais de pacientes e sem depender de ferramentas externas.
- **Acesso:** `/system-master-hub/prospeccao`

#### 14.4 Central Privada de Contratos Comerciais (Fidelidade 12 Meses — Word Editável e PDF A4)
- **Status:** Em Produção (Exclusivo Super Admin — oculto com HTTP 404 + `noindex`)
- **Perfis:** Exclusivo `SUPER_ADMIN`
- **O que faz:** Editor jurídico-comercial privado para gerar, editar livremente cada cláusula, versionar no Supabase, duplicar e exportar contratos B2B SaaS do CliniGo com fidelidade de 12 meses (editável), multa rescisória proporcional, cláusula LGPD e cláusula de nova contratação independente, com carregamento em 1 clique dos dados de qualquer clínica e download em Word editável (`.doc`) e PDF oficial A4 timbrado.
- **Valor competitivo:** Elimina retrabalho na formalização de novos contratos e recontratações, padronizando regras comerciais e segurança jurídica.
- **Acesso:** `/system-master-hub/contratos-comerciais`

#### 14.5 Sentinela 24/7 do Bot Clin e Recuperação de Leads Offline
- **Status:** Em Produção (Exclusivo Super Admin)
- **Perfis:** Exclusivo `SUPER_ADMIN`
- **O que faz:** Monitora a conexão do Bot Clin no Railway a cada 5 minutos direto pelo servidor (`pg_cron`), realiza keep-alive e auto-cura automática em caso de desconexão, envia alertas urgentes fora do WhatsApp (E-mail SMTP, Push instantâneo no celular via `ntfy.sh`, Telegram e Webhook) com aviso automático de recuperação, e disponibiliza disparo imediato do Bot Clin para leads que enviaram mensagem durante períodos offline.
- **Valor competitivo:** Garante alta disponibilidade do canal comercial WhatsApp sem depender de verificação manual e impede perda de leads quentes.
- **Acesso:** `/system-master-hub/clin-whatsapp`

#### 14.6 Automação Comercial de Disparo B2B em Lote (Hostinger + PDF + Cadência D+0/D+3/D+7)
- **Status:** Em Produção (Exclusivo Super Admin — oculto com HTTP 404 + `noindex`)
- **Perfis:** Exclusivo `SUPER_ADMIN`
- **O que faz:** Permite importar listas TXT, CSV ou texto colado (extraindo nome, clínica, e-mail e telefone com deduplicação e validação DNS MX anti-bounce), vincular ou subir um PDF comercial direto no Cofre e disparar automaticamente via `contato@clinigo.app` (Hostinger) em gotejamento humanizado com assinatura HTML oficial do Diretor, cadência automática D+0/D+3/D+7, link rastreável (`/apresentacao/[token]`) com destaque de Leads Quentes, descadastro LGPD 1 clique e botão WhatsApp contextual por contato.
- **Valor competitivo:** Escala a prospecção ativa para clínicas de terapias com entregabilidade protegida e sinalização imediata de quem demonstrou interesse no material.
- **Acesso:** `/system-master-hub/prospeccao` (aba **Campanhas de E-mail**)

---

## 4. Registro de Evoluções Funcionais (Changelog de Produto)

| Data | Módulo / Pilar | O que foi adicionado ou aprimorado |
|---|---|---|
| **27/11/2026** | Pilar 14 (`/system-master-hub/prospeccao` e `/apresentacao/[token]`) | **Automação Comercial de Disparo B2B em Lote (Hostinger `contato@clinigo.app`):** adicionada aba **Campanhas de E-mail** com upload inteligente de TXT/CSV/colar lista, validação DNS MX anti-bounce, sincronização automática com o CRM (`sales_prospects`), anexo PDF direto do Cofre (com upload na mesma tela), assinatura HTML oficial **Robson Oliveira — Diretor · CliniGO**, disparo em gotejamento humanizado via `pg_cron` gate, cadência automática D+0/D+3/D+7 com parada ao responder, página rastreável `/apresentacao/[token]` que destaca Leads Quentes ao abrir o PDF, descadastro LGPD 1 clique e botão WhatsApp contextual por contato. |
| **27/11/2026** | Pilar 14 (Bot Clin Railway + `/api/chatbot`) | **Correção do Número do Especialista (`21 96696-0684`), Blindagem contra LID Falso, Pausa Automática em Resposta Humana e E-mail Comercial Próprio:** substituído o número antigo morto `21 96553-2247` por `21 96696-0684` no alerta `NOVO LEAD QUALIFICADO NO BOT CLIN` (Railway) e na assinatura comercial; adicionada resolução de WhatsApp LID (`contacts` + `lidMapping`) e bloqueio definitivo de LIDs em `extractWhatsappDigits` (nunca mais fabrica números falsos de 16 dígitos como `+5542696420929732`); adicionada pausa automática de 12h quando o atendimento humano responde direto no WhatsApp; e criado e-mail comercial próprio (`[CliniGo Comercial]`) eliminando o cabeçalho errado `TESTE DE MONITORAMENTO · SENTINELA 24/7`. |
| **27/11/2026** | Pilar 14 (`/api/chatbot` e `/system-master-hub/prospeccao`) | **Correção de Sync CRM Bot Clin (`sales_prospects` `23502`) + Filtro de Saudação:** corrigida a gravação automática de leads qualificados do Bot Clin em `sales_prospects` (`estimated_professionals` 1..500 com padrão 5, `funnel_status: 'RESPONDEU'` e strings vazias em vez de `null` nas colunas `NOT NULL`) e adicionado filtro de saudações soltas (`Bom dia`/`Olá`) no fluxo de nova contratação para nunca gravar saudação como nome de clínica. |
| **27/11/2026** | Pilar 11 e Pilar 13 (`/trial` e Rotas Auth) | **Blindagem Anti-Abandono de Cadastro e Tradução Clara de Erros de Senha (`weak_password`):** criado motor `lib/auth/password-policy.ts` para traduzir erros `AuthWeakPasswordError` do Supabase Auth para orientação clara em pt-BR (`HTTP 422 WEAK_PASSWORD`) nas 4 rotas de senha (`register`, `signup`, `reset-password`, `activate-account`), eliminado `"Database error creating new user"`, adicionados medidor de força em tempo real, banner inline persistente `role="alert"`, botão 1-clique **Sugerir senha forte** + **Copiar** em `/trial` e alerta Push (`ntfy.sh`) instantâneo ao Super Admin (100% LGPD, sem senha/CPF). |
| **26/11/2026** | Pilar 14 (`/system-master-hub` e Dock Flutuante) | **Impersonate 2.0 (Silencioso, 1-Clique, Multi-Perfil e Dock Discreto):** eliminada a barra laranja fixa no topo (substituída por Dock Flutuante recolhível no canto inferior direito com **Modo Invisível** e **Troca de Perfil Ao Vivo**), removida a exigência de 10 caracteres para entrar, adicionado seletor 1-clique de qualquer perfil/usuário real da clínica com espelho fiel em `middleware.ts`/`AuthProvider`/`/api/profile` (sem derrubar sessões ativas nem deixar rastro visível às clínicas) e corrigido definitivamente o erro `PGRST204` (`target_clinic`) em `system_logs`. |
| **26/11/2026** | Pilar 14 (`/api/chatbot` e `/system-master-hub/chatbot`) | **Bot Clin 2.0 — Máquina de Vendas 24/7:** implantado fluxo dedicado para conta encerrada/nova contratação (com pausa automática de 24h), repertório completo do CliniGo 2.0 (CliniGo IA Escudo LGPD, CliniGo Família 2.0, Modo Tatame, Curvas ABA, Mesa de Supervisão, Dossiê Anti-Glosa 1-Clique e Simulador de ROI no WhatsApp), fallback em cascata gratuita (`Groq → OpenRouter → Cloudflare`), captura progressiva de leads com sincronização automática no HQ de Prospecção B2B (`sales_prospects`), alerta instantâneo de leads quentes no celular (`ntfy.sh` + E-mail), follow-up automático 2h/24h em horário comercial BRT e botão **Pausar 24h / Retomar Bot** por conversa no painel `/system-master-hub/chatbot`. |
| **26/11/2026** | Pilar 14 (`/system-master-hub/contratos-comerciais` e `/system-master-hub/clin-whatsapp`) | **Central Privada de Contratos Comerciais (Fidelidade 12m) + Sentinela 24/7 do Bot Clin + Recuperação de Lead Offline:** criada página privada Super Admin para gerar, editar livremente, salvar e baixar contratos comerciais em Word editável (`.doc`) e PDF A4 com carregamento em 1 clique de clínicas cadastradas; implantado Sentinela 24/7 via `pg_cron` (5 min) com keep-alive, auto-cura automática e alertas fora do WhatsApp (E-mail + Push celular `ntfy.sh` + Telegram/Webhook), correção de erro 404 silencioso do Railway e botão de recuperação instantânea de leads offline pelo Bot Clin. |
| **25/11/2026** | Pilar 13 e Pilar 14 (Governança LGPD e Master Hub) | **Encerramento Definitivo Agendado de Clínica (LGPD) + Desbloqueio Exclusivamente Manual:** implantado bloqueio total programável por data/hora via `pg_cron` (encerrando sessões ativas, banindo credenciais no Auth e bloqueando recuperação/redefinição de senha, convites, portal do paciente, agendamento e totem/TV), tela formal **Acesso ao sistema encerrado** (`/conta-bloqueada?type=terminated`), trigger PostgreSQL impedindo desbloqueio automático por webhooks/pagamentos e desbloqueio exclusivo do Super Admin no Master Hub mediante confirmação de `NOVO CONTRATO`. |
| **25/11/2026** | Pilar 11 e Pilar 13 (Infraestrutura e Segurança) | **Remoção Completa da Página Pública + Blindagem de Fluid Active CPU na Vercel:** descontinuada e removida a Página Pública (rota catch-all raiz `/[clinic_slug]`, menu lateral, editor, ajuda e atalhos), implantado escudo de borda anti-scanners (`isBlockedScannerProbe`) no `middleware.ts`, otimizado `config.matcher` para dispensar páginas públicas estáticas, reforçado cache de `FamilyCorrelationStrip`, criada suíte anti-regressão Jest e adicionada a **Seção 15-C** permanente ao Protocolo Global v6.0. |
| **25/11/2026** | Pilar 14 (`/system-master-hub/prospeccao`) | **HQ Privado de Prospecção B2B:** lançada central administrativa privada de vendas com CRM no Supabase, gerador instantâneo client-side de 3 PDFs personalizados com logo oficial redondo (Relatório de Continuidade Multidisciplinar LGPD, Apresentação Executiva 1 página e Proposta Comercial oficial), Biblioteca de Scripts com substituição automática em 1 clique e Cofre privado de documentos com URLs assinadas. |
| **24/11/2026** | Pilar 6 & 13 (`/dashboard/tiss/glosas`) | **Ajuda Lateral Interativa com Pulsar In-Page:** os passos 1 a 4 do menu lateral **Ajuda Glosas** e **Ajuda Recursos** passaram a ser clicáveis sem sair da tela, rolando até a funcionalidade real na página com destaque suave em pulsar (e orientação automática de pré-requisito quando o subnível ainda não foi aberto), mantendo intacto o botão **Abrir Manual Completo em /dashboard/help**. |
| **24/11/2026** | Pilar 12 (`/dashboard/tarefas`) | **Tarefas e Projetos Aprimorados:** removidos todos os nomes técnicos de perfil do banco (`CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`) substituídos por rótulos em português claro, removido `&` dos projetos padrão (código + banco), corrigida persistência completa de checklists e vínculo opcional de paciente, adicionada gestão de projetos (editar/arquivar), KPIs clicáveis, filtro por prioridade, `Limpar filtros`, `Duplicar tarefa`, `Exportar CSV` e modais de confirmação no padrão CliniGo. |
| **24/11/2026** | Pilares 1, 2, 6 & 13 | **CliniGo IA (Escudo LGPD + Motor Híbrido Custo Zero + Trio de Ouro):** lançado motor de IA com anonimização LGPD prévia, cache SHA-256, cota por clínica, cascata gratuita (`Groq` → `OpenRouter` → `Cloudflare`) e fallback local, integrando **Estruturador Instantâneo de Evolução + Check Anti-Glosa** (Prontuário e Planos de Sessão), **Tradutor Empático CliniGo Família**, **Redator Multidisciplinar de Laudos em 3 Tons** e **Advogado Anti-Glosa TISS (Carta ANS no Dossiê PDF)**, com cobertura completa em `/dashboard/help` e CliniGo Academy. |
| **24/11/2026** | Pilar 13 (`/dashboard/help`) | **Central de Ajuda & CliniGo Academy 100% Atualizados + RBAC Estrito:** publicados 4 novos guias dedicados (`Módulos Clínicos`, `Modo Tatame + Curvas ABA`, `Relatório de Renovação 1-Clique`, `Radar Operacional + Meu Repasse Ao Vivo`), enriquecidos 10 guias existentes, adicionadas 8 novas lições práticas nas 3 trilhas do CliniGo Academy com filtro RBAC por rota, mapeado o ícone `?` de `/dashboard/meu-dia` na Sidebar e ativado o repasse de `clinicTheme` para ocultar guias de módulos desativados pela clínica. |
| **23/11/2026** | Pilares 1, 5 & 13 | **Blindagem Global de RBAC por Perfil + Correção Supervisão + Menu Meu Dia Clínico:** unificada a Busca Global (`Ctrl+K`), lista/ficha de pacientes, Planos de Sessão e APIs clínicas na Fonte Única de RBAC (`evaluateDashboardPageAccess`) mantendo 100% de isolamento das exceções pontuais por clínica; adicionado **Meu Dia Clínico** no menu lateral (**Agendamento**) e Hard Gate de servidor; corrigido erro `42703` em `/api/supervision` com isolamento multi-tenant reforçado. |
| **23/11/2026** | Pilares 1, 2, 5, 6 & 8 | **CliniGo 2.0 Completo (4 Pilares):** lançados **Meu Dia Clínico** (`/dashboard/meu-dia`) + **Clonar Última Sessão** em 1 clique; **Raio-X de Rentabilidade por Operadora**, **Memória Anti-Glosa** no Score de Lote e **Dossiê Probatório 1-Clique (Biometria + Evolução Assinada + Guia TISS)**; **Mesa de Supervisão ABA/PEI** (Semáforo de Estagnação, Metas para Promoção, Calibração entre Aplicadores, Prompt Fading e Card Multidisciplinar 7d); **CliniGo Família 2.0** (Mural de Conquistas, Contexto Semanal, Correlação Casa × Clínica, Termômetro Anti-Churn no Radar e Micro-Retorno Estruturado da Escola). |
| **23/11/2026** | Pilar 1 & Pilar 5 | Lançada **Biblioteca Visual de Objetivos de Psicomotricidade (55 objetivos A–K)** com visualização completa antes da escolha, autopreenchimento de critério, impressão/PDF white-label e auto-seed multi-clínica; lançada **Busca Global Universal (`Ctrl+K`)** com ações rápidas diretas por paciente e respeito total a RBAC. |
| **23/11/2026** | Pilar 13 | Blindagem **White-Label Global** removendo todas as ocorrências visíveis de nomes de clínicas clientes em Psicomotricidade, Fila de Espera (WhatsApp dinâmico), Contratos, Prontuários, Teleconsulta e `/buscar`, com trava recursiva permanente em CI. |
| **23/11/2026** | Pilar 5 & Pilar 2 | Lista de Pacientes com botões de ação rápida sempre visíveis (`Abrir Ficha`, `Prontuário`, `Contratos`, `WhatsApp`) e linha clicável; refinamento do `CliniGo Família` (estabilidade do botão Atualizar, layout responsivo do link seguro e logotipo oficial clicável no rodapé). |
| **23/11/2026** | Pilar 1, 6, 7 & 8 | **Fase 2:** Relatório de Renovação de Convênio em 1 clique, **Score de Saúde do Lote TISS (0–100%)**, **Meu Repasse Ao Vivo** (Liberado vs Aguardando Evolução Assinada) e **Radar Operacional da Clínica** no dashboard. |
| **23/11/2026** | Pilar 1 & Pilar 2 | **Fase 1:** Curvas de Aprendizagem PEI/ABA com regra automática de domínio (`>= 80% × 3`), **Modo Tatame DTT/NET 1-toque** e lançamento do **CliniGo Família** (boletim LGPD sem app, atividades em casa com confirmação e feedback ao prontuário). |
| **23/11/2026** | Pilar 13 | **Fase 0:** Central de **7 Módulos Clínicos configuráveis** por clínica, RLS multi-tenant em Contratos e modernização editorial da landing page. |

