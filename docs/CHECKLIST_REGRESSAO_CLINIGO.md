# Checklist de Regressao e Matriz de Permissoes - CliniGo

Este documento serve como protocolo operacional para prevencao de falhas em atualizacoes do CliniGo, garantindo isolamento multi-tenant e estabilidade continua.

---

## 1. Matriz de Permissoes por Papel (Role x Modulo)

| Modulo / Rota | SUPER_ADMIN | CLINIC_ADMIN | FINANCIAL | DOCTOR | RECEPTIONIST |
|---|:---:|:---:|:---:|:---:|:---:|
| **Dashboard Principal** (`/dashboard`) | Sim | Sim | Sim | Sim | Sim |
| **Agenda de Atendimentos** (`/dashboard/agenda`) | Sim | Sim | Nao | Sim (somente propria) | Sim |
| **Prontuario Clinico / PEP** (`/dashboard/prontuarios/*`) | Sim | Sim | Nao | Sim (somente proprios) | Nao |
| **Pacientes** (`/dashboard/pacientes`) | Sim | Sim | Nao | Sim (vinculados) | Sim |
| **Medicos / Equipe Clinica** (`/dashboard/medicos`) | Sim | Sim | Nao | Nao | Nao |
| **Financeiro Geral** (`/dashboard/financial`) | Sim | Sim | Sim | Nao | Nao |
| **Notas e Demonstrativos** (`/dashboard/financial/notas-demonstrativos`) | Sim | Sim | Sim | Sim (propria NF) | Nao |
| **Faturamento / Cobrancas** (`/dashboard/financial/faturamento`) | Sim | Sim | Sim | Nao | Nao |
| **Convenios** (`/dashboard/configuracoes/convenios`) | Sim | Sim | Sim | Nao | Nao |
| **Gestao de Usuarios** (`/dashboard/configuracoes/usuarios`) | Sim | Sim | Nao | Nao | Nao |
| **Painel de Chamada TV** (`/dashboard/tv`) | Sim | Sim | Nao | Sim | Sim |

> **Regra de Isolamento de Cadastro**: Usuarios com papel `FINANCIAL` sao cadastrados exclusivamente na tabela `users` (sem correspondente na tabela `doctors`), assegurando que nunca aparecam como profissionais disponiveis para agendamento na agenda ou painel de chamada da TV.

---

## 2. Checklist de Regressao Operacional (Telas Criticas)

Executar apos qualquer mudanca relevante de codigo ou deploy:

- [ ] **1. Agenda (`/dashboard/agenda`)**:
  - Modal de agendamento manual abre sem erro.
  - Selecao de horario livre aceita qualquer minuto (HH:MM).
  - Forma de pagamento "Convenio" lista apenas convenios ativos da clinica logada.
- [ ] **2. Prontuario Clinico (`/dashboard/prontuarios/[id]`)**:
  - Na World Sensory: ficha de evolucao terapeutica em 7 secoes estruturadas com assinatura automatica do profissional (nome, especialidade, conselho).
  - Em outras clinicas: formulario padrao preservado intacto.
  - Exportacao para PDF funcional sem cortes.
- [ ] **3. Perfil do Usuario (`/dashboard/perfil`)**:
  - Edicao do nome completo salva corretamente na tabela `users(full_name)`.
  - Reflete imediatamente na barra de navegacao e cabecalhos.
- [ ] **4. Valores por Paciente (`/dashboard/medicos/[id]`)**:
  - Aba carrega sem erro de inicializacao temporal (bug `eL`).
  - Lista valores diferenciados por paciente e permite busca.
- [ ] **5. Notas e Demonstrativos (`/dashboard/financial/notas-demonstrativos`)**:
  - Upload de NF pelo profissional dispara notificacao para administradores e financeiro da clinica.
  - Lista de documentos isolada estritamente por clinica.
- [ ] **6. Gestao de Usuarios (`/dashboard/configuracoes/usuarios`)**:
  - Exibe nomes corretos e suporta papel "Administrativo / Financeiro".
- [ ] **7. Painel de TV (`/dashboard/tv`)**:
  - Apenas profissionais de saude cadastrados aparecem na chamada de atendimento.
- [ ] **8. Responsividade Mobile (PWA)**:
  - Botoes com area minima de toque (44x44px).
  - Sem overflow horizontal em telas com largura inferior a 768px.
