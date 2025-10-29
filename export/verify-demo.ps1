# Script de vérification du package démo
# Vérifie que tous les fichiers essentiels sont présents

$packageDir = "demo-package"

Write-Host "🔍 Vérification du package démo..." -ForegroundColor Yellow
Write-Host ""

# Vérifier les dossiers essentiels
$requiredDirs = @(
    "backend",
    "components", 
    "services",
    "stores",
    "utils",
    "contexts",
    "data",
    "hooks",
    "i18n"
)

$missingDirs = @()
foreach ($dir in $requiredDirs) {
    $path = Join-Path $packageDir $dir
    if (Test-Path $path) {
        Write-Host "✅ $dir" -ForegroundColor Green
    } else {
        Write-Host "❌ $dir MANQUANT" -ForegroundColor Red
        $missingDirs += $dir
    }
}

Write-Host ""

# Vérifier les fichiers essentiels
$requiredFiles = @(
    "package.json",
    "package-lock.json",
    "App.tsx",
    "index.tsx", 
    "types.ts",
    "README.md",
    ".env.local"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    $path = Join-Path $packageDir $file
    if (Test-Path $path) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file MANQUANT" -ForegroundColor Red
        $missingFiles += $file
    }
}

Write-Host ""

# Vérifier les tailles
$zipFile = "LLM-Workflow-Orchestrator-Demo.zip"
if (Test-Path $zipFile) {
    $zipSize = (Get-Item $zipFile).Length / 1MB
    Write-Host "📦 Taille du ZIP: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "❌ Fichier ZIP manquant" -ForegroundColor Red
}

# Résumé
Write-Host ""
if ($missingDirs.Count -eq 0 -and $missingFiles.Count -eq 0) {
    Write-Host "🎉 Package démo COMPLET et prêt à distribuer!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Livrable:" -ForegroundColor Yellow
    Write-Host "   - LLM-Workflow-Orchestrator-Demo.zip"
    Write-Host "   - Instructions-Demo.md (optionnel)"
    Write-Host ""
    Write-Host "🚀 Le client peut installer avec:" -ForegroundColor Cyan
    Write-Host "   1. Extraire le ZIP"
    Write-Host "   2. Configurer .env.local"
    Write-Host "   3. npm install"
    Write-Host "   4. cd backend && npm install && cd .."
    Write-Host "   5. npm run dev + cd backend && npm run dev"
} else {
    Write-Host "⚠️  Package incomplet!" -ForegroundColor Red
    if ($missingDirs.Count -gt 0) {
        Write-Host "Dossiers manquants: $($missingDirs -join ', ')" -ForegroundColor Red
    }
    if ($missingFiles.Count -gt 0) {
        Write-Host "Fichiers manquants: $($missingFiles -join ', ')" -ForegroundColor Red
    }
}