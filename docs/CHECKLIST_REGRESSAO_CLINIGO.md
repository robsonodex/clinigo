# Checklist de Regressão e Matriz de Permissões - CliniGo (V5.1)

Este documento serve como protocolo operacional para prevenção de falhas em atualizações do CliniGo, garantindo isolamento multi-tenant, estabilidade contínua e integridade de permissões RBAC.

---

## 1. Matriz de Permissões por Papel (Role x Módulo)

| Módulo / Rota | SUPER_ADMIN | CLINIC_ADMIN | FINANCIAL | DOCTOR | RECEPTIONIST | READONLY |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Dashboard Principal** (`/dashboard`) | Sim | Sim | Sim | Sim | Sim | Sim (Leitura) |
| **Agenda de Atendimentos** (`/dashboard/agenda`) | Sim | Sim | Não | Sim (somente própria) | Sim | Sim (Leitura) |
| **Prontuário Clínico / PEP** (`/dashboard/prontuarios/*`) | Sim | Sim | Não | Sim (somente vinculados) | Não | Sim (Leitura) |
| **Pacientes** (`/dashboard/pacientes`) | Sim | Sim | Não | Sim (vinculados) | Sim | Sim (Leitura) |
| **Médicos / Equipe Clínica** (`/dashboard/medicos`) | Sim | Sim | Não | Não | Não | Sim (Leitura) |
| **Projetos e Tarefas** (`/dashboard/tarefas`) | Sim | Sim | Sim | Sim (próprias/atribuídas) | Sim | Sim (Leitura) |
| **Faturamento TISS** (`/dashboard/tiss/*`) | Sim | Sim | Sim | Não | Sim (Leitura/Guias) | Sim (Leitura) |
| **Financeiro Geral e DRE** (`/dashboard/financial/*`) | Sim | Sim | Sim | Não | Não | Sim (Leitura) |
| **Demonstrativos e Repasse** (`/dashboard/financial/payroll`) | Sim | Sim | Sim | Sim (somente próprio) | Não | Sim (Leitura) |
| **Convênios e Tabela TUSS** (`/dashboard/convenios`) | Sim | Sim | Sim | Não | Não | Sim (Leitura) |
| **Gestão de Usuários e Assentos** (`/dashboard/configuracoes/usuarios`) | Sim | Sim | Não | Não | Não | Sim (Leitura) |
| **Painel de Chamada TV** (`/dashboard/tv`) | Sim | Sim | Não | Sim | Sim | Sim (Leitura) |
| **Telemedicina / Salas Virtuais** (`/video/*`) | Sim | Sim | Não | Sim | Não | Não |
| **Super Admin Master Hub** (`/system-master-hub`) | Sim | Não | Não | Não | Não | Não |

> **Regras Estritas de Segurança:**
> 1. **Isolamento do Perfil READONLY:** O usuário com papel `READONLY` possui permissão estritamente consultiva. Qualquer requisição HTTP com método `POST`, `PUT`, `PATCH` ou `DELETE` disparada por este perfil é sumariamente bloqueada no backend com código HTTP `403 Forbidden`.
> 2. **Isolamento de Cadastro Financeiro:** Usuários com papel `FINANCIAL` são cadastrados exclusivamente na tabela `users` (sem correspondente na tabela `doctors`), assegurando que nunca apareçam como profissionais disponíveis para agendamento na agenda ou no painel de TV.
> 3. **Defesa em Profundidade TISS:** 100% dos endpoints administrativos de faturamento TISS utilizam o helper `enforceTissAdministrativeGuard`, bloqueando com 403 qualquer requisição de perfil assistencial (`DOCTOR`).

---

## 2. Checklist de Regressão Operacional (Telas Críticas)

Executar após qualquer mudança relevante de código ou deploy:

- [ ] **1. Agenda (`/dashboard/agenda`)**:
  - Modal de agendamento manual abre sem erro.
  - Horário livre aceita qualquer minuto (HH:MM).
  - Forma de pagamento "Convênio" lista apenas convênios ativos da clínica logada.
  - Cancelamento de agendamento libera o horário imediatamente sem violação de chave única.

- [ ] **2. Prontuário Clínico e Documentos R2 (`/dashboard/prontuarios/[id]`)**:
  - Visualização de documentos de pacientes gera URLs pré-assinadas com prefixo `r2://` e responde em menos de 2 segundos.
  - Evolução por sessão bloqueia edição após finalização.
  - Assinatura ICP-Brasil grava hash e exibe selo formal de autenticidade.

- [ ] **3. Gestão de Tarefas Corporativas (`/dashboard/tarefas`)**:
  - Visualização Kanban renderiza colunas TODO, IN_PROGRESS e DONE.
  - Farol de SLA exibe corretamente cores Verde (no prazo), Âmbar (vence hoje) e Vermelho (atrasado).
  - Terapeutas não visualizam tarefas particulares de outros colegas.

- [ ] **4. Faturamento TISS Premium (`/dashboard/tiss`)**:
  - Emissão de nova guia gera numeração sequencial atômica sem duplicação.
  - Geração de XML do lote calcula hash e grava histórico em `tiss_batch_xml_versions`.
  - Tentativa de acesso por médicos (`DOCTOR`) retorna 403 Forbidden.

- [ ] **5. Licenciamento por Assentos (`/dashboard/configuracoes/usuarios`)**:
  - Card exibe assentos ativos vs incluídos no plano.
  - Criação de usuário além do limite abre modal transparente de R$ 49,90/mês assinado com HMAC-SHA256.
  - Aceite registra evento com idempotência em `seat_billing_events`.

- [ ] **6. Telemedicina WebRTC (`/video/[id]`)**:
  - Entrada de médico e paciente na sala ocorre sem oscilação ou tela piscando (canal Realtime estável).
  - Encerramento de chamada atualiza status do agendamento para concluído.

- [ ] **7. Painel do Dono (`/system-master-hub`)**:
  - Super Admin visualiza lista de clínicas com badges corretos de TISS Premium e plano.
  - Alternância do interruptor persiste a feature flag em `clinics.addons`.
