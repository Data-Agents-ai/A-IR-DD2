# Script de vérification : Aucun appel direct vers LMStudio
# Usage : .\verify-no-direct-calls.ps1

Write-Host "🔍 Vérification des appels directs vers LMStudio..." -ForegroundColor Cyan
Write-Host ""

$hasErrors = $false

# 1. Chercher fetch direct vers localhost:1234/3928/11434
Write-Host "1️⃣  Recherche appels directs fetch(http://localhost:1234...)..." -ForegroundColor Yellow
$pattern1 = 'fetch\([`''"](http://localhost:1234|http://localhost:3928|http://localhost:11434)'
$results1 = Get-ChildItem -Path . -Include *.ts, *.tsx -Recurse -ErrorAction SilentlyContinue | 
Select-String -Pattern $pattern1 -ErrorAction SilentlyContinue

if ($results1) {
    Write-Host "❌ ERREUR : Appels directs trouvés !" -ForegroundColor Red
    $results1 | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber) - $($_.Line)" -ForegroundColor Red }
    $hasErrors = $true
}
else {
    Write-Host "✅ Aucun appel direct trouvé" -ForegroundColor Green
}

Write-Host ""

# 2. Chercher template string avec endpoint/v1/
Write-Host "2️⃣  Recherche template strings \${endpoint}/v1/..." -ForegroundColor Yellow
$pattern2 = '\$\{.*endpoint.*\}/v1/'
$results2 = Get-ChildItem -Path .\services -Include *.ts -Recurse -ErrorAction SilentlyContinue | 
Select-String -Pattern $pattern2 -ErrorAction SilentlyContinue |
Where-Object { $_.Line -notmatch "buildLMStudioProxyUrl" -and $_.Line -notmatch "// " }

if ($results2) {
    Write-Host "❌ ERREUR : Template strings suspects trouvés !" -ForegroundColor Red
    $results2 | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Red }
    $hasErrors = $true
}
else {
    Write-Host "✅ Aucun template string suspect" -ForegroundColor Green
}

Write-Host ""

# 3. Vérifier que buildLMStudioProxyUrl est bien utilisé
Write-Host "3️⃣  Vérification utilisation buildLMStudioProxyUrl..." -ForegroundColor Yellow
$pattern3 = 'buildLMStudioProxyUrl'
$results3 = Get-ChildItem -Path .\services -Include lmStudioService.ts, routeDetectionService.ts -Recurse -ErrorAction SilentlyContinue | 
Select-String -Pattern $pattern3 -ErrorAction SilentlyContinue

$count = ($results3 | Measure-Object).Count
if ($count -ge 7) {
    Write-Host "✅ buildLMStudioProxyUrl utilisé $count fois (minimum 7 requis)" -ForegroundColor Green
}
else {
    Write-Host "⚠️  WARNING : buildLMStudioProxyUrl utilisé seulement $count fois (7 attendus)" -ForegroundColor Yellow
    $hasErrors = $true
}

Write-Host ""

# 4. Vérifier imports config/api.config.ts
Write-Host "4️⃣  Vérification imports config/api.config.ts..." -ForegroundColor Yellow
$filesNeedingImport = @(
    ".\services\lmStudioService.ts",
    ".\services\routeDetectionService.ts"
)

$allImported = $true
foreach ($file in $filesNeedingImport) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "from ['\"]\.\.\/config\/api\.config['\"]") {
            Write-Host "   ✅ $file - Import OK" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $file - Import MANQUANT" -ForegroundColor Red
            $allImported = $false
            $hasErrors = $true
        }
    }
}

if ($allImported) {
    Write-Host "✅ Tous les imports présents" -ForegroundColor Green
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($hasErrors) {
    Write-Host "❌ ÉCHEC : Des appels directs vers LMStudio persistent !" -ForegroundColor Red
    Write-Host "   Action requise : Corriger les fichiers listés ci-dessus" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ SUCCÈS : Aucun appel direct vers LMStudio détecté !" -ForegroundColor Green
    Write-Host "   Tous les appels passent par le backend proxy" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎯 Prochaine étape : Tester sur PC avec LMStudio" -ForegroundColor Yellow
    exit 0
}
