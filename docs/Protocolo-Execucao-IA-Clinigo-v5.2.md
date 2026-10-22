# Protocolo de Execução — IA · Clinigo v5.2

> Instruções obrigatórias de operação para qualquer agente ou modelo. Responder **sempre em pt-br**.
> Esta versão preserva integralmente todas as regras da v5.1 e adiciona a **Regra de Loops** (ciclo de execução do agente).

---

## 🤖 REGRA ZERO — Exibição de Agentes (ABSOLUTA E INVIOLÁVEL)

> ⛔ **NENHUMA ação, leitura, consulta, modificação ou deploy pode ser iniciada sem antes exibir os agentes selecionados.**
> Esta regra se aplica a **100% das circunstâncias**, sem exceção, mesmo que a tarefa pareça simples.
> Nunca abra o navegador para testar nada — todos os testes são feitos via código.

### Formato obrigatório de exibição:

```
╔══════════════════════════════════════════════╗
║         AGENTES SELECIONADOS                 ║
╠══════════════════════════════════════════════╣
║ Subtarefa 1: [nome da subtarefa]             ║
║ → Agente: [nome do agente]                   ║
║ → Motivo: [por que esse agente]              ║
╠══════════════════════════════════════════════╣
║ Subtarefa 2: [nome da subtarefa]             ║
║ → Agente: [nome do agente]                   ║
║ → Motivo: [por que esse agente]              ║
╚══════════════════════════════════════════════╝
```

### Diretórios de busca de agentes (consultar sempre, nesta ordem):

| Prioridade | Diretório | Caminho |
|---|---|---|
| 1 | Agentes principais | `E:\Backup Clinigo 11-03-2026\clinigo\clinigo-producao\.agent\agents` |
| 2 | Skills Gemini | `C:\Users\Robson\.gemini\antigravity\skills` |

---

## 🔄 REGRA DOS LOOPS — Ciclos de Execução do Agente (ABSOLUTA E INVIOLÁVEL)

> ⛔ **Todo agente (incluindo Claude, Gemini ou qualquer outro modelo) DEVE operar seguindo loops explícitos de execução, nunca em "tiro único".**
> Cada loop abaixo descreve um ciclo real de funcionamento de agentes de IA neste contexto. Eles **não substituem** as demais regras — são o "motor" que garante que elas sejam cumpridas em todas as iterações.

### 1️⃣ Loop de Contexto (Context-Gathering Loop)
> Antes de qualquer plano, o agente entra em um ciclo de descoberta:
```
ler arquivo → entender dependências → ler arquivos relacionados → 
   ainda há dúvida? → SIM → ler mais → NÃO → seguir para o Loop de Planejamento
```
- Nunca assumir conteúdo de arquivo não lido por completo (reforça Pré-execução, item 4).
- Repetir o loop até ter contexto suficiente para o **[ENTENDIMENTO]** e **[MAPEAMENTO]**.

### 2️⃣ Loop Plan → Act → Verify
> Ciclo central de qualquer tarefa de implementação:
```
PLANEJAR (passo numerado) → EXECUTAR (1 passo) → VERIFICAR (ler diff/saída) →
   passou? → SIM → próximo passo → NÃO → corrigir → VERIFICAR novamente
```
- Cada passo do **[PLANO]** (Pré-execução, item 4) deve passar por este loop individualmente.
- Nunca executar todos os passos em sequência sem verificar entre eles.

### 3️⃣ Loop de Autorrevisão (Self-Review Loop)
> Após cada alteração, o agente reentra no código como **revisor externo**:
```
revisar diff → encontrou problema? → SIM → corrigir → revisar de novo →
   NÃO → revisar impacto em código vizinho → liberar para próximo passo
```
- Este loop formaliza a regra já existente: *"Após cada alteração, revise como revisor externo, buscando erros ativamente."*

### 4️⃣ Loop de Correção de Erros (Error-Recovery Loop)
> Sempre que houver erro de build, log ou execução:
```
capturar erro → ler stack/log completo → identificar causa raiz →
   corrigir cirurgicamente → reexecutar → erro persiste? → SIM → repetir → NÃO → seguir
```
- Limite de tentativas: se o mesmo erro persistir após **3 ciclos**, o agente deve **parar e reportar** em vez de seguir tentando às cegas (evita loops infinitos e alterações especulativas fora do escopo).
- Erros de TypeScript no build seguem a regra já definida: aplicar bypass, não bloquear o build.

### 5️⃣ Loop de Confirmação Humana (Human-in-the-Loop)
> Sempre que houver dúvida, ambiguidade ou decisão fora do escopo definido:
```
dúvida real? → SIM → PARAR → perguntar ao usuário → aguardar resposta → retomar loop correspondente
                NÃO → seguir sem interromper
```
- Nunca inventar requisitos não especificados (reforça regra já existente).
- Este loop tem prioridade sobre todos os outros — interrompe qualquer ciclo em andamento.

### 6️⃣ Loop de Auditoria de Interface (Botões + PWA/Mobile)
> Toda tela tocada passa por dois sub-loops obrigatórios antes de ser considerada concluída:
```
para cada botão do checklist → presente e correto? → ✅ →
   ausente e pertinente? → ❌ → implementar → reavaliar
```
```
para cada item do checklist PWA/Mobile → validado? → ✅ →
   falhou? → ⚠️ → corrigir → revalidar
```
- Só sai do loop quando **todos** os itens dos dois checklists (Regra dos Botões e Regra PWA/Mobile) estiverem marcados.

### 7️⃣ Loop de Build/Deploy
> Antes de qualquer deploy, ciclo obrigatório de estabilização:
```
build local → 100% estável? → SIM → git commit/push → vercel --prod →
                NÃO → voltar ao Loop de Correção de Erros (item 4)
```
- Nunca pular para `vercel --prod` sem ter saído deste loop com sucesso.

### 8️⃣ Loop de Documentação e Relatório Final
> Ciclo de encerramento de qualquer tarefa:
```
implementação concluída → atualizar DOCUMENTACAO_TECNICA_V3 →
   é funcionalidade nova? → SIM → atualizar Guia de Ajuda Integrado → NÃO → seguir →
   gerar Relatório Final completo (10 itens) → tarefa encerrada
```

> 📌 **Regra de ouro dos loops:** nenhum loop pode ser abandonado por impaciência ou pressa. O agente só avança de loop quando o critério de saída do loop atual for satisfeito. Em caso de loop sem critério de saída claro (ex.: erro não identificado), aplicar o Loop de Confirmação Humana.

---

## 📱 REGRA PWA/MOBILE — Responsividade e Adequação Mobile (ABSOLUTA E INVIOLÁVEL)

> ⛔ **TODA interface criada ou modificada DEVE obrigatoriamente ser responsiva e adequada para uso em Mobile PWA.**
> Esta regra se aplica a **100% das circunstâncias**, sem exceção — mesmo que a solicitação não mencione mobile.

### Princípios obrigatórios de responsividade:

#### 📐 Layout e Grid
- **Mobile-first**: toda estilização começa pelo breakpoint `< 768px`, depois expande para tablet e desktop.
- Use **CSS Grid** e/ou **Flexbox** — nunca posicionamento fixo ou absoluto em fluxo de conteúdo.
- Nunca use larguras fixas em px para containers principais. Use `%`, `vw`, `rem`, `clamp()` ou `max-width`.
- Breakpoints obrigatórios mínimos:
  - Mobile: `< 768px`
  - Tablet: `768px – 1024px`
  - Desktop: `> 1024px`

#### 👆 Touch e Interação Mobile
- Área mínima de toque: **44×44px** em todos os botões, ícones e elementos clicáveis.
- Nunca use hover como único indicador de ação — garanta feedback visual em `:active` e `:focus`.
- Espaçamento entre elementos interativos: mínimo `8px` para evitar toque acidental.
- Formulários: use `font-size: 16px` nos inputs para evitar zoom automático no iOS.
- Swipe e gestos nativos não devem ser bloqueados sem motivo técnico.

#### 🖥️ Tipografia e Espaçamento Responsivos
- Use `clamp()` ou unidades relativas (`rem`, `em`) para fontes — nunca `px` fixo em textos.
- Padding e margin em telas menores devem ser reduzidos proporcionalmente — nunca cortar conteúdo.
- Texto nunca deve transbordar ou sobrepor outros elementos em nenhuma resolução.

#### 📋 Tabelas e Listas Responsivas
- Tabelas largas: aplicar scroll horizontal (`overflow-x: auto`) no container — nunca deixar quebrar o layout.
- Em mobile, avaliar conversão de tabela em cards empilhados quando houver mais de 4 colunas.

#### 🗂️ Modais, Drawers e Painéis
- Modais em mobile: ocupar **100% da largura** com `border-radius` apenas no topo, ou usar drawer bottom-sheet.
- Nunca posicionar modal com `margin: auto` sem garantir que caiba na viewport mobile.
- Fechar modal com swipe down deve ser suportado sempre que tecnicamente viável.

#### ⚡ PWA — Requisitos Técnicos Obrigatórios
Sempre que criar ou modificar uma interface, verificar e garantir:

| Item | Requisito |
|---|---|
| **Viewport** | `<meta name="viewport" content="width=device-width, initial-scale=1">` presente |
| **Touch Icons** | `apple-touch-icon` e ícones PWA configurados |
| **Theme Color** | `<meta name="theme-color">` definido com a cor primária do sistema |
| **Scroll nativo** | Scroll suave e sem travamentos em iOS e Android |
| **Safe Areas** | Suporte a `env(safe-area-inset-*)` para notch e barra de navegação (iOS/Android) |
| **Offline** | Se houver Service Worker, garantir que as rotas tocadas não quebrem offline |
| **Manifest** | `manifest.json` atualizado quando novos módulos forem adicionados |

#### 🔍 Checklist PWA/Mobile — Obrigatório antes de concluir qualquer tarefa de interface:

> Percorra item a item e registre no Relatório Final (ver Loop 6 da Regra dos Loops):

- [ ] Layout responsivo validado nos 3 breakpoints (mobile, tablet, desktop)
- [ ] Todos os botões e elementos clicáveis com área de toque ≥ 44×44px
- [ ] Sem overflow horizontal em nenhuma resolução
- [ ] Fontes legíveis em mobile (mínimo 14px, inputs com 16px)
- [ ] Modais/Drawers adaptados para tela pequena
- [ ] Tabelas com scroll horizontal quando necessário
- [ ] Sem dependência exclusiva de hover para interações críticas
- [ ] Safe areas (notch/barra de navegação) respeitadas
- [ ] Viewport meta tag presente e correta
- [ ] Theme-color definido

---

## ⚑ Regra Nº 1 — Cirurgicidade Absoluta

- **Nunca modifique arquivos ou código não relacionados ao problema solicitado.**
- Toda correção deve ser **cirúrgica**: mínimo impacto, máximo de precisão.
- Nunca altere código feito por outras IAs.
- Nunca introduza erros em funcionalidades existentes.
- Nunca abra o navegador para testar nada. Todos os testes via código.

---

## 🖱️ REGRA DOS BOTÕES — Obrigatória em Toda Interface Tocada (INVIOLÁVEL)

> ⛔ **Toda vez que uma tela, módulo, formulário ou componente for criado ou modificado, é OBRIGATÓRIO auditar e implementar TODOS os botões pertinentes abaixo.**
> **Nunca entregue uma interface com botão faltando.** Se não tiver, implante. Se tiver, melhore.

### Checklist completo de botões — verificar item por item:

#### ➕ Criação e Entrada de Dados
| Botão | Ação esperada | Obrigatório quando |
|---|---|---|
| **Inserir / Adicionar / Novo** | Abre modal ou formulário em branco | Há lista ou coleção de itens |
| **Importar** | Importa dados externos (CSV, Excel, etc.) | Há dados em massa |
| **Colar** | Cola conteúdo da área de transferência | Há campos de texto ou código |

#### ✏️ Edição e Manipulação
| Botão | Ação esperada | Obrigatório quando |
|---|---|---|
| **Editar** | Abre item para edição | Há itens listados |
| **Modificar / Alterar** | Aplica mudança pontual sem abrir modal | Há propriedades editáveis inline |
| **Duplicar / Clonar** | Cria cópia exata do item | Há itens reutilizáveis |
| **Copiar** | Copia texto/dado para clipboard | Há campos com conteúdo copiável |
| **Mover** | Reposiciona item na lista ou entre módulos | Há ordenação ou categorias |
| **Reordenar / Arrastar** | Drag-and-drop para reorganizar | Há listas ordenáveis |
| **Agrupar** | Agrupa itens por critério | Há itens com categoria comum |

#### 💾 Persistência
| Botão | Ação esperada | Obrigatório quando |
|---|---|---|
| **Salvar** | Persiste alterações | Há qualquer formulário ou edição |
| **Salvar e continuar** | Salva sem fechar o formulário | Há fluxo sequencial |
| **Salvar como** | Cria nova versão com nome diferente | Há templates ou versões |
| **Rascunho / Salvar rascunho** | Salva sem publicar/ativar | Há fluxo de aprovação |
| **Confirmar / Aplicar** | Confirma ação sem necessariamente salvar no banco | Há ações reversíveis |

#### 🗑️ Exclusão — SEMPRE COM ALERTA DE CONFIRMAÇÃO
| Botão | Ação esperada | Alerta obrigatório |
|---|---|---|
| **Excluir (um)** | Remove item único | ⚠️ `"Tem certeza que deseja excluir [nome/item]? Esta ação não pode ser desfeita."` |
| **Excluir selecionados** | Remove itens marcados | ⚠️ `"Você selecionou X itens para excluir. Confirmar?"` |
| **Excluir todos** | Remove todos da lista | ⚠️ `"ATENÇÃO: Todos os X itens serão excluídos permanentemente. Confirmar?"` |
| **Arquivar** | Oculta sem deletar (soft delete) | ⚠️ `"Deseja arquivar este item? Poderá ser restaurado depois."` |
| **Restaurar** | Recupera item arquivado | Sem alerta — ação positiva |
| **Limpar** | Limpa campos do formulário | ⚠️ `"Deseja limpar todos os campos?"` |

#### 🔎 Navegação e Visualização
| Botão | Ação esperada | Obrigatório quando |
|---|---|---|
| **Buscar / Filtrar** | Filtra lista por critério | Há listas com mais de 5 itens |
| **Visualizar / Ver detalhes** | Abre modo leitura sem edição | Há dados expandidos |
| **Expandir / Recolher** | Toggle de seções | Há seções colapsáveis |
| **Voltar** | Retorna à tela anterior | Há navegação em profundidade |
| **Fechar / Cancelar** | Fecha modal sem salvar | Há modais ou drawers |
| **Atualizar / Recarregar** | Refaz a consulta | Há dados em tempo real |

#### ⚙️ Ações Avançadas
| Botão | Ação esperada | Obrigatório quando |
|---|---|---|
| **Exportar** | Exporta dados (PDF, CSV, Excel) | Há relatórios ou listas |
| **Imprimir** | Abre janela de impressão | Há documentos imprimíveis |
| **Compartilhar** | Gera link ou envia | Há conteúdo compartilhável |
| **Histórico / Auditoria** | Exibe log de alterações | Há dados sensíveis |
| **Desfazer** | Reverte última ação | Há ações destrutivas |
| **Permissões / Acesso** | Gerencia quem pode ver/editar | Há controle de usuários |
| **Ativar / Inativar** | Toggle de status | Há itens com estado ativo/inativo |
| **Configurar / Personalizar** | Abre painel de configurações | Há customização disponível |

### Regra de entrega de interface:
> Antes de finalizar qualquer tarefa de interface, percorra o checklist acima e responda explicitamente (ver Loop 6 da Regra dos Loops):
> - ✅ Botão presente e funcionando
> - ⚠️ Botão ausente mas não pertinente (justificar)
> - ❌ Botão ausente e pertinente → **IMPLEMENTAR antes de concluir**

---

## 📋 Pré-execução — Obrigatório antes de qualquer implementação

> ⛔ Estes 4 passos NÃO podem ser pulados. A execução só começa após todos serem concluídos.
> Os passos 1–4 correspondem, respectivamente, ao acionamento da Regra Zero e à entrada no **Loop de Contexto** e no **Loop Plan → Act → Verify** (ver Regra dos Loops).

1. **[AGENTES]** — Exiba os agentes conforme Regra Zero. Obrigatório primeiro.
2. **[ENTENDIMENTO]** — Explique o que foi compreendido, o que pode dar errado e qual é a melhor abordagem.
3. **[MAPEAMENTO]** — Liste **todos** os arquivos que serão tocados e justifique cada um.
4. **[PLANO]** — Apresente o plano em passos numerados. Aguarde confirmação quando necessário.

Só então inicie a implementação. Leia o arquivo **completo** antes de modificar. Nunca assuma o conteúdo.

---

## ⚙️ Durante a execução — Regras

- Alterações **cirúrgicas**: não toque em nada fora do escopo.
- Após cada alteração, revise como **revisor externo**, buscando erros ativamente (Loop de Autorrevisão).
- Em caso de dúvida: **não assuma** — pare e pergunte. Nunca invente requisitos não especificados (Loop de Confirmação Humana).
- Verifique logs de erro sempre que necessário para diagnóstico preciso (Loop de Correção de Erros).
- **Nunca abra o navegador** para testar. Todos os testes devem ser feitos via código.
- **Toda alteração de interface inclui obrigatoriamente a validação PWA/Mobile** conforme Regra PWA/Mobile.

---

## 🗄️ Banco de dados — MCP Supabase

- Use **sempre o MCP Supabase** quando a tarefa envolver banco de dados ou qualquer operação no Supabase.
- Nunca simule ou assuma dados do banco. Consulte diretamente via MCP.

---

## 🚀 Deploy — Fluxo obrigatório (siga esta ordem)

1. **[AGENTES]** Exiba os agentes escolhidos por subtarefa. *(Regra Zero — sempre primeiro)*
2. **[DEV]** Implemente e valide em ambiente local. Não avance sem validação completa.
3. **[BOTÕES]** Aplique o checklist completo de botões em toda interface tocada.
4. **[PWA/MOBILE]** Aplique o checklist completo de responsividade e adequação mobile em toda interface tocada.
5. **[VALIDAÇÃO]** Confirme que nenhuma funcionalidade existente foi afetada.
6. **[BUILD]** Execute somente com 100% de certeza de estabilidade.
   - Erros de TypeScript: aplique bypass — não bloqueie o build por eles.
7. **[GIT]** Sempre salve no Git antes do deploy para garantir histórico e restauração.
8. **[DEPLOY]** Execute nesta ordem:

```bash
git push origin master
vercel --prod
```

> Este fluxo é a aplicação prática do **Loop de Build/Deploy** (item 7 da Regra dos Loops).

---

## 🏥 Escopo da Alteração — Verificação Obrigatória

Quando uma solicitação for feita por uma clínica específica (ex.: *Clínica Espaço Incluir*), sempre informe explicitamente:

```
⚠️ ESCOPO DA ALTERAÇÃO:
→ Esta modificação afeta: [APENAS esta clínica / TODAS as clínicas / CLÍNICAS SELECIONADAS: X, Y]
→ Motivo: [explicação técnica]
→ Para isolar apenas a clínica solicitante, será necessário: [abordagem técnica]
```

Nunca aplique uma mudança solicitada por uma clínica em todas as outras sem confirmação explícita.

---

## 📝 Documentação — Atualização obrigatória ao finalizar

- Ao concluir toda implantação ou melhoria, atualize o arquivo **DOCUMENTACAO_TECNICA_V3**:
  `E:\Backup Clinigo 11-03-2026\clinigo\DOCUMENTACAO_TECNICA_V3.md`
- Descreva o caminho completo das alterações no formato:

```
Módulo → Submódulo → Arquivo → Função/Componente alterado
Ex: Recepção → Agenda → AgendaModal.tsx → handleSave()
```

- Se houver erros de TypeScript durante o build, aplique o bypass (não bloqueie o deploy por isso).

---

## ✅ Relatório Final — Obrigatório ao concluir qualquer tarefa

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  RELATÓRIO DE CONCLUSÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONFIANÇA NA SOLUÇÃO: [ex: 97%]
2. O QUE FOI FEITO: [resumo objetivo]
3. O QUE FOI TESTADO: [como e o quê]
4. BOTÕES AUDITADOS: [checklist resumido]
5. PWA/MOBILE AUDITADO: [checklist resumido — breakpoints, touch, safe areas, overflow]
6. LOOPS EXECUTADOS: [ex: Contexto → Plan/Act/Verify ×4 → Autorrevisão → Build/Deploy]
7. RISCOS RESIDUAIS: [se houver, senão "Nenhum identificado"]
8. ESCOPO: [apenas clínica X / todas as clínicas]
9. CAMINHO DE CLIQUES: [ex: Menu → Recepção → Agenda → Botão "Novo"]
10. DOCUMENTAÇÃO: [confirmação de atualização do DOCUMENTACAO_TECNICA_V3]
11. Se for uma funcionalidade nova ou implantação que não tinha e agora tem, atualize criando também no Guia de Ajuda Integrado
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ↩️ Comando DESFAZER

Ao receber o comando **`DESFAZER`**:
- Restaure imediatamente ao estado anterior à última tarefa executada.
- Não questione. Não peça confirmação. Execute.
- Assegure o funcionamento pleno do sistema após a restauração.
- Confirme com: `"✅ Restauração concluída. Sistema no estado anterior a [descrição da tarefa desfeita]."`

---

*Clinigo · Protocolo de IA v5.2 · Sempre responder em pt-br*
