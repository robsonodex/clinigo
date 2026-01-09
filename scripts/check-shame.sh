#!/bin/bash
# 🔴 RELATÓRIO DE VERGONHAS - CliniGo QA Check
# Execute: ./scripts/check-shame.sh

set -e

echo ""
echo "========================================"
echo "🔴 RELATÓRIO DE VERGONHAS - CliniGo"
echo "========================================"
echo ""

CRITICAL_ERRORS=0
WARNINGS=0

# =========================================
# 1. TypeScript Build Check
# =========================================
echo "📦 [1/5] Verificando Build TypeScript..."

if npm run build > /dev/null 2>&1; then
    echo "  ✅ Build passou"
else
    echo "  ❌ CRÍTICO: Build falhou!"
    TS_ERRORS=$(npm run build 2>&1 | grep -c "error TS" || true)
    echo "  └─ $TS_ERRORS erros de TypeScript encontrados"
    CRITICAL_ERRORS=$((CRITICAL_ERRORS + TS_ERRORS))
fi

# =========================================
# 2. Type 'any' Counter
# =========================================
echo ""
echo "🔍 [2/5] Contando tipos 'any'..."

ANY_COUNT=$(grep -r ": any" app components lib --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo 0)

if [ "$ANY_COUNT" -gt 0 ]; then
    echo "  ⚠️ AVISO: $ANY_COUNT ocorrências de 'any' encontradas"
    WARNINGS=$((WARNINGS + ANY_COUNT))
else
    echo "  ✅ Nenhum 'any' encontrado"
fi

# =========================================
# 3. TODO Counter
# =========================================
echo ""
echo "📝 [3/5] Contando TODOs..."

TODO_COUNT=$(grep -r "TODO" app components lib --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo 0)

if [ "$TODO_COUNT" -gt 0 ]; then
    echo "  ⚠️ DÉBITO: $TODO_COUNT TODOs pendentes"
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✅ Nenhum TODO encontrado"
fi

# =========================================
# 4. Mock Data Check
# =========================================
echo ""
echo "🎭 [4/5] Verificando dados mock..."

MOCK_COUNT=$(grep -rE "mockData|dummyPatients|fakeData|sampleData" app components lib --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo 0)

if [ "$MOCK_COUNT" -gt 0 ]; then
    echo "  ❌ CRÍTICO: $MOCK_COUNT dados mock encontrados!"
    CRITICAL_ERRORS=$((CRITICAL_ERRORS + MOCK_COUNT))
else
    echo "  ✅ Nenhum dado mock encontrado"
fi

# =========================================
# 5. Console.log Check
# =========================================
echo ""
echo "🖨️ [5/5] Verificando console.log em produção..."

CONSOLE_COUNT=$(grep -r "console\.log" app components lib --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo 0)

if [ "$CONSOLE_COUNT" -gt 5 ]; then
    echo "  ⚠️ AVISO: $CONSOLE_COUNT console.log encontrados (máx: 5)"
    WARNINGS=$((WARNINGS + 1))
else
    echo "  ✅ Console.log dentro do limite ($CONSOLE_COUNT)"
fi

# =========================================
# RESUMO FINAL
# =========================================
echo ""
echo "========================================"
echo "📊 RESUMO FINAL"
echo "========================================"
echo ""

if [ "$CRITICAL_ERRORS" -gt 0 ]; then
    echo "  🔴 ERROS CRÍTICOS: $CRITICAL_ERRORS"
else
    echo "  ✅ ERROS CRÍTICOS: 0"
fi

if [ "$WARNINGS" -gt 0 ]; then
    echo "  🟡 AVISOS: $WARNINGS"
else
    echo "  ✅ AVISOS: 0"
fi

echo ""

# =========================================
# VEREDICTO
# =========================================
if [ "$CRITICAL_ERRORS" -gt 0 ]; then
    echo "  ❌ DEPLOY BLOQUEADO"
    echo "  └─ Corrija os erros críticos antes de fazer deploy"
    echo ""
    exit 1
elif [ "$WARNINGS" -gt 10 ]; then
    echo "  ⚠️ DEPLOY COM RESSALVAS"
    echo "  └─ Muitos avisos - considere corrigir"
    echo ""
    exit 0
else
    echo "  ✅ PRONTO PARA DEPLOY"
    echo ""
    exit 0
fi
