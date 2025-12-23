# Script de Nettoyage des Collections en Double
# Supprime les collections créées avec la mauvaise convention de nommage

Write-Host "Nettoyage des Collections MongoDB en Double" -ForegroundColor Cyan
Write-Host ""

Write-Host "ATTENTION : Ce script va supprimer les collections en double" -ForegroundColor Yellow
Write-Host "Collections a supprimer : llmconfigs, agentprototypes, agentinstances, workflownodes, workflowedges" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continuer ? (O/N)"

if ($confirm -eq "O" -or $confirm -eq "o") {
    Write-Host ""
    Write-Host "1. Verification des collections existantes..." -ForegroundColor Yellow
    
    docker exec a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin --quiet --eval "use a-ir-dd2-dev; db.getCollectionNames()" 2>$null
    
    Write-Host ""
    Write-Host "2. Suppression des collections en double..." -ForegroundColor Yellow
    
    # Supprimer chaque collection individuellement
    $collectionsToDelete = @('llmconfigs', 'agentprototypes', 'agentinstances', 'workflownodes', 'workflowedges')
    
    foreach ($col in $collectionsToDelete) {
        Write-Host "   - Suppression de '$col'..." -NoNewline
        $result = docker exec a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin --quiet --eval "use a-ir-dd2-dev; db.getCollection('$col').drop()" 2>$null
        if ($result -match "true") {
            Write-Host " [OK]" -ForegroundColor Green
        } else {
            Write-Host " [N/A - Collection inexistante]" -ForegroundColor Gray
        }
    }
    
    Write-Host ""
    Write-Host "3. Verification finale des collections..." -ForegroundColor Yellow
    docker exec a-ir-dd2-mongodb mongosh -u admin -p SecurePassword123! --authenticationDatabase admin --quiet --eval "use a-ir-dd2-dev; db.getCollectionNames()" 2>$null
    
    Write-Host ""
    Write-Host "[OK] Nettoyage termine !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines etapes :" -ForegroundColor Cyan
    Write-Host "   1. Redemarrer le backend : npm run dev" -ForegroundColor White
    Write-Host "   2. Executer les tests : .\scripts\test-sync.ps1" -ForegroundColor White
    Write-Host "   3. Verifier qu'aucune collection en double n'est recree" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "[X] Nettoyage annule." -ForegroundColor Red
}
