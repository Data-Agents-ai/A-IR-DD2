# Script de nettoyage des fichiers obsoletes
# A-IR-DD2 - 13 novembre 2025

Write-Host "Nettoyage des fichiers obsoletes..." -ForegroundColor Cyan

$filesToDelete = @(
    # Backups inutiles
    "components\V2AgentNode_BACKUP.tsx",
    "components\WorkflowCanvas.tsx.backup",
    "components\WorkflowCanvas.tsx.pre-websocket",
    
    # Tests manuels obsoletes
    "test-llm-integration.js",
    "test-lmstudio-capabilities.js",
    "test-template-adaptation.js",
    
    # Composants V1 obsoletes (remplaces par V2)
    "components\AgentNode.tsx",
    "components\CustomAgentNode.tsx",
    "components\AgentSidebar.tsx"
)

$deletedCount = 0
$notFoundCount = 0

foreach ($file in $filesToDelete) {
    $fullPath = Join-Path $PSScriptRoot $file
    
    if (Test-Path $fullPath) {
        try {
            Remove-Item $fullPath -Force
            Write-Host "Supprime: $file" -ForegroundColor Green
            $deletedCount++
        }
        catch {
            Write-Host "Erreur lors de la suppression de $file : $_" -ForegroundColor Red
        }
    }
    else {
        Write-Host "Fichier non trouve: $file" -ForegroundColor Yellow
        $notFoundCount++
    }
}

Write-Host ""
Write-Host "Resume:" -ForegroundColor Cyan
Write-Host "   - Fichiers supprimes: $deletedCount" -ForegroundColor Green
Write-Host "   - Fichiers non trouves: $notFoundCount" -ForegroundColor Yellow
Write-Host ""
Write-Host "Nettoyage termine!" -ForegroundColor Cyan
Write-Host ""
Write-Host "N'oubliez pas de:" -ForegroundColor Yellow
Write-Host "   1. Import AgentSidebar deja supprime de App.tsx" -ForegroundColor Yellow
Write-Host "   2. Verifier que l'application compile sans erreurs" -ForegroundColor Yellow
Write-Host "   3. Faire un commit/push des changements" -ForegroundColor Yellow
