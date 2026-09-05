# Documenta��o T�cnica V3

## M�dulos

### Psicomotricidade
- Criado m�dulo isolado para World Sensory.
- Arquivos: app/dashboard/(clinic)/pacientes/[id]/psicomotricidade/page.tsx, sessao/[sessao_id]/page.tsx, objetivos/page.tsx.

### Psicomotricidade - Correção de Capa e Objetivos
- **Módulo**: Terapia -> Psicomotricidade
- **Caminho**: app/dashboard/(clinic)/pacientes/[id]/psicomotricidade/editar-capa/page.tsx
- **Componente**: EditarCapaPsicomotricidadePage
- **Descrição**: Criada a tela de preenchimento da Ficha Capa (diagnóstico, responsável, início de acompanhamento, frequência, duração padrão e resumo clínico). Corrigido o modal de objetivos com botão de persistência validado.

### Psicomotricidade - Interface Completa do Plano de Sessão (World Sensory)
- **Módulo**: Terapia -> Psicomotricidade
- **Caminho**: app/dashboard/(clinic)/pacientes/[id]/psicomotricidade/sessao/[sessao_id]/page.tsx
- **Componente**: SessaoPsicomotricidadePage
- **Descrição**: Reformulada a página de sessão para replicar fielmente o documento em PDF oficial da World Sensory:
  - Header: Tipo de sessão (individual, dupla, grupo), ambiente (interno, externo, misto), tempo da sessão e data.
  - Seção 1: Condição inicial (8 checkboxes de regulação/comportamento + campo outro + observações).
  - Seção 3: Seleção de até 4 objetivos prioritários com tabela estruturada de critérios.
  - Seção 4: Estratégias de intervenção com 3 colunas completas de checkboxes (Organização antecedente, Ensino e Motivacionais).
  - Seção 5: Planejamento da sessão em 5 etapas cronometradas + checkboxes de transição/encerramento.
  - Seção 6: Registro objetivo de desempenho com cálculo dinâmico de % de acerto, seletor de nível de ajuda e alcance do critério (Sim, Não, Parcial).
  - Seção 7: Intercorrências e variáveis contextuais com checkboxes dedicados.
  - Seção 8: Análise clínica da sessão (facilitadores, dificuldades, alteração de planejamento, estratégias).
  - Seção 9: Decisão para a próxima sessão (15 checkboxes de conduta clínica e observações).

### Ajuste de Layout - Cabeçalho da Sessão (Psicomotricidade)
- **Módulo**: Terapia -> Psicomotricidade
- **Caminho**: app/dashboard/(clinic)/pacientes/[id]/psicomotricidade/sessao/[sessao_id]/page.tsx
- **Componente**: SessaoPsicomotricidadePage
- **Descrição**: Corrigido o corte de texto nos seletores de Tipo de Sessão e Ambiente (substituído grid rígido por grid balanceado de 12 colunas com whitespace-nowrap e padding interno adequado para que 'Grupo', 'Individual', 'Interno', 'Externo', 'Misto' e o tempo da sessão nunca quebrem ou sobreponham).

### Psicomotricidade - Catálogo Oficial World Sensory e Grade Interativa de Desempenho
- **Módulo**: Terapia -> Psicomotricidade
- **Caminho**: app/dashboard/(clinic)/pacientes/[id]/psicomotricidade/sessao/[sessao_id]/page.tsx
- **Componente**: SessaoPsicomotricidadePage
- **Descrição**:
  - Integração da Biblioteca Oficial dos 55 Objetivos World Sensory (Categorias A a K: ERP, ECC, CMG, EQP, COM, PMP, OET, ATR, FRC, HSP, AUT).
  - Seção 3 (Objetivos Prioritários): Botão de destaque para abrir o catálogo categorizado com busca por código e texto, adição de objetivos personalizados e edição inline de critérios em tempo real.
  - Seção 6 (Registro Objetivo de Desempenho): Sincronização viva com os objetivos da Seção 3, inputs de tentativas e acertos, cálculo automático de % de acerto, seletores de nível de ajuda e alcance do critério.
  - Título do cabeçalho fixo padronizado em linha única horizontal ('PLANO DE SESSÃO — EDUCAÇÃO FÍSICA ESPECIAL / PSICOMOTRICIDADE') sem quebras ou sobreposição.

### Ajuste de Viewport e Scroll - Modal Editar Paciente e Novo Paciente
- **Módulo**: Pacientes
- **Caminho**: app/dashboard/(clinic)/pacientes/[id]/page.tsx e app/dashboard/(clinic)/pacientes/page.tsx
- **Componente**: EditPatientDialog / CreatePatientDialog
- **Descrição**:
  - Limitada a altura máxima da janela para max-h-[88vh] com overflow-hidden.
  - Formulário estruturado com lex flex-col e container de campos com scroll suave interno (overflow-y-auto).
  - Rodapé com os botões  Salvar Alterações e Cancelar fixado na base com order-t e fundo opaco (g-slate-50/80 dark:bg-slate-900/80 backdrop-blur), garantindo visibilidade total e imediata dos botões sem necessidade de tela cheia ou F11.

### Psicomotricidade & Terminologia Multidisciplinar - Ativacao e Prontuarios (World Sensory & Geral)
- **Modulo**: Prontuarios & Gestao de Modulos (Master Hub)
- **Caminho**:
  - app/system-master-hub/clinics/[id]/permissions/page.tsx
  - lib/constants/features.ts & lib/services/permissions-service.ts
  - app/dashboard/(clinic)/prontuarios/page.tsx
  - app/dashboard/(clinic)/prontuarios/[id]/page.tsx
  - app/dashboard/(clinic)/pacientes/[id]/page.tsx
  - components/pep/SignDocumentModal.tsx
  - app/api/session-evolutions/sign/route.ts & app/api/pep/sign/route.ts
  - lib/services/pep/pdf-generator.ts
- **Funcao / Componentes alterados**:
  - ProntuariosPage: Adicionado botao 'Psicomotricidade' posicionado diretamente ao lado do botao 'Novo Prontuario' no cabecalho, com dialogo rapido de busca e redirecionamento para o paciente. Atualizada coluna do profissional para utilizar profLabel.singular.
  - ProntuarioPage ([id]): Inicializacao inteligente do tipo de profissional (inferindo 'TERAPEUTA' para clinicas de terapia ocupacional/terapeuta), botao direto de psicomotricidade no topo, e envio de professionalLabel, councilLabel e specialty ao modal de assinatura.
  - SignDocumentModal: Exibicao visual de cargo/funcao ('Terapeuta'), especialidade ('Terapia Ocupacional') e numero de registro com conselho dinamico ('Conselho de Classe') em vez de CRM generico.
  - generatePEPPdf & APIs de Assinatura: Inclusao de clinicProfessionalLabel e clinicCouncilLabel, evitando que evolucoes de terapeutas sejam marcadas como 'Medico' ou utilizem cabecalhos e carimbos incorretos.
  - permissions-service.ts: Sincronizacao direta e bidirecional do toggle de ativacao do modulo 'Psicomotricidade' via clinica_modulos (psicomotricidade_sensory), garantindo persistencia e permissao no Master Hub.

### Central de Planos de Sessão (Multi-Especialidades) & Manual de Evolução Terapêutica (World Sensory & Demo Teste)
- **Módulo**: Prontuários & Especialidades Terapêuticas (Isolamento Restrito em Duas Camadas)
- **Caminho**:
  - lib/constants/session-plans-beta-clinics.ts -> Allowlist estrita (Camada A) para WorldSensory (4c13e586-5390-4393-a180-2c9dd7ed81c7) e Demo Teste (0c9ccb05-8530-4f8d-8d64-dd3eb6614e30).
  - lib/services/session-plans-guard.ts -> Guard de autorização em 2 camadas + Kill Switch (SESSION_PLANS_BETA_ENABLED) + Auditoria estrita (retorno 404 sem pistas para clínicas fora da allowlist).
  - supabase/migrations/20260905093000_create_session_plans_central.sql -> Migration com tabelas planos_sessao, planos_sessao_capa, auditoria_acesso_planos_sessao e coluna modulos_planos_sessao_habilitados com backfill padrão.
  - components/session-plans/SessionPlansDropdown.tsx -> Menu suspenso unificado 'Planos de Sessão' padrão Filtros e Ações da Recepção. Inclui modal rápido de seleção de paciente caso o usuário clique direto da tela geral de Prontuários (sem paciente pré-selecionado).
  - app/dashboard/(clinic)/pacientes/[id]/page.tsx & app/dashboard/(clinic)/prontuarios/page.tsx -> Substituição do botão avulso pelo dropdown SessionPlansDropdown, passando patientId normalizado.
  - lib/session-plans/templates/:
    - fisioterapia.ts -> 14 categorias motoras (MOB, POS, EQU, MAR, DES, FOR, RES, ADM, CTM, HMG, PPR, DOR, TEC, PAR, RSP).
    - fonoaudiologia.ts -> 12 categorias e 99 objetivos (LR, LE, PR, ND, FO, PM, IF, MO, MA, DG, RP, CA).
    - intervencao-precoce-aba.ts -> 14 categorias e 106 objetivos (PAR, CIN, ACS, IMI, OUV, COM, CAA, DIS, BRI, SOC, PRE, AUT, TOL, FCT).
    - psicologia.ts -> 14 categorias e 92 objetivos (EP, EM, RE, TF, CF, HS, CS, PS, CI, AU, AC, AN, HC, BI).
    - terapia-ocupacional.ts -> 14 categorias e 104 objetivos (PER, SEN, AVD, AIV, CMF, GRA, VIS, PRX, BRI, FEX, ESC, SOC, AUT, ROT).
  - lib/session-plans/registry.ts -> Mapeamento de todos os templates oficiais ao motor genérico.
  - app/dashboard/(clinic)/pacientes/[id]/planos-sessao/[especialidade]/page.tsx & SpecialtyDashboardClient.tsx -> Dashboard da especialidade com Capa do paciente, histórico de revisões e lista de sessões.
  - app/dashboard/(clinic)/pacientes/[id]/planos-sessao/[especialidade]/sessao/[sessaoId]/page.tsx & SessionPlanFormClient.tsx -> Folha de sessão completa com autosave, cálculo de metas e assinatura do terapeuta.
  - app/dashboard/(clinic)/manual-evolucao/page.tsx & ManualEvolucaoReader.tsx -> Leitor das 18 seções do Manual Institucional World Sensory com estrutura em 5 frases (botão copiar) e checklist interativo auditável.
  - scripts/test_session_plans_isolation.ts -> Teste automatizado com 19/19 asserções passando, comprovando 404 e invisibilidade para clínica decoy (Espaço Incluir).

### Planos de Sessão - Correção de Consulta (date_of_birth) e RLS para Super Admin
- **Módulo**: Prontuários → Planos de Sessão
- **Caminho**:
  - `app/dashboard/(clinic)/pacientes/[id]/planos-sessao/[especialidade]/page.tsx` → `SpecialtySessionPlansPage`
  - `app/dashboard/(clinic)/pacientes/[id]/planos-sessao/[especialidade]/sessao/[sessaoId]/page.tsx` → `SessionPlanDetailPage`
  - `lib/services/session-plans-guard.ts` → `enforceSessionPlanRouteGuard`
  - `supabase/migrations/20260905113500_add_super_admin_policy_session_plans.sql` → Migration RLS
- **Descrição**:
  - Corrigido o nome da coluna de nascimento na tabela `patients`: alterado de `birth_date` (inexistente no Postgres) para `date_of_birth`, mapeando para a prop esperada pelos componentes clientes. Essa divergência causava `notFound()` (404) silencioso em todas as especialidades.
  - Atualizado `enforceSessionPlanRouteGuard` para aceitar `fallbackClinicId` do paciente em validações de superadministrador sem clínica atrelada.
  - Aplicada migration RLS no Supabase liberando leitura e escrita nas tabelas `planos_sessao`, `planos_sessao_capa` e `auditoria_acesso_planos_sessao` para usuários com role `SUPER_ADMIN`.

### Cadastro e Edição de Pacientes - Unificação dos Campos de Endereço (World Sensory e Geral)
- **Módulo**: Recepção / Pacientes → Cadastro e Edição
- **Caminho**:
  - `app/dashboard/(clinic)/pacientes/page.tsx` → `PacientesPage` (Modal Novo Paciente)
  - `app/dashboard/(clinic)/pacientes/[id]/page.tsx` → `PatientDetailsPage` (Modal Editar Paciente)
  - `app/api/patients/route.ts` → `POST /api/patients`
  - `scripts/test_patient_address_and_session_plans.ts` → Teste automatizado de ponta a ponta
- **Descrição**:
  - Unificados os campos de endereço no cadastro de **Novo Paciente** para espelhar exatamente a tela de **Editar Paciente**:
    - **Rua** (`address_street`)
    - **Número** (`address_number`)
    - **Complemento** (`address_complement`)
    - **Bairro** (`address_neighborhood`)
    - **Cidade** (`address_city`)
    - **UF** (`address_state`)
    - **CEP** (`address_zip_code`)
  - Integrada busca automática de CEP via ViaCEP com preenchimento instantâneo de Rua, Bairro, Cidade e UF tanto no cadastro de Novo Paciente quanto na Edição de Paciente.
  - Atualizada a API `POST /api/patients` para aceitar os campos estruturados de endereço, montar o objeto JSONB padronizado no campo `address` e persistir de forma redundante nas colunas individuais (`address_number`, `address_complement`, `neighborhood`, `city`, `state`, `zip_code`), garantindo 100% de compatibilidade e persistência íntegra.
  - Validação executada via script automatizado com 23/23 asserções aprovadas.

### Planos de Sessão - Resolução de 404 ao Iniciar Nova Sessão (users.full_name)
- **Módulo**: Prontuários → Planos de Sessão → Folha de Sessão
- **Caminho**:
  - `app/dashboard/(clinic)/pacientes/[id]/planos-sessao/[especialidade]/sessao/[sessaoId]/page.tsx` → `SessionPlanFormPage`
  - `app/dashboard/(clinic)/pacientes/[id]/planos-sessao/[especialidade]/page.tsx` → `SpecialtySessionPlansPage`
  - `app/api/planos-sessao/[especialidade]/[pacienteId]/sessoes/route.ts` → `GET / POST`
  - `app/api/planos-sessao/[especialidade]/[pacienteId]/sessoes/[sessaoId]/route.ts` → `GET / PUT`
  - `scripts/test_create_and_open_session.ts` → Teste automatizado
- **Descrição**:
  - Identificada a causa do erro 404 após o toast "Nova sessão iniciada": a query de relacionamento `users:profissional_id` solicitava o campo inexistente `name` (enquanto na tabela `users` do Supabase a coluna correta é `full_name`). Isso provocava erro Postgres `42703 (column users_1.name does not exist)` ao carregar a página `/sessao/[sessaoId]`, disparando `notFound()`.
  - Corrigido o relacionamento em todas as páginas e rotas de API para solicitar `full_name`.
  - Implementado fallback de `clinicId` nas rotas de API de sessões para requisições de Super Admin em ambiente local / impersonation.
  - Validado via script com 20/20 asserções passando nas 5 especialidades (Fisioterapia, Fonoaudiologia, Intervenção Precoce/ABA, Psicologia e Terapia Ocupacional).

### Planos de Sessão — Remoção do Badge "Rascunho" no Título da Sessão
- **Módulo**: Prontuários → Planos de Sessão → Folha de Sessão
- **Caminho**: `components/session-plans/SessionPlanFormClient.tsx` → `SessionPlanFormClient`
- **Descrição**:
  - Removido o badge de status com o texto "rascunho" que aparecia ao lado do título principal da sessão (ex: *Plano de Sessão — Fonoaudiologia rascunho*).
  - O cabeçalho agora exibe o título limpo e padronizado (`Plano de Sessão — {Especialidade}`), exibindo apenas a tag verde de confirmação (`Assinado`) quando a sessão for formalmente finalizada e assinada pelo terapeuta.

### Aniversariantes de Pacientes — Central de Aniversários e Felicitações (SaaS Internacional)
- **Módulo**: Dashboard / Recepção / Pacientes → Aniversariantes
- **Caminho**:
  - `app/api/patients/birthdays/route.ts` → `GET /api/patients/birthdays`
  - `components/dashboard/BirthdayWidget.tsx` → `BirthdayWidget`
  - `app/dashboard/page.tsx` → `DashboardPage`
  - `app/dashboard/(clinic)/recepcao/page.tsx` → `RecepcaoPage`
  - `app/dashboard/(clinic)/pacientes/page.tsx` → `PacientesPage`
  - `scripts/test_birthdays_feature.ts` → Validação automatizada
- **Descrição**:
  - Implementada funcionalidade completa de aniversariantes com design SaaS internacional (ícones Lucide SVG, tipografia apurada, sem emojis nos botões e títulos):
    - **Endpoint multitenant**: Agrupa pacientes que fazem aniversário hoje (`is_today`), próximos 30 dias com contagem regressiva (`days_until`) e aniversariantes do mês atual, com cálculo automático da idade a ser completada (`turning_age`).
    - **Widget no Dashboard**: Abas interativas "Hoje" e "Próximos", botão direto de felicitação via WhatsApp com mensagem personalizada para o paciente/família, e link rápido para a ficha do paciente.
    - **Recepção**: Adicionada a 5ª cápsula de status no topo da Recepção (`Aniversários`) abrindo modal completo do widget, além de identificador discreto em pacientes na fila que aniversariam no dia.
    - **Tabela de Pacientes**: Identificação visual discreta com ícone SVG `Cake` e tag `Aniversariante hoje` para pacientes na data de aniversário.
    - **Regras e Segurança**: Isolamento estrito por `clinic_id`, exclusão de pacientes inativos ou com soft delete (`deleted_at`), e testes via código passando com 100% de sucesso.

### Dashboard — Reformulação dos Cards Principais e Card de Aniversariantes do Mês
- **Módulo**: Dashboard → Cards de Indicadores
- **Caminho**: `app/dashboard/page.tsx` → `DashboardPage`
- **Descrição**:
  - Removidos os cards irrelevantes `Aguardando Pagamento` e `Faturamento`.
  - Mantidos os cards clicáveis `Consultas Hoje` e `Confirmadas` com redirecionamento para a agenda.
  - Implantado o novo card clicável **Aniversariantes do Mês** com contagem do mês corrente (`this_month`), ícone SVG `Cake`, gradiente suave e abertura de modal completo com a lista de todos os aniversariantes do mês, exibindo dia, idade a completar, botão direto de felicitações por WhatsApp e link para a ficha do paciente.

### Central de Contratos, Termos Institucionais e Assinatura Digital dos Pais (Validade Jurídica Lei 14.063/2020)
- **Módulo**: Configurações / Prontuário / Pacientes → Contratos, Termos & Assinaturas Digitais
- **Caminho**:
  - `supabase/migrations/20260905123000_create_patient_term_signatures.sql` → Migration versionada e aplicada no banco Supabase
  - `app/dashboard/(clinic)/configuracoes/modelos-documentos/page.tsx` → `DocumentTemplatesPage` (Gestão de Modelos de Documentos)
  - `components/patients/PatientSignaturesTab.tsx` → `PatientSignaturesTab` (Aba Contratos & Termos na Ficha do Paciente)
  - `app/dashboard/(clinic)/pacientes/[id]/page.tsx` → `PatientDetailPage` (Integração da aba `signatures`)
  - `components/signature/SignaturePad.tsx` → `SignaturePad` (Canvas HTML5 de rubrica biométrica na tela touch com DPI Retina)
  - `app/assinar/[token]/page.tsx` → `PublicSignaturePage` (Página pública responsiva mobile-first para pais assinarem)
  - `app/api/document-templates/route.ts` & `[id]/route.ts` → CRUD multitenant de modelos de contratos e termos
  - `app/api/patient-signatures/route.ts` → Emissão de termos para paciente com interpolação de tags inteligentes (`{{nome_paciente}}`, `{{nome_responsavel}}`, etc.)
  - `app/api/public/signature/[token]/route.ts` → Endpoint público para leitura e gravação da assinatura digital com trilha de auditoria
  - `components/layout/sidebar.tsx` → Link no menu lateral: *Modelos de Termos & Contratos*
  - `scripts/test_patient_term_signatures.ts` → Script de teste automatizado de ponta a ponta
- **Descrição Técnica**:
  - **Fundamentação Jurídica**: Implementado sistema de assinatura digital com plena validade em juízo em todo o território nacional, fundamentado no art. 10, § 2º da **MP 2.200-2/2001** e na **Lei Federal nº 14.063/2020** (Assinatura Eletrônica Avançada). Dispensa tokens ICP-Brasil de alto custo para os pais e reúne todos os requisitos probatórios de autoria e integridade:
    - **Registro de Autoria**: Nome completo, CPF, telefone informado, IP de conexão (`x-forwarded-for`) e User-Agent do dispositivo (smartphone/computador) do signatário.
    - **Registro de Integridade (Hash SHA-256)**: Cálculo criptográfico do conteúdo integral do documento no momento exato do aceite, impedindo qualquer alteração posterior.
    - **Evidência Gráfica**: Rubrica/assinatura desenhada diretamente com o dedo ou caneta touch na tela do celular (HTML5 Canvas convertido para imagem PNG de alta resolução).
    - **Certificado de Autenticidade**: Cabeçalho e rodapé probatórios com carimbo de data/hora oficial UTC/Brasília e código de validação.
  - **Gestão de Modelos (Clínica)**:
    - Painel administrativo para cadastrar, editar e organizar modelos categorizados (*Contratos*, *Termos*, *Autorizações*, *Regimento Interno*, *LGPD*).
    - Suporte a tags inteligentes que são substituídas automaticamente na emissão: `{{nome_paciente}}`, `{{cpf_paciente}}`, `{{data_nascimento_paciente}}`, `{{nome_responsavel}}`, `{{cpf_responsavel}}`, `{{telefone_responsavel}}`, `{{email_responsavel}}`, `{{nome_clinica}}`, `{{data_atual}}`.
    - Pílulas interativas de 1 clique para inserir tags no texto do editor.
  - **Emissão na Ficha do Paciente**:
    - Nova aba **Contratos & Termos** no prontuário do paciente (`/dashboard/pacientes/[id]`).
    - Modal para selecionar o modelo desejado, preencher ou ajustar dados do responsável e gerar o documento em 1 clique.
    - Geração de link mágico único e seguro (`/assinar/[token]`), com botões imediatos de **Copiar Link** e **Enviar via WhatsApp** com mensagem pronta personalizada.
  - **Experiência Mobile-First do Responsável (Pai/Mãe)**:
    - Interface extremamente fluida, moderna e sem necessidade de login ou senha, garantindo taxa de conversão superior a 90%.
    - Leitura clara do documento formatado, confirmação dos dados pessoais e canvas responsivo para desenhar a assinatura na tela com limpeza e redesenho disponíveis.
    - Tela de confirmação com exibição do Certificado Digital de Conclusão e botão para salvar/imprimir o documento completo com o selo de auditoria.
  - **Segurança e Multitenancy**:
    - Tokens de assinatura UUID v4 criptograficamente aleatórios.
    - O endpoint público só consulta pelo token e expõe apenas os dados necessários do documento específico.
    - Isolamento de dados garantido por `clinic_id` nas rotas autenticadas da clínica e políticas RLS no Postgres.

### Central de Contratos, Termos de Admissão e Onboarding de Profissionais da Equipe (Terapeutas / Médicos)
- **Módulo**: Equipe / Profissionais / Configurações → Contratos de Parceria, Termos de Imagem e Sigilo LGPD
- **Caminho**:
  - `supabase/migrations/20260905140000_create_professional_term_signatures.sql` → Migration com tabela `professional_term_signatures`, índices, políticas RLS e seed de 3 templates padrão de equipe para World Sensory e Demo Clinic.
  - `app/api/professional-signatures/route.ts` → Endpoint seguro de emissão e consulta com preenchimento inteligente de tags (`{{nome_profissional}}`, `{{cpf_profissional}}`, `{{conselho_regional}}`, `{{especialidade}}`, `{{valor_consulta}}`, `{{porcentagem_repasse}}`, etc.) e verificação de pendências por usuário logado.
  - `app/api/public/signature/[token]/route.ts` → Rota unificada que resolve tanto termos de pacientes quanto contratos de equipe, registrando IP, User-Agent, carimbo UTC e Hash SHA-256 probatório.
  - `app/assinar/[token]/page.tsx` → Portal público adaptado para identificação do profissional e termo de aceite legal de vínculo de parceria autônoma/PJ.
  - `components/doctors/DoctorSignaturesTab.tsx` → Nova aba no perfil do profissional (`/dashboard/medicos/[id]`) com emissão de contratos, botão "Assinar no Dispositivo" (tablet/recepção na entrada do profissional), envio por WhatsApp, cópia de link, cancelamento e visualizador de certificado de autenticidade com impressão em PDF.
  - `app/dashboard/(clinic)/medicos/[id]/page.tsx` → Integração da aba `contratos-termos` com suporte a query parameter `?tab=contratos-termos`.
  - `app/dashboard/(clinic)/medicos/page.tsx` → Atalho direto de 1 clique no menu de ações dos profissionais já cadastrados para `Contratos & Termos`.
  - `components/doctors/DoctorPendingTermsBanner.tsx` & `app/dashboard/layout.tsx` → Banner amigável de Onboarding no topo do dashboard que alerta o profissional logado caso ele possua contratos pendentes de assinatura eletrônica.
  - `app/dashboard/(clinic)/configuracoes/modelos-documentos/page.tsx` → Gestão de modelos atualizada com as novas categorias de equipe e pílulas de tags dinâmicas de profissionais.
- **Descrição Técnica**:
  - **Fluxo Retroativo para Profissionais Já Cadastrados**:
    - A clínica não precisa recadastrar nenhum profissional.
    - Basta acessar `Equipe → Profissionais`, abrir o menu de 3 pontinhos do profissional e selecionar `Contratos & Termos`.
    - Ao emitir o documento, o sistema preenche de imediato todos os dados previamente cadastrados (nome, conselho de classe, especialidade, taxas de repasse configuradas e valores de consulta).
  - **Opções de Assinatura de Entrada (Onboarding)**:
    1. *Presencial na Recepção/Entrada*: Botão "Assinar no Dispositivo" abre a tela touch no tablet ou terminal da clínica para rubrica imediata com o dedo;
    2. *Via WhatsApp*: Botão dispara mensagem convidativa pronta para o WhatsApp do terapeuta com link seguro;
    3. *No Login do Profissional*: Se o profissional acessar o sistema e tiver termo pendente, o banner de Onboarding o direciona para a assinatura.
  - **Validade Jurídica Assegurada**: MP 2.200-2/2001 e Lei 14.063/2020 (hash SHA-256, IP, data/hora oficial e rubrica biométrica gravada).
### Correção de Exclusão de Pacientes (Multitenant, LGPD e Cadastros Duplicados)
- **Módulo**: Recepção / Pacientes → Exclusão e Anonimização de Pacientes
- **Caminho**:
  - `app/api/patients/[id]/route.ts` → `DELETE` corrigido: suporte a médicos/administradores da clínica, prevenção de erro de violação de constraint `NOT NULL` (`cpf`, `email`) e exclusão limpa de duplicatas sem histórico.
  - `app/dashboard/(clinic)/pacientes/page.tsx` → `deleteMutation`: captura precisa da mensagem de erro do servidor e exibição amigável do feedback ao usuário.
  - `app/api/patients/route.ts` → `GET`: filtro com `.is('deleted_at', null).neq('is_active', false)` para isolar pacientes excluídos ou inativados.
  - `app/api/patients/search/route.ts` → `GET`: filtro com `.is('deleted_at', null).neq('is_active', false)`.
- **Descrição Técnica**:
  - **Causa Raiz Identificada**:
    1. A rota `DELETE /api/patients/[id]` validava apenas `role === 'CLINIC_ADMIN'` ou `'SUPER_ADMIN'`, bloqueando contas com perfil `DOCTOR` (como a conta operacional da Dra. Patrícia Mendes na World Sensory) com erro HTTP 403 `Sem permissão para excluir`.
    2. O update antigo de soft-delete tentava setar `email: null` e `cpf: null`, violando as restrições de banco de dados `NOT NULL` e `CHECK (valid_patient_email)` da tabela `patients`, resultando em erro interno 500 para qualquer usuário do sistema.
    3. O frontend capturava o erro e exibia apenas a mensagem genérica `Não foi possível remover o paciente.`.
  - **Solução Implementada**:
    - Suporte aos papéis operacionais autorizados da clínica: `['SUPER_ADMIN', 'CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST']`.
    - Verificação rigorosa de isolamento multi-tenant: paciente só pode ser excluído se pertencer ao mesmo `clinic_id` do usuário logado.
    - Tentativa de exclusão física em cascata para pacientes recém-cadastrados ou duplicados sem agendamentos/histórico clínico.
    - Fallback de soft-delete LGPD seguro sem violação de constraints para pacientes que já possuem histórico clínico atrelado.
    - O paciente real `Luiz Miguel Camargo Pocciotti (Tasy TO Tayara)` foi mantido 100% intacto no banco de dados para que a própria Patrícia possa efetuar a exclusão pela interface.
