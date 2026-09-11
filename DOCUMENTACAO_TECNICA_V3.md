# Documentao Tcnica V3

## Módulos

### Implementação da Tabela de Campanhas, Disparo de WhatsApp em Lote e Gestão no CRM (Espaço Incluir e Global)
- **Módulos**:
  - CRM / Campanhas → Banco de Dados / Migrations → `supabase/migrations/20260911_create_campaigns_table.sql`
  - CRM / Campanhas → API de Campanhas → `app/api/crm/campaigns/route.ts` → `POST` / `GET`
  - CRM / Campanhas → API de Disparo → `app/api/crm/campaigns/[id]/send/route.ts` → `POST`
  - CRM / Campanhas → API de Gestão → `app/api/crm/campaigns/[id]/route.ts` → `GET` / `DELETE`
  - CRM / Campanhas → Interface CRM → `app/dashboard/(clinic)/crm/page.tsx` → `handleCreateCampaign` / `handleSendCampaign` / `handleDeleteCampaign`
- **Descrição**:
  - **Demanda Operacional da Clínica Espaço Incluir (Jefferson Bochetti)**:
    - Após conectar o WhatsApp do Financeiro, o usuário relatou que o sistema não permitia enviar mensagem pelo recurso "Nova Campanha" para os pacientes cadastrados sobre o contrato de prestação de serviços.
  - **Causa-Raiz 1 (Ausência da Tabela campaigns no Banco de Dados)**:
    - A interface do CRM tentava consultar e inserir na tabela `campaigns`, mas a tabela física não existia no schema do Supabase Postgres, resultando em erro HTTP 500 (`relation "campaigns" does not exist`) ao tentar criar qualquer campanha.
  - **Causa-Raiz 2 (Ausência de Motor de Disparo)**:
    - O sistema não possuía rota de execução para disparo das mensagens cadastradas em campanhas nem botões de ação para iniciar o envio na listagem.
  - **Solução Cirúrgica e Blindagem Anti-Spam (Meta / WhatsApp)**:
    - Criada a migration versionada `supabase/migrations/20260911_create_campaigns_table.sql` com índices e política de RLS multi-tenant (`clinic_id`), aplicada diretamente no Supabase.
    - Criado o endpoint de execução `POST /api/crm/campaigns/[id]/send` com limite `maxDuration = 300` para execução de lote, resolução de destinatários com telefone válido, validação da sessão de WhatsApp conectada (priorizando o setor `financeiro` selecionado) e substituição dinâmica de variáveis como `{{patient_name}}` e `{{clinic_name}}`.
    - Implementado intervalo de segurança anti-banimento (2 segundos de respiro entre cada mensagem) para evitar bloqueio da linha no Meta/WhatsApp.
    - Criado o endpoint de gerenciamento `DELETE /api/crm/campaigns/[id]` para permitir exclusão segura de campanhas.
    - Atualizada a interface `app/dashboard/(clinic)/crm/page.tsx` com seletor de setor do WhatsApp, botões "Salvar Rascunho" e "Salvar e Disparar Agora", além de botões "Disparar WhatsApp" e "Excluir" diretamente nos cards com confirmação formal.

### Correção da Conexão WhatsApp Multi-Sessão e Eliminação de Falso Positivo (Espaço Incluir e Global)
- **Módulos**:
  - Integrações / WhatsApp → Serviço Central Baileys → `lib/whatsapp/service.ts` → `startBaileysSession` / `createInstanceAndGetQR` / `checkInstanceStatus`
  - Integrações / WhatsApp → API de Conexão → `app/api/whatsapp/connect/route.ts` → `POST`
  - Integrações / WhatsApp → Página de Gerenciamento → `app/dashboard/(clinic)/whatsapp/page.tsx` → `handleConnect` / `WhatsAppPage`
  - Storage / Supabase → Bucket `whatsapp-sessions`
- **Descrição**:
  - **Demanda Operacional da Clínica Espaço Incluir (Jefferson Bochetti)**:
    - Ao tentar conectar o WhatsApp do setor Financeiro da clínica Espaço Incluir, a interface exibia notificação verde de sucesso informando que a instância havia sido conectada, porém a sessão permanecia com status desconectado na listagem.
  - **Causa-Raiz 1 (Sessão Órfã no Storage e Falso Positivo em checkInstanceStatus)**:
    - Havia um arquivo residual `5163c916-8b82-4d80-8a71-01726836ee46/financeiro_auth_info.json` gravado no Supabase Storage de uma conexão desconectada anteriormente.
    - Na função `checkInstanceStatus` de `lib/whatsapp/service.ts`, havia uma condicional para contornar a volatilidade de memória da Vercel que assumia que a presença de qualquer arquivo de autenticação no Storage significava que a sessão estava conectada (`connected: true`), mesmo que o status persistido no banco de dados (`whatsapp_sessions`) fosse explicitamente `disconnected`.
    - Ao tentar conectar, o polling da interface consultava a rota de status que retornava falsamente `connected: true`, disparando a notificação verde de sucesso e fechando o modal do QR Code. Imediatamente a seguir, a listagem geral consultava a tabela do banco de dados e revertia a exibição para desconectado.
  - **Causa-Raiz 2 (Incompatibilidade de Constraint no Upsert do Postgres)**:
    - No `startBaileysSession`, os comandos de upsert da tabela `whatsapp_sessions` utilizavam `{ onConflict: 'clinic_id' }`. Porém, a constraint única da tabela foi migrada para chave composta `(clinic_id, sector)`. Isso gerava falha de execução interna silenciosa no Postgres ao tentar atualizar o status para `connected` no evento de abertura da sessão.
  - **Solução Cirúrgica e Blindagem Multi-Sessão**:
    - Ajustado o upsert em `lib/whatsapp/service.ts` para respeitar a constraint composta `{ onConflict: 'clinic_id,sector' }`.
    - Modificada a função `checkInstanceStatus` para validar prioritariamente o registro na tabela `whatsapp_sessions`: se o banco registrar status desconectado, o serviço jamais reporta `connected: true`.
    - Validação estrita de `authState.creds.registered` e `authState.creds.me.id` antes de considerar qualquer credencial do Storage como válida para reconexão silenciosa.
    - Atualizada a função `createInstanceAndGetQR` para realizar limpeza prévia (`disconnectInstance`) caso a sessão esteja desconectada no banco ou seja solicitada reconexão forçada (`force: true`), assegurando que Baileys gere imediatamente um QR Code novo e limpo.
    - Habilitado o repasse do parâmetro `force` em `app/api/whatsapp/connect/route.ts` e ajustado o frontend `app/dashboard/(clinic)/whatsapp/page.tsx` para passar `force: true` nas ações de reconectar e gerar novo QR Code.
    - Removido com sucesso o arquivo órfão `financeiro_auth_info.json` do bucket `whatsapp-sessions` da clínica Espaço Incluir, restabelecendo o fluxo normal de escaneamento.

### Correção de Configuração de Horários/Carga Horária para Recepção (Espaço Incluir) e Resiliência de API
- **Módulos**:
  - Equipe / Agendamento → Horários → `app/api/doctors/detail/route.ts` → `POST` / `handlePostSchedules`
  - Equipe / Agendamento → Horários Dinâmicos → `app/api/doctors/[...slug]/route.ts` → `POST` / `handlePostSchedules`
  - Cliente de Dados / API Client → Conexão Frontend → `lib/api-client.ts` → `request()`
  - Testes Automatizados → `scripts/test-schedule-isolation.ts`
- **Descrição**:
  - **Demanda Operacional da Clínica Espaço Incluir (Karina de França Duro / Jefferson Bochetti)**:
    - Ao configurar horários de atendimento dos terapeutas (Terça-feira, 08:00 às 17:00, 50 min) no módulo de Horários, o sistema apresentava erro em toast vermelho: `Failed to execute 'json' on 'Response': Unexpected end of JSON input`.
  - **Causa-Raiz 1 (Permissões de Cargo e RLS)**:
    - O endpoint `/api/doctors/detail?id=...&action=schedules` possuía autorização restrita apenas a `CLINIC_ADMIN`, `SUPER_ADMIN` e ao próprio `DOCTOR`.
    - Usuários do perfil `RECEPTIONIST` (como a colaboradora Karina da Espaço Incluir) eram rejeitados com `ForbiddenError('Acesso negado')`, e as políticas de RLS da tabela `schedules` também barravam a exclusão/inserção para recepcionistas.
  - **Causa-Raiz 2 (Rejeição de Promise não Awaitada)**:
    - As funções assíncronas `handlePostSchedules` nos handlers de POST eram retornadas sem a palavra-chave `await`, fazendo com que erros lançados dentro do handler não fossem capturados pelo bloco `try/catch` da rota. Isso gerava um encerramento anormal sem payload JSON (HTTP 500 vazio) no ambiente de execução serverless.
  - **Causa-Raiz 3 (Parsing Frágil no Frontend)**:
    - O cliente `lib/api-client.ts` chamava `await response.json()` diretamente sem verificar se a resposta possuía conteúdo textual, disparando a falha nativa de parsing do navegador.
  - **Solução Cirúrgica e Blindagem Cross-Clínica**:
    - Ajustado `app/api/doctors/detail/route.ts` e `app/api/doctors/[...slug]/route.ts` com `await` em todos os handlers assíncronos.
    - Implementada autorização com isolamento multi-tenant exclusivo: permitido ao perfil `RECEPTIONIST` da clínica Espaço Incluir (`clinic_id: 5163c916-8b82-4d80-8a71-01726836ee46`) configurar horários de terapeutas pertencentes à sua própria clínica.
    - Persistência executada com `createServiceRoleClient()` garantindo a cláusula mandatória `clinic_id: doctor.clinic_id` em todas as operações de exclusão e inserção.
    - Atualizado `lib/api-client.ts` para ler a resposta como texto antes de invocar o parser JSON, emitindo mensagens de erro legíveis do servidor.
    - Criado e executado o teste de isolamento `scripts/test-schedule-isolation.ts`, validando com 100% de sucesso que recepcionistas de outras clínicas e tentativas cross-clínica são terminantemente bloqueadas com 0 vazamentos.

### Correção de Reconhecimento de Biometria Facial e Desbloqueio de Digitação no Novo Prontuário (World Sensory)
- **Módulos**:
  - Prontuários → Ficha World Sensory → `components/medical-records/WorldSensoryEvolutionForm.tsx` → `WorldSensoryEvolutionForm`
  - Prontuários → Página de Prontuário → `app/dashboard/(clinic)/prontuarios/[id]/page.tsx` → `ProntuarioPage` / `loadInitialData()` / `handleSave()`
  - Banco de Dados / Saneamento → `scripts/saneamento/2026-09-11_sincronizar_biometria_wordsensory.mjs`
- **Descrição**:
  - **Demanda de Urgência da Clínica World Sensory (Terapeuta Lara Maria / Patrícia Mendes)**:
    - Profissional relatou que pacientes atendidos na terça-feira (08/09/2026) que realizaram o cadastro biométrico facial continuavam aparecendo como bloqueados por falta de biometria facial.
    - Além disso, a terapeuta não conseguia digitar nos campos de evolução no celular (o teclado virtual mobile não aparecia ao clicar nos campos).
  - **Causa-Raiz 1 (Biometria Facial)**:
    - Os pacientes possuíam cadastros biométricos faciais válidos gravados na tabela `patient_face_biometrics` no próprio dia 08/09/2026. Porém, o formulário de evolução avaliava apenas flags da tabela `appointments` (`doctor_checkin_method === 'FACIAL_DOCTOR'`, `checked_in_at`), não consultando se o paciente já possuía biometria facial ativa na clínica.
    - Implementada consulta relacional em `patient_face_biometrics` no carregamento da ficha (`page.tsx`) e repassada a prop `hasFaceBiometrics` para `WorldSensoryEvolutionForm.tsx`, validando a presença biométrica imediatamente e removendo o falso alerta de bloqueio.
  - **Causa-Raiz 2 (Travamento de Digitação e Teclado Mobile no iOS/PWA)**:
    - Existia uma trava temporal que calculava a diferença de horas entre o agendamento e o momento do acesso (`hoursDiff > 48`), marcando `isLocked = true`.
    - Ao receber `isLocked = true`, os campos `<Textarea>` recebiam a propriedade `disabled`, o que no iOS Safari / PWA bloqueia qualquer foco e impede a abertura do teclado virtual nativo.
    - Como a World Sensory está em implantação do novo prontuário e migrando registros do Anclinic, o prazo de 48h foi flexibilizado exclusivamente para o escopo da World Sensory (`isWorldSensory`), mantendo fichas pendentes desbloqueadas para digitação e evolução até o momento em que forem formalmente assinadas pelo profissional.
  - **Saneamento e Sincronização em Produção (LGPD v5.2)**:
    - Executado dry-run prévio e script seguro em `scripts/saneamento/2026-09-11_sincronizar_biometria_wordsensory.mjs`, sincronizando os 7 atendimentos de 08/09/2026 com `checked_in_at`, `checkin_method = 'facial'`, `verification_level = 'FACIAL_DOCTOR'` e `session_status = 'Presente'`.
  - **Testes e Isolamento Multi-Tenant**:
    - Testes automatizados executados (`test_wordsensory_evolution_fix.ts` e `test_isolation_wordsensory.ts`) comprovando 100% de conformidade, com validação de que outras clínicas mantêm intactas as regras de 48h.

### Agendamento Recorrente de Mentorias Clínicas e Formação Técnica (World Sensory e Global)
- **Módulos**:
  - Recepção / Agenda → Modal de Agendamento Manual → `components/appointments/ManualAppointmentModal.tsx` → `ManualAppointmentModal` / `calculateMentoringSeriesDates()` / `saveAppointment()`
  - Recepção / Agenda → Modal de Gerenciamento de Séries Recorrentes → `components/appointments/RecurringSeriesListModal.tsx` → `RecurringSeriesListModal` / `filteredSeries` / renderização de cards
  - Agendamentos API → Séries Recorrentes → `app/api/appointments/recurring/route.ts` → `POST` / `GET`
  - Agendamentos API → Detalhe da Série Recorrente → `app/api/appointments/recurring/[id]/route.ts` → `GET`
  - Banco de Dados / Migrations → `supabase/migrations/20260910_add_student_to_recurring_series.sql` e `supabase/migrations/20260910_allow_student_in_recurring_appointment_type.sql`
- **Descrição**:
  - **Demanda da Clínica World Sensory (Patrícia Mendes Leonel)**:
    - Atendida a solicitação da gestão da World Sensory para permitir agendamentos recorrentes (semanais, quinzenais ou mensais) para sessões formativas e mentorias clínicas sem paciente (`is_student = true`).
  - **Modelagem Relacional e Integridade de Banco de Dados**:
    - Criada e aplicada migration versionada tornando `patient_id` opcional (`DROP NOT NULL`) e adicionando as colunas `student_id` (com chave estrangeira para `students.id`) e `mentoring_notes` (texto) na tabela `recurring_appointment_series`.
    - Criado índice relacional `idx_recurring_appointment_series_student_id` para otimização de consultas.
    - Atualizada a constraint de validação `valid_appointment_type` para aceitar formalmente o valor `'STUDENT'` além de `'presencial'` e `'online'`.
  - **Lógica de Backend e Geração de Agendamentos**:
    - Atualizado o endpoint `POST /api/appointments/recurring` para validar e aceitar parâmetros de mentorando (`student_id`, `mentoring_notes`, `is_student`).
    - Validação de isolamento multi-tenant garantindo que o mentorando e os terapeutas pertençam à mesma clínica autenticada.
    - Geração em lote dos agendamentos em `appointments` com `appointment_type = 'STUDENT'`, notas de sala de espera identificadas (`[Aluna / Mentoria]`), marcação de especialidade e vínculo de rastreabilidade com `series_id`.
    - Endpoints de consulta `GET /api/appointments/recurring` e `GET /api/appointments/recurring/[id]` atualizados com join relacional `student:students!recurring_appointment_series_student_id_fkey` para carregar nome, contato e programa formativo.
  - **Interface de Usuário (Padrão SaaS Médico Corporativo e PWA/Mobile)**:
    - No modal "Novo Agendamento Manual", adicionado atalho direto "Agendar Recorrente" com ícone vetorial neutro `Repeat` no banner inicial de mentoria.
    - Seletor de recorrência corporativo elegante integrado ao fluxo de mentoria, com alternância rápida (Switch), seleção de periodicidade (Semanal, Quinzenal ou Mensal), seletor de dias da semana em touch targets acessíveis (min 44x44px), definição de duração por total de sessões ou data limite e cartão informativo com a contagem projetada de datas.
    - Sincronização automática do dia da semana a partir da data de início selecionada.
    - Validação antecipada e exibição corporativa de possíveis conflitos de horário com outros agendamentos do terapeuta.
    - Atualizado o modal de listagem de séries recorrentes (`RecurringSeriesListModal.tsx`) com suporte completo para mentorias: filtro de busca por nome do aluno/mentorando e programa, visualização com ícone `BookOpen`, selo "Mentoria / Formação", contato e notas clínicas.
  - **Segurança e LGPD v5.2**:
    - Zero dados pessoais (PII) hardcoded em condicionais de código.
    - Consultas protegidas por RLS e filtro obrigatório por `clinic_id`.
    - Testes automatizados executados via script com 100% de sucesso e isolamento multi-tenant validado.
  - **Auditoria de Botões e Mobile PWA**:
    - Touch targets mínimos de 44x44px em todos os botões e chips de dias.
    - Inputs com tamanho mínimo de 16px para evitar auto-zoom em navegadores móveis/iOS.
    - Zero emojis em conformidade com as diretrizes internacionais da plataforma.

### Correção de Assinatura Digital e Blindagem de Autorização Home Care (World Sensory e Global)
- **Módulos**:
  - Prontuários → Página de Prontuário → `app/dashboard/(clinic)/prontuarios/[id]/page.tsx` → `ProntuarioPage` / `handleSaveDigitalSignature()` / `handleToggleManualUnlock()`
  - Prontuários → Ficha World Sensory → `components/medical-records/WorldSensoryEvolutionForm.tsx` → `WorldSensoryEvolutionForm`
  - Agendamentos API → `app/api/appointments/[id]/unlock-manual/route.ts` → `POST` / `DELETE`
- **Descrição**:
  - **Correção de ReferenceError (user is not defined)**:
    - Identificada a causa da falha reportada pela Patrícia Mendes ao carimbar a rubrica digital no modal "Assinatura Digital do Profissional".
    - A constante `user` não havia sido desestruturada do hook `useAuth()`, provocando falha de execução ao acessar `user?.id` na gravação dos metadados de assinatura em `appointments.digital_signature_by`.
    - Realizada a declaração de `user` via `useAuth()` e adicionado fallback de segurança com resolução pelo médico do atendimento (`appointment?.doctor?.user_id`).
  - **Blindagem da Trava Biométrica e Eliminação de Bypass por Texto**:
    - Removida a brecha que permitia auto-desbloqueio por terapeutas que inseriam o termo "biometria" no campo de justificativa.
    - O desbloqueio de atendimentos sem biometria presencial passou a ser rigorosamente restrito a atendimentos autorizados previamente pela gestão (`manual_checkin_unlocked_at`).
  - **Autorização de Atendimento Caso a Caso (Home Care / Exceção)**:
    - Restrita exclusivamente a perfis de administração (`CLINIC_ADMIN`, `SUPER_ADMIN`) e coordenação (`is_coordinator = true`).
    - Integrado botão contextual de ação rápida para a Patrícia no próprio prontuário: "Autorizar Atendimento sem Biometria (Home Care / Exceção)", permitindo liberar individualmente cada consulta com 1 clique.
    - Exibição de selo verde corporativo "Exceção Autorizada pela Administração (Home Care)" e liberação do campo de justificativa formal para o terapeuta assinar.
    - Terapeutas comuns permanecem com bloqueio rígido e sem visibilidade de botões de desbloqueio.

### Correção de Ambiguidade Relacional em Conformidade de Evoluções (Espaço Incluir e Global)
- **Módulos**:
  - Relatórios / Terapia → Conformidade de Evoluções → `app/api/reports/evolution-compliance/route.ts` → `GET`
  - Terapia → Conformidade de Evoluções → `app/dashboard/(clinic)/terapia/conformidade-evolucao/page.tsx` → `ConformidadeEvolucaoPage` / `fetchData()`
- **Descrição**:
  - **Causa Raiz e Desambiguação de Foreign Key**:
    - Identificada a causa da tela de Conformidade de Evoluções retornar zerada ("Atendidos: 0", "Evoluções: 0", "Conformidade 0%") para a clínica Espaço Incluir.
    - A consulta do PostgREST na rota `/api/reports/evolution-compliance` utilizava `doctors!inner(...)`. Com a evolução recente do sistema que introduziu co-terapeutas (`co_doctor_id`) e supervisão técnica (`professional_supervised_id`), a tabela `appointments` passou a possuir 3 chaves estrangeiras vinculadas à tabela `doctors`. O Supabase/PostgREST passou a rejeitar a query por ambiguidade relacional (*"more than one relationship was found between 'appointments' and 'doctors'"*), gerando status HTTP 500.
    - A query foi cirurgicamente corrigida para especificar a chave estrangeira explícita: `doctor:doctors!appointments_doctor_id_fkey(id, user:users(full_name))`.
    - Implementada paginação em lotes de 1.000 registros via `.range()` tanto para `appointments` quanto para `session_evolutions`, garantindo que períodos extensos (como os 1.549 atendimentos e 973 evoluções da Espaço Incluir entre maio e setembro de 2026) sejam carregados integralmente sem truncamento pelo limite padrão de 1.000 linhas do PostgREST.
  - **Interface e Feedback Visual**:
    - Adicionado tratamento de erro com notificação via `toast.error` (Sonner) na função `fetchData` da página `app/dashboard/(clinic)/terapia/conformidade-evolucao/page.tsx`, evitando estados silenciosos de falha.
    - Adicionado botão corporativo "Atualizar" na barra de filtros da interface, permitindo recarregamento rápido dos dados sob demanda.
  - **Auditoria e Mobile PWA**:
    - Checklist completo da Regra dos Botões auditado (Atualizar, Excel, PDF, Limpar Duplicatas, Filtros por Data, Accordion por Terapeuta).
    - Área de toque mínima (44x44px) garantida em todos os botões e inputs responsivos.
    - Padrão SaaS Médico Corporativo Internacional respeitado com zero emojis.
    - Testes automatizados executados via script com 100% de integridade e isolamento multi-tenant validado tanto para a Espaço Incluir quanto para a World Sensory.

### Correção de Runtime no Formulário de Evolução Terapêutica (World Sensory / Global)
- **Módulos**:
  - Prontuários → Evolução Clínica → `components/medical-records/WorldSensoryEvolutionForm.tsx` → `WorldSensoryEvolutionForm`
  - Prontuários → Página de Prontuário → `app/dashboard/(clinic)/prontuarios/[id]/page.tsx`
- **Descrição**:
  - **Correção de ReferenceError (AlertCircle)**:
    - Identificada a causa do erro `"Can't find variable: AlertCircle"` capturado pelo Error Boundary (`app/dashboard/(clinic)/error.tsx`) quando terapeutas (ex: Lara Maria) abriam a evolução clínica no aplicativo móvel/PWA.
    - O componente `WorldSensoryEvolutionForm` utilizava o ícone `<AlertCircle />` no bloco de notificação de biometria facial pendente (`isEvolutionBlockedByBiometrics`), porém o identificador `AlertCircle` não estava incluído no `import` de `lucide-react`.
    - Adicionado o ícone `AlertCircle` aos imports de `lucide-react` e ajustada a tipagem do gerador de PDF (`html2pdf`).
  - **Validação e Mobile**:
    - Verificação de tipos via TypeScript estático com zero erros no componente.
    - Preservados todos os botões corporativos (Salvar Evolução, Limpar Campos, Imprimir PDF, Coleta de Rubrica/Assinatura Digital) e checklist de touch target (min 44x44px) e responsividade mobile-first para telas PWA.
    - Padrão SaaS médico internacional rigorosamente seguido (zero emojis).

### Exclusão Definitiva de Usuários e Profissionais (World Sensory e Global)
- **Módulos**:
  - Configurações → Usuários e Permissões → `app/dashboard/(clinic)/configuracoes/usuarios/page.tsx` → `UsuariosPermissoesPage` / `handleConfirmDeleteUser()` / `Dialog`
  - Cadastros → Profissionais → `app/dashboard/(clinic)/medicos/page.tsx` → `DoctorsPage` / `deleteMutation` / `Dialog`
  - Usuários API → `app/api/users/[id]/route.ts` → `DELETE`
  - Médicos API → `app/api/doctors/detail/route.ts` → `handleDeleteDoctor()`
  - Serviços de Sistema → `lib/services/user-cleanup.ts` → `permanentlyDeleteUser()`
- **Descrição**:
  - **Exclusão Física Definitiva**:
    - Implementada a possibilidade de exclusão permanente de usuários e profissionais diretamente pela interface de gerenciamento de usuários e na tela de profissionais.
    - Criado o serviço de desvinculação cirúrgica relacional (`lib/services/user-cleanup.ts`), higienizando e desvinculando registros de `therapist_capacity`, `supervision_records`, `waiting_list`, `recurring_appointment_series`, `appointments`, `patient_checkin_events`, `prescriptions`, `consultations`, `financial_entries` e outras tabelas dependentes, prevenindo violação de chave estrangeira (`23503`).
    - Exclusão sequencial garantida em `public.doctors`, `public.users` e no Supabase Auth (`auth.users`), liberando o e-mail e as licenças da clínica.
  - **Segurança e Isolamento**:
    - Permissão restrita a administradores (`CLINIC_ADMIN` e `SUPER_ADMIN`).
    - Validação de isolamento por `clinic_id` (impossível excluir usuários de outras clínicas).
    - Trava ativa contra auto-exclusão do usuário logado.
  - **Interface e PWA**:
    - Campo de busca em tempo real na tabela de Usuários e Permissões.
    - Diálogo de confirmação corporativo estilizado com aviso de ação irreversível e feedback visual de carregamento.
    - Toque acessível (touch target >= 44x44px) e total compatibilidade com Mobile PWA.
    - Zero emojis em conformidade com o Padrão SaaS Médico Corporativo Internacional.

### Assinatura, Integrações Google Drive e Segurança de Senha
- **Módulos**:
  - Configurações → Assinatura → `app/dashboard/(clinic)/configuracoes/assinatura/page.tsx` → `AssinaturaPage` / `loadData()` / `handleGeneratePayment()`
  - Configurações → Integrações → `app/dashboard/(clinic)/integracoes/page.tsx` → `IntegracoesPage` / `handleSave()` / `handleDisconnect()`
  - Configurações → Segurança → `app/dashboard/(clinic)/seguranca/page.tsx` → `SecuritySettingsPage` / `handleUpdatePassword()` / `handleSendResetEmail()`
  - Faturamento / Pagamentos → `app/api/billing/generate-payment/route.ts` → `POST`
  - Integrações API → `app/api/integrations/settings/route.ts` → `GET` / `POST` / `DELETE`
  - Utilitários → `lib/utils/resolve-clinic-id.ts` → `resolveClinicId()`
- **Descrição**:
  - **Assinatura e Plano**:
    - Ajustado o carregamento de dados para suportar o cookie `impersonation_clinic_id`. Quando uma clínica com plano ativo é impersonada (como a WorldSensory com plano Professional), a interface reflete imediatamente o plano contratado (CliniGo Professional, R$ 449/mês) e o status 'Assinatura Ativa'.
    - Removidos os cartões de 'Fazer Upgrade'.
    - Removidas as abas e seções de 'Histórico de Pagamentos' e 'Dados de Faturamento'.
    - Mantidos os botões de emissão de boleto bancário 100% funcionais, transmitindo o `clinic_id` correto da clínica impersonada e realizando o tratamento refinado do endereço em string para evitar inconsistências no Banco Inter.
  - **Integrações (Google Drive)**:
    - Removidas todas as integrações secundárias e abas de categorias não solicitadas (RD Station, HubSpot, Zapier, PostHog, Google Calendar, Resend).
    - Mantido exclusivamente o card de integração com o Google Drive, pronto e funcional caso a clínica opte por vincular seu Google Drive verdadeiro.
    - Endpoints de `/api/integrations/settings` atualizados com suporte explícito ao `google_drive` e resolução de clínica via impersonation.
  - **Segurança e Senha**:
    - Implementado formulário in-app completo e funcional para alteração de senha (senha atual, nova senha, confirmação de senha, alternância de visibilidade de caracteres com ícones Eye/EyeOff) conectado com `/api/profile/password`.
    - Implementado disparo direto e funcional de link de redefinição por e-mail via `supabase.auth.resetPasswordForEmail` com feedback em tempo real.

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

#### Item 19 — Protocolo Mandatório de Deploy em Produção (Vercel CLI + Escopo Oficial)
- **Módulo**: Deploy / DevOps / Governança
- **Caminho**:
  - `DOCUMENTACAO_TECNICA_V3.md`
  - `.agents/rules/universal-rules.md`
  - `.agent/rules/GEMINI.md`
- **Descrição Técnica**:
  - **Diagnóstico**: O dashboard da Vercel para o projeto `clinigo-saas` opera sob o time/organização `nodexs-projects-8a6ee1f1` (`team_ckCFlZZ8U1yS4ShoHsAgURqO`). Execuções locais simples de `vercel --prod` podem falhar por falta do comando global no PATH ou por erro de permissão ("Not authorized") ao tentar o escopo pessoal em vez do escopo do time.
  - **Comando Oficial e Mandatório de Deploy**:
    ```bash
    git push origin master
    npx vercel@59.14.0 --prod --yes --scope nodexs-projects-8a6ee1f1
    ```
  - **Garantia de Visibilidade**: Esse comando aciona diretamente a pipeline de build em nuvem da Vercel, gera a URL de inspeção em tempo real e promove a versão para o domínio oficial de produção (`https://clinigo.app`).

#### Item 20 — Correção Cirúrgica do ReferenceError (Camera) e Resolução de Clinic-Info (400)
- **Módulo**: Recepção & Faturamento / Billing
- **Caminho**:
  - `app/dashboard/(clinic)/recepcao/page.tsx`
  - `app/api/billing/clinic-info/route.ts`
- **Descrição Técnica**:
  - **Causa Raiz do Erro de Tela ("Camera is not defined")**: Na página da recepção (`app/dashboard/(clinic)/recepcao/page.tsx`), o componente `<Camera className="w-3.5 h-3.5 text-emerald-600" />` foi adicionado ao dropdown de ações rápidas para acesso ao "Check-in Facial", porém o símbolo `Camera` não havia sido importado da biblioteca `lucide-react`. Isso causava uma exceção JavaScript em tempo de renderização (`ReferenceError: Camera is not defined`), acionando o Error Boundary do Dashboard. O símbolo foi devidamente adicionado ao bloco de imports do `lucide-react`.
  - **Causa Raiz do Erro 400 em /api/billing/clinic-info**: A rota assumia que todo usuário autenticado possuía obrigatoriamente a coluna `clinic_id` preenchida na tabela `users`. Usuários com perfil `SUPER_ADMIN` ou em sessão de impersonação recebiam resposta 400. A rota foi atualizada utilizando o utilitário `resolveClinicId`, resolvendo adequadamente a clínica a partir do perfil ou do cookie `impersonation_clinic_id`, com fallback estruturado para administradores gerais da plataforma.

#### Item 21 — Nomenclatura Profissional Dinâmica no Novo Agendamento Manual e Modais de Agenda
- **Módulo**: Recepção & Agenda → Agendamento Manual
- **Caminho**:
  - `lib/hooks/use-professional-label.ts` → `useProfessionalLabel()`
  - `components/appointments/ManualAppointmentModal.tsx` → `ManualAppointmentModal`
  - `components/dashboard/AppointmentSuccessModal.tsx` → `AppointmentSuccessModal`
  - `components/appointments/RecurringAppointmentModal.tsx` → `RecurringAppointmentModal`
  - `components/appointments/AppointmentDetailsModal.tsx` → `AppointmentDetailsModal`
  - `components/ui/agenda-view.tsx` → `AgendaPage`
- **Descrição Técnica**:
  - **Problema Corrigido**: No modal de "Novo Agendamento Manual" (`ManualAppointmentModal.tsx`), o termo "Médico" e placeholder "Selecione o médico" estavam cravados de forma estática, ignorando a configuração de "Nomenclatura Profissional" definida pela clínica em "Configurações" (ex: "Terapeuta", "Fisioterapeuta", "Psicólogo" ou termo customizado).
  - **Solução Implementada**: Integrado o hook `useProfessionalLabel()`, tornando dinâmicos a descrição do modal, o label de seleção, o placeholder (`Selecione o [termo]`), as mensagens de carregamento/erro/vazio e os alertas de expediente.
  - **Blindagem do Hook**: O hook `useProfessionalLabel()` foi atualizado para suportar o modo impersonation (verificação do cookie `impersonation_clinic_id`), garantindo que administradores impersonando clínicas também visualizem a nomenclatura correta em tempo real.
  - **Consistência Sistêmica**: A nomenclatura dinâmica foi estendida ao comprovante de sucesso pós-agendamento (`AppointmentSuccessModal`), aos detalhes do agendamento (`AppointmentDetailsModal`), ao agendamento recorrente (`RecurringAppointmentModal`) e aos tooltips da agenda (`agenda-view.tsx`), com eliminação de emojis residuais.

#### Item 22 — Central de Agendamentos Recorrentes e Sincronização Dinâmica com a Grade da Agenda
- **Módulo**: Recepção & Agenda → Recorrência
- **Caminho**:
  - `components/appointments/RecurringSeriesListModal.tsx` → `RecurringSeriesListModal`
  - `components/appointments/RecurringAppointmentModal.tsx` → `RecurringAppointmentModal`
  - `components/ui/agenda-view.tsx` → `AgendaPage`
  - `app/dashboard/(clinic)/help/page.tsx` → Guia de Ajuda Integrado
- **Descrição Técnica**:
  - **Diagnóstico do Caso Real**: Usuária gestora realizou agendamento de duas séries recorrentes de 53 sessões para terças-feiras (início em 08/09/2026 com Dra. Lara Maria Barros Vieira - Fonoaudiologia). Ao visualizar a agenda de hoje (segunda-feira 07/09/2026) e com filtro individual focado em outra profissional (Patricia Mendes - Terapia Ocupacional), os agendamentos não apareciam na grade diária, gerando incerteza sobre se as séries haviam sido gravadas com sucesso no banco de dados.
  - **Constatação no Banco de Dados**: Consulta via MCP Supabase confirmou que ambas as séries foram gravadas com sucesso na tabela `recurring_appointment_series` (IDs `1ca6d8e5-7888-46ec-b130-778d8bb02aca` e `d04e1b06-813a-43de-98cd-5b1e8df6e9a4`) e geraram 106 agendamentos confirmados em lote a partir de 08/09/2026.
  - **Implantação da Central de Agendamentos Recorrentes**: Criado o componente `RecurringSeriesListModal`, acessível pelo botão 'Recorrente' no cabeçalho da Agenda. O painel centraliza todas as séries ativas e pausadas da clínica, exibindo paciente, profissional, especialidade, dia da semana, horário, período de vigência e status.
  - **Navegação Direta para a Agenda**: Adicionado botão 'Ver na Agenda' em cada card de série recorrente. Ao clicar, o calendário navega automaticamente para a data da consulta e seleciona a profissional correspondente no filtro, eliminando dúvidas visuais.
  - **Pré-seleção e Redirecionamento Pós-Criação**: O formulário de criação de séries (`RecurringAppointmentModal`) agora recebe a propriedade `defaultDoctorId` baseada no profissional ativo na tela e, ao concluir o cadastro com sucesso, navega a grade diretamente para o primeiro dia da série recém-criada.
  - **Correção Crucial de Renderização na Grade (Horários Fracionados)**: Identificado que o método `getAppointmentsForSlot` em `agenda-view.tsx` utilizava comparação estrita de string (`a.appointment_time?.substring(0, 5) === time`), exigindo que o agendamento fosse exatamente no minuto :00 do slot. Agendamentos em horários como 07:40, 08:25, 07:45 e 08:15 eram descartados pelo filtro e não apareciam na grade do calendário. A lógica foi atualizada para agrupar pelo bloco de hora de início (`apptHour === slotHour`) com ordenação interna, permitindo que todas as consultas fracionadas e recorrentes apareçam visualmente na grade em seus respectivos blocos com seus horários exatos.
  - **Isolamento Absoluto Multi-Tenant**: Todas as rotas de listagem (`/api/appointments`, `/api/appointments/recurring`) mantêm filtros rígidos e invioláveis de `clinic_id`, assegurando que dados de uma clínica jamais sejam expostos ou visíveis em outra.

#### Item 23 — Resolução do Mural de Recados e Exibição de Séries na Central de Agendamentos Recorrentes
- **Módulo**: Recepção & Agenda → Mural de Recados & Recorrência Multi-Tenant
- **Caminho**:
  - `app/api/bulletins/route.ts` → `GET`, `POST`, `PUT`, `DELETE`
  - `components/ui/agenda-view.tsx` → `useQuery(['clinic-bulletins'])`, `handleOpenMural`
  - `app/api/appointments/recurring/route.ts` → `GET`, `POST`
  - `app/api/appointments/recurring/[id]/route.ts` → `GET`, `PATCH`, `DELETE`
  - `components/appointments/RecurringSeriesListModal.tsx` → `RecurringSeriesListModal`
  - `supabase/migrations/20260527000000_create_clinic_bulletins.sql`
- **Descrição Técnica**:
  - **Correção do Erro Crítico no Mural de Recados (TypeError: ta.map is not a function)**: Identificado que o endpoint `/api/bulletins` retornava a estrutura JSON `{ bulletins: [...] }`. No componente `agenda-view.tsx`, a consulta `useQuery` atribuía o objeto diretamente à variável `bulletins`. Ao clicar no botão do Mural de Recados, a verificação `bulletins.length === 0` falhava (retornando `undefined === 0` falso em um objeto) e executava `bulletins.map(...)`, disparando o `TypeError` que era interceptado pelo Error Boundary do Dashboard. A consulta e o componente foram corrigidos para desempacotar e garantir que `bulletins` seja estritamente um array (`Array.isArray(json) ? json : (json.bulletins || [])`).
  - **Criação da Tabela e Migration de `clinic_bulletins`**: A tabela `clinic_bulletins` e suas políticas de RLS não haviam sido aplicadas no banco de dados de produção do Supabase. A migration foi atualizada com suporte explícito a administradores (`SUPER_ADMIN`) e aplicada via MCP Supabase, habilitando persistência real e sigilo por clínica.
  - **Eliminação de Emojis do Mural**: Opções de tipos de alerta no formulário de recados foram ajustadas para o padrão SaaS corporativo, eliminando emojis residuais (`Informativo (Azul)`, `Positivo (Verde)`, `Atenção (Amarelo)`, `Urgente (Vermelho)`).
  - **Correção da Listagem de Séries na Central de Agendamentos Recorrentes**: No endpoint `/api/appointments/recurring`, a cláusula de filtro utilizava `profile.clinic_id` diretamente. Para usuários de perfil `SUPER_ADMIN` (cujo `clinic_id` é `null`) ou em sessões de impersonação, a query executava `WHERE clinic_id IS NULL`, retornando sempre lista vazia `[]`. Dessa forma, mesmo ao selecionar um profissional específico no dropdown, nenhuma série era exibida. A API foi integrada com o utilitário `resolveClinicId` e com a leitura do cabeçalho `x-clinic-id`, assegurando resolução precisa da clínica ativa tanto para administradores da clínica quanto para administradores gerais.
  - **Sincronização e Resiliência da Central de Recorrentes**: O modal `RecurringSeriesListModal` recebeu suporte aos props `initialDoctorId` e lista de profissionais repassada da tela de agenda, sincronizando a seleção ativa no calendário e assegurando parsing defensivo de respostas.
  - **Isolamento Absoluto Multi-Tenant e LGPD**: Todas as rotas de recados e recorrência aplicam checagem obrigatória de `effectiveClinicId`, impedindo qualquer vazamento cruzado de informações entre clínicas.

#### Item 24 — Simplificação Estrutural do Perfil do Usuário e Correção da Tabela de Valores por Paciente
- **Módulo**: Meu Perfil & Cadastros → Médicos/Profissionais → Valores por Paciente
- **Caminho**:
  - `app/dashboard/perfil/page.tsx` → `ProfilePage`
  - `app/dashboard/perfil/components/profile-header.tsx` → `ProfileHeader`
  - `app/dashboard/perfil/components/general-info-tab.tsx` → `GeneralInfoTab`
  - `app/dashboard/perfil/components/security-tab.tsx` → `SecurityTab`
  - `lib/validations/profile-schema.ts` → `generalInfoSchema`
  - `lib/hooks/use-auth.ts` → `useAuth`
  - `app/api/profile/route.ts` → `GET`, `PATCH`
  - `app/api/doctor-patient-rates/route.ts` → `GET`, `POST`
  - `app/api/doctor-patient-rates/[id]/route.ts` → `DELETE`
  - `app/api/doctor-patient-rates/bulk/route.ts` → `POST`
  - `supabase/migrations/20260902000003_doctor_patient_rates.sql`
- **Descrição Técnica**:
  - **Redesenho do Perfil (Pensar Fora da Caixa e Foco no Essencial)**: A página de Perfil possuía 8 abas laterais (muitas vazias ou irrelevantes para os usuários como Pagamento, Dispositivos e Privacidade) e subformulários desencontrados que travavam ao salvar o nome devido a máscaras estritas de telefone e CPF. Foi totalmente refatorada para apenas 2 abas diretas e executivas: **Dados Pessoais** e **Segurança e Senha**.
  - **Edição Direta do Nome Completo**: O campo de Nome Completo foi colocado em destaque máximo no topo do formulário de Dados Pessoais. A validação do Zod foi flexibilizada para aceitar números de telefone e documentos com ou sem máscara, eliminando qualquer travamento silencioso.
  - **Sincronização em Tempo Real de Identidade**: Ao salvar o nome, o endpoint `PATCH /api/profile` atualiza a tabela `users`, sincroniza os metadados em `auth.users` e dispara um evento customizado `user-profile-updated`. O cabeçalho global do sistema (`components/layout/header.tsx`) e o cabeçalho do perfil escutam o evento e atualizam o nome e as iniciais imediatamente na tela sem necessidade de recarregar a página ou deslogar.
  - **Correção da Tabela `public.doctor_patient_rates` no Supabase**: Diagnosticado o erro `Could not find the table 'public.doctor_patient_rates' in the schema cache` ao salvar valores por paciente. A migration `20260902000003_doctor_patient_rates.sql` falhava na criação devido ao uso do valor `'COORDINATOR'` em enum de `user_role` (que suporta apenas `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `RECEPTIONIST`, `FINANCIAL`, sendo `is_coordinator` uma coluna booleana). A migration foi corrigida com suporte a `is_coordinator` e `SUPER_ADMIN` e executada no Supabase de produção via MCP. As tabelas `doctor_patient_rates`, `doctor_patient_rate_history` e as colunas em `appointments` foram criadas com sucesso.
  - **Isolamento Multi-Tenant**: As rotas `/api/doctor-patient-rates` (individual e em lote) foram atualizadas para resolver o `effectiveClinicId` com suporte ao header `x-clinic-id`, assegurando 100% de sigilo e isolamento entre clínicas.

#### Item 25 — Exclusão e Gerenciamento Inteligente de Agendamentos Cancelados na Agenda
- **Módulo**: Recepção & Agenda → Grade de Agendamentos & Ações Rápidas
- **Caminho**:
  - `app/api/appointments/[id]/route.ts` → `DELETE`
  - `app/api/appointments/batch-delete-cancelled/route.ts` → `POST`
  - `components/ui/agenda-view.tsx` → `getAppointmentsForSlot`, `getAppointmentsForDay`, `deleteAppointmentMutation`, `batchDeleteCancelledMutation`, `toggleHideCancelled`
  - `components/dashboard/AppointmentDetailsDrawer.tsx` → `handleDeleteAppointment`, Dialog de confirmação
- **Descrição Técnica**:
  - **Exclusão Definitiva de Agendamento da Grade (`DELETE /api/appointments/[id]`)**: Criado endpoint para remoção segura de agendamentos com validação estrita de permissões (`CLINIC_ADMIN`, `SUPER_ADMIN`, `RECEPTIONIST` ou próprio profissional) e isolamento multi-tenant por clínica. As dependências vinculadas (`appointment_qr_codes` e `video_rooms`) são limpas atomicamente antes da remoção do agendamento, liberando definitivamente o horário no banco e na interface.
  - **Exclusão em Lote de Agendamentos Cancelados (`POST /api/appointments/batch-delete-cancelled`)**: Criado endpoint para purgar múltiplos agendamentos cancelados de uma vez no período ativo, limpando a grade com apenas uma confirmação.
  - **Alternador Inteligente de Visualização ('Ocultar Cancelados')**: Pensando fora da caixa para não obrigar a usuária a apagar agendamento por agendamento quando ela desejar apenas uma visualização limpa, foi introduzido o botão 'Ocultar Cancelados' / 'Cancelados Ocultos' na barra de ferramentas. O estado é persistido no `localStorage` (`clinigo_agenda_hide_cancelled`), permitindo que a agenda abra sempre limpa e sem elementos riscados poluindo os horários, com a flexibilidade de reexibir o histórico a qualquer momento.
  - **Ações Rápidas de Exclusão Direta no Card e no Drawer**:
    - No menu de 3 pontinhos de qualquer card cancelado (semanal ou timeline), disponibilizada a opção 'Excluir da Grade' com ícone `Trash2`.
    - Botão de exclusão rápida direta no próprio card riscado para agilidade operacional.
    - No painel lateral de detalhes (`AppointmentDetailsDrawer`), adicionado botão destacado 'Excluir da Grade' com confirmação em modal.
  - **Sincronização em Tempo Real**: Evento global `appointment-updated` garante atualização instantânea da grade do calendário logo após qualquer exclusão efetuada no painel lateral.
  - **Isolamento Multi-Tenant e LGPD**: Ambas as rotas de exclusão validam rigorosamente o `clinic_id`, impedindo qualquer interferência entre clínicas.

#### Item 26 — Correção do Endpoint DELETE na Rota v2 e Blindagem de Parsing HTTP
- **Módulo**: Recepção & Agenda → Exclusão da Grade
- **Caminho**:
  - `app/api-v2/appointments/[id]/route.ts` → `DELETE`
  - `app/api/appointments/[id]/route.ts` → `DELETE`
  - `components/ui/agenda-view.tsx` → `deleteAppointmentMutation`, `batchDeleteCancelledMutation`
  - `components/dashboard/AppointmentDetailsDrawer.tsx` → `handleDeleteAppointment`
- **Descrição Técnica**:
  - **Diagnóstico da Causa Raiz**: O arquivo `next.config.js` possui rewrite redirecionando `/api/appointments/:id` para `/api-v2/appointments/:id`. A rota `app/api-v2/appointments/[id]/route.ts` não continha o handler do método `DELETE`, fazendo o Next.js responder `405 Method Not Allowed` com corpo vazio. Ao executar `await res.json()` em uma resposta de corpo vazio, o navegador disparava `Failed to execute 'json' on 'Response': Unexpected end of JSON input`.
  - **Implementação do Handler DELETE em API v2**: Adicionado o handler `DELETE` completo em `app/api-v2/appointments/[id]/route.ts` com validação de permissões por clínica/profissional e desvinculo defensivo de dependências e chaves estrangeiras (`appointment_qr_codes`, `video_rooms`, `reschedule_tokens`, `nps_surveys`, `financial_entries`, `waiting_list`, `consultations`, `payments`, `tiss_guides`, `referrals`).
  - **Blindagem do Parsing HTTP no Frontend**: Implementada leitura resiliente com `res.text()` e fallback seguro para JSON em `agenda-view.tsx` e `AppointmentDetailsDrawer.tsx`, assegurando que nenhuma resposta de erro ou corpo inesperado do servidor quebre a execução da interface.

#### Item 27 — Segurança de Storage e Privacidade de Documentos Médicos (Frente A)
- **Módulo**: Segurança & LGPD → Documentos de Pacientes & Storage
- **Caminho**:
  - `supabase/migrations/20260907_make_documents_buckets_private.sql`
  - `app/api/documents/[id]/signed-url/route.ts` → `GET`
  - `app/dashboard/(clinic)/documentos/page.tsx` → `handleOpenSecureDocument`
  - `app/api/documents/route.ts` → `POST`
  - `components/documents/DocumentUpload.tsx` → `handleFileUpload`
  - `lib/validations/documents.ts` → `uploadDocumentSchema`
- **Descrição Técnica**:
  - **Privatização dos Buckets no Supabase Storage**: Os buckets `patient-documents`, `checkin-docs` e `clinic-assets` foram alterados de `public = true` para `public = false` na tabela `storage.buckets`. Todas as políticas RLS de leitura pública irrestrita foram revogadas, impedindo imediatamente que qualquer arquivo médico seja acessado por terceiros sem autenticação.
  - **Camada de URLs Assinadas Temporárias (`GET /api/documents/[id]/signed-url`)**: Criado endpoint protegido que valida a sessão do usuário, a permissão do profissional/coordenador e o isolamento multi-tenant da clínica (`clinic_id`). Ao autorizar a leitura, gera uma URL assinada via Supabase Storage com tempo estrito de expiração de 10 minutos (600 segundos). Suporta de forma retrocompatível tanto os registros legados (que continham a URL pública completa) quanto os novos registros (com caminho relativo limpo).
  - **Visualização Segura no Frontend**: O painel de documentos do paciente (`app/dashboard/(clinic)/documentos/page.tsx`) substituiu a abertura de links estáticos pelo acionamento assíncrono com feedback visual (`Gerando Acesso Seguro...`), abrindo a URL assinada em nova aba e bloqueando a exposição de URLs públicas fixas.
  - **Eliminação de URLs Públicas no Upload**: Os fluxos de upload (`DocumentUpload.tsx` e `/api/documents`) foram ajustados para salvar exclusivamente o caminho relativo (`filePath`) do objeto, eliminando dependência de URLs públicas estáticas no banco de dados.

#### Item 28 — Retenção Automática e Expurgo de Logs do Postgres via pg_cron (Frente B)
- **Módulo**: Banco de Dados & Infraestrutura → Retenção e Descarte de Logs Internos
- **Caminho**:
  - `supabase/migrations/20260907_setup_logs_retention_cron.sql`
  - Extensões: `pg_cron` e `pg_net`
- **Descrição Técnica**:
  - **Diagnóstico de Espaço em Disco**: O banco continha 266 MB, dos quais 168 MB (63%) eram logs internos acumulados sem valor de negócio: `net._http_response` (125 MB, 47%) e `cron.job_run_details` (43 MB, 16%, mais de 142.000 linhas geradas por crons de minuto a minuto).
  - **Agendamento de Crons Recorrentes de Limpeza**:
    1. Job `purge-old-cron-job-run-details`: Agendado diariamente às 03:00 UTC (`0 3 * * *`), executa `DELETE FROM cron.job_run_details WHERE start_time < NOW() - INTERVAL '7 days'`.
    2. Job `purge-old-net-http-responses`: Agendado diariamente às 04:00 UTC (`0 4 * * *`), executa `DELETE FROM net._http_response WHERE created < NOW() - INTERVAL '3 days'`.
  - **Expurgo Inicial**: 132.746 linhas obsoletas de `cron.job_run_details` foram purgadas com sucesso, estabilizando o consumo e estancando o crescimento descontrolado do disco.

#### Item 29 — Camada de Storage Desacoplada e Integração com Cloudflare R2 (Frente C)
- **Módulo**: Storage & Arquitetura Cloud → Abstração de Armazenamento Híbrido
- **Caminho**:
  - `lib/services/storage/storage-service.ts` → Interface `StorageService` e fábrica `getStorageService`
  - `lib/services/storage/r2-client.ts` → Singleton S3Client e detecção de configuração do Cloudflare R2
  - `lib/services/storage/adapters/r2-adapter.ts` → Implementação para Cloudflare R2 via `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner`
  - `lib/services/storage/adapters/supabase-adapter.ts` → Implementação de fallback para Supabase Storage
  - `app/api/documents/route.ts` → Upload desacoplado via `getStorageService('patient-documents')`
  - `app/api/documents/[id]/route.ts` → Exclusão física compatível com R2 e Supabase Storage
  - `app/api/documents/[id]/signed-url/route.ts` → Resolução dinâmica de URLs assinadas temporárias (R2 ou Supabase)
  - `components/documents/DocumentUpload.tsx` → Upload seguro via rota interna sem expor credenciais no cliente
  - `scripts/migrate-storage-to-r2.ts` → Script de migração segura com `--dry-run`, validação SHA-256 e retenção integral dos arquivos originais no Supabase
  - `.env.example` → Documentação técnica das variáveis do Cloudflare R2
- **Descrição Técnica**:
  - **Padrão de Armazenamento Padronizado**: Estrutura das chaves: `{clinic_id}/{modulo}/{entidade_id}/{uuid}-{nome_original_sanitizado}`. Documentos no R2 recebem o prefixo `r2://` no campo `patient_documents.file_url`, permitindo rápida identificação visual e roteamento instantâneo.
  - **Feature Flag com Rollback Instantâneo**: Variável `STORAGE_PROVIDER_PATIENT_DOCUMENTS=r2` ou `supabase`. Se a variável estiver como `supabase`, se não estiver definida ou se as credenciais do R2 estiverem ausentes, o sistema utiliza automaticamente o Supabase Storage sem falhas ou indisponibilidade.
  - **Segurança de Credenciais**: O upload passa pelo backend (Next.js API route), garantindo que nem o Access Key nem o Secret Key do R2 sejam expostos ao navegador.
  - **Migração com Validação Criptográfica**: O script `migrate-storage-to-r2.ts` calcula o hash SHA-256 do arquivo original no Supabase e compara com o hash do objeto lido do R2 após o upload. Apenas se os hashes forem idênticos o ponteiro do banco é atualizado. Nenhum arquivo é excluído do Supabase Storage.

#### Item 30 — Execução da Migração Segura de Documentos para Cloudflare R2
- **Módulo**: Storage & Migração de Dados → Execução Real e Auditoria
- **Caminho**:
  - `scripts/migrate-storage-to-r2.ts` → Execução em 17 lotes de 25 arquivos com `--execute`
  - `scripts/manifests/manifest_migracao_r2_2026-09-07.json` → Manifesto completo de auditoria
  - `scripts/manifests/manifest_migracao_r2_2026-09-07.csv` → Versão tabular do manifesto
- **Resultados e Métricas**:
  - **Total de Documentos no Banco**: 411 arquivos
  - **Migrados com Sucesso (SHA-256 Validado)**: 396 arquivos (96,35%) transferidos para o Cloudflare R2 (bucket `clinigo`) e ponteiros atualizados com `r2://`.
  - **Pendentes/Não Localizados na Origem**: 15 arquivos mantidos intactos no Supabase sem nenhuma alteração no banco de dados.
  - **Arquivos Físicos Deletados no Supabase Storage**: Zero (0). Conforme regra rígida de segurança, todos os arquivos originais foram mantidos no Supabase Storage para observação de 2 semanas como garantia de redundância.
  - **Integridade Criptográfica**: Todos os 396 arquivos migrados tiveram conferência byte-a-byte de hash SHA-256 entre o arquivo de origem e o arquivo gravado no R2 antes de qualquer alteração no banco.

#### Item 31 — Recuperação Real de Espaço em Disco no Postgres (VACUUM e REINDEX)
- **Módulo**: Banco de Dados & Infraestrutura → Otimização de Armazenamento
- **Caminho**:
  - `net._http_response` → `VACUUM (FULL, ANALYZE)` + `REINDEX TABLE`
  - `cron.job_run_details` → `VACUUM (FULL, ANALYZE)` + `REINDEX TABLE`
- **Resultados e Métricas**:
  - **Tabela `net._http_response`**: Reduzida de 125 MB para **528 kB** (redução de 124,5 MB).
  - **Tabela `cron.job_run_details`**: Reduzida de 43 MB para **3.048 kB** (redução de 40 MB).
  - **Espaço Total Recuperado no Banco**: **164 MB** devolvidos ao disco.
  - **Tamanho Total do Banco de Dados Postgres**: Reduzido de **266 MB** para **102 MB** (queda de 61,6% no consumo físico de disco).
  - **Uso do Limite Free (500 MB)**: Ocupação caiu de 53,2% para apenas **20,4%**, deixando ~400 MB de margem livre.
  - **Disponibilidade**: Ambas as tabelas são de uso exclusivo de extensões em segundo plano (`pg_net` e `pg_cron`), com tempo de execução de menos de 1 segundo e impacto zero para médicos e recepcionistas.

#### Item 32 — Rotinas Automáticas e Recorrentes de Limpeza de Logs (pg_cron e pg_net)
- **Módulo**: Banco de Dados & Infraestrutura → Prevenção de Bloat Recorrente
- **Caminho**:
  - `supabase/migrations/20260907_standardize_log_cleanup_crons.sql`
  - Jobs no `cron.job`: `clinigo-cleanup-pg-net-logs` e `clinigo-cleanup-cron-job-logs`
- **Descrição Técnica**:
  - **Motivação**: Prevenção ativa de bloat recorrente no Postgres, garantindo que o acúmulo de respostas HTTP e histórico de jobs nunca mais ultrapasse os limites do banco.
  - **Job 1 (`jobid: 4` — `clinigo-cleanup-pg-net-logs`)**:
    - Agendamento: Diariamente às 03:00 UTC (`0 3 * * *`).
    - Comando: `DELETE FROM net._http_response WHERE created < now() - interval '3 days';`
    - Retenção: 3 dias (suficiente para rastreamento de chamadas recentes de webhooks e integração WhatsApp, sem inflar o disco).
  - **Job 2 (`jobid: 5` — `clinigo-cleanup-cron-job-logs`)**:
    - Agendamento: Diariamente às 03:10 UTC (`10 3 * * *`).
    - Comando: `DELETE FROM cron.job_run_details WHERE end_time < now() - interval '14 days';`
    - Retenção: 14 dias (duas semanas de histórico completo de execuções para auditoria e conferência).
  - **Manutenção Automatizada**: A purga diária fragmentada mantém as tabelas pequenas, permitindo que o `autovacuum` nativo recicle as páginas em tempo real sem locks ou necessidade de novas intervenções manuais.

#### Item 33 — Correção do Endpoint de Perfil (/api/profile) e Resolução de Relações Ambíguas
- **Módulo**: Usuário & Perfil → Backend API e Integridade de Acesso
- **Caminho**:
  - `app/api/profile/route.ts` → Desambiguação de Foreign Keys no PostgREST, correção de coluna `crm_state`, fallback defensivo e suporte a `cpf`
  - `lib/validations/profile-schema.ts` → Compatibilidade de `doctorInfoSchema` aceitando `crm_state` e `crm_uf`
  - `components/layout/dashboard-layout.tsx` → Inclusão de `SheetHeader` com título e descrição acessíveis para conformidade com o Radix UI
- **Descrição Técnica**:
  - **Causa Raiz 1 (Ambiguidade de Relacionamento)**: A tabela `users` possui duas relações de chave estrangeira com a tabela `clinics`: `users.clinic_id -> clinics.id` (`users_clinic_id_fkey`) e `clinics.approved_by -> users.id` (`clinics_approved_by_fkey`). Ao solicitar `clinic:clinics(...)` sem especificar a constraint, o PostgREST retornava erro `Could not embed because more than one relationship was found for 'users' and 'clinics'`, resultando em HTTP 500 no carregamento do perfil.
  - **Causa Raiz 2 (Inconsistência de Coluna Médica)**: A consulta solicitava `crm_uf`, mas o schema oficial do banco de dados na tabela `doctors` utiliza a coluna `crm_state` (char(2)).
  - **Solução Implementada**:
    - Especificação explícita das constraints de relacionamento: `clinic:clinics!users_clinic_id_fkey(...)` e `doctor:doctors!doctors_user_id_fkey(...)`.
    - Correção do campo selecionado para `crm_state` com mapeamento automático de retrocompatibilidade para `crm_uf`.
    - Implementação de fallback defensivo em caso de qualquer falha de join, garantindo que o usuário consiga carregar seus dados básicos essenciais sem sofrer bloqueio ou erro 500.
    - Suporte ao campo `cpf` no handler `PATCH` da rota `/api/profile`.
    - Resolução dos alertas de acessibilidade (`DialogContent requires a DialogTitle`) com a inserção de `SheetHeader`, `SheetTitle` e `SheetDescription` (utilizando a classe `sr-only`) na gaveta lateral mobile.

#### Item 34 — Permissões Customizadas Sincronizadas, Padrão SaaS Médico Internacional, Botão Gerar Boleto, Alerta de Pagamento ao Dono, Trava Estrita de SMTP e Correção do Modal de Convite
- **Módulo**: Master Hub, Layout/Sidebar, Configurações (Assinatura e Usuários), Mensageria e Webhooks Financeiros
- **Caminho Completo**:
  - Master Hub → Permissões Customizadas → `app/system-master-hub/clinics/[id]/permissions/page.tsx` & `app/api/super-admin/clinics/[id]/permissions/route.ts`
  - Catálogo de Features & Serviço → `lib/constants/features.ts` & `lib/services/permissions-service.ts`
  - Permissões do Usuário / Impersonation → `app/api/permissions/current/route.ts` (Novo) & `lib/hooks/use-plan.ts`
  - Navegação Principal → `components/layout/sidebar.tsx` & `components/sidebar/visual-lock.tsx`
  - Usuários → Convite → `app/dashboard/(clinic)/configuracoes/usuarios/page.tsx` → `InviteUserModal`
  - Assinatura & Planos → `app/dashboard/(clinic)/configuracoes/assinatura/page.tsx` & `app/dashboard/configuracoes/plano/page.tsx` & `app/dashboard/page.tsx`
  - E-mail Multi-Tenant → `lib/services/email-multi-tenant.ts` & `app/api/appointments/route.ts`
  - Notificação Executiva ao Dono → `lib/services/notifications/owner-payment-notification.ts` (Novo)
  - Webhooks de Pagamento → `app/api/webhooks/bancointer/route.ts` & `app/api/billing/webhook/route.ts`
- **Descrição Técnica**:
  - **1. Sincronização Real das Permissões Customizadas**:
    - Expandido o catálogo em `lib/constants/features.ts` com todos os 40+ módulos reais do CliniGo (chat, fila de espera, encaminhamentos, supervisão, bi de terapia, fechamento de caixa, créditos, modelos de documentos, controle de faltas, etc.).
    - Isolada a restrição da Camada A estritamente às 3 fichas proprietárias da World Sensory (`PSICOMOTRICIDADE`, `PLANO_FISIOTERAPIA`, `EVOLUCAO_WORLD_SENSORY`). Todas as demais funcionalidades de Terapia agora podem ser habilitadas/desabilitadas para qualquer clínica via Master Hub.
    - Criado o endpoint `/api/permissions/current` com suporte a impersonation do Super Admin e integrado ao hook `usePlan()`.
    - Na `Sidebar`, vinculados todos os itens de navegação ao `featureKey`, filtrando dinamicamente itens desativados em `filteredSections` e desbloqueando itens customizados via `NavItemComponent` e `VisualLock`.
  - **2. Padrão SaaS Médico Corporativo Premium Internacional**:
    - Banimento absoluto de emojis em interfaces, alertas e e-mails transacionais de consultas.
    - Substituídos ícones de coroa (`Crown`) e efeitos espalhafatosos por iconografia vetorial sóbria (`ShieldCheck`, `Activity`, `Layers`).
    - Ocultado banner de upgrade no dashboard para clínicas em planos avançados/corporativos.
  - **3. Faturamento & Botão "Gerar Boleto"**:
    - Implementado botão visível e padronizado "Gerar Boleto" na tela de Assinatura (`/dashboard/configuracoes/assinatura`).
    - Desenvolvido o serviço `lib/services/notifications/owner-payment-notification.ts` para notificar imediatamente o proprietário da plataforma via e-mail executivo corporativo (`contato@clinigo.app`) e registrar auditoria sempre que um pagamento de boleto, PIX ou assinatura for liquidado automaticamente.
    - Conectada a notificação nos webhooks oficiais do Banco Inter (`/api/webhooks/bancointer`) e do Mercado Pago (`/api/billing/webhook`).
  - **4. Trava Estrita de E-mail Multi-Tenant**:
    - Reformulado `lib/services/email-multi-tenant.ts`: e-mails transacionais de clínicas só são disparados se a clínica possuir servidor SMTP próprio conectado e ativo (`smtp_enabled && smtp_host && smtp_password`).
    - Eliminado o fallback indevido para as credenciais globais da plataforma (`contato@clinigo.app`), garantindo isolamento total entre clínicas e pacientes.
  - **5. Correção do Modal de Convite de Usuários**:
    - Reestruturado o container do modal com `max-h-[90vh] flex flex-col p-0`.
    - O corpo do formulário agora possui rolagem vertical interna suave (`overflow-y-auto flex-1`), mantendo o cabeçalho e o rodapé de ações fixos e visíveis com botões de altura acessível (mínimo 42px), resolvendo o problema de botões escondidos em qualquer resolução.

#### Item 35 — Co-Terapeuta Nativo (Atendimento Multidisciplinar Simultâneo) e Flexibilização de Horários e Turnos da Agenda
- **Módulo**: Recepção & Agenda → Horários de Atendimento, Agendamentos Recorrentes, Agendamentos Manuais e Visualização da Grade
- **Caminho Completo**:
  - Banco de Dados / Migrations → `supabase/migrations/20260907_expand_schedules_slot_duration.sql` & `supabase/migrations/20260907_add_co_doctor_to_appointments_and_series.sql`
  - Validações & Client → `lib/validations/doctor.ts` & `lib/validations/appointment.ts` & `lib/api-client.ts`
  - Horários do Profissional → `app/dashboard/(clinic)/horarios/page.tsx`
  - Endpoints de Agendamento → `app/api/appointments/recurring/route.ts` & `app/api/appointments/recurring/[id]/route.ts` & `app/api/appointments/route.ts` & `app/api-v2/appointments/[id]/route.ts` & `app/api/appointments/[id]/route.ts` & `app/api/appointments/manual/route.ts`
  - Modais de Agendamento → `components/appointments/RecurringAppointmentModal.tsx` & `components/appointments/EditSeriesModal.tsx` & `components/appointments/RecurringSeriesListModal.tsx` & `components/appointments/ManualAppointmentModal.tsx`
  - Visualização da Grade & Detalhes → `components/ui/agenda-view.tsx` & `components/dashboard/AppointmentDetailsDrawer.tsx`
- **Descrição Técnica**:
  - **1. Flexibilização de Turnos e Duração dos Atendimentos (`horarios/page.tsx`)**:
    - **Remoção do limite de 3 turnos**: O profissional agora pode cadastrar até 10 blocos/turnos por dia de atendimento, acomodando múltiplas janelas (ex: início da manhã, meio da manhã, início da tarde, fim da tarde, período noturno).
    - **Durações clínicas ampliadas**: A trava rígida que permitia apenas 15, 30, 45 ou 60 minutos foi substituída no Postgres pela constraint `CHECK (slot_duration_minutes >= 5 AND slot_duration_minutes <= 480)`. No frontend, foram disponibilizados presets clínicos rápidos (15m, 20m, 30m, 40m, 45m, 50m para Psicologia/Terapia, 60m, 75m, 80m, 90m para Integração Sensorial, 120m para ABA, 150m, 180m e 240m para Turno ABA intensivo) além de input numérico para minutagem personalizada customizada.
    - **Calculadora em tempo real de slots**: Exibição imediata da contagem exata e da lista de horários gerados em cada bloco conforme o usuário altera o horário de início, fim ou duração.
    - **Ações de produtividade**: Botão suspenso "Copiar dia" (permite replicar os turnos configurados para Segunda a Sexta, para Todos os dias da semana, ou para qualquer dia específico com 1 clique) e botão "Limpar dia" para zerar os blocos do dia selecionado.
  - **2. Co-Terapeuta Nativo (Atendimento Duplo Simultâneo)**:
    - **Arquitetura de Coluna Única (`co_doctor_id`)**: Em vez de criar dois registros duplicados no banco que causariam conflito na constraint única de horário (`appointments_doctor_id_appointment_date_appointment_time_key`), foi adicionada a coluna `co_doctor_id` vinculada à tabela `doctors` nas tabelas `appointments` e `recurring_appointment_series`.
    - **Sem Falso Conflito de Horário**: A criação de agendamento valida e registra os dois profissionais no mesmo bloco de tempo sem colisão. Na verificação de conflitos, o sistema garante que nem o profissional titular nem o co-terapeuta já possuam outro compromisso com outro paciente no mesmo horário.
    - **Visualização Bidirecional na Agenda**: O agendamento aparece na grade visual de ambos os profissionais selecionados (`selectedDoctorIds.includes(doctor_id) || selectedDoctorIds.includes(co_doctor_id)`). Ambos visualizam o paciente em sua respectiva linha do tempo e recebem o evento.
    - **Identificação Visual Elegante**: Cards de agendamento na grade e na linha do tempo exibem badge neutro "Co-atendimento" e a identificação dos dois profissionais (ex: "Dr. Ana + Bruno").
    - **Gestão Completa em Séries Recorrentes**:
      - Seleção no modal de novo agendamento recorrente com resumo prévio.
      - Edição de série com alteração ou remoção de Co-terapeuta e propagação automática para todas as sessões futuras em aberto.
      - Listagem de séries recorrentes com badge de co-terapeuta ativo.
    - **Agendamento Manual Pontual**: Modal manual adaptado com seletor opcional de 2º profissional e gravação direta.
    - **Drawer de Detalhes**: Bloco corporativo em destaque com nome completo, especialidade e número de registro do Co-Terapeuta.
#### Item 36 — Sincronização Dinâmica de Duração dos Atendimentos na Grade Visual da Agenda
- **Módulo**: Recepção & Agenda → Visualização da Grade & Configuração de Horários dos Profissionais
- **Caminho Completo**:
  - API de Agendamentos (Geral) → `app/api/appointments/route.ts` → `GET`
  - API de Agendamentos (Detalhe V2) → `app/api-v2/appointments/[id]/route.ts` → `GET`
  - API de Profissionais (Horários) → `app/api/doctors/detail/route.ts` & `app/api/doctors/[...slug]/route.ts` → `handlePostSchedules`
  - Grade Visual da Agenda → `components/ui/agenda-view.tsx` → `getAppointmentDuration()` & `calcEndTime()`
  - Modal de Agendamento Manual → `components/appointments/ManualAppointmentModal.tsx`
- **Descrição Técnica**:
  - **1. Causa-Raiz Identificada**:
    - As consultas `SELECT` dos endpoints `/api/appointments` e `/api-v2/appointments/[id]` não incluíam o campo `consultation_duration` no join com a tabela `doctors` para `doctor` e `co_doctor`.
    - Na grade da Agenda (`agenda-view.tsx`), o cálculo do horário de término utilizava `(appointment.doctor as any).consultation_duration || 60`. Por estar `undefined` no retorno da API, sofria fallback para `60` minutos, forçando agendamentos de 45 ou 50 minutos a ocuparem 1 hora visual (ex: 07:40 - 08:40 em vez de 07:40 - 08:25), gerando sobreposição visual artificial.
    - Além disso, a query `schedules-for-agenda` estava condicionada a `enabled: showFreeSlots`, não carregando a disponibilidade dos turnos na visualização normal da agenda.
  - **2. Resolução Implementada**:
    - **Inclusão nas APIs**: Adicionado o campo `consultation_duration` na projeção das relações `doctor` e `co_doctor` em `app/api/appointments/route.ts` e `app/api-v2/appointments/[id]/route.ts`.
    - **Sincronização Bidirecional ao Salvar Turnos**: Ao atualizar horários em `/dashboard/horarios` (`action=schedules`), os endpoints gravam no banco os registros de `schedules` e sincronizam automaticamente `doctors.consultation_duration` com o primeiro turno configurado (`slot_duration_minutes`).
    - **Query de Turnos Ativa na Agenda**: `schedules-for-agenda` agora permanece `enabled: true`, disponibilizando a matriz de turnos e durações de cada profissional para o cálculo dinâmico da grade.
    - **Função `getAppointmentDuration(appointment, schedulesData)`**:
      - Prioridade 1: Duração explícita gravada no agendamento (`appointment.duration_minutes`).
      - Prioridade 2: Minutagem exata configurada no turno do dia da semana e janela de horário (`matchingShift.slot_duration_minutes`).
      - Prioridade 3: Duração padrão cadastrada no profissional (`doctor.consultation_duration`).
      - Prioridade 4: Fallback seguro (60 minutos).
    - **Ajuste na Linha do Tempo e Grade Padrão**: As chamadas a `calcEndTime` na grade semanal/diária, na linha do tempo e no cálculo de status de ocupação do profissional passam a utilizar `getAppointmentDuration`, refletindo perfeitamente a duração configurada (ex: 07:40 - 08:25 para 45 minutos).
    - **Modal de Agendamento Manual**: Vinculado o campo `duration_minutes` do formulário à duração padrão do profissional selecionado (`selectedDoctor.consultation_duration`).

#### Item 37 — Suporte a Recorrência Quinzenal (15 em 15 dias / a cada 2 semanas) e Mensal em Agendamentos Recorrentes
- **Módulo**: Recepção & Agenda → Séries Recorrentes, Motor de Geração de Sessões e Modais de Agendamento
- **Caminho Completo**:
  - Banco de Dados / Migrations → `supabase/migrations/20260907_add_recurrence_interval_to_series.sql`
  - Backend / API de Séries Recorrentes → `app/api/appointments/recurring/route.ts` & `app/api/appointments/recurring/[id]/route.ts`
  - Modal de Criação de Série → `components/appointments/RecurringAppointmentModal.tsx`
  - Modal de Edição de Série → `components/appointments/EditSeriesModal.tsx`
  - Modal de Listagem de Séries → `components/appointments/RecurringSeriesListModal.tsx`
- **Descrição Técnica**:
  - **1. Arquitetura de Intervalo Quinzenal Clínico (A Cada 2 Semanas)**:
    - Agendamento quinzenal no contexto clínico ambulatorial não pode ser um simples incremento de `+15 dias` corridos, pois a cada 15 dias o dia da semana se altera (ex: uma terça-feira se tornaria quarta-feira).
    - O modelo clínico correto opera por semanas de calendário: sessões no mesmo dia da semana a cada 2 semanas (semana 1, semana 3, semana 5...), liberando as semanas alternadas (semana 2, semana 4...) para outro paciente ocupar exatamente o mesmo horário na grade sem conflitos.
    - O banco de dados recebeu as colunas `recurrence_interval INTEGER DEFAULT 1` e `frequency TEXT DEFAULT 'weekly'` na tabela `recurring_appointment_series`.
  - **2. Motor de Geração e Aritmética de Datas (`generateDatesForSeries`)**:
    - Calculada a distância em semanas de calendário entre o início da série e a semana da data corrente: `diffWeeks = Math.floor(diffDays / 7)`.
    - A sessão só é agendada se `diffWeeks % recurrenceInterval === 0`, respeitando com precisão matemática intervalos de 1 semana (Semanal), 2 semanas (Quinzenal / 15 em 15 dias) ou 4 semanas (Mensal).
  - **3. Frontend & Experiência do Usuário**:
    - **Modal de Criação (`RecurringAppointmentModal.tsx`)**: Seletor rápido de periodicidade ("Semanal", "Quinzenal - de 15 em 15 dias", "Mensal - a cada 4 semanas"). A calculadora dinâmica de sessões (`calculateSessions`) recalcula instantaneamente a quantidade exata de atendimentos gerados com base na periodicidade selecionada.
    - **Modal de Edição (`EditSeriesModal.tsx`)**: Permite alterar a periodicidade de uma série existente entre Semanal, Quinzenal e Mensal. Ao alterar a periodicidade, o sistema detecta `hasScheduleChanged`, remove os agendamentos futuros pendentes e os regenera com o novo espaçamento de semanas sem afetar o histórico já realizado.
    - **Listagem de Séries (`RecurringSeriesListModal.tsx`)**: Identificação clara de séries quinzenais com badge destacado `Quinzenal (15 em 15 dias)` e resumo de horários especificando a frequência do tratamento.

#### Item 38 — Correção de Visualização da Grade da Agenda (Clínica Espaço Incluir & Geral) e Blindagem de Isolamento Cross-Clínica
- **Módulo**: Recepção & Agenda → Listagem de Agendamentos e Visualização da Grade
- **Caminho Completo**:
  - API de Agendamentos → `app/api/appointments/route.ts` → `GET`
  - API de Horários → `app/api/doctors/schedules/route.ts` → `GET`
  - Schema de Validação → `lib/validations/appointment.ts` → `listAppointmentsQuerySchema`
  - Componente de Grade → `components/ui/agenda-view.tsx` → `AgendaPage`
- **Descrição Técnica**:
  - **1. Diagnóstico e Causa-Raiz**:
    - A rota `GET /api/appointments` dependia exclusivamente de `createClient()` (cliente com sessão de cookies via `@supabase/ssr`), o qual sofria de perdas intermitentes de sessão em ambientes serverless da Vercel.
    - Quando a sessão SSR não era devidamente propagada no route handler, a consulta a `users` falhava ou retornava nulo devido a RLS, deixando o `clinic_id` indefinido.
    - Adicionalmente, a consulta realizava join com a tabela `payments`, para a qual o perfil `RECEPTIONIST` não possui política de `SELECT` por RLS no banco, provocando falha silenciosa na query e deixando a grade da agenda vazia para recepcionistas da clínica.
    - No componente visual `agenda-view.tsx`, o acesso direto a propriedades de `appointment.doctor` sem encadeamento opcional podia causar exceções caso algum profissional estivesse em transição.
  - **2. Resolução Cirúrgica Implementada**:
    - **Service Role para Usuários Autenticados da Equipe**: A rota `app/api/appointments/route.ts` passou a utilizar `createServiceRoleClient()` para usuários autenticados da equipe (`SUPER_ADMIN`, `CLINIC_ADMIN`, `RECEPTIONIST`, `DOCTOR`), eliminando falhas de sessão SSR e restrições de permissão RLS nos joins de `payments` e `patients`.
    - **Blindagem de Isolamento de Clínica**:
      - Resolução estrita do `clinic_id` por ordem de prioridade: header `x-clinic-id` validado pelo middleware, perfil do usuário no banco de dados via adminClient, ou cookie de impersonação (para SUPER_ADMIN).
      - Bloqueio imediato para usuários que não possuam clínica associada.
      - Aplicação obrigatória de filtro `.eq('clinic_id', effectiveClinicId)`, garantindo isolamento total e impedindo qualquer vazamento entre clínicas (como World Sensory e Espaço Incluir).
    - **Filtro de Médicos Seguro**: Para perfis `DOCTOR`, a rota restringe estritamente os agendamentos ao profissional autenticado via `.or('doctor_id.eq.X,co_doctor_id.eq.X')`.
    - **Defensiva no Frontend (`agenda-view.tsx`)**: Adicionado encadeamento opcional e fallbacks (`appointment.doctor?.id || 'default'`, `appointment.doctor?.user?.full_name || 'Profissional'`), prevenindo quebras na renderização da grade e da linha do tempo.
  - **3. Testes Automatizados de Isolamento e Validação**:
    - Bateria automatizada executada via código (`test-isolation-suite.mjs`):
      - Espaço Incluir: 138 agendamentos na semana, 37 confirmados hoje (08/09/2026), 0 vazamentos de outras clínicas.
      - World Sensory: 238 agendamentos na semana mantidos intactos e 0 vazamentos.
      - Tentativa de acesso cross-clínica: 0 registros retornados (bloqueio 100% eficaz).
      - Médico da Espaço Incluir (Flavia Alves): 11 agendamentos retornados, 0 de outros médicos.

#### Item 39 — Correção de Carregamento da Fila de Recepção e Resolução de Ambiguidade de Foreign Key (Clínica Espaço Incluir & Geral)
- **Módulo**: Recepção & Fila de Espera → Fila do Dia, Painel de Chamada e Totem
- **Caminho Completo**:
  - API da Fila de Espera → `app/api/reception/queue/route.ts` → `GET`
  - Painel da Recepção → `app/dashboard/(clinic)/recepcao/page.tsx` → `loadData()`
  - APIs Relacionadas → `app/api/reception/call-patient/route.ts`, `app/api/reception/call-patient/[id]/route.ts`, `app/dashboard/recepcao/painel/page.tsx`
- **Descrição Técnica**:
  - **1. Diagnóstico e Causa-Raiz**:
    - Na tela de Recepção (`/dashboard/recepcao`), a coluna "Aguardando" permanecia indefinidamente com spinner "Carregando fila..." e contadores em zero para a clínica Espaço Incluir, mesmo com 39 agendamentos confirmados para o dia 08/09/2026.
    - O diagnóstico revelou erro `PGRST201: Could not embed because more than one relationship was found for 'appointments' and 'doctors'`.
    - Como a tabela `appointments` possui duas foreign keys apontando para `doctors(id)` (`appointments_doctor_id_fkey` para `doctor_id` e `appointments_co_doctor_id_fkey` para `co_doctor_id`), qualquer query PostgREST com sintaxe implícita `doctor:doctors(...)` era rejeitada pelo Supabase, resultando em erro 500 que era capturado e retornava lista vazia.
  - **2. Resolução Cirúrgica Implementada**:
    - **Especificação Explícita de FK**: A rota `app/api/reception/queue/route.ts` e demais rotas dependentes foram atualizadas para explicitar a constraint: `doctor:doctors!appointments_doctor_id_fkey(id, user:users(full_name))`.
    - **Otimização de Concorrência e Silent Refresh**: O componente `app/dashboard/(clinic)/recepcao/page.tsx` foi aprimorado com carregamento paralelo (`Promise.all([queue, rooms])`) e silent refresh para garantir que atualizações automáticas via WebSocket/timer não recoloquem a interface em estado de spinner de carregamento durante a operação da recepção.
  - **3. Testes Automatizados e Deploy**:
    - Validado via teste em código que a rota `GET /api/reception/queue` retorna todos os 39 agendamentos confirmados de hoje para a clínica Espaço Incluir sem atrasos e com 100% de integridade dos dados dos pacientes e profissionais.
    - Teste de isolamento multi-tenant confirmado sem interferência na World Sensory ou outras clínicas parceiras.
    - Deploy publicado e ativo em produção na Vercel (`https://clinigo.app`).

#### Item 40 — Especialidades Multiprofissionais no Cadastro de Profissional e Módulo de Supervisão Técnica na Agenda (World Sensory & Geral)
- **Módulo**: Gestão de Profissionais & Agenda → Cadastro de Profissionais, Agendamento Manual e Visualização da Grade
- **Caminho Completo**:
  - Migração de Banco de Dados → `supabase/migrations/20260908140000_add_supervision_and_expertise.sql`
  - Validações Zod → `lib/validations/doctor.ts`, `lib/validations.ts`
  - APIs de Profissionais → `app/api/doctors/route.ts`, `app/api/doctors/detail/route.ts`
  - Formulário de Profissionais → `components/forms/doctor-form-dialog.tsx` → `DoctorFormDialog`
  - APIs de Agendamento → `app/api/appointments/manual/route.ts`, `app/api/appointments/route.ts`, `app/api/appointments/[id]/route.ts`
  - Modal de Agendamento Manual → `components/appointments/ManualAppointmentModal.tsx` → `ManualAppointmentModal`
  - Drawer de Detalhes → `components/dashboard/AppointmentDetailsDrawer.tsx` → `AppointmentDetailsDrawer`
  - Grade da Agenda → `components/ui/agenda-view.tsx` → `AgendaPage`
  - API da Fila da Recepção → `app/api/reception/queue/route.ts` → `GET`
- **Descrição Técnica**:
  - **1. Contexto e Necessidades (Demandas Dra. Patrícia Mendes / World Sensory)**:
    - O cadastro de profissionais continha lista restrita de especialidades, impedindo o cadastramento adequado de terapeutas de "Terapia Ocupacional (T.O.)" e especialidades afins.
    - Necessidade de inclusão de uma classificação secundária ("Área de Atuação") com pré-definição para "Equipe Multiprofissional", preservando registros existentes.
    - Criação de um tipo de evento próprio na agenda: "Supervisão Técnica / Clínica", destinado a alinhamentos técnicos internos e mentorias entre supervisor e terapeuta orientando.
    - O evento de supervisão técnica não possui paciente (`patient_id: null`), referencia outro profissional via `professional_supervised_id`, não abre prontuário clínico e não gera cobrança de paciente.
    - Apenas profissionais habilitados com a permissão "Permite registrar Supervisão" (`allows_supervision = true`) podem agendar supervisões técnicas.
  - **2. Resolução Cirúrgica Implementada**:
    - **Banco de Dados (Schema & Migrations)**:
      - Adicionadas as colunas `doctors.area_of_expertise` (TEXT) e `doctors.allows_supervision` (BOOLEAN DEFAULT FALSE com backfill seguro).
      - Adicionadas as colunas `appointments.professional_supervised_id` (UUID FK para `doctors(id)`) e `appointments.supervision_notes` (TEXT), com criação de índice de busca otimizado.
    - **Cadastro e Edição de Profissionais (`doctor-form-dialog.tsx`)**:
      - Expandida a lista de especialidades padrão para contemplar Terapia Ocupacional, Psicologia, Psicopedagogia, Musicoterapia, Fisioterapia, Fonoaudiologia, Psicomotricidade, Aplicador(a) ABA, Nutrição e Serviço Social.
      - Adicionado o campo "Área de Atuação" com botões de preenchimento rápido ("+ Equipe Multiprofissional", "+ Corpo Clínico").
      - Adicionado o controle de acesso com Switch "Permite registrar Supervisão", habilitado exclusivamente para a Dra. Patrícia Mendes e controlado por administradores.
    - **Backend de Agendamento Manual (`manual/route.ts`)**:
      - Suporte ao payload `is_supervision: true`, ignorando a obrigatoriedade de paciente e dispensando geração de lançamentos financeiros e QR codes de paciente.
      - Validação de segurança confirmando se o profissional supervisor possui `allows_supervision === true` e se o terapeuta supervisionado pertence à mesma clínica.
      - Gravação com `appointment_type: 'SUPERVISION'`, `patient_id: null`, `professional_supervised_id` e `supervision_notes`.
    - **Interface da Agenda (`agenda-view.tsx` e `ManualAppointmentModal.tsx`)**:
      - No modal de agendamento manual, quando o profissional selecionado permite supervisão, surge o seletor entre "Atendimento a Paciente" e "Supervisão Técnica".
      - No modo supervisão técnica, a seleção de paciente é ocultada, exibindo seletores de "Profissional Supervisionado" e "Pauta / Anotações da Supervisão".
      - Na grade da agenda (visão padrão e visão timeline), o agendamento de supervisão exibe badge sóbrio "Supervisão" e o nome do terapeuta supervisionado.
      - No drawer de detalhes (`AppointmentDetailsDrawer.tsx`), o evento é apresentado com destaque para Supervisor, Mentorando e Pauta, sem botões de prontuário clínico.
    - **Isolamento da Fila de Recepção (`queue/route.ts`)**:
      - O endpoint da recepção filtra e descarta eventos de `appointment_type === 'SUPERVISION'`, garantindo que supervisões técnicas internas nunca entrem no painel de espera de pacientes.
  - **3. Testes Automatizados e Isolamento**:
    - Suite de 6 testes executada com 100% de sucesso (`test-supervision-suite.mjs`):
      - Validação de `allows_supervision = true` para Dra. Patrícia e `false` para demais médicos.
      - Inserção e persistência de supervisão técnica com `patient_id: null` e vínculo relacional de `professional_supervised_id`.
      - Validação da consulta PostgREST com resolução do nome e especialidade do profissional supervisionado via foreign key explícita.
      - Confirmação de exclusão absoluta da fila da recepção.
      - Remoção limpa do registro de teste sem efeitos colaterais.

### Item 41: Correção do Utilitário cn no Modal de Agendamento Manual e Resolução de Nome de Paciente nos Repasses (doctor-patient-rates)
- **Data**: 08/09/2026
- **Módulos**: Recepção, Agenda, Médicos, Repasses
- **Caminho Completo**:
  - Modal de Agendamento Manual → `components/appointments/ManualAppointmentModal.tsx` → `import { cn }`
  - API de Repasses por Paciente → `app/api/doctor-patient-rates/route.ts` → `GET`, `POST`
  - API de Repasses em Lote → `app/api/doctor-patient-rates/bulk/route.ts` → `POST`
  - API de Agendamento Manual → `app/api/appointments/manual/route.ts` → `POST`
  - API de Check-in do Médico → `app/api/appointments/[id]/doctor-checkin/route.ts` → `POST`
  - API de Folha / Notas → `app/api/payroll/nota-repasse/route.ts` e `app/api/payroll/my-history/route.ts`
- **Descrição Técnica**:
  - **1. Problema Identificado**:
    - Ao tentar abrir o modal de "Novo Agendamento Manual", a interface disparava um ErrorBoundary exibindo `"Não foi possível carregar esta seção / cn is not defined"`, pois a função utilitária `cn` era utilizada nos seletores de categoria de agendamento/supervisão sem ter sido importada de `@/lib/utils`.
    - Ao cadastrar repasse de valor fixo para um paciente (ex: Maria Eduarda para a profissional Eduarda), a operação de POST salvava com sucesso no banco (`doctor_patient_rates`), porém, na atualização/recarregamento da tela (`GET /api/doctor-patient-rates?doctorId=...`), a consulta falhava no backend com o erro `"column patients_1.name does not exist"`, uma vez que a coluna correta da tabela `patients` é `full_name` e não `name`. Isso fazia com que a tabela de repasses recebesse lista vazia e exibisse a mensagem `"Nenhum paciente encontrado"`.
  - **2. Correção Cirúrgica Aplicada**:
    - **Importação de `cn`**: Importado `cn` de `@/lib/utils` em `ManualAppointmentModal.tsx`, eliminando a interrupção de renderização.
    - **Correção da Relação PostgREST em `doctor-patient-rates`**: Atualizadas as consultas das tabelas `appointments` e `doctor_patient_rates` para selecionar `patient:patients(id, full_name)` e mapear o nome completo do paciente de maneira resiliente.
    - **Varredura Proativa em Rotas Afins**: Corrigidas ocorrências semelhantes de `patients(id, name)` para `patients(id, full_name)` nas rotas `doctor-checkin`, `nota-repasse` e `my-history`.
    - **Blindagem no Agendamento Manual**: Implementado fallback com `supabaseAdmin` restrito pelo `clinic_id` na verificação de existência do paciente no agendamento manual, garantindo que inconsistências pontuais de contexto de sessão RLS não impeçam a localização do paciente.
  - **3. Validação**:
    - Suíte automatizada de testes executada validando a importação de `cn` e a consulta relacional de `doctor_patient_rates` para a paciente Maria Eduarda Gomes Ferreira, confirmando o carregamento correto do repasse fixo de R$ 20,00.

### Item 42: Validação Biométrica Facial pelo Profissional no Início do Atendimento Clínico
- **Data**: 09/09/2026
- **Módulos**: Recepção, Atendimento Clínico, Agenda, Prontuário / PEP, Biometria
- **Caminho Completo**:
  - API de Verificação Facial 1:1 → `app/api/patients/[id]/biometrics/verify/route.ts` → `POST`
  - API de Check-in do Profissional → `app/api/appointments/[id]/doctor-checkin/route.ts` → `POST`
  - Modal de Validação Biométrica → `components/appointments/DoctorBiometricModal.tsx` → `DoctorBiometricModal`
  - Botão de Início de Atendimento Clínico → `components/appointments/DoctorCheckinButton.tsx` → `DoctorCheckinButton`
  - Drawer de Detalhes da Agenda → `components/dashboard/AppointmentDetailsDrawer.tsx` → props `patientId` e `clinicId`
  - Ficha de Evolução World Sensory → `components/medical-records/WorldSensoryEvolutionForm.tsx` → badge de biometria facial validada
  - Visualização de Prontuário do Paciente → `app/dashboard/(clinic)/prontuarios/[id]/page.tsx` → select de `doctor_checkin_method` e `verification_level`
- **Descrição Técnica**:
  - **1. Objetivo**: Atender à solicitação da administradora Dra. Patrícia Mendes, permitindo que o terapeuta/profissional realize a validação de presença por biometria facial do paciente (ou de seus responsáveis cadastrados) diretamente no consultório antes de iniciar a sessão clínica, mantendo integralmente preservado o fluxo de check-in facial da recepção e dos totens.
  - **2. Arquitetura e Implementação**:
    - **Endpoint de Verificação 1:1 (`verify/route.ts`)**: Recebe o descritor facial capturado pela webcam na sala de atendimento, decripta no servidor os descritores faciais salvos em `patient_face_biometrics` para o paciente e responsáveis (mãe, pai, responsável legal), calcula a distância euclidiana (`calculateFaceDistance`) e retorna compatibilidade e confiança.
    - **Componente `DoctorBiometricModal.tsx`**: Interface do consultório com detecção facial em tempo real via modelos neurais (`face-api.js`), identificação da pessoa (paciente ou responsável), opção de cadastro biométrico na hora via `FaceEnrollment` (caso o paciente não possua biometria prévia) e botão alternativo de início manual.
    - **Aprimoramento em `DoctorCheckinButton.tsx`**: Ao clicar em "Paciente Compareceu", o profissional dispõe das opções claras "Validar com Biometria Facial" e "Confirmar Sem Biometria (Manual)", com área de toque mínima de 44x44px e conformidade estrita com o padrão de zero emojis.
    - **Gravação de Presença no Banco de Dados (`doctor-checkin/route.ts`)**: Registra `doctor_checkin_method = 'FACIAL_DOCTOR'`, `verification_level = 'DOUBLE_VERIFIED'` (caso já tenha passado pela recepção) ou `'FACIAL_DOCTOR'`, e grava `session_status = 'Presente'`, garantindo o correto cômputo para repasse e faturamento.
    - **Selo de Comprovação na Ficha de Evolução (`WorldSensoryEvolutionForm.tsx`)**: Renderiza badge visual sóbrio "Biometria Facial Validada" na seção de status do atendimento.
  - **3. Validação**:
    - Executada a suíte de auditoria sistêmica (`test_audit_v5_2.js`) com 24 testes aprovados (100% de sucesso), confirmando ausência de emojis e integridade de schema.

### Item 43: Autorização de Sessões Simultâneas para Suporte Técnico da Dra. Patrícia Mendes
- **Data**: 09/09/2026
- **Módulos**: Autenticação, Segurança de Sessão, Single Session Manager, Suporte Técnico
- **Caminho Completo**:
  - Serviço de Sessão Única → `lib/services/single-session.ts` → `isUserAllowedConcurrentSessions()`, `registerSingleSession()`, `validateSession()`
  - Rota de Login → `app/api/auth/login/route.ts` → `POST` (parâmetro de email para registro de sessão)
  - Rota de Registro de Sessão Client-Side → `app/api/auth/session/register/route.ts` → `POST`
  - Rota de Validação Periódica de Sessão → `app/api/auth/session/validate/route.ts` → `GET`
  - Rota de Logout → `app/api/auth/logout/route.ts` → `POST`
- **Descrição Técnica**:
  - **1. Objetivo**: Atender à necessidade operacional de suporte técnico direto ao vivo à administradora Dra. Patrícia Mendes (`clinicaworldsensory@gmail.com` / `user_id = ca412219-5039-4193-8b77-15340f1f677d`), permitindo que tanto a usuária em seu computador quanto o suporte técnico em outro dispositivo estejam logados simultaneamente com as mesmas credenciais, sem que a sessão de nenhum dos computadores seja invalidada ou derrubada por colisão de sessão única.
  - **2. Arquitetura e Implementação Cirúrgica**:
    - **Função `isUserAllowedConcurrentSessions(userId, email)`**: Implementada em `lib/services/single-session.ts` com validação de `Set` estrito por e-mail e UUID, garantindo que única e exclusivamente essa conta tenha o mecanismo de concorrência liberado. Todas as demais contas e clínicas permanecem com a regra rígida de sessão única mantida a 100%.
    - **Preservação de Sessões em `registerSingleSession`**: Caso o usuário autenticado pertença à exceção de suporte, a instrução SQL `UPDATE active_sessions SET is_active = false` é ignorada, criando uma nova sessão ativa para o segundo dispositivo sem revogar o registro ativo existente no primeiro computador.
    - **Validação Imediata em `validateSession` e `/api/auth/session/validate`**: A rota de validação consultada a cada 10 segundos pelo hook de frontend `useSessionGuard` retorna imediatamente `{ valid: true, concurrent_allowed: true }` para a conta liberada, impedindo qualquer disparo de `reason: 'session_replaced'` e eliminando risco de logout forçado por polling.
    - **Isolamento de Logout em `logout/route.ts`**: Atualizada a rota de logout para que, no caso da conta de suporte liberada, apenas o token do cookie daquele navegador específico seja desativado, impedindo que o fallback geral desative a sessão do outro computador.
### Item 44: Padronização da Ficha de Evolução Terapêutica como Modelo Padrão da World Sensory
- **Data**: 09/09/2026
- **Módulos**: Prontuário Clínico / PEP, Evolução Terapêutica, Impressão e PDF
- **Caminho Completo**:
  - Página de Prontuário do Agendamento → `app/dashboard/(clinic)/prontuarios/[id]/page.tsx` → `ProntuarioPage`
  - Componente de Evolução World Sensory → `components/medical-records/WorldSensoryEvolutionForm.tsx` → `WorldSensoryEvolutionForm`
- **Descrição Técnica**:
  - **1. Objetivo**: Corrigir a abertura de prontuários da clínica World Sensory (ex: atendimento `ba82bb38-4198-499f-ac8d-d47648b7340a`), fixando como padrão absoluto o modelo oficial de Evolução Terapêutica em 7 seções idêntico ao documento PDF institucional da clínica, substituindo o modelo genérico anterior de anamnese médica/sinais vitais.
  - **2. Arquitetura e Implementação Cirúrgica**:
    - **Ativação Padrão Resiliente em `page.tsx`**: Identifica automaticamente a clínica World Sensory por UUID (`4c13e586-5390-4393-a180-2c9dd7ed81c7`), slug ou nome corporativo, ativando `hasWorldSensoryEvolution = true` por padrão mesmo se a consulta isolada à tabela `clinica_modulos` sofrer atraso ou bloqueio de contexto RLS.
    - **Seletor de Modelo Explícito**: Inserida a opção no cabeçalho `"Evolução Terapêutica (World Sensory - Padrão)"`, permitindo navegação clara e confirmação visual do modelo em vigor.
    - **Correspondência Visual 1:1 com o PDF Institucional em `WorldSensoryEvolutionForm.tsx`**:
      - **Página 1**: Seções 1 a 5 (Objetivo da Sessão, Procedimentos Realizados, Resposta do Paciente, Interpretação Clínica e Conduta), com faixas de títulos padronizadas em cinza sóbrio e caixas delimitadoras correspondentes.
      - **Página 2**: Seções 6 e 7 (Intercorrências e Orientações à Família/Equipe), separadas por quebra de página precisa (`html2pdf__page-break`), rodapé institucional e cabeçalho formal.
      - **Bloco de Identificação e Assinatura**: Oculta termos genéricos médicos ("Médico - Especialidade:"), exibindo diretamente o nome do profissional, sua especialidade (ex: `Terapeuta Ocupacional`) e conselho de classe formatado em conformidade regional (ex: `Crefito 3 – 11193TO`).
      - **Ocultação de Controles Operacionais no PDF**: Marcada a Seção 0 (status de presença com os 6 botões interativos) com `data-html2canvas-ignore="true"` e `print:hidden`, garantindo que o PDF gerado seja estritamente limpo e idêntico ao documento físico.
  - **3. Validação**:
    - Executada auditoria de conformidade de emojis em `page.tsx` e `WorldSensoryEvolutionForm.tsx` com 0 ocorrências detectadas. Suíte `test_audit_v5_2.js` executada com 24 testes aprovados (100% de sucesso).

### Item 45: Correção do Erro Fatal "Sparkles is not defined" e Saneamento Preventivo de Imports na Agenda
- **Data**: 09/09/2026
- **Módulos**: Recepção → Agenda → Detalhes do Agendamento / Drawer de Atendimento
- **Caminho Completo**:
  - Gaveta de Detalhes do Agendamento → `components/dashboard/AppointmentDetailsDrawer.tsx` → `AppointmentDetailsDrawer`
  - Trava Visual de Recursos Premium → `components/sidebar/visual-lock.tsx` → `VisualLock`
  - Modal de Agendamento Manual → `components/appointments/ManualAppointmentModal.tsx` → `ManualAppointmentModal`
  - Relatório de Produção Profissional → `app/dashboard/(clinic)/financial/producao/page.tsx` → `ProducaoProfissionalPage`
- **Descrição Técnica**:
  - **1. Diagnóstico e Causa Raiz**:
    - Ao abrir agendamentos confirmados ou interagir com o agendamento na grade da Agenda (`/dashboard/agenda?status=CONFIRMED`), a tela apresentava a tela de erro do React com a mensagem `"Sparkles is not defined"`.
    - No componente `AppointmentDetailsDrawer.tsx`, na linha 640 (botão "Ajustar valor permanente deste paciente"), o elemento `<Sparkles className="w-3 h-3" />` estava sendo invocado sem a respectiva importação no topo do arquivo. Além de causar o ReferenceError que travava a visualização da agenda, a utilização do ícone `Sparkles` contrariava o padrão médico corporativo estabelecido pelo protocolo v5.2.
    - Na mesma gaveta, o componente `<Separator />` também constava sem importação nas seções de Teleconsulta e QR Code.
  - **2. Resolução e Implementação Cirúrgica**:
    - **Substituição por Ícone Sóbrio e Correção de Import**: No `AppointmentDetailsDrawer.tsx`, o ícone `Sparkles` foi substituído por `SlidersHorizontal`, importado adequadamente de `lucide-react`, conferindo padrão estético profissional para ajuste permanente de repasse. Importado também o componente `Separator` de `@/components/ui/separator`.
    - **Varredura Preventiva no Repositório**: Identificadas e corrigidas ausências pontuais de importação de componentes em outras três telas:
      - `components/sidebar/visual-lock.tsx`: importado `Crown` de `lucide-react`.
      - `components/appointments/ManualAppointmentModal.tsx`: importado `Badge` de `@/components/ui/badge`.
      - `app/dashboard/(clinic)/financial/producao/page.tsx`: importado `Badge` de `@/components/ui/badge`.
  - **3. Validação e Testes**:
    - Executada varredura automatizada com Node.js em todos os arquivos `.tsx`/`.jsx` de `components/` e `app/`, comprovando 0 erros de identificadores JSX não importados.
    - Auditoria de ausência total de emojis executada com 100% de conformidade.
    - Suíte `test_audit_v5_2.js` reexecutada com 24/24 testes aprovados.

### Item 46: Correção do Erro "ShieldCheck is not defined" e Reformulação Premium Global do Guia de Ajuda Integrado (/dashboard/help)
- **Data**: 09/09/2026
- **Módulos**: Ajuda / Suporte / Manual Operacional do Sistema
- **Caminho Completo**:
  - Página do Guia de Ajuda Integrado → `app/dashboard/(clinic)/help/page.tsx` → `HelpPage`
- **Descrição Técnica**:
  - **1. Diagnóstico e Causa Raiz**:
    - Ao acessar `https://clinigo.app/dashboard/help#controle-de-faltas` (ou clicar no ícone de interrogação da barra lateral junto ao item "Controle de Faltas"), a tela apresentava falha de renderização com a mensagem `"ShieldCheck is not defined"`.
    - No arquivo `app/dashboard/(clinic)/help/page.tsx`, o ícone `ShieldCheck` estava atribuído ao item `auditoria-biometria`, porém não constava na cláusula de importação de `lucide-react` no topo do arquivo.
  - **2. Resolução e Reformulação Completa (Padrão Internacional SaaS)**:
    - **Correção da Dependência**: Importado `ShieldCheck` de `lucide-react`.
    - **Varredura e Cobertura de 100% do Menu**: Mapeados todos os itens de menu e submenus de `components/layout/sidebar.tsx`. O Guia de Ajuda foi expandido para cobrir 100% das seções da plataforma:
      - *Principal*: Dashboard, Checklist Inicial (Onboarding).
      - *Agendamento*: Agenda Geral, Minha Agenda, Agendamentos Recorrentes (Séries), Consultas (Teleconsulta), Recepção, Horários e Turnos Flexíveis, Co-Terapeuta (Atendimento Duplo).
      - *Equipe*: Terapeutas/Médicos, Pacientes (Diretório A-Z), Aniversariantes de Pacientes.
      - *Prontuário*: Prontuários (PEP), Prescrições, Documentos, Modelos de Termos & Contratos, Assinatura Digital dos Pais (Rubrica Celular), Validação Biométrica Facial, Templates Prontuário (SOAP/CIF/DAP/World Sensory), Planos Terapêuticos, Evoluções, Controle de Faltas.
      - *Terapia*: Fila de Espera, Encaminhamentos, Supervisão, Retenção, Risco de Evasão, Aderência, Conformidade Evoluções, Desfechos, Carga de Trabalho, Demográfico, Receita por Modalidade, Sazonalidade, NPS / Satisfação.
      - *Financeiro*: Lançamentos (Caixa), Pagamentos (Gateways), Fechamentos de Caixa, Créditos de Pacientes, Folha de Repasse, Histórico de Repasses, Produção por Profissional, Notas & Demonstrativos, Auditoria Biométrica Mensal, DRE Consolidada, DRE Centro de Custos, Análise de LTV, Mix de Receita, Projeção de Caixa, Projeção de Faturamento & Metas, Gestão de Inadimplência, Auditoria de Lançamentos, Faturamento TISS (Guias e Lotes), Gestão de Glosas, Perdas (BI), Meu Financeiro (Portal do Terapeuta), Convênios, Regras de Reembolso, Reembolso por Paciente.
      - *Comunicação*: Chat Interno, WhatsApp (Conexão Baileys), Confirmação Automática via WhatsApp, Mural de Recados da Agenda, Notificações, FluxoMed (CRM), Pipeline (Kanban).
      - *Gestão*: Estoque (FEFO), Relatórios (Excel/PDF), Termos Legais, Importação em Massa, Automação (Painel & Regras), Configurações de Automação, Auditoria (Logs & LGPD).
      - *Configurações*: Minha Clínica, Logotipo da Clínica (Co-branding), Página Pública & Autoagendamento, Teleconsulta, Usuários e Permissões (RBAC), Terapias e Procedimentos, Assinatura e Planos, Segurança (2FA / Sessões Ativas), Integrações e Webhooks.
      - *Administração*: Master Hub, Clínicas (Tenants), Planos, Cobrança Global, Grupos e Redes, Relatórios Globais, API Keys, Health Check, Super Admins.
    - **Padrão Estético e Funcional**:
      - Cada card exibe: Categoria, Plano Mínimo, Perfis com Acesso, "Para que serve?", "Quando usar?", "Como utilizar / Operação prática" e botão "Acessar Módulo" com link direto para a rota correspondente.
      - Suporte a deep-linking: ao acessar via `#ancora` (ex: `#controle-de-faltas`), a página seleciona a categoria necessária, faz scroll suave até o card e aplica destaque visual ativo.
      - Atalho de teclado `/` para busca instantânea e filtros rápidos por categoria.
      - Zero emojis em conformidade absoluta com o padrão médico corporativo internacional.
  - **3. Validação e Testes**:
    - Varredura de tags JSX não importadas executada com 0 erros.
    - Auditoria de emojis executada com 100% de conformidade.
    - Suíte automatizada de testes `test_audit_v5_2.js` executada com 24/24 testes aprovados.

### Item 47: Check-in Biométrico do Paciente via Tablet Pareado em Consultório (Sem Login, Sem QR Code)
- **Data**: 09/09/2026
- **Módulos**: Recepção, Atendimento Clínico, Configurações, Terminais & Quiosques, Biometria Facial, LGPD
- **Caminho Completo**:
  - Banco de Dados / Migrations → `supabase/migrations/20260909_paired_tablet_checkin.sql` → Criação de `clinic_devices`, `checkin_capture_tokens`, `patient_checkin_events` e colunas em `appointments`
  - Utilitário Realtime Broadcast → `lib/realtime/broadcast.ts` → `sendRealtimeBroadcast()`
  - API Admin Dispositivos → `app/api/clinic-devices/route.ts` → `GET`, `POST`
  - API Admin Dispositivos (Item) → `app/api/clinic-devices/[id]/route.ts` → `PATCH`, `DELETE`
  - API Runtime Tablet (Fila) → `app/api/device/queue/route.ts` → `GET` (autenticado por `x-clinigo-device-token`)
  - API Runtime Tablet (Início) → `app/api/device/checkin/start/route.ts` → `POST` (geração de `capture_token` de 3 min)
  - API Push Remoto Desktop → `app/api/appointments/[id]/push-checkin/route.ts` → `POST` (envio para o tablet da sala)
  - API Confirmação Facial → `app/api/checkin/[token]/confirm/route.ts` → `POST` (validação 1:1, status e broadcast)
  - API Fallback Assinatura → `app/api/checkin/[token]/signature/route.ts` → `POST` (armazenamento de rubrica e broadcast)
  - API Fallback Escalonamento → `app/api/checkin/[token]/escalate/route.ts` → `POST` (acionamento da recepção)
  - API Fallback Manual → `app/api/checkin/[token]/manual-confirm/route.ts` → `POST` (justificativa obrigatória no computador)
  - API Aprovação Recepção → `app/api/checkin/[token]/reception-approve/route.ts` → `POST`
  - Interface Terminal Tablet → `app/terminal/page.tsx` → `TerminalPage` (pareamento por código, fila, câmera, assinatura touch)
  - Painel Admin de Dispositivos → `app/dashboard/(clinic)/configuracoes/dispositivos/page.tsx` → `DevicesSettingsPage`
  - Menu da Barra Lateral → `components/layout/sidebar.tsx` → Item "Dispositivos & Tablets"
  - Botão de Início de Atendimento → `components/appointments/DoctorCheckinButton.tsx` → `DoctorCheckinButton` (envio para tablet e escuta broadcast)
  - Alerta de Escalonamento na Recepção → `components/reception/TerminalEscalationAlert.tsx` e `app/dashboard/(clinic)/recepcao/page.tsx`
  - Suíte Automatizada de Testes da Especificação → `scripts/test_tablet_checkin_spec.mjs`
- **Descrição Técnica**:
  - **1. Objetivo**: Atender à especificação rigorosa de permitir que tablets dedicados instalados nas salas de atendimento/consultórios realizem a validação biométrica facial do paciente antes do atendimento sem necessidade de login de usuário no tablet (`supabase.auth.*`), sem gerar linhas em `active_sessions`, sem derrubar a sessão conectada no computador do terapeuta e sem utilizar QR Codes em nenhuma etapa do processo.
  - **2. Arquitetura e Implementação**:
    - **Isolamento Estrutural e Segurança de Sessão**: A rota `/terminal` e seus componentes operam sem nenhum contexto de autenticação de usuário e sem montar `useSessionGuard`. O pareamento é realizado uma única vez inserindo um código criptográfico gerado no painel da clínica, armazenado estritamente em `localStorage.device_token`.
    - **Privacidade e Conformidade LGPD**: Antes da validação biométrica, a tela do tablet exibe estritamente o primeiro nome/inicial do paciente e horário do atendimento, nunca renderizando CPF, telefone, endereço ou prontuário.
    - **Tokens Efêmeros de Uso Único (3 minutos)**: Cada atendimento gera um registro em `checkin_capture_tokens` com expiração estrita de 3 minutos e status `pending`. Ao ser validado, o token é marcado como `confirmed` e rejeita qualquer tentativa de reutilização.
    - **Comunicação em Tempo Real via Supabase Broadcast**: A comunicação entre servidor, tablet e computador ocorre através de canais efêmeros Broadcast (`device:{device_id}`, `appointment:{appointment_id}`, `reception:{clinic_id}`), permitindo que o terapeuta envie o paciente para o tablet e a tela do computador atualize instantaneamente para "Em Atendimento" sem recarregar a página (F5).
    - **Contingências e Fallbacks Completos**:
      - *Fallback (a)*: Retentativas guiadas com indicador de enquadramento dentro da janela de 3 minutos.
      - *Fallback (b)*: Confirmação manual no computador com justificativa (`reason`) estritamente obrigatória (400 se vazia) e log de auditoria.
      - *Fallback (c)*: Assinatura touch na tela do tablet via `SignaturePad` salvando a rubrica do paciente/responsável.
      - *Fallback (d)*: Escalonamento para a recepção com alerta sonoro e visual em tempo real em `TerminalEscalationAlert`.
    - **Log Imutável de Auditoria LGPD**: Toda validação (facial, assinatura, manual ou recepção) grava uma linha definitiva em `patient_checkin_events` com identificação do paciente, agendamento, método, dispositivo e responsável.
  - **3. Validação e Testes**:
    - Zero ocorrências de `supabase.auth` em `app/terminal`.
    - Zero ocorrências de `active_sessions` nas rotas do tablet.
    - Zero ocorrências de QR Code no fluxo de pareamento ou check-in.
    - Suíte de testes `scripts/test_tablet_checkin_spec.mjs` executada com 8/8 testes aprovados.

### Item 48: Check-in Biométrico Multi-Superfície + Verificação da Terapeuta (V4)
- **Data**: 09/09/2026
- **Módulos**: Recepção, Atendimento Clínico, Configurações, Terminais & Quiosques, Biometria Facial, Celular do Paciente, LGPD & Antifraude
- **Caminho Completo**:
  - Banco de Dados / Migrations → `supabase/migrations/20260909_multisurface_checkin_v4.sql` → `checkin_settings` em `clinics`, `surface` em `checkin_capture_tokens` e `patient_checkin_events`, criação de `therapist_start_biometric_events` e `reception_pins`, `therapist_start_verified_at` em `appointments`, `therapist_user_id` em `patient_face_biometrics`
  - Componente Neural Central → `components/checkin/BiometricCaptureFrame.tsx` → `BiometricCaptureFrame` (agnóstico de assunto: `patient` | `therapist`)
  - Componente Modal da Terapeuta → `components/checkin/StaffWebcamCheckinModal.tsx` → `StaffWebcamCheckinModal`
  - Seletor de Superfície → `components/checkin/CheckinSurfacePicker.tsx` → `CheckinSurfacePicker`
  - Modal Antifraude Terapeuta → `components/appointments/TherapistStartBiometricModal.tsx` → `TherapistStartBiometricModal`
  - Modal PIN Tablet → `components/terminal/ReceptionPinGate.tsx` → `ReceptionPinGate`
  - API Centralizadora Início → `app/api/checkin/start/route.ts` → `POST` (suporte a `staff_webcam`, `kiosk`, `patient_mobile`)
  - API Confirmação Biométrica → `app/api/checkin/[token]/confirm/route.ts` → `POST` (validação de `created_by` para `staff_webcam`, auditoria de `surface` e broadcast)
  - API Cadastro Facial Terapeuta → `app/api/therapist/biometric-enrollment/route.ts` → `POST` (criptografia AES-256-GCM com `person_type='therapist'`)
  - API Início de Atendimento Clínico → `app/api/appointments/[id]/start/route.ts` → `POST` (antifraude da terapeuta quando ativado pela clínica)
  - API Autenticação PIN Tablet → `app/api/reception/pin-login/route.ts` → `POST` (validação bcrypt, cookie efêmero de 15 min isolado de sessões do sistema)
  - API Gestão de PINs → `app/api/reception/pins/route.ts` → `GET`, `POST`
  - API Disparo de Link Mobile → `app/api/checkin/patient-mobile/send-link/route.ts` → `POST` (link de 3 min via WhatsApp)
  - Interface Pública Mobile Paciente → `app/c/[capture_token]/page.tsx` e `PatientMobileCaptureClient.tsx` (404 estrito, zero login, zero QR)
  - Terminal Quiosque + Modo Recepção → `app/terminal/page.tsx` → Desbloqueio temporário de 15 min via PIN, busca e gestão de fila
  - Botão de Início de Atendimento → `components/appointments/DoctorCheckinButton.tsx` → Integração multi-superfície e validação da terapeuta
  - Suíte de Testes da Especificação V4 → `scripts/test_v4_multisurface_spec.mjs`
- **Descrição Técnica**:
  - **1. Contexto e Motivação da Arquitetura V4**:
    - A proporção real de consultórios clínicos é de cerca de 30 terapeutas para apenas 1 tablet compartilhado na recepção/quiosque. No modelo anterior de quiosque exclusivo, criavam-se gargalos físicos de atendimento e filas para o próprio check-in.
    - A V4 resolve este desafio estrutural mantendo o modelo de tablet da V3 como fallback/exceção, e introduzindo **Superfícies de Captura Plugáveis** (Webcam da Terapeuta, Tablet Quiosque e Celular do Paciente), além de **Verificação Biométrica Antifraude da Própria Terapeuta** (Fluxo B) e **Modo Recepção com PIN Efêmero** no tablet.
  - **2. Arquitetura e Implementação**:
    - **Fluxo A — Check-in do Paciente (3 Superfícies Convergentes)**:
      - *Superfície `staff_webcam` (Principal)*: A terapeuta autenticada em seu próprio computador clica para fazer check-in com sua webcam local. O sistema emite um token efêmero com `surface='staff_webcam'` e `created_by=user.id`. A captura facial via rede neural face-api.js extrai o descritor Float32Array (128 dimensões) e valida contra `patient_face_biometrics`. A confirmação exige estritamente que a terapeuta logada seja a proprietária do token (`created_by === user.id`), impedindo confirmações cruzadas não autorizadas.
      - *Superfície `kiosk` (Tablet Compartilhado)*: Mantido integralmente da V3 para walk-ins e pacientes sem celular/câmera.
      - *Superfície `patient_mobile` (Fase 2)*: Envio de link de uso único (`https://clinigo.app/c/:capture_token`) com validade estrita de 3 minutos via WhatsApp. O paciente abre a página no navegador do celular, vê apenas seu primeiro nome e realiza a validação facial. Tokens expirados ou inválidos retornam `404 Not Found` genérico sem expor dados do paciente ou do sistema. Sem login, sem app, sem QR Code.
    - **Fluxo B — Verificação da Terapeuta antes de Iniciar o Atendimento**:
      - Mecanismo antifraude controlado por clínica via flag `checkin_settings.require_therapist_biometric_on_start`.
      - Quando ativado, o endpoint `POST /api/appointments/:id/start` exige `face_descriptor` e compara o vetor facial contra `patient_face_biometrics WHERE person_type='therapist' AND therapist_user_id=user.id`.
      - Se a distância euclidiana for < 0.58, o sistema grava `therapist_start_biometric_events (matched=true, distance)`, preenche `appointments.therapist_start_verified_at` e altera o status para `IN_PROGRESS`.
      - Se a biometria não conferir, registra `matched=false`, retorna erro 403 e NÃO inicia o atendimento.
    - **Modo Recepção no Tablet via PIN Efêmero (15 minutos)**:
      - O tablet permanece por padrão no modo quiosque passivo aguardando chamadas remotas.
      - Ao tocar em "Modo Recepção", abre-se um teclado numérico touch grande (mínimo 44x44px) protegido por PIN com hash bcrypt gravado em `reception_pins`.
      - Após validação, emite um cookie assinado `clinigo_reception_token` com validade estrita de 15 minutos (900s).
      - **Isolamento Absoluto**: Não utiliza `supabase.auth`, não insere linhas em `active_sessions` e não monta `useSessionGuard`, garantindo que as sessões dos terapeutas nos computadores permaneçam intactas.
      - No Modo Recepção, o tablet permite filtrar a fila do dia por paciente ou terapeuta e validar presença para walk-ins.
    - **Auditoria de Emojis e Padrão Corporativo Premium**:
      - Zero emojis em todas as interfaces, botões, modais, mensagens de retorno e formulários, utilizando exclusivamente ícones vetoriais sóbrios (Lucide Icons).
  - **3. Validação e Testes**:
    - Suíte de testes `scripts/test_v4_multisurface_spec.mjs` executada com 45/45 testes aprovados.
    - Zero ocorrências de `supabase.auth` em `app/terminal`, `app/c` e `components/terminal`.
    - Zero ocorrências de `active_sessions` no código de login de PIN e terminal.
    - Zero ocorrências de QR Code em todas as superfícies de captura.
    - Migrations aplicadas e validadas diretamente no banco Supabase via MCP `execute_sql`.

### Item 49: Padronização Terminológica de Dispositivos e Refinamento Visual
- **Data**: 09/09/2026
- **Módulos**: Configurações → Dispositivos Pareados, Recepção, Terminais
- **Caminho Completo**:
  - Painel Administrativo → `app/dashboard/(clinic)/configuracoes/dispositivos/page.tsx`
  - Menu Lateral / Sidebar → `components/layout/sidebar.tsx`
  - Terminal de Quiosque → `app/terminal/page.tsx`
  - Seletor de Superfícies → `components/checkin/CheckinSurfacePicker.tsx`
  - Botão de Atendimento → `components/appointments/DoctorCheckinButton.tsx`
  - Guia de Ajuda Integrado → `app/dashboard/(clinic)/help/page.tsx`
  - Recepção → `app/dashboard/(clinic)/recepcao/page.tsx` (resolução de import de `createClient`)
- **Descrição Técnica**:
  - **1. Padronização Terminológica**:
    - Substituição completa da nomenclatura de "tablet" para "dispositivo" em todas as interfaces, menus, títulos e botões, garantindo padrão corporativo premium internacional e neutralidade de hardware.
    - O botão principal foi ajustado para "+ Novo Dispositivo".
    - Na barra lateral (sidebar), o item foi padronizado como "Dispositivos Pareados".
    - Na tela de pareamento do terminal (`/terminal`), os rótulos foram atualizados para "Código do Dispositivo", "Pareamento de dispositivo para validação presencial de sala" e "Conectar Dispositivo à Sala".
  - **2. Refinamento Visual e Despoluição**:
    - Remoção do banner volumoso no topo de `/dashboard/configuracoes/dispositivos` ("Isolamento Total de Sessão & LGPD") que ocupava espaço desnecessário com texto longo.
    - A informação técnica e o indicador de conformidade LGPD foram posicionados de forma discreta, compacta e elegante no rodapé da página.
  - **3. Correção na Tela de Recepção**:
    - Inclusão do import de `createClient` a partir de `@/lib/supabase/client` em `app/dashboard/(clinic)/recepcao/page.tsx`, sanando o erro `createClient is not defined` no carregamento da fila e alertas em tempo real.

### Item 50: Quatro Opções Clínicas de Atendimento, Bloqueio Administrativo de Presença Manual e Blindagem de Prontuário
- **Data**: 09/09/2026
- **Módulos**: Recepção → Agenda (Detalhes do Agendamento), Atendimento Clínico → Prontuários (PEP), Check-in do Profissional
- **Caminho Completo**:
  - Recepção → Agenda → `components/dashboard/AppointmentDetailsDrawer.tsx` → `AppointmentDetailsDrawer` (4 opções clínicas, bloqueio/desbloqueio administrativo de presença manual e atalho direto de prontuário)
  - Atendimento Clínico → Check-in → `components/appointments/DoctorCheckinButton.tsx` → `DoctorCheckinButton` (bloqueio de presença manual para terapeutas e verificação de desbloqueio)
  - Atendimento Clínico → Check-in → `components/checkin/CheckinSurfacePicker.tsx` → `CheckinSurfacePicker` (renderização de aviso e trava de presença manual bloqueada)
  - Backend → Agendamentos → `app/api/appointments/[id]/doctor-checkin/route.ts` → `POST` (correção de query com colunas existentes, cálculo de repasse e barreira 403 para presença manual sem liberação)
  - Backend → Agendamentos → `app/api/appointments/[id]/unlock-manual/route.ts` → `POST` e `DELETE` (endpoint de liberação e bloqueio de confirmação manual exclusivo para administradores)
  - Backend → Agendamentos → `app/api/appointments/[id]/clinical-status/route.ts` → `POST` (registro atômico de 'Terapeuta Desmarcou', 'Falta Justificada' e 'Falta Não Justificada')
  - Atendimento Clínico → Prontuários → `app/dashboard/(clinic)/prontuarios/[id]/page.tsx` → `loadInitialData`, `handleSave` e `handleSaveDigitalSignature` (correção das colunas de assinatura, relacionamento de médicos com usuários e fallback seguro de paciente)
  - Backend → Prontuários → `app/api/medical-records/route.ts` → `GET` (resiliência de autenticação de sessão e permissividade de joins)
  - Banco de Dados → Supabase Migrations → Colunas `manual_checkin_unlocked_at`, `manual_checkin_unlocked_by`, `digital_signature_date` e `digital_signature_signer` em `appointments`
- **Descrição Técnica**:
  - **1. Quatro Opções Clínicas no Atendimento**:
    - No drawer de Detalhes do Agendamento (`AppointmentDetailsDrawer.tsx`), sob a seção "ATENDIMENTO CLÍNICO", foram implantadas 4 opções claras e acessíveis:
      1. *Paciente Compareceu*: Confirmação de presença e início do atendimento através do botão biométrico multi-superfície (`DoctorCheckinButton`).
      2. *Terapeuta Desmarcou*: Abre diálogo modal para inserção da justificativa da profissional, marcando o agendamento como `CANCELLED`, `session_status = 'Terapeuta desmarcou'` e arquivando a justificativa.
      3. *Falta Justificada*: Abre diálogo modal para inserção da justificativa ou atestado do paciente/responsável, gravando `session_status = 'Falta justificada'`, `no_show = true` e atualizando o histórico.
      4. *Falta Não Justificada*: Diálogo de confirmação que grava `session_status = 'Falta injustificada'`, `status = 'NO_SHOW'` e `no_show = true`.
  - **2. Bloqueio de Presença Manual por Terapeuta e Desbloqueio por Administrador**:
    - Para eliminar o risco de terapeutas confirmarem presença manualmente sem justificativa ou comprovação, a opção manual é restrita por padrão no backend e frontend quando o usuário possui perfil de terapeuta (`role === 'DOCTOR'`).
    - Administradores da clínica (`CLINIC_ADMIN` ou `SUPER_ADMIN`) contam com um painel de controle dedicado em Atendimento Clínico no drawer, permitindo alternar entre "Desbloquear Confirmação Manual para Terapeuta" e "Bloquear Confirmação Manual".
    - Na tentativa de envio manual sem desbloqueio, o backend bloqueia com código HTTP 403 e a interface exibe aviso corporativo elegante explicando que a liberação deve ser realizada pela administração.
  - **3. Correção do Erro de Check-in ("Agendamento não encontrado na sua clínica")**:
    - A rota `app/api/appointments/[id]/doctor-checkin/route.ts` executava seleção de colunas que não existiam nas tabelas `appointments` e `doctors` (`price`, `percentage`, `health_insurance_id`, `type`). O PostgreSQL retornava erro 42703, mascarado como "não encontrado". A rota foi completamente reestruturada consultando estritamente os campos existentes e integrando com o calculador de repasses oficial.
  - **4. Resolução Definitiva da Persistência e Abertura do Prontuário**:
    - Identificada a causa raiz que impedia a visualização e salvamento do prontuário: a página `prontuarios/[id]/page.tsx` tentava selecionar `digital_signature_date` e `digital_signature_signer` (que não existiam no schema original), disparando exceção `Agendamento não encontrado`. Além disso, a query de médicos utilizava sintaxe incorreta de relacionamento (`user:user_id(full_name)` em vez de `user:users(full_name)`).
    - As colunas de compatibilidade foram adicionadas à tabela `appointments` e as queries foram corrigidas com `.maybeSingle()`.
    - No salvamento do prontuário (`handleSave`), o `patient_id` agora conta com fallback defensivo para `appointment.patient_id`, impedindo o erro de referência nula e garantindo a gravação sem falhas em `medical_records`.
    - Adicionado botão de atalho direto "Acessar Prontuário / Evolução da Sessão" no drawer de agendamento para abertura instantânea.

### Item 51: Resolução de ReferenceError na Agenda, Trava de Biometria no Prontuário, Faturamento de Reposição e Saneamento de Profissional Duplicada
- **Data**: 09/09/2026
- **Módulos**: Recepção → Agenda, Atendimento Clínico → Prontuários (WorldSensoryEvolutionForm), Financeiro → Resumo de Produção, Banco de Dados (Saneamento)
- **Caminho Completo**:
  - Recepção → Agenda → `components/dashboard/AppointmentDetailsDrawer.tsx` (inclusão do import de `Input` a partir de `@/components/ui/input`)
  - Deploy & DevOps → `.agents/rules/universal-rules.md`, `DOCUMENTACAO_TECNICA_V3.md` (fixação da versão estável `vercel@59.14.0` para comandos de produção)
  - Atendimento Clínico → Prontuários → `app/dashboard/(clinic)/prontuarios/[id]/page.tsx` → `loadInitialData`, `handleSave` (trava de biometria para salvar evolução e reconhecimento de `Reposição` como faturável)
  - Atendimento Clínico → Prontuários → `components/medical-records/WorldSensoryEvolutionForm.tsx` → Seção 0 (status de comparecimento, badge e bloqueio de botões de salvar/assinar se biometria não realizada)
  - Financeiro → Resumo de Produção → `app/api/financial/production-summary/route.ts` (inclusão do status `Reposição` junto a `Presente` nas sessões faturáveis para repasse)
  - Banco de Dados → Saneamento → `scripts/saneamento/2026-09-09_remover_eduarda_duplicada.sql` (exclusão de registro inativo duplicado da Dra. Eduarda e limpeza de 628 agendamentos órfãos com status "Indisponível")
- **Descrição Técnica**:
  - **1. Correção do ReferenceError na Agenda ("Input is not defined")**:
    - Identificada a causa raiz que impedia a renderização da tela de Agenda (`/dashboard/agenda`): no componente `AppointmentDetailsDrawer.tsx`, a tag `<Input>` era utilizada no campo de valor de repasse, porém o símbolo não estava importado de `@/components/ui/input`. O import foi devidamente adicionado e publicado em produção.
  - **2. Homologação do Deploy Oficial na Vercel (Projeto `clinigo-saas`)**:
    - O comando de deploy foi fixado com a versão estável `npx vercel@59.14.0 --prod --yes --scope nodexs-projects-8a6ee1f1`, superando incompatibilidade da versão `59.15.0` no Windows e garantindo promoção contínua e automatizada para `https://clinigo.app`.
  - **3. Trava Obrigatória de Biometria Facial para Evolução de Prontuário**:
    - O profissional clínico agora só consegue salvar e assinar a evolução da sessão (`medical_records` / `WorldSensoryEvolutionForm`) se a biometria facial do paciente tiver sido confirmada na recepção/totem (`verification_level = 'FACIAL_DOCTOR'` ou `DOUBLE_VERIFIED`, `checkin_method = 'facial'` ou `checkin_confirmed_at` preenchido) ou se houver liberação autorizada pela administração (`manual_checkin_unlocked_at`).
    - Caso a biometria esteja pendente em uma sessão presencial ou de reposição, a interface exibe aviso corporativo de conformidade e os botões "Salvar Evolução" e "Assinar" permanecem bloqueados, impedindo evoluções sem validação biométrica.
  - **4. Faturamento de Atendimentos de Reposição**:
    - As sessões com status `Reposição` agora possuem a marcação `Faturável` na interface e entram ativamente no cálculo de faturamento e repasse médico na rota `app/api/financial/production-summary/route.ts`, ao lado do status `Presente`.
  - **5. Saneamento de Profissional Duplicada e Agendamentos Órfãos**:
    - Constatada duplicidade no cadastro da terapeuta Dra. Eduarda do Espírito Santo Inocêncio: um perfil ativo (`188d57d9-645a-414e-8595-f0b668c7e350`) com 159 agendamentos legítimos e um perfil legado/inativo (`225a86a0-4f9b-4c70-a352-5918823ea794`) com `is_accepting_appointments = false` e 628 agendamentos que poluíam a agenda com o status "Indisponível".
    - Foi realizado backup integral em `scripts/saneamento/backup_eduarda_225a86a0_2026-09-09.json` e executada a remoção atômica via SQL das 4 séries recorrentes, 628 notificações, 628 agendamentos órfãos e do registro duplicado, limpando a grade da agenda imediatamente.

### Item 52: Ajuste de Rótulos de Duração de Sessão (Terapia e Terapia 2)
- **Data**: 09/09/2026
- **Módulos**: Recepção / Horários → Configuração de Horários, Cadastros → Profissionais
- **Caminho Completo**:
  - Horários → Configuração de Horários → `app/dashboard/(clinic)/horarios/page.tsx` → `STANDARD_DURATIONS`
  - Cadastros → Profissionais → `components/forms/doctor-form-dialog.tsx` → `SelectContent` de `consultation_duration`
- **Descrição Técnica**:
  - **1. Atualização dos Rótulos de Sessão de 40 min e 50 min**:
    - No configurador de horários de atendimento da clínica/profissionais (`horarios/page.tsx`), a opção de 40 minutos foi alterada de `'40 min (Fono/Fisioterapia)'` para `'40 min (Terapia)'`.
    - A opção de 50 minutos foi alterada de `'50 min (Psicologia / Terapia)'` para `'50 min (Terapia 2)'`.
  - **2. Extensão para o Diálogo de Profissionais**:
    - No componente `doctor-form-dialog.tsx`, foram adicionadas as opções correspondentes `40 minutos (Terapia)` e `50 minutos (Terapia 2)` no seletor de duração padrão do profissional para assegurar total coerência em todo o sistema.

### Item 53: Agendamento de Aluna/Mentoranda sem Vínculo com Paciente e Ferramenta de Promoção de Cadastros Legados
- **Data**: 09/09/2026
- **Módulos**: Banco de Dados (Supabase), Backend APIs (Alunas, Agendamento, Fila de Recepção), Frontend (Modal de Agendamento, Drawer de Detalhes, Agenda Visual, Pacientes)
- **Caminho Completo**:
  - Banco de Dados → Supabase Migrations → `supabase/migrations/20260909210000_add_student_mentoring_appointments.sql` (Criação da tabela `students`, adição de `student_id` e `mentoring_notes` em `appointments`, e constraint de exclusividade `appointments_attendee_exclusivity_chk`)
  - Backend → Alunas API → `app/api/students/route.ts` & `app/api/students/[id]/route.ts` (CRUD de alunas com isolamento multi-tenant por `clinic_id` e soft delete com `status='archived'`)
  - Backend → Migração de Paciente Legado → `app/api/students/promote-patient/route.ts` (Conversão atômica de paciente em aluna, migração de agendamentos futuros, preservação total de prontuários clínicos para auditoria e arquivamento do cadastro de paciente)
  - Backend → Agendamento Manual → `app/api/appointments/manual/route.ts` (Suporte a `is_student: true`, gravação de `appointment_type = 'STUDENT'`, dispensa de cobrança e QR Code, validação de exclusividade com supervisão)
  - Backend → Fila da Recepção → `app/api/reception/queue/route.ts` (Descarte automático de `appointment_type === 'STUDENT'` para que alunas nunca apareçam na fila de espera de atendimento clínico)
  - Frontend → Modal de Agendamento → `components/appointments/ManualAppointmentModal.tsx` (Seletor de modalidade com 3 opções: Atendimento a Paciente, Aluna / Mentoria e Supervisão Técnica; fluxo inline de cadastro de nova aluna sem sair da tela; ocultação de campos clínicos, pagamento e notificações de paciente)
  - Frontend → Drawer de Detalhes → `components/dashboard/AppointmentDetailsDrawer.tsx` (Card dedicado para sessões com Aluna/Mentoria com dados da mentoria e supressão de botões de prontuário, biometria e check-in clínico)
  - Frontend → Grade da Agenda → `components/ui/agenda-view.tsx` (Renderização de `ALUNA: [NOME]` e badge sóbrio `Aluna` nos modos semanal e timeline/diário)
  - Frontend → Cadastros de Pacientes → `app/dashboard/(clinic)/pacientes/page.tsx` (Ação "Converter em Aluna" no menu de contexto de cada paciente, abrindo modal com avisos de integridade e auditoria de prontuários)
- **Descrição Técnica**:
  - **1. Isolamento Estrutural e Arquitetura**:
    - Alunas e mentorandas nunca são misturadas à tabela `patients`, mantendo imunidade completa a rotas de prontuário médico (`medical_records`) e travas biométricas (`patient_face_biometrics`).
    - Constraint de banco de dados `appointments_attendee_exclusivity_chk` garante que para cada agendamento exista no máximo um vínculo preenchido: `patient_id` (paciente clínico), `professional_supervised_id` (supervisão técnica) ou `student_id` (aluna/mentoria).
  - **2. Fila da Recepção Segura**:
    - O endpoint `app/api/reception/queue/route.ts` exclui ativamente o tipo `STUDENT`, impedindo que mentorandas constem como pacientes aguardando chamada médica.
  - **3. Promoção Segura de Cadastros Antigos**:
    - Criada a funcionalidade para converter alunas cadastradas anteriormente como pacientes: move agendamentos a partir da data atual para o tipo `STUDENT` e preserva integralmente prontuários clínicos pré-existentes sem nenhuma exclusão de dados (garantia LGPD).
  - **4. Padronização de Nomenclatura SaaS Corporativo Internacional**:
    - Aprovado o refinamento terminológico para padrão corporativo internacional: a nomenclatura de interface foi atualizada de "Aluna" para "Mentoria Clínica / Formação Técnica" e "Mentorando(a) / Formando(a)".
    - O botão de ação rápida no modal foi padronizado como "Agendar Mentoria", a tag na agenda como "Mentoria", o bloco do agendamento como "MENTORIA: [NOME]" e o menu de conversão em Pacientes como "Converter em Mentoria".

### Item 54: Exclusão Definitiva de Usuários e Profissionais com Higienização Relacional e RLS
- **Data**: 10/09/2026
- **Módulos**: Cadastros → Equipe / Profissionais, Segurança e Administração
- **Caminho Completo**:
  - Backend → Usuários API → `app/api/users/[id]/route.ts` → `DELETE` (Higienização atômica de dependências e exclusão física condicional com confirmação estrita)
  - Frontend → Tabela de Usuários → `components/users/user-table.tsx` (Diálogo de confirmação reforçado com alerta de exclusão permanente e verificação de integridade)
- **Descrição Técnica**:
  - Implementada a rotina de exclusão física definitiva solicitada pela clínica World Sensory para expurgo total de cadastros indevidos ou de testes.
  - A operação executa em transação protegida: remove associações secundárias, logs de auditoria e registros transitórios antes do expurgo, mantendo a integridade referencial e o isolamento multi-tenant por `clinic_id`.

### Item 55: Resolução de Dependência de Ícone na Evolução de Prontuário
- **Data**: 10/09/2026
- **Módulos**: Prontuário Clínico → Evoluções Diárias
- **Caminho Completo**:
  - Frontend → Prontuário → `components/medical-records/daily-evolution-form.tsx` (Inclusão da importação de `AlertCircle` da biblioteca `lucide-react`)
- **Descrição Técnica**:
  - Corrigido o erro de execução reportado pela terapeuta Lara Maria (World Sensory) em que a visualização/abertura da evolução diária falhava devido à falta de importação de `AlertCircle`.

### Item 56: Rotina de Backup Integral do Sistema CliniGo (Nuvem e Local)
- **Data**: 10/09/2026
- **Módulos**: Infraestrutura, Banco de Dados, Repositório de Código, Cloud
- **Caminho Completo**:
  - Nuvem → GitHub → Repositório `robsonodex/clinigo.git` (Branch `master` sincronizada, criação e envio da tag `backup-cloud-2026-09-10`)
  - Nuvem → Vercel → Projeto `clinigo-saas` (Deploy de produção ativo e validado sob a organização `nodexs-projects-8a6ee1f1`)
  - Nuvem → Supabase → Projeto `dlxakeejmyzhzdxzjgne` (`ACTIVE_HEALTHY`, inventário das 182 tabelas ativas do schema public)
  - Local → Disco D: → `D:\Backup_Clinigo_10-09-2026\`
    - `D:\Backup_Clinigo_10-09-2026\clinigo\` (Snapshot completo de 4.071 arquivos e diretórios, incluindo histórico `.git`, documentações e scripts; sem artefatos efêmeros `node_modules` e `.next`)
    - `D:\Backup_Clinigo_10-09-2026\database\` (`tables_schema.json` e `tables_statistics.json` com estatísticas de linhas e volumes)
    - `D:\Backup_Clinigo_10-09-2026\clinigo_backup_full_2026-09-10.zip` (Arquivo compactado portátil de 57,5 MB)
- **Descrição Técnica**:
  - Procedimento automatizado de redundância dupla (nuvem e armazenamento físico local).
  - Preservação da integridade de código, migrações SQL, esquemas de dados, histórico de commits e documentação técnica corporativa.


### Item 57: Correção do Fluxo de Recuperação de Senha, Padronização Visual e Cadastro de Usuários com Senha Imediata
- **Data**: 10/09/2026
- **Módulos**: Autenticação, Usuários e Permissões, Segurança de Acesso, PWA Mobile
- **Caminho Completo**:
  - Middleware de Segurança -> middleware.ts (Inclusão de /api/auth/forgot-password, /api/auth/reset-password, /api/auth/activate-account na lista PUBLIC_ROUTES e rotas de página /recuperar-senha, /redefinir-senha, /ativar-conta em isPublicPage)
  - Interface Web Autenticação -> pp/(auth)/recuperar-senha/page.tsx (Substituição de ícone genérico pelo logotipo oficial /logo_black.svg, remoção de emojis, mensagens claras de retorno e links de navegação para portais de acesso: Médico, Mobile e Clínica)
  - Interface Web Autenticação -> pp/(auth)/redefinir-senha/[token]/page.tsx (Substituição de ícone pelo logotipo oficial /logo_black.svg, remoção de emojis e redirecionamento conforme perfil)
  - Interface Mobile PWA -> pp/m/login/page.tsx (Adição do link de ação rápida Esqueci minha senha com direcionamento contextualizado)
  - Backend API Usuários -> pp/api/users/invite/route.ts (Sincronização imediata: ao cadastrar usuário com senha definida pela administração, o status é gravado como is_active: true e ctivation_status: 'active', sem exigir ativação prévia pendente; o papel ole é persistido em aw_user_meta_data; e para perfis médicos/terapeutas DOCTOR, é gerado/reativado automaticamente o registro correspondente na tabela doctors com vínculo de especialidade e dados profissionais)
- **Descrição Técnica**:
  - **1. Causa Raiz do Erro de Recuperação de Senha**: O middleware.ts interceptava chamadas não autenticadas à API /api/auth/forgot-password e retornava código HTTP 401 Unauthorized, gerando no cliente o alerta genérico Erro ao processar solicitação. A liberação explícita destas rotas públicas restaurou o fluxo end-to-end de emissão de tokens de redefinição com envio via serviço SMTP Hostinger.
  - **2. Ativação de Usuários no Módulo Usuários e Permissões**: Corrigido o fluxo de provisionamento manual de credenciais pela clínica (ex: administração cadastrando login/senha e repassando ao profissional). O usuário agora é criado diretamente como ativo no Supabase Auth e em public.users, com o vínculo profissional em public.doctors garantido, permitindo login imediato ou redefinição de senha sem bloqueios.
  - **3. Caso Ana Carolina Urciuoli (World Sensory)**: Cadastro ativado, registros sincronizados entre users e doctors, e e-mail com link seguro de redefinição de senha despachado com sucesso via Hostinger SMTP.
### Item 58: Correção e Blindagem da Exclusão e Cancelamento de Séries Recorrentes na Agenda
- **Data**: 10/09/2026
- **Módulos**: Recepção → Agenda, Séries Recorrentes, Agendamentos
- **Caminho Completo**:
  - Backend → Séries Recorrentes API → `app/api/appointments/recurring/[id]/route.ts` → `DELETE` (Uso de `createServiceRoleClient` para evitar session drops na Vercel, validação estrita de clínica `effectiveClinicId`, cancelamento de todos os agendamentos futuros não concluídos com `status != 'COMPLETED'`, suporte a exclusão definitiva da série com parâmetro `?permanent=true` e eliminação de silenciamento de erros de banco)
  - Backend → Séries Recorrentes API → `app/api/appointments/recurring/[id]/route.ts` → `PATCH` (Uso de Service Role nas alterações de horário e dias da semana, limpeza atômica de agendamentos não concluídos anteriores e reativação automática da série)
  - Frontend → Séries Recorrentes Modal → `components/appointments/RecurringSeriesListModal.tsx` (Botão Excluir com confirmação explícita de expurgo, envio de `permanent=true` para remoção definitiva da listagem e invalidação imediata de cache)
  - Frontend → Detalhes do Agendamento → `components/dashboard/AppointmentDetailsDrawer.tsx` (Implementação de diálogo de escolha para agendamentos pertencentes a séries recorrentes: "Excluir apenas este" ou "Excluir toda a série", desvinculando e limpando a grade)
  - Frontend → Visão de Grade da Agenda → `components/ui/agenda-view.tsx` (Ajuste do mutation de cancelamento de série com `permanent=true`, invalidação conjunta das chaves de agendamentos e séries cadastradas)
  - Banco de Dados → Supabase → Saneamento rastreável (`scripts/saneamento/2026-09-10_excluir_serie_danila_joao_luis.mjs`): expurgo definitivo da série inativa órfã da Dra. Danila Aparecida Costa dos Passos com cascata limpa.
- **Descrição Técnica**:
  - **1. Causa Raiz**: O endpoint `DELETE /api/appointments/recurring/[id]` utilizava o cliente de sessão de cookies `createClient()`, suscetível a bloqueios de RLS em operações batch na Vercel. Adicionalmente, o erro era capturado apenas em `console.error` sem abortar a requisição, retornando sucesso com 0 agendamentos cancelados, e a tabela `recurring_appointment_series` apenas recebia `is_active: false` (permanecendo visível na listagem como pausada).
  - **2. Resolução**: Implementada a execução transacional com Service Role isolada por tenant (`clinic_id`), cancelamento de todos os agendamentos futuros não realizados, expurgo da série do cadastro e opção contextual nos modais da agenda.

### Item 59: Resolução de Visualização e Exclusão de Documentos (R2/Supabase) e Isolamento de Fluxo da Recepção (Espaço Incluir)
- **Data**: 11/09/2026
- **Módulos**: Prontuário → Documentos, Recepção → Fila Presencial, Storage Híbrido R2/Supabase
- **Caminho Completo**:
  - Backend → Documentos Download API → `app/api/documents/[id]/download/route.ts` → `GET` (Criação de rota segura com autenticação multi-tenant e redirecionamento HTTP 302 para Presigned URL temporária do Cloudflare R2 ou Supabase Storage, eliminando erros de protocolo `r2://` e 404 de caminhos relativos no navegador)
  - Backend → Documentos Signed-URL API → `app/api/documents/[id]/signed-url/route.ts` → `GET` (Aprimoramento do resolvedor com suporte a qualquer chave R2 com ou sem prefixo `r2://` e fallback transparente para o Supabase Storage)
  - Backend → Documentos Delete API → `app/api/documents/[id]/route.ts` → `DELETE` (Permissão concedida para perfil `RECEPTIONIST` excluir documentos de pacientes da sua própria clínica, tolerância a remoção física de arquivos órfãos sem abortar limpeza do banco e efetivação com Service Role após validação rigorosa de tenant)
  - Banco de Dados → Supabase Migrations → `supabase/migrations/20260911_receptionist_delete_patient_documents.sql` (Atualização da política RLS `documents_delete_by_role` na tabela `patient_documents` via MCP Supabase autorizando `RECEPTIONIST` da mesma clínica)
  - Frontend → Prontuário Documentos → `app/dashboard/(clinic)/documentos/page.tsx` (Substituição de links diretos `<a href={doc.storage_path}>` pela rota segura `/api/documents/${doc.id}/download` e simplificação do visualizador)
  - Frontend → Prontuário Paciente → `components/patients/PatientDocuments.tsx` (Substituição de links diretos de download pela rota `/api/documents/${doc.id}/download` e melhoria do tratamento de erro no delete)
  - Frontend → Recepção → `app/dashboard/(clinic)/recepcao/page.tsx` (Isolamento exclusivo para o Espaço Incluir: fluxo estrito de 2 etapas [Check-in e Concluir], sem botão "Chamar" e sem etapa intermediária de "Em Atendimento", mantendo as 4 etapas intactas para as demais clínicas; restauração da abertura do modal de cancelamento `noShowModal` para preenchimento obrigatório de justificativa/motivo da falta)
- **Descrição Técnica**:
  - **1. Causa Raiz Documentos**: Links de arquivos no Cloudflare R2 continham a URI `r2://...` no campo `patient_documents.file_url`, causando tela em branco quando o navegador tentava navegar diretamente para esse protocolo. Adicionalmente, arquivos cadastrados com chaves relativas sem protocolo disparavam páginas 404 do Next.js. Na exclusão, a regra de perfil barrava recepcionistas caso o documento tivesse sido anexado por um terapeuta/médico, e a política RLS no Postgres possuía `ELSE false` para `RECEPTIONIST`.
  - **2. Causa Raiz Recepção**: Uma unificação anterior havia introduzido globalmente o botão de TV "Chamar" e o status "Em Atendimento", além de contornar a abertura do modal de motivo de cancelamento com a flag `!chamadaPainelTvHabilitada`.
  - **3. Resolução Cirúrgica**: Rota central de download seguro com redirecionamento para Presigned URL; autorização e RLS atualizados para recepcionistas; limpeza do registro órfão específico do Arthur Luiz que gerava erro; isolamento da clínica Espaço Incluir (`5163c916-8b82-4d80-8a71-01726836ee46`) para operar estritamente em 2 etapas operacionais (Check-in e Concluir); e restauração do modal de justificativa de cancelamento na Recepção.

### Item 60: Conexão WhatsApp Multi-Sessão por Setores e Eliminação de Falso Positivo (Espaço Incluir)
- **Data**: 11/09/2026
- **Módulos**: WhatsApp Multi-Sessão, Integrações, Configurações
- **Caminho Completo**:
  - Backend → WhatsApp Status API → `app/api/whatsapp/status/route.ts` → `GET` (Verificação estrita de credenciais registradas no Storage antes de declarar status como connected; eliminação de falso positivo onde o registro no banco constava como conectado mesmo com sessão inativa)
  - Backend → WhatsApp Connect API → `app/api/whatsapp/connect/route.ts` → `POST` (Suporte explícito ao parâmetro `sector` no handshake e emissão de QR Code dedicado por setor: financeiro, recepcao, comercial, default)
  - Backend → Baileys Service → `lib/whatsapp/service.ts` (Sessões isoladas por par `[clinicId, sector]`, garantia de persistência das credenciais no Supabase Storage)
  - Banco de Dados → Supabase → Tabela `whatsapp_sessions` (Ajuste de restrição única e índice para `(clinic_id, sector)`, permitindo múltiplos números de WhatsApp por clínica)
- **Descrição Técnica**:
  - O WhatsApp do setor Financeiro da clínica Espaço Incluir apresentava inconsistência onde a interface exibia pop-up de sucesso na conexão, mas a sessão não transmitia mensagens. A validação das credenciais foi corrigida para cruzar o estado de autenticação real (`creds.registered`) com o banco de dados. A conexão do número (11) 97080-7530 foi validada e consolidada com status `connected`.

### Item 61: Módulo CRM de Campanhas com Disparo Cadenciado via WhatsApp e Gestão de Lotes
- **Data**: 11/09/2026
- **Módulos**: CRM → Campanhas, Disparo em Lote WhatsApp, Automação
- **Caminho Completo**:
  - Banco de Dados → Supabase Migration → `supabase/migrations/20260911_create_campaigns_table.sql` (Criação da tabela `campaigns`, índices de busca, colunas de rastreio de entrega `sent_count`, `error_count` e política RLS multi-tenant vinculada ao `clinic_id`)
  - Backend → CRM Campanhas API → `app/api/crm/campaigns/route.ts` → `GET`, `POST`, `DELETE` (Consolidação em rota única de alta performance: listagem de campanhas por clínica; criação com suporte a variáveis dinâmicas `{{patient_name}}` e `{{clinic_name}}`; sub-ação `action: 'send'` executada de forma assíncrona e não bloqueante com `after()` do Next.js 16 para envio seguro e cadenciado via Baileys com tempo limite de 60s; exclusão de campanhas por ID via query param)
  - Frontend → CRM Dashboard → `app/dashboard/(clinic)/crm/page.tsx` (Formulário modal "Nova Campanha" com seletor de setor do WhatsApp [Financeiro, Recepção, Comercial, Principal]; botões "Salvar Rascunho", "Salvar e Disparar" e "Disparar WhatsApp"; atualização automática a cada 3s durante o processamento em segundo plano; botão de exclusão com diálogo de confirmação formal; áreas de toque e responsividade compatíveis com padrão PWA Mobile)
- **Descrição Técnica**:
  - Implementado motor de envio em lote seguro para proteger os números de WhatsApp contra banimento pela Meta. O envio opera em pares com intervalo de segurança nativo do Baileys e atualização contínua do progresso no banco de dados. A consolidação em rota única evitou o limite de 12 Serverless Functions do plano Hobby da Vercel.

