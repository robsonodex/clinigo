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

### Modalidade de Atendimento no Cadastro do Paciente (Particular vs Convênio) e Gestão Aprimorada de Convênios
- **Módulo**: Recepção / Pacientes / Faturamento → Modalidade de Atendimento (Particular vs Convênio) e Operadoras de Saúde
- **Caminho**:
  - `supabase/migrations/20260905163000_add_health_insurance_fields_to_patients.sql` → Migration com colunas estruturadas na tabela `patients`: `billing_type` ('particular' | 'convenio'), `health_insurance_id` (FK `health_insurances`), `insurance_card_number`, `insurance_validity`, `insurance_plan_name` e índices de performance `idx_patients_billing_type`, `idx_patients_health_insurance_id`.
  - `app/api/health-insurances/route.ts` → Endpoint `GET`/`POST`: suporte a fallback de sessão Supabase (`createClient()`), permissão para `RECEPTIONIST` cadastrar convênios na recepção.
  - `app/api/health-insurances/[id]/route.ts` → Endpoint `PATCH`/`DELETE`: trava de integridade impedindo a exclusão de operadora caso haja pacientes ativos vinculados, orientando inativação.
  - `app/api/patients/route.ts` → Endpoint `GET`/`POST`: inclusão de campos de convênio e join relacional com `health_insurances(id, name, code)`, mantendo espelhamento na coluna legada `health_insurance` JSONB.
  - `app/api/patients/[id]/route.ts` → Endpoint `GET`/`PATCH`: suporte completo aos campos relacionais no perfil individual.
  - `app/dashboard/(clinic)/pacientes/page.tsx`:
    - Filtro segmentado na barra de pesquisa: `[ Todos ] [ Particular ] [ Convênio ]`.
    - Crachás distintivos na lista da tabela: `Particular` (cinza) e `Convênio: [Nome] • Cart: [Número]` (verde esmeralda).
    - Modal de cadastro com seletor segmentado `Particular` | `Convênio`, select de operadoras, campos para carteirinha, data de validade, nome do plano e alternância de titularidade (paciente titular vs dependente com nome/CPF do titular).
    - Atalho de 1 clique `+ Novo Convênio` (Quick Create Modal) que permite cadastrar e selecionar a operadora na hora em 3 segundos.
  - `app/dashboard/(clinic)/pacientes/[id]/page.tsx`:
    - Cabeçalho com badge da modalidade diretamente ao lado do nome do paciente.
    - Aba "Informações" com bloco estruturado exibindo Modalidade, Operadora, Nº Carteirinha, Plano e Validade.
    - Modal de edição do paciente totalmente alinhado com o seletor Particular vs Convênio e o atalho de criação rápida.
  - `app/dashboard/(clinic)/convenios/page.tsx`:
    - Eliminação de alertas nativos de `confirm()` do navegador e implantação de Modais de Confirmação com a mensagem obrigatória do protocolo: `Tem certeza que deseja excluir [item]? Esta ação não pode ser desfeita.` para operadoras, planos e desvinculação de médicos.
    - Correção de duplicidade de chaves de formulário (`phone`, `email`).
    - Adequação completa de acessibilidade móvel e PWA com botões e targets de toque ≥ 44×44px.
  - `components/layout/sidebar.tsx` → Inclusão da role `RECEPTIONIST` no item de navegação `Convênios e Reembolsos`.
- **Descrição Técnica**:
  - **Retrocompatibilidade Multi-tenant Total**: Todos os pacientes pré-existentes mantiveram o valor padrão `'particular'`, sem quebrar relatórios, faturamentos ou prontuários legados.
  - **Isolamento e Integridade**: Os convênios e planos continuam isolados por `clinic_id`, impedindo contaminação cruzada entre clínicas parceiras.

### Diretório Alfabético A-Z e Paginação Inteligente de Pacientes (Fim da Rolagem Infinita e Roster Completo)
- **Módulo**: Recepção / Pacientes → Roster de Pacientes, Diretório A-Z e Visualização Adaptativa
- **Caminho**:
  - pp/api/patients/route.ts → Remoção do limit fixo rígido de 50 registros; suporte ao parâmetro dinâmico limit=1000 refletindo a contagem real de pacientes (71 na World Sensory) com metadados 	otal: patients.length.
  - pp/dashboard/(clinic)/pacientes/page.tsx →
    - Painel de Métricas (KPIs) recalculado dinamicamente: Total real de pacientes cadastrados, novos no mês, total Particular e total Convênio.
    - Barra de Busca com botão de limpeza rápida [X] em um clique.
    - **Diretório Alfabético A-Z Inteligente**: Barra horizontal responsiva com contadores ao vivo por letra inicial (ex: A (8), B (3)), desativação automática de letras com 0 pacientes e filtragem instantânea em memória (0ms de latência, sem re-fetch).
    - **Barra de Controle de Visualização**: Alternância entre Modo Tabela Compacta e Modo Cartões Visuais (Card Grid).
    - **Seletor de Itens por Página**: Opções de 15, 25, 50, 100 ou Todos os pacientes por página, eliminando a rolagem vertical infinita.
    - **Cartões Visuais Responsivos**: Visualização em cards com avatar de iniciais, crachá de aniversário, CPF, telefone com disparador direto de WhatsApp e atalhos rápidos de 1 clique para Ficha e Prontuário (PEP).
    - **Barra de Paginação Inferior**: Controles de página anterior/próxima e navegação numérica com touch targets de 44×44px.
- **Descrição Técnica**:
  - A limitação de 50 pacientes no backend foi corrigida para permitir que todo o diretório de pacientes seja carregado e indexado instantaneamente no cliente, oferecendo uma experiência fluida para a gestora Patrícia navegar entre 71 ou mais pacientes sem sobrecarga visual.

### Central de Notas Fiscais e Demonstrativos Financeiros de Repasse (Clínica e Profissionais)
- **Módulo**: Financeiro / Repasses & Produção / Meu Financeiro → Central de Notas Fiscais e Demonstrativos
- **Caminho**:
  - supabase/migrations/20260905180000_create_professional_financial_documents.sql → Criação da tabela professional_financial_documents, bucket de storage inancial-documents, índices por clínica/mês/doutor e políticas de RLS estritas com isolamento multi-tenant por clinic_id.
  - pp/api/financial/professional-documents/route.ts → Endpoint seguro GET e POST:
    - GET: Lista os documentos por competência (month_reference) e ano, com join no perfil do profissional e listagem consolidada de todos os profissionais ativos para a clínica.
    - POST: Upload via multipart/form-data para o Storage Supabase, suportando as ações UPLOAD_STATEMENT (pela clínica) e UPLOAD_INVOICE (pelo terapeuta/médico).
  - pp/api/financial/professional-documents/[id]/route.ts → Endpoint PATCH e DELETE:
    - PATCH: Transição de status do documento: APPROVE (aprovar nota fiscal), REJECT (solicitar correção informando motivo obrigatório), MARK_PAID (dar baixa e registrar liquidação do repasse).
    - DELETE: Remoção autorizada exclusiva para administradores da clínica.
  - pp/dashboard/(clinic)/financial/notas-demonstrativos/page.tsx → **Central da Administração da Clínica (Patrícia)**:
    - Seletor de competência mensal com botões de navegação rápida (Mês Anterior / Mês Próximo / Seletor de Data).
    - 5 Cards de KPIs financeiros: Total de Profissionais, Aguardando NF, NF Enviadas (Para Conferir), NF Aprovadas e Total de Repasses Pagos.
    - Tabela consolidada dos profissionais da clínica com status em tempo real (SEM DEMONSTRATIVO, AGUARDANDO NOTA FISCAL, NF ENVIADA, NF APROVADA, CORREÇÃO SOLICITADA, REPASSE PAGO).
    - Modal para Anexar Demonstrativo: Upload de PDF/Excel, valor líquido, produção bruta, deduções e observações.
    - Ações em 1 clique: Visualizar/baixar demonstrativo, visualizar/baixar NF, Aprovar NF, Solicitar Correção com modal de justificativa e Dar Baixa/Confirmar Pagamento.
    - Botão WhatsApp com mensagem pré-formatada inteligente adaptada ao status de cada profissional (aviso de demonstrativo disponível, solicitação de NF ou notificação de correção).
  - components/financial/DoctorFinancialDocumentsView.tsx & pp/dashboard/(clinic)/meu-financeiro/notas-demonstrativos/page.tsx → **Portal do Profissional / Terapeuta**:
    - Histórico anual de demonstrativos disponibilizados pela clínica com valor líquido e link de download.
    - Modal de envio da Nota Fiscal (NFS-e): Upload do arquivo (PDF ou XML), preenchimento do número da nota, valor e data de emissão.
    - Alerta em destaque caso a clínica tenha solicitado correção, exibindo o motivo detalhado e permitindo o reenvio imediato da nota corrigida.
    - Confirmação visual de aprovação e liquidação do repasse.
  - pp/dashboard/(clinic)/meu-financeiro/page.tsx → Integração direta com abas de navegação: [Notas Fiscais & Demonstrativos] e [Fechamentos do Sistema].
  - components/layout/sidebar.tsx → Links dedicados de navegação:
    - Para Administração: Financeiro → Repasses & Produção → Notas & Demonstrativos.
    - Para Profissionais: Meu Financeiro → Notas & Demonstrativos.
- **Descrição Técnica**:
  - Resolução direta da solicitação de Patrícia Mendes (World Sensory): permite que a administração anexe mensalmente os demonstrativos financeiros de repasse calculados para os terapeutas e que os terapeutas anexem suas respectivas notas fiscais de serviço para conferência, aprovação e baixa financeira organizada.

### Gerenciamento, Inativação e Exclusão Segura de Convênios e Planos (Resolução de Cadastros Incorretos)
- **Módulo**: Recepção → Convênios e Reembolsos & Cadastro de Pacientes
- **Caminho**:
  - `lib/types/health-insurance.ts` → Adição de `patients_count?: number` à interface `HealthInsurance`.
  - `app/api/health-insurances/route.ts` → Retorno dinâmico da contagem de pacientes associados a cada operadora (`patients_count`), suporte a filtro por `status` (`ACTIVE`/`INACTIVE`), e ampliação de permissões para `RECEPTIONIST`.
  - `app/api/health-insurances/[id]/route.ts` →
    - Suporte a `DELETE` com query param `unlink_patients=true`: desvincula automaticamente todos os pacientes associados (revertendo para `billing_type = 'particular'` e `health_insurance_id = null`) e remove a operadora em caso de cadastro incorreto.
    - Atualização do endpoint `PATCH` para permitir alternância de status e atualização por recepcionistas.
  - `app/api/health-insurance-plans/[id]/route.ts` → Ampliação de permissão do perfil `RECEPTIONIST` para operações nos planos de saúde.
  - `app/dashboard/(clinic)/convenios/page.tsx`:
    - **Aba Operadoras**:
      - Filtro por status (`Todos`, `Ativos`, `Inativos`).
      - Coluna **Pacientes Vinculados** (`patients_count`) informando visualmente a dependência antes de qualquer ação.
      - Coluna **Status** com Badge visual (`Ativo` / `Inativo`) e ação rápida no menu suspenso de 1 clique para `Inativar` ou `Ativar`.
      - Modal Inteligente de Exclusão contextual:
        - Para operadoras sem pacientes: confirmação direta e segura.
        - Para operadoras com pacientes vinculados: alerta detalhado e opções de "Apenas Inativar" ou "Desvincular Pacientes e Excluir" (com aviso e contagem exata de pacientes afetados).
    - **Aba Planos**:
      - Filtro por status (`Todos`, `Ativos`, `Inativos`).
      - Coluna de Status e ações rápidas para Ativar / Inativar e Excluir com modal de confirmação.
      - Acessibilidade e touch targets ≥ 44×44px em todos os botões e itens interativos.
  - `app/dashboard/(clinic)/pacientes/page.tsx`:
    - Link rápido "Gerenciar" ao lado de "+ Novo Convênio" na seleção de modalidade.
    - Atalho explicativo no rodapé do modal de criação rápida: *"Cadastrou convênio com erro? Gerenciar / Excluir Convênios"*, conduzindo a usuária Patrícia diretamente ao local de exclusão.
- **Descrição Técnica**:
  - Resolve integralmente a dúvida e necessidade de Patrícia (World Sensory): quando um convênio ou plano for cadastrado incorretamente, a usuária pode excluí-lo diretamente na aba de Operadoras (mesmo que pacientes já tenham sido vinculados por engano, através da opção segura de desvinculação em massa) ou simplesmente inativá-lo para que não apareça mais nas opções de novos cadastros.

---

### Atualização 05/09/2026 — Tipo/Nomenclatura de Conselho Profissional, Blindagem de Endereço e Modalidade Híbrida ("Ambos")

- **Módulo**: Cadastros → Profissionais (Médicos/Terapeutas) & Pacientes
- **Caminho**:
  - `supabase/migrations/20260905193000_add_council_name_and_patient_billing_both.sql` → Migration versionada adicionando `council_name TEXT` na tabela `doctors` e constraint `CHECK (billing_type IN ('particular', 'convenio', 'ambos'))` na tabela `patients`.
  - `lib/validations/doctor.ts` → Inclusão dos campos `crm`, `crm_state`, `council_name` e `specialties_additional` nos schemas `createDoctorSchema` e `updateDoctorSchema`.
  - `app/api/doctors/route.ts` → Suporte à gravação do `council_name` na criação de novos profissionais.
  - `app/api/doctors/detail/route.ts` → Correção crítica no endpoint `PATCH`: adicionados `crm`, `crm_state` e `council_name` ao payload de atualização de `doctors` (antes eram ignorados pela API, dando a impressão de salvar sem persistir).
  - `components/forms/doctor-form-dialog.tsx` → Suporte completo a Conselhos Profissionais Multidisciplinares (`CRFa - Fonoaudiologia`, `CRP - Psicologia`, `CREFITO - Fisioterapia/TO`, `CRM - Medicina`, `CRN - Nutrição`, `CRO - Odontologia`, `CRESS - Serviço Social`, `CBO`, e `Outro`), com detecção automática pela especialidade e seleção explícita.
  - `app/dashboard/(clinic)/medicos/page.tsx` → Exibição dinâmica do prefixo correto do conselho profissional (`CRFa/SP`, `CRP/SP`, etc.) nas listagens e cards de profissionais.
  - `app/dashboard/(clinic)/configuracoes/page.tsx` → Adição de `council_label` na query de carregamento dos dados da clínica, evitando reset para CRM padrão.
  - `app/dashboard/(clinic)/pacientes/[id]/page.tsx` →
    - **Blindagem do Endereço**: `loadPatient` agora trata resilientemente endereços legados gravados como string única, objetos JSONB ou colunas soltas (`address_street`, `address_number`, etc.), impedindo que o formulário de edição abra com campos em branco.
    - `handleEditSubmit` agora protege contra nulificação acidental e sincroniza tanto o objeto JSONB `address` quanto as colunas raízes.
    - **Modalidade Híbrida ("Ambos")**: Suporte a `billing_type = 'ambos'`, permitindo que o mesmo paciente seja atendido Particular E por Convênio simultaneamente, preservando e exibindo os dados da operadora e carteirinha.
  - `app/api/patients/[id]/route.ts` & `app/api/patients/route.ts` →
    - Suporte a `billing_type = 'ambos'`.
    - Blindagem contra limpeza indevida dos dados de convênio quando o paciente estiver na modalidade `ambos`.
    - Proteção estrita do campo `address`: só atualiza ou remove se expressamente enviado pelo cliente.
  - `app/dashboard/(clinic)/pacientes/page.tsx` →
    - Suporte a `billing_type = 'ambos'` no formulário de criação rápida, tabela desktop, cards mobile e visualização rápida.
    - Filtro e estatísticas atualizados para computar pacientes da modalidade mista em ambos os relatórios.
---

### Atualização 05/09/2026 — Assistente Inteligente CliniGo IA (Google Gemini) & Central de Sugestões de Novas Funcionalidades

- **Módulo**: Suporte → Assistente IA & Guia do Usuário
- **Caminho**:
  - `supabase/migrations/20260905204000_create_feature_suggestions.sql` → Migration versionada criando a tabela `feature_suggestions` com RLS, índices e campos de identificação da clínica, usuário, contatos e status `PENDING`.
  - `lib/services/gemini-support.ts` → Serviço de integração de IA contextualizada com base de conhecimento do CliniGo, tolerância a picos temporários e cascata de modelos (`gemini-3.6-flash`, `gemini-flash-latest`, `gemini-3.5-flash`, `gemini-3-flash-preview`). Formato JSON estruturado com chave `clickPath` e `suggestFeature`.
  - `app/api/support/ai/route.ts` → Endpoint seguro com autenticação de sessão e extração de contexto da clínica/usuário para consulta ao assistente.
  - `app/api/support/suggest/route.ts` → Endpoint para submissão e registro de ideias e solicitações de novas funcionalidades enviadas pelas clínicas.
  - `components/support/support-assistant-widget.tsx` → Interface interativa com botão flutuante launcher responsivo, chat guiado passo a passo, banner de "Caminho no Sistema" com botão de cópia, e modal pré-preenchido para envio de sugestões.
  - `components/support/support-chat-wrapper.tsx` → Integração direta no Dashboard CliniGo com passagem segura de dados de usuário e clínica.
- **Descrição Técnica**:
  - Permite que qualquer colaborador de qualquer clínica tire dúvidas em linguagem natural e receba o caminho exato dos cliques no formato `👉 Caminho: Menu Lateral → [Módulo] → [Ação] → Botão "[Nome]"`.
  - Caso a funcionalidade solicitada não exista no CliniGo, a IA instrui amigavelmente e ativa o botão "💡 Sugerir Nova Funcionalidade", permitindo registrar a necessidade com dados da clínica e contato para a equipe de produto.



---

### Atualização 06/09/2026 — Lote de Correções e Implementações (Cliente: World Sensory / Patrícia)

#### Item 1 — Agendamento Manual: Horário Livre (Minuto a Minuto) e Listagem de Convênios
- **Módulo**: Recepção → Agenda → Agendamento Manual
- **Caminho**:
  - `components/appointments/ManualAppointmentModal.tsx`
  - `components/appointments/PaymentMethodSelector.tsx`
- **Descrição Técnica**:
  - **1a. Horário Livre**: Substituído o seletor engessado de intervalos de 30 em 30 minutos por `<Input type="time" step="60" ... />` com validação de formato `HH:MM` livre no schema Zod (`timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/`). Agora o usuário pode agendar em qualquer minuto exato (ex: 07:21, 07:56, 08:32), mantendo intactas as validações de conflito de agenda e expediente da clínica.
  - **1b. Convênios no Agendamento**: Integrada a consulta de operadoras de convênio ativas da clínica logada (`/api/health-insurances`) e repassada via prop `healthInsurances` ao seletor de pagamento. Caso a clínica não possua convênios ativos cadastrados, é exibido aviso claro com atalho orientador. Isolamento estrito por `clinic_id`.

#### Item 2 — Nome de Perfil Editável Manualmente
- **Módulo**: Minha Conta → Perfil
- **Caminho**:
  - `app/api/profile/route.ts`
  - `app/dashboard/perfil/components/general-info-tab.tsx`
- **Descrição Técnica**:
  - Corrigida a rota de persistência do perfil: a tabela oficial do PostgreSQL é `users` com a coluna `full_name` (o código anterior tentava atualizar uma coluna inexistente `name`).
  - Adicionada sanitização completa do nome (remoção de tags, espaços extras e limite seguro de 100 caracteres) e sincronização com o metadata do Supabase Auth (`supabase.auth.admin.updateUserById`).
  - Como os módulos do sistema (Agenda, Prontuário, Financeiro, Painel de TV) realizam join dinâmico com `users.full_name`, a alteração reflete imediatamente em todos os pontos do CliniGo.

#### Itens 3 e 4 — Papel Administrativo / Financeiro & Controle de Permissões
- **Módulo**: Configurações → Usuários & Controle de Acesso
- **Caminho**:
  - `supabase/migrations/20260906_world_sensory_updates.sql`
  - `lib/hooks/use-auth.ts`
  - `components/layout/sidebar.tsx`
  - `app/dashboard/(clinic)/configuracoes/usuarios/page.tsx`
  - `docs/CHECKLIST_REGRESSAO_CLINIGO.md`
- **Descrição Técnica**:
  - Adicionado o valor `'FINANCIAL'` ao enum de banco `user_role` via migration versionada.
  - No `use-auth.ts`, adicionada a verificação `isFinancial: effectiveRole === 'FINANCIAL'`.
  - No `sidebar.tsx`, concedido acesso a todos os módulos financeiros, faturamento, notas/demonstrativos, cobranças, comunicação e convênios, bloqueando categoricamente o acesso a prontuários, prescrições e agenda médica.
  - Os colaboradores com papel Administrativo / Financeiro são cadastrados exclusivamente na tabela `users` (sem vínculo na tabela `doctors`), assegurando por design que **nunca apareçam** nas listas de atendimento da agenda, painel de chamada da TV ou seleção de repasse clínico.

#### Item 5 — Ficha Exclusiva de Prontuário / Evolução Terapêutica (World Sensory)
- **Módulo**: Atendimento Clínico → Prontuário / PEP
- **Caminho**:
  - `components/medical-records/WorldSensoryEvolutionForm.tsx`
  - `app/dashboard/(clinic)/prontuarios/[id]/page.tsx`
  - `lib/constants/features.ts`
  - `supabase/migrations/20260906_world_sensory_updates.sql`
- **Descrição Técnica**:
  - Criado o componente dedicado `WorldSensoryEvolutionForm` reproduzindo integralmente a estrutura de "EVOLUÇÃO TERAPÊUTICA" da cliente:
    1. Objetivo da Sessão
    2. Procedimentos Realizados
    3. Resposta do Paciente (Apresentação geral, Desempenho observado e Nível de ajuda necessário)
    4. Interpretação Clínica (O que os dados indicam e Comparação com sessões anteriores)
    5. Conduta
    6. Intercorrências (Descrição da intercorrência, manejo realizado e repercussão clínica)
    7. Orientações ou Contato com Família/Equipe
  - **Bloco de Assinatura Dinâmico**: Nome do profissional logado + Especialidade + Registro do Conselho de Classe (ex: *Crefito 3 – 11193TO*), puxados automaticamente do cadastro do profissional no banco.
  - **Isolamento Multi-tenant Estrito**: Ativado via tabela `clinica_modulos` (`modulo_id = 'evolucao_world_sensory'`) apenas para as clínicas World Sensory e Demo Teste. Clínicas padrão continuam com o modelo tradicional intacto.
  - Exportação fiel para PDF via `html2pdf.js` respeitando o modelo interno fornecido.

#### Item 6 — Correção do Bug Crítico de TDZ ("Cannot access 'eL' before initialization")
- **Módulo**: Cadastros → Médicos/Profissionais → Valores por Paciente
- **Caminho**:
  - `components/doctors/PatientRatesTab.tsx`
- **Descrição Técnica**:
  - Identificada a causa raiz: a função de busca `handlePatientSearch` na linha 151 acessava a constante `patientRates` antes de sua declaração na linha 244 (Temporal Dead Zone). No ambiente de build minificado do Turbopack/Next.js, essa variável foi nomeada como `eL`, gerando o `ReferenceError`.
  - Reposicionado o hook `useQuery` e a declaração de `patientRates` para o topo do componente antes de qualquer manipulador dependente, eliminando completamente a TDZ tanto em desenvolvimento quanto em produção.

#### Item 7 — Notificação Automática ao Anexar Nota Fiscal
- **Módulo**: Financeiro → Notas Fiscais e Demonstrativos
- **Caminho**:
  - `app/api/financial/professional-documents/route.ts`
- **Descrição Técnica**:
  - No endpoint `POST` (ação `UPLOAD_INVOICE`), após o upload com sucesso da nota fiscal pelo profissional, o backend consulta os dados do doutor (`full_name`, `specialty`) e busca todos os usuários com papel `CLINIC_ADMIN`, `FINANCIAL` ou `SUPER_ADMIN` vinculados àquela mesma clínica.
  - Insere registros na tabela `notifications` com o título *"Nota Fiscal Anexada"*, a mensagem *"{Nome} ({Especialidade}) anexou a nota fiscal referente a MM/AAAA"* e o link direto para a conferência financeira. Isolamento estrito por `clinic_id`.

#### Pensando à Frente — Resiliência e Prevenção de Regressão
- **Error Boundary Global do Dashboard**:
  - Criado `app/dashboard/(clinic)/error.tsx` com interface sóbria, ícones neutros e botões de recuperação imediata para impedir telas em branco.
- **Matriz de Permissões e Checklist**:
  - Criado `docs/CHECKLIST_REGRESSAO_CLINIGO.md` documentando a matriz de papéis e as 8 etapas essenciais de homologação pré-deploy.

#### Item 8 — Fechamento Automático de Produção, Cálculo de Repasse e Sigilo Individual por Terapeuta
- **Módulo**: Financeiro → Notas Fiscais e Demonstrativos & Meu Financeiro
- **Caminho**:
  - `app/api/financial/production-summary/route.ts` (API de cálculo com blindagem RBAC)
  - `app/dashboard/(clinic)/financial/notas-demonstrativos/page.tsx` (Central da Administração - Patrícia)
  - `components/financial/DoctorFinancialDocumentsView.tsx` (Portal do Terapeuta - Meu Financeiro)
- **Descrição Técnica**:
  - **Motor de Cálculo Automático**: Criada a rota `/api/financial/production-summary` que recebe `doctor_id` e `month_reference`. Varre os atendimentos realizados no mês (excluindo cancelados e no-shows) e cruza com a tabela de taxas específicas por paciente (`doctor_patient_rates`), aplicando fallback para o contrato padrão do médico (`doctor_contracts`) ou valor base de consulta.
  - **Garantia de Sigilo Absoluto entre Terapeutas (RBAC Backend)**: Quando um usuário autenticado possui o papel `DOCTOR`, o endpoint valida no banco se o ID do médico solicitado pertence estritamente ao seu próprio `user_id`. Tentativas de consultar colegas retornam `403 Forbidden: Acesso negado: você só pode visualizar a sua própria produção`. Nenhum profissional tem acesso a salários, sessões ou demonstrativos de outros terapeutas.
  - **Central da Administração (Patrícia)**:
    - No modal de Anexar Demonstrativo: adicionado o bloco "Cálculo Automático por Produção" com botão "Puxar Produção do Mês", preenchendo automaticamente o valor líquido, produção bruta e notas de fechamento.
    - Na tabela de profissionais: adicionado o botão rápido "Produção" na coluna de Ações, permitindo conferência e exportação em 1 clique.
    - Modal de visualização detalhada com cards de KPI (atendimentos, pacientes únicos, valor bruto e líquido) e tabela completa das sessões com indicação da regra aplicada.
  - **Exportação Profissional em Excel (`ExcelJS`)**:
    - Gerador de planilha com formatação institucional CliniGo, cabeçalho de metadados, blocos de totais consolidados e listagem detalhada de atendimentos com formatação monetária e larguras automáticas.
  - **Portal do Terapeuta (`Meu Financeiro`)**:
    - Adicionado o botão "Conferir Produção" em cada card mensal, permitindo que o terapeuta confira suas próprias sessões e baixe a planilha Excel individual sem visibilidade sobre outros membros da clínica.

### Lote de Melhorias, Investigações e Implantações — World Sensory (Prompt 2)

#### Item 1 — Múltiplas Biometrias Faciais por Paciente e Registro de Frequência
- **Módulo**: Recepção / Pacientes → Ficha do Paciente & Reconhecimento Facial
- **Caminho**:
  - `supabase/migrations/20260906_biometrics_and_session_status.sql`
  - `app/api/patients/[id]/biometrics/route.ts`
  - `components/face-recognition/FaceEnrollment.tsx`
  - `app/dashboard/(clinic)/pacientes/[id]/page.tsx`
  - `app/api/financial/production-summary/route.ts`
- **Descrição Técnica**:
  - Removida a restrição de unicidade (`UNIQUE constraint`) da tabela `patient_face_biometrics` para permitir que múltiplos rostos sejam associados ao mesmo paciente (ex: Paciente, Mãe, Pai, Responsável Legal ou Acompanhante).
  - Adicionadas colunas `person_type`, `person_name` e `notes` em `patient_face_biometrics`.
  - Criado componente em grade para visualização de todas as faces cadastradas na ficha do paciente, com botão de exclusão e modal para novos cadastros fotográficos.
  - Adicionadas colunas `session_status` e `session_status_notes` na tabela `appointments` para registro explícito da presença ('Presente', 'Falta Justificada', 'Falta Injustificada', 'Feriado/Desmarcado').
  - O cálculo de produção e repasse financeiro (`/api/financial/production-summary`) foi ajustado para contabilizar estritamente atendimentos com `session_status === 'Presente'`.

#### Item 2 — Integração da Fila de Espera com o Painel de TV
- **Módulo**: Recepção → Fila de Atendimento & Painel de TV
- **Caminho**:
  - `hooks/pwa/useFila.ts`
  - `app/m/fila/page.tsx`
  - `app/painel-tv/page.tsx`
- **Descrição Técnica**:
  - O hook `useFila` foi atualizado para que a ação de chamar paciente dispare requisição `POST` para `/api/reception/call-patient`.
  - Essa chamada aciona o canal Supabase Broadcast em tempo real, disparando no Painel de TV (`/painel-tv`) o alerta sonoro por voz sintetizada e o card com foto, nome do paciente, sala e terapeuta.

#### Item 3 — Agendamento de Horários Livres, Formas de Pagamento e Filtro de Confirmação
- **Módulo**: Recepção → Agenda
- **Caminho**:
  - `components/appointments/ManualAppointmentModal.tsx`
  - `components/appointments/PaymentMethodSelector.tsx`
  - `components/ui/agenda-view.tsx`
- **Descrição Técnica**:
  - Removida a restrição de intervalos fixos de 30 minutos no modal de novo agendamento, habilitando agendamentos em qualquer minuto livre (`step="60"`).
  - Restaurado o seletor completo de métodos de pagamento (PIX, Cartão de Crédito, Cartão de Débito, Dinheiro, Link de Pagamento, Convênio, Cortesia).
  - Adicionado seletor de filtro de confirmação na barra superior da agenda ("Todos", "Confirmados", "A Confirmar") e badges visuais de status nos cards de atendimento da agenda.

#### Item 4 — Prevenção de Erro TDZ em Importação de Bibliotecas de Planilha
- **Módulo**: Financeiro & Profissionais
- **Caminho**:
  - `components/doctors/PatientRatesTab.tsx`
  - `components/financial/DoctorFinancialDocumentsView.tsx`
- **Descrição Técnica**:
  - Substituída a importação estática de `exceljs` por importação dinâmica assíncrona (`await import('exceljs')`). Isso elimina o erro de Temporal Dead Zone e conflitos de polyfills em navegadores mobile/PWA e no Turbopack.

#### Itens 5 e 7 — Restrição de Acesso ao Módulo WhatsApp
- **Módulo**: Comunicação → WhatsApp
- **Caminho**:
  - `components/layout/sidebar.tsx`
  - `app/dashboard/(clinic)/whatsapp/page.tsx`
- **Descrição Técnica**:
  - O módulo WhatsApp foi bloqueado categoricamente para terapeutas (`DOCTOR`) e financeiro (`FINANCIAL`).
  - O item do menu lateral só é visível e acessível para administradores da clínica (`CLINIC_ADMIN`, `SUPER_ADMIN`) e recepcionistas (`RECEPTIONIST`). Tentativas diretas de acesso por URL redirecionam com mensagem de acesso não autorizado.

#### Item 6 — Contestação de Demonstrativo pelo Terapeuta
- **Módulo**: Meu Financeiro → Demonstrativos
- **Caminho**:
  - `app/api/financial/professional-documents/route.ts`
  - `components/financial/DoctorFinancialDocumentsView.tsx`
- **Descrição Técnica**:
  - Implementada a ação `CONTEST_STATEMENT` na API de documentos do profissional.
  - Adicionado o botão "Apontar Inconsistência" no portal do terapeuta. Ao submeter uma contestação com justificativa, o status do demonstrativo é alterado para "Em Revisão", o upload de nota fiscal fica suspenso e notificações internas são geradas para os administradores e setor financeiro da clínica para reavaliação.

#### Item 8 — Confirmação Automática por WhatsApp e Sincronização com Chat da Recepção
- **Módulo**: Comunicação → WhatsApp & Chat
- **Caminho**:
  - `lib/services/whatsapp-appointment-confirmation.ts`
  - `lib/whatsapp/service.ts`
- **Descrição Técnica**:
  - Criado serviço automatizado que processa mensagens recebidas no WhatsApp da clínica via `messages.upsert`.
  - Respostas afirmativas ("SIM", "CONFIRMO", "CONFIRMAR", "OK") atualizam o agendamento correspondente para `CONFIRMED` e devolvem mensagem automática de confirmação para o paciente.
  - Respostas negativas ("NÃO VOU", "CANCELAR") atualizam o agendamento para `CANCELLED`.
  - Todas as conversas e mensagens recebidas são imediatamente sincronizadas com o banco de dados do Chat Interno (`chat_conversations` e `chat_messages`), permitindo que a recepção atenda e visualize os históricos sem alternar de tela.

#### Item 9 — Auditoria Mensal de Biometria Facial
- **Módulo**: Financeiro → Notas Fiscais e Demonstrativos
- **Caminho**:
  - `app/api/financial/biometric-audit/route.ts`
  - `components/financial/BiometricAuditDialog.tsx`
  - `app/dashboard/(clinic)/financial/notas-demonstrativos/page.tsx`
- **Descrição Técnica**:
  - Criada a API `/api/financial/biometric-audit` que cruza os agendamentos do mês selecionado com os registros biométricos da tabela `patient_face_biometrics`.
  - Desenvolvido diálogo de auditoria com KPIs (total de pacientes com sessões no mês, pacientes com cadastro biométrico ativo, pacientes pendentes e percentual de conformidade), busca textual, filtros de status e botão de exportação consolidada em planilha Excel.

#### Item 10 — Nome de Perfil da Administradora (Patrícia)
- **Módulo**: Minha Conta → Perfil
- **Caminho**:
  - `app/dashboard/perfil/page.tsx`
  - `app/dashboard/perfil/components/general-info-tab.tsx`
- **Descrição Técnica**:
  - Conforme instrução expressa da usuária, o nome no banco de dados não foi alterado via script e permaneceu como 'Patricia Mendes Leonel' (`users.full_name`), preservando total autonomia para que ela edite manualmente na tela de Perfil quando desejar.

#### Item 11 — Ficha de Evolução com Validação de Presença e Assinatura Digital
- **Módulo**: Atendimento Clínico → Prontuário / PEP
- **Caminho**:
  - `components/medical-records/WorldSensoryEvolutionForm.tsx`
  - `components/signature/SignaturePad.tsx`
- **Descrição Técnica**:
  - Adicionado seletor de status de sessão ('Presente', 'Falta Justificada', 'Falta Injustificada', 'Feriado/Desmarcado') no cabeçalho da ficha de evolução. Em casos de falta, um alerta visual informa que a sessão não será computada no repasse financeiro do terapeuta.
  - Integrado o componente `SignaturePad` para captura de assinatura digital via canvas com geração de hash SHA-256 de autenticidade, exibindo o carimbo do profissional (Nome, Conselho e Especialidade) e permitindo a exportação limpa para PDF e impressão.

#### Item 12 — Atualização do Guia de Ajuda Integrado
- **Módulo**: Ajuda e Suporte
- **Caminho**:
  - `app/dashboard/(clinic)/help/page.tsx`
- **Descrição Técnica**:
  - Atualizado o guia com seções dedicadas à Confirmação Automática de Agendamentos por WhatsApp, Auditoria Mensal de Biometria Facial e Políticas de Acesso e Permissões do WhatsApp.

#### Item 13 — Refinamento de Notificações em Tempo Real (Padrão SaaS Premium e Eliminação de Toasts Invasivos)
- **Módulo**: Recepção → Agenda & Sistema de Notificações
- **Caminho**:
  - `supabase/migrations/20260906180000_refine_notification_triggers_silent_feed.sql`
  - `hooks/use-notifications.ts`
- **Descrição Técnica**:
  - **Diagnóstico da Causa Raiz**: Ao agendar com pagamento de balcão (dinheiro/cartão/PIX), o sistema insere em `financial_entries`. O trigger `trg_notify_payment_registered` gerava notificação para todos os administradores (inclusive quem estava operando o agendamento). O listener em `hooks/use-notifications.ts` disparava um toast com `duration: 86400000` (24 horas!), mantendo o aviso permanentemente travado na tela do operador e acumulando a cada agendamento.
  - **Supressão de Auto-Notificação (Zero Self-Toasts)**: O trigger SQL foi refinado com `(NEW.created_by IS NULL OR id != NEW.created_by)`, impedindo que o próprio operador receba notificação redundante de sua própria ação.
  - **Entrega Silenciosa no Sino (Notification Bell Feed)**: Entradas de caixa rotineiras e confirmações de agenda passam a alimentar exclusivamente o feed do Sino de Notificações (`metadata: { silent: true }`), sem gerar popups flutuantes na tela.
  - **Linguagem Sóbria Internacional**: Mensagem atualizada para "Recebimento em caixa: Entrada de R$ X,XX conciliada no caixa."
  - **Correção da Duração de Toasts**: Corrigido o timeout global de notificações de 86.400.000 ms para 4.000 ms (4 segundos), garantindo fechamento suave e automático.

#### Item 14 — Correção do Modelo Neural de Biometria Facial e Redesign Premium da Ficha do Paciente
- **Módulo**: Recepção / Pacientes → Detalhes do Paciente & Biometria Facial
- **Caminho**:
  - `components/face-recognition/FaceEnrollment.tsx`
  - `app/api/patients/[id]/biometrics/route.ts`
  - `app/dashboard/(clinic)/pacientes/[id]/page.tsx`
  - `supabase/migrations/20260906_storage_biometric_photos_policies.sql`
- **Descrição Técnica**:
  - **Correção da Carga dos Modelos Neurais**: Identificado que o componente `FaceEnrollment.tsx` tentava carregar `faceapi.nets.tinyFaceDetector.loadFromUri('/models/face-api')`, enquanto os modelos pré-treinados armazenados em `public/models/face-api/` são os pesos do `ssd_mobilenetv1` (`ssd_mobilenetv1_model-weights_manifest.json` e shards 1 e 2). O código foi atualizado para carregar `faceapi.nets.ssdMobilenetv1`, unificando a arquitetura com o `FaceCheckIn.tsx`, além de adicionar detecção de modelos já em memória e tratamento resiliente de erro com botão de repetição.
  - **Persistência Biométrica e Políticas de Storage**:
    - Criada a rota `POST /api/patients/[id]/biometrics` que processa o salvamento biométrico no servidor, resolvendo a clínica a partir da sessão autenticada, convertendo o thumbnail para buffer e realizando upload seguro.
    - Aplicadas políticas RLS de `INSERT` e `UPDATE` no bucket `biometric-photos` da tabela `storage.objects` isoladas por `clinic_id`.
    - Aplicada migration `20260906_make_biometric_photos_bucket_public.sql` configurando `public = true` no bucket `biometric-photos` e política de leitura pública para renderização direta de miniaturas nas tags `<img>` dos prontuários e no painel de check-in facial.
    - Passado o prop `clinicId` obrigatório no `<FaceEnrollment clinicId={user?.clinic_id || patient.clinic_id} />`.
    - Adicionados `DialogTitle` e `DialogDescription` ocultos com `sr-only` no modal biométrico, eliminando advertências de acessibilidade do Radix.
  - **Correção do Erro de Renderização (`Select is not defined`)**: Adicionada a importação faltante dos primitivos de formulário (`Select, SelectContent, SelectItem, SelectTrigger, SelectValue`) de `@/components/ui/select` em `pacientes/[id]/page.tsx`, eliminando a tela de erro pontual.
  - **Redesign com Padrão SaaS Internacional**:
    - **Hierarquia Tipográfica Unificada**: Eliminada a discrepância entre fontes grandes e pequenas. Todos os blocos agora seguem a escala corporativa: labels em `text-xs font-medium text-slate-500` e valores em `text-sm font-semibold text-slate-900 dark:text-slate-100`.
    - **Máscaras e Formatação Automática**: CPF e telefone agora são renderizados via `formatCPF` e `formatPhone`.
    - **Ações de Cópia Rápida com Feedback Visual**: Botões discretos de cópia para CPF, carteirinha do convênio, telefone e e-mail com confirmação de sucesso instantânea.
    - **Monograma de Avatar**: Iniciais do paciente em container circular com acabamento escuro sofisticado.
    - **Estrutura Modular em 4 Cards**: 1) Identificação do Paciente; 2) Contato & Localização; 3) Modalidade & Cobertura (Particular / Convênio); 4) Biometria Facial com badges de status e botões de ação rápida.

#### Item 15 — Co-branding no Sidebar (Logo CliniGo + Espaço da Clínica) e Correção de Contraste no Check-in Facial
- **Módulo**: Layout / Sidebar & Recepção / Check-in Facial
- **Caminho**:
  - `components/layout/sidebar.tsx` → `Sidebar`
  - `lib/hooks/use-clinic.ts` → `useClinic`
  - `app/dashboard/(clinic)/configuracoes/page.tsx` → `handleLogoUpload`, `onSubmit`
  - `components/face-recognition/FaceCheckIn.tsx` → `detectedPatient dialog`
- **Descrição Técnica**:
  - **Co-branding no Topo da Barra Lateral**:
    - O logotipo da marca CliniGo permanece imutável e renderizado no padrão corporativo.
    - Implementado espaço dedicado e integrado para a clínica parceira exibir o seu logotipo lado a lado, com divisor vertical elegante (`w-[1px] h-5`).
    - Criado o hook reativo `useClinic` que consulta `logo_url` e `name` da tabela `clinics` a partir do `clinic_id` do usuário ou impersonação ativa.
    - Dimensões exatas: logotipo CliniGo em `h-6 w-auto` (24px de altura) e logotipo da clínica em miniatura (`max-w-[85px] h-6 object-contain`, 24px de altura) com link para configurações.
    - Quando a clínica ainda não possui logotipo, é exibido um slot sutil com borda tracejada e ícone `Plus` ("Sua Logo", texto `text-[11px]`) que encaminha o gestor com 1 clique para a tela de configurações gerais (`/dashboard/configuracoes`) para efetuar o upload.
    - Em `configuracoes/page.tsx`, o upload e o salvamento emitem o evento customizado `clinic-profile-updated`, atualizando o sidebar instantaneamente em tempo real sem reload.
  - **Correção do Botão "Não sou eu" no Reconhecimento Facial**:
    - Diagnosticado que o botão "Não sou eu" no overlay escuro de confirmação utilizava `variant="outline"`, que injeta `bg-background` (fundo branco no tema claro) conflitante com a classe `text-white`, tornando o botão inteiramente branco e invisível.
    - Removida a variante outline e aplicada estilização sólida em tom escuro contrastante (`bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600`), com ícone `XCircle` em destaque sutil e área mínima de toque de 44px.

#### Item 16 — Fix Rígido de Dimensionamento de Logo Co-branding e Higienização Visual Corporativa
- **Módulo**: Layout / Sidebar, Configurações Gerais & Dashboard
- **Caminho**:
  - `components/layout/sidebar.tsx` → `Sidebar`
  - `app/dashboard/(clinic)/configuracoes/page.tsx` → `ConfiguracoesPage`
  - `components/dashboard/BirthdayWidget.tsx` → `BirthdayWidget`
- **Descrição Técnica**:
  - **Correção de Dimensionamento do Logotipo CliniGo**:
    - O arquivo SVG original (`public/logo_black.svg`) possui dimensões nativas de 1792x576px.
    - A classe utilitária arbitrária `h-[26px]` não garantia restrição estrita sob compilação dinâmica ou SSR, ocasionando expansão para a largura total do container.
    - Aplicadas propriedades inline `style={{ height: '26px', width: 'auto', maxHeight: '26px', maxWidth: '100px' }}` na tag `<Image>` com a flag `unoptimized={true}`, garantindo renderização direta e exata no tamanho especificado de 26px.
    - O container de link pai foi envolvido com `overflow-hidden` e `style={{ height: '26px', maxHeight: '26px' }}`.
    - O logotipo da clínica também recebeu travas inline `style={{ height: '26px', width: 'auto', maxHeight: '26px', maxWidth: '90px' }}`.
  - **Higienização Visual e Conformidade com SaaS Médico Corporativo**:
    - Eliminados todos os ícones `Sparkles` e decorações espalhafatosas em `configuracoes/page.tsx` (substituídos por `Building2` em Identidade Visual e `Users` em Nomenclatura Profissional).
    - Em `BirthdayWidget.tsx`, removida a barra gradiente multicolorida, removido o ícone festivo `PartyPopper` (substituído por `CalendarDays` sóbrio), removido `Sparkles` e padronizados os badges para paleta corporativa neutra (`variant="secondary"` e `variant="outline"`).

#### Item 17 — Inclusão Mandatória das Diretrizes Globais de SaaS Médico Corporativo Premium Internacional
- **Módulo**: Governança de IA, Regras Globais & Memória do Sistema
- **Caminho**:
  - `.agents/rules/universal-rules.md`
  - `.agent/rules/GEMINI.md`
  - `.agents/memory/project-conventions.md`
- **Descrição Técnica**:
  - Incorporada em todas as instruções globais (ativas para todos os agentes, tarefas e sessões) a diretriz inviolável de **Padrão SaaS Médico Corporativo Premium Internacional**:
    1. **Zero Emojis**: Proibição total e irrestrita de emojis em qualquer tela, botão, título, alerta, notificação ou resposta de IA.
    2. **Iconografia Sóbria**: Uso exclusivo de Lucide Icons neutros. Banimento de ícones festivos, mágicos ou infantis (como `Sparkles` e `PartyPopper`).
    3. **Design Hospitalar e Clínico Elegante**: Cores corporativas sóbrias, contrastes precisos e ausência de gradientes arco-íris ou elementos espalhafatosos.
    4. **Co-Branding e Proporções Harmônicas**: Travas de contenção estritas para marcas e logotipos institucionais.
    5. **Comunicação Profissional**: Tom direto, formal, técnico e sóbrio em português (pt-br).

#### Item 18 — Auditoria Sistêmica Pré-Deploy v5.2, Correção de Enum Postgres (CHECKED_IN / IN_QUEUE) e Sucesso de Build (443 Rotas)
- **Módulo**: Banco de Dados, Qualidade / Testes & Agendamento
- **Caminho**:
  - `supabase/migrations/20260907_add_checked_in_to_appointment_status.sql`
  - `components/appointments/PaymentMethodSelector.tsx`
  - `components/medical-records/WorldSensoryEvolutionForm.tsx`
  - `scripts/test_audit_v5_2.js`
- **Descrição Técnica**:
  - **Causa Raiz Corrigida (PostgreSQL Enum 22P02)**: Identificado que tentativas de salvar ou consultar `status: 'CHECKED_IN'` ou `'IN_QUEUE'` na tabela `appointments` falhavam com erro HTTP 400 (`invalid input value for enum appointment_status: "CHECKED_IN"`). Aplicada migration versionada adicionando os dois valores ao tipo enum no Supabase.
  - **Higienização Visual Estrita (Zero Emojis)**: Eliminado emoji residual em `PaymentMethodSelector.tsx` (linha 161) e removida importação não utilizada de `Sparkles` em `WorldSensoryEvolutionForm.tsx`.
  - **Suíte de Testes Automatizados**: Executado `scripts/test_audit_v5_2.js` com 24/24 testes aprovados cobrindo intenções de WhatsApp, queries com enum, colunas biométricas, assinaturas digitais e conformidade visual.
  - **Validação de Build de Produção**: `next build` executado com sucesso total (Exit Code 0), compilando 443 rotas estáticas e dinâmicas do CliniGo sem erros impeditivos.

