---
description: Créer une sauvegarde complète du site
---

# Sauvegarde du site

Quand l'utilisateur dit "sauvegarde" ou "backup" ou "protège mon travail":

// turbo
1. Créer une sauvegarde timestampée
```powershell
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"
$source = "c:\Users\joeba\OneDrive\Desktop\Backup_Groupe_Empire_Nettoyage"
$destination = "c:\Users\joeba\OneDrive\Desktop\Backup_Groupe_Empire_Nettoyage_SAFE_$timestamp"
Copy-Item -Path $source -Destination $destination -Recurse -Force -Exclude @("node_modules","dist",".astro")
Write-Host "✅ Sauvegarde créée: Backup_Groupe_Empire_Nettoyage_SAFE_$timestamp"
```
