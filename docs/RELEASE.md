# Manual de Produção: Pacote de Release — Módulo TISS CliniGo

Este documento foi elaborado para o dono da clínica ou administrador do sistema. Contém instruções simples, curtas e exatas para colocar em produção as novas melhorias do Faturamento TISS sem interromper o funcionamento das clínicas atuais.

---

## 1. Passo Zero: Segurança e Backup Preventivo

Antes de rodar qualquer comando no banco de dados:
1. Acesse o painel do Supabase do projeto de produção.
2. No menu lateral esquerdo, clique em **Project Settings** (ícone de engrenagem) e depois em **Database**.
3. Desça até a seção **Backups** e clique em **Create Backup** (ou solicite um snapshot sob demanda).
4. Abra o **SQL Editor** do Supabase.

---

## 2. Pré-checagem de Duplicatas (Obrigatório antes das Migrations)

Antes de aplicar qualquer migração, execute o script de pré-checagem abaixo no SQL Editor do Supabase. Ele é **somente leitura** e não altera nenhum dado:

Arquivo de referência: `docs/release/00_pre_checagem_duplicatas.sql`

```sql
SELECT 
    clinic_id,
    guide_number,
    COUNT(*) AS total_duplicatas,
    ARRAY_AGG(id) AS ids_guias,
    ARRAY_AGG(status) AS status_guias,
    MIN(created_at) AS primeira_criacao,
    MAX(created_at) AS ultima_criacao
FROM tiss_guides
WHERE guide_number IS NOT NULL AND TRIM(guide_number) != ''
GROUP BY clinic_id, guide_number
HAVING COUNT(*) > 1
ORDER BY total_duplicatas DESC, clinic_id;
```

- **Se retornar 0 linhas:** Tudo certo. Pode prosseguir com as migrações no passo 3.
- **Se retornar linhas:** Existem guias com o mesmo número cadastradas na mesma clínica. Pare e entre em contato com o suporte técnico para unificar ou cancelar os registros duplicados antes de aplicar o índice único da migration 5.

---

## 3. Ordem Exata de Execução das Migrations

Abra a pasta `supabase/migrations/` e execute os arquivos um a um, **exatamente na ordem abaixo**, no SQL Editor do Supabase.

> Regra de ouro: Se alguma migration apresentar mensagem de erro, pare imediatamente e copie a mensagem. O sistema atual continuará funcionando normalmente porque o código novo só será publicado após o banco estar pronto.

| Ordem | Arquivo Real da Migration | O que ela faz em uma linha | O que conferir logo após rodar |
|---|---|---|---|
| 1 | `20260929120000_tiss_convenios_glosas_repasse.sql` | Cria catálogos TUSS e ANS, tabela de preços, controle de glosas e colunas de repasse em clínicas. | `SELECT count(*) FROM information_schema.tables WHERE table_name = 'tuss_procedures';` (deve retornar 1) |
| 2 | `20260929130000_tiss_undo_rpc_and_reimport.sql` | Cria função segura para desfazimento de retorno importado e permite reimportação do mesmo arquivo. | `SELECT count(*) FROM pg_proc WHERE proname = 'tiss_undo_return_import';` (deve retornar 1) |
| 3 | `20260929140000_tiss_batch_hash_tracking.sql` | Adiciona colunas para guardar o código Hash e data de geração do XML dos lotes. | `SELECT count(*) FROM information_schema.columns WHERE table_name = 'tiss_batches' AND column_name = 'hash_value';` (deve retornar 1) |
| 4 | `20260929150000_tiss_premium_foundation.sql` | Cria contadores automáticos de numeração de guias e histórico de versões de XML. | `SELECT count(*) FROM information_schema.tables WHERE table_name = 'tiss_guide_counters';` (deve retornar 1) |
| 5 | `20260929160000_tiss_premium_hardening.sql` | Preenche os números anteriores e ativa trava para impedir número de guia repetido. | `SELECT count(*) FROM pg_class WHERE relname = 'uq_tiss_guides_clinic_number';` (deve retornar 1) |
| 6 | `20260929170000_tiss_guide_cancelled_status.sql` | Adiciona suporte a guias canceladas sem distorcer o cálculo de perdas da clínica. | `SELECT count(*) FROM information_schema.columns WHERE table_name = 'tiss_guides' AND column_name = 'cancellation_reason';` (deve retornar 1) |
| 7 | `20260930100000_create_patient_intake_module.sql` | Cria a estrutura do pré-cadastro online de pacientes com fotos de documentos. | `SELECT count(*) FROM information_schema.tables WHERE table_name = 'patient_intake_links';` (deve retornar 1) |
| 8 | `20260930110000_tiss_premium_p0_extensions.sql` | Cria as tabelas de recursos de glosa, anexos em pasta privada e envio manual de lote. | `SELECT count(*) FROM information_schema.tables WHERE table_name = 'tiss_appeals';` (deve retornar 1) |

### Conferência Geral Pós-Migrações
Após rodar as 8 migrations, execute o script de verificação final (`docs/release/99_verificar_apos_migrations.sql`) no SQL Editor. Ele imprimirá uma lista completa confirmando que cada tabela, coluna e índice está presente (todos com status SIM).

---

## 4. Publicação do Código (Deploy na Vercel)

Com o banco de dados atualizado, faça a publicação da versão no servidor.

Todas as novas telas e botões ficam **desligados por padrão** para todas as clínicas via feature flag (`faturamento_premium = false`). Nenhuma clínica em produção terá sua rotina alterada após este comando.

Execute no terminal:
```bash
git push origin master
npx vercel@59.14.0 --prod --yes --scope nodexs-projects-8a6ee1f1
```

---

## 5. Roteiro de Teste de 10 Minutos por Perfil

### Etapa Prévia Obrigatória (ANTES de ligar a flag na clínica teste):
Abra o sistema em uma clínica real já existente e acesse:
- **Menu** > **Meu Financeiro** > **Produção** (`/dashboard/meu-financeiro/producao`).
- Confirme que os valores de produção e repasse dos profissionais estão idênticos aos de antes.
- *Motivo:* O cálculo de produção foi aprimorado para respeitar recursos de glosa; nas clínicas com a flag desligada, o cálculo permanece exatamente igual ao anterior.

---

### Como Ligar a Feature Flag na Clínica de Teste

#### Método Principal: Interruptor no Painel do Dono (Super Admin)
A ativação é controlada com exclusividade pelo Dono da Plataforma no Painel Super Admin (evitando ativação acidental por parte dos usuários comuns):
1. Acesse o Painel do Dono: `https://clinigo.app/system-master-hub` (ou na tela de permissões `/system-master-hub/clinics/[id]/permissions`).
2. Na aba **Todas as Clínicas**, localize a clínica piloto e observe a coluna **TISS Premium** (status inicial: `Inativo`).
3. Clique no botão **Ativar**.
4. O modal de confirmação será exibido: `"Ativar o Faturamento TISS Premium para [Nome da Clínica]?"`.
5. Clique em **Confirmar Ativação**. O badge mudará imediatamente para `Ativo` e o estado será persistido com registro de auditoria.

#### Método Alternativo (Plano B — Via SQL de Contingência)
Caso não esteja logado no painel web, copie e execute no SQL Editor do Supabase (arquivo `docs/release/ligar_flag.sql`):
```sql
UPDATE clinics 
SET addons = COALESCE(addons, '{}'::jsonb) || '{"faturamento_premium": true}'::jsonb 
WHERE id = 'ID_DA_CLINICA';
```

Para consultar se a flag está ativada:
```sql
SELECT id, name, addons->>'faturamento_premium' AS faturamento_premium 
FROM clinics 
WHERE (addons->>'faturamento_premium')::boolean = true;
```

---

### Roteiro de Verificação (10 Minutos)

#### 1. Perfil RECEPÇÃO (2 minutos)
- Acesse **Faturamento TISS** (`/dashboard/tiss`).
- Clique no botão **Nova Guia**: verifique o formulário de emissão em 3 passos com busca de paciente e preenchimento de procedimento.
- **O que a Recepção NÃO pode ver ou fazer:**
  - Não pode fechar lotes (bloqueado por permissão).
  - Não pode excluir guias fechadas ou transmitidas (apenas cancelar com justificativa).
  - Não tem acesso à aba de Recursos de Glosa.

#### 2. Perfil FINANCEIRO (3 minutos)
- Acesse **Lotes TISS** (`/dashboard/tiss/batches`).
- Note os filtros no topo com contadores de lotes (Rascunho, Fechados, Enviados).
- Abra o menu de 3 pontos de um lote em rascunho:
  - Clique em **Vincular Guias**: selecione guias e veja a soma de valor e quantidade atualizando ao vivo.
  - Clique em **Fechar Lote**: o sistema verifica se há impeditivos (carteirinha ou valor pendente) e só fecha se estiver 100% correto.
- Em um lote já fechado (`VALID` ou `CLOSED`), abra o menu e clique em **Registrar Envio Manual**: anexe um comprovante em PDF e informe o protocolo. O lote avança para Enviado.
- Clique em **Histórico do Lote**: a gaveta lateral se abre mostrando quem fechou e quem enviou.

#### 3. Perfil ADMINISTRADOR DA CLÍNICA (3 minutos)
- Acesse **Glosas e Recursos** (`/dashboard/tiss/glosas`).
- Clique no botão **Lançar Glosa Manual**: informe um código ANS de glosa e o valor. O sistema não permite lançar valor maior do que o da guia.
- Clique na aba **Recursos de Glosa (C1 - C8)**:
  - Crie um recurso agrupando as glosas da mesma operadora.
  - Anexe um documento comprobatório.
  - Registre o parecer (Acatado ou Negado) e confirme a liquidação.

#### 4. Perfil PROFISSIONAL / TERAPEUTA (2 minutos)
- Acesse com o login de um profissional médico ou terapeuta.
- Vá em **Meu Financeiro** > **Produção** (`/dashboard/meu-financeiro/producao`).
- **O que o Profissional NÃO pode ver:**
  - Vê estritamente os seus próprios atendimentos (sigilo total entre profissionais).
  - Não vê faturamento global da clínica, dados contábeis de outros médicos nem telas de envio de lotes TISS.

---

## 6. Procedimentos de Contingência e Rollback

Caso encontre qualquer comportamento fora do esperado, siga os passos abaixo para normalizar o sistema imediatamente.

### 6.1 Como Desligar a Flag Instantaneamente (Menos de 5 segundos)

#### Método Principal: Desligar pelo Painel do Dono (Super Admin)
1. Acesse o Painel do Dono (`https://clinigo.app/system-master-hub` ou `/system-master-hub/clinics/[id]/permissions`).
2. Localize a clínica e clique no botão **Desativar** na coluna **TISS Premium**.
3. No modal de confirmação, clique em **Confirmar Desativação**.
4. O status mudará imediatamente para `Inativo`. Todos os usuários da clínica voltarão ao modo tradicional no próximo carregamento de página, sem necessidade de novo deploy.

#### Método Alternativo (Plano B — Via SQL de Contingência)
Se desejar voltar a clínica de teste para a versão anterior diretamente pelo banco, execute no SQL Editor do Supabase (arquivo `docs/release/desligar_flag.sql`):
```sql
UPDATE clinics 
SET addons = COALESCE(addons, '{}'::jsonb) || '{"faturamento_premium": false}'::jsonb 
WHERE id = 'ID_DA_CLINICA';
```

*(Para desligar em todas as clínicas de uma só vez caso tenha ativado em mais de uma: `UPDATE clinics SET addons = COALESCE(addons, '{}'::jsonb) || '{"faturamento_premium": false}'::jsonb;`)*

Assim que rodar esse comando e atualizar a página no navegador (F5), a tela volta imediatamente ao modelo tradicional legado.

### 6.2 Como Fazer Rollback do Código na Vercel (Menos de 10 segundos)
Se precisar reverter a versão do código na nuvem:
1. Acesse o painel da Vercel no projeto `clinigo-frontend` (time `nodexs-projects-8a6ee1f1`).
2. Clique na aba **Deployments**.
3. Localize o deployment anterior ao que você acabou de subir.
4. Clique no botão de três pontos à direita dele e selecione **Instant Rollback** (ou **Promote to Production**).
5. O tráfego do sistema voltará imediatamente para a versão anterior.
