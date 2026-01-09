---
description: Restaurer la dernière sauvegarde
---

# Restaurer la dernière sauvegarde

Quand l'utilisateur dit "reviens à la dernière sauvegarde" ou "restaure" ou "annule tout":

// turbo
1. Trouver la dernière sauvegarde
```powershell
$backups = Get-ChildItem "c:\Users\joeba\OneDrive\Desktop" -Directory -Filter "Backup_Groupe_Empire_Nettoyage_SAFE_*" | Sort-Object Name -Descending
if ($backups.Count -eq 0) {
    Write-Host "❌ Aucune sauvegarde trouvée!"
    exit 1
}
$latest = $backups[0].FullName
Write-Host "📂 Dernière sauvegarde trouvée: $($backups[0].Name)"
```

// turbo
2. Supprimer le dossier actuel
```powershell
$current = "c:\Users\joeba\OneDrive\Desktop\Backup_Groupe_Empire_Nettoyage"
Remove-Item -Path $current -Recurse -Force
Write-Host "🗑️ Dossier actuel supprimé"
```

// turbo
3. Copier la sauvegarde
```powershell
Copy-Item -Path $latest -Destination $current -Recurse -Force
Write-Host "✅ Sauvegarde restaurée avec succès!"
Write-Host "⚠️ N'oubliez pas de faire: npm install"
```
