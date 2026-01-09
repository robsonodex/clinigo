# QA Check Script - CliniGo
# Execute: npm run qa

Write-Host ""
Write-Host "========================================"
Write-Host "  RELATORIO DE VERGONHAS - CliniGo"
Write-Host "========================================"
Write-Host ""

$criticalErrors = 0
$warnings = 0

# 1. TypeScript Check
Write-Host "[1/4] Verificando TypeScript..."
$tsResult = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  X CRITICO: Erros de TypeScript!" -ForegroundColor Red
    $criticalErrors++
}
else {
    Write-Host "  OK TypeScript passou" -ForegroundColor Green
}

# 2. Any Counter
Write-Host ""
Write-Host "[2/4] Contando 'any'..."
$anyFiles = Get-ChildItem -Path "app","components","lib" -Recurse -Include "*.ts","*.tsx" -ErrorAction SilentlyContinue
$anyCount = 0
foreach ($file in $anyFiles) {
    $matches = Select-String -Path $file.FullName -Pattern ": any" -AllMatches
    if ($matches) {
        $anyCount += $matches.Matches.Count
    }
}
if ($anyCount -gt 0) {
    Write-Host "  ! AVISO: $anyCount ocorrencias de 'any'" -ForegroundColor Yellow
    $warnings++
}
else {
    Write-Host "  OK Nenhum 'any' encontrado" -ForegroundColor Green
}

# 3. TODO Counter
Write-Host ""
Write-Host "[3/4] Contando TODOs..."
$todoCount = 0
foreach ($file in $anyFiles) {
    $matches = Select-String -Path $file.FullName -Pattern "TODO" -AllMatches
    if ($matches) {
        $todoCount += $matches.Matches.Count
    }
}
if ($todoCount -gt 0) {
    Write-Host "  ! DEBITO: $todoCount TODOs pendentes" -ForegroundColor Yellow
    $warnings++
}
else {
    Write-Host "  OK Nenhum TODO" -ForegroundColor Green
}

# 4. Mock Check
Write-Host ""
Write-Host "[4/4] Verificando dados mock..."
$mockCount = 0
$mockPatterns = @("mockData", "dummyPatients", "fakeData")
foreach ($file in $anyFiles) {
    foreach ($pattern in $mockPatterns) {
        $matches = Select-String -Path $file.FullName -Pattern $pattern -AllMatches
        if ($matches) {
            $mockCount += $matches.Matches.Count
        }
    }
}
if ($mockCount -gt 0) {
    Write-Host "  X CRITICO: $mockCount dados mock!" -ForegroundColor Red
    $criticalErrors++
}
else {
    Write-Host "  OK Sem dados mock" -ForegroundColor Green
}

# Resumo
Write-Host ""
Write-Host "========================================"
Write-Host "  RESUMO"
Write-Host "========================================"
Write-Host ""
Write-Host "  Erros Criticos: $criticalErrors"
Write-Host "  Avisos: $warnings"
Write-Host ""

if ($criticalErrors -gt 0) {
    Write-Host "  DEPLOY BLOQUEADO" -ForegroundColor Red
    exit 1
}
else {
    Write-Host "  OK PRONTO PARA DEPLOY" -ForegroundColor Green
    exit 0
}
