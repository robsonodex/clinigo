# Instruções de Execução: Auditoria de Repasse em Staging

Este documento orienta o dono e a equipe técnica sobre a execução segura do script de auditoria e comparação de repasse.

---

## 1. Princípios de Segurança Absoluta

1. **SOMENTE LEITURA:** O script `scripts/staging/compare-repasse-real.mjs` realiza estritamente consultas (`SELECT`) no banco. Não contém comandos de `INSERT`, `UPDATE`, `DELETE` ou `ALTER`.
2. **ZERO CREDENCIAIS NO CÓDIGO:** Nenhuma senha, token ou chave de banco fica gravada em arquivos do Git. Todas as credenciais são lidas em tempo de execução via variáveis de ambiente da sessão.
3. **AMBIENTE RECOMENDADO:** Execute preferencialmente contra uma cópia do banco em ambiente de **homologação/staging**. Não execute scripts diretamente contra a produção sem necessidade.

---

## 2. Como o Dono Executa o Script

### No Windows (PowerShell):

```powershell
# 1. Definir as variáveis de ambiente da sessão (apenas na memória da janela atual)
$env:SUPABASE_URL = "https://seu-projeto-staging.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "sua-chave-service-role-ou-anon-com-leitura"

# Opcional: filtrar apenas uma clínica específica
# $env:CLINIC_ID = "uuid-da-clinica"

# 2. Executar o script
node scripts/staging/compare-repasse-real.mjs
```

### No Linux / macOS (Bash):

```bash
export SUPABASE_URL="https://seu-projeto-staging.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="sua-chave-service-role"
node scripts/staging/compare-repasse-real.mjs
```

---

## 3. Como Interpretar os Resultados

O script consulta todos os atendimentos do último mês fechado (`COMPLETED`, `CONFIRMED`, `ATTENDED`) e aplica lado a lado:
- **Cálculo Legado (commit 711df48):** Regra histórica de override fixo, percentual e contratos.
- **Cálculo Novo (HEAD):** Implementação atual com proteções contra valores negativos e bounds.

A saída no terminal exibe:
- Tabela por médico com colunas: Atendimentos, Produção Bruta, Total Legado, Total Novo, Divergência.
- Linha de totais consolidados.

### Critério de Decisão:
- **Divergência = R$ 0,00:** Paridade 100% comprovada. O motor de cálculo novo está homologado e preserva integralmente os repasses históricos.
- **Divergência != R$ 0,00:** Ação mandatória: reverter o arquivo `lib/services/repasse-calculator.ts` para o código idêntico ao commit `711df48` no caminho padrão.
