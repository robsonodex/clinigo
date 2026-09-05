# Documenta��o T�cnica V3

## M�dulos

### Psicomotricidade
- Criado m�dulo isolado para World Sensory.
- Arquivos: pp/dashboard/(clinic)/pacientes/[id]/psicomotricidade/page.tsx, sessao/[sessao_id]/page.tsx, objetivos/page.tsx.

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