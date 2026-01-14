# fix-nextjs16-params.ps1
# Automatically fixes Next.js 16 async params pattern in all dynamic routes

Write-Host "🔧 Fixing Next.js 16 async params in all dynamic routes..." -ForegroundColor Cyan

# Find all route files with dynamic segments [something]
$routeFiles = Get-ChildItem -Path "app\api" -Filter "route.ts" -Recurse | 
    Where-Object { $_.Directory.Name -match '\[.*\]' }

Write-Host "Found $($routeFiles.Count) dynamic route files" -ForegroundColor Yellow

$fixedCount = 0

foreach ($file in $routeFiles) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Pattern 1: { params }: { params: { id: string } }
    # Replace with: context: { params: Promise<{ id: string }> } and add const params = await context.params
    
    # Match function signatures with { params }: { params: { ... } }
    $pattern = '(export async function (?:GET|POST|PUT|PATCH|DELETE)\s*\(\s*request:\s*\w+,\s*)\{\s*params\s*\}:\s*\{\s*params:\s*(\{[^}]+\})\s*\}'
    
    if ($content -match $pattern) {
        # Replace the signature
        $content = $content -replace $pattern, '$1context: { params: Promise<$2> }'
        
        # Add const params = await context.params after the opening brace
        $content = $content -replace '(\) \{)', ') {`n    const params = await context.params;'
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $fixedCount++
            Write-Host "✅ Fixed: $($file.FullName)" -ForegroundColor Green
        }
    }
}

Write-Host "`n🎉 Fixed $fixedCount route files!" -ForegroundColor Green
Write-Host "Running type check..." -ForegroundColor Cyan

npm run type-check
