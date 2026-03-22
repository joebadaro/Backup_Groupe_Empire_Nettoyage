# Hero mobile (portrait) — home FR/EN

Fichiers utilisés **uniquement** pour `max-width: 768px` via `<picture><source media="…">`.

| Fichier | Usage diaporama | Dimensions |
|--------|-------------------|------------|
| `hero-tapis-commercial-bureau-quebec-portrait.webp` | Slide 1 (bureau / tapis bleu) | 1600×2000 |
| `hero-tapis-commercial-bureau-quebec-portrait-800.webp` | Slide 1, variante légère | 800×1000 |
| `hero-salon-nettoyage-vapeur-montreal-portrait.webp` | Slide 2 (salon) | 1600×2000 |
| `hero-salon-nettoyage-vapeur-montreal-portrait-800.webp` | Slide 2, variante légère | 800×1000 |

**Desktop / tablette large :** inchangé — `hero-slide-office.webp`, `hero-slide-2.webp` + srcset landscape existants.

Pour régénérer à partir de nouveaux JPEG sources (Sharp requis) :

```bash
node scripts/build-hero-portrait.mjs
```

(ajuster les chemins sources dans le script si besoin.)
