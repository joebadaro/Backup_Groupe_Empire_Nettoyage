$catalog = "public\images\catalog"
$optimized = "public\images\catalog_optimized"

Write-Host "Vérification des dossiers..."
if (Test-Path $optimized) {
    if (Test-Path $catalog) {
        Write-Host "Suppression de l'ancien dossier catalog..."
        Remove-Item -Recurse -Force $catalog
    }
    
    Write-Host "Renommage du dossier optimisé..."
    Rename-Item $optimized "catalog"
    Write-Host "SUCCÈS : Vos images sont maintenant optimisées !"
} else {
    Write-Host "ERREUR : Le dossier 'catalog_optimized' n'a pas été trouvé."
}
