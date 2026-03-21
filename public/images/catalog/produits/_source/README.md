# Sources visuels produits

Placez ici vos **fichiers haute définition** (JPG, PNG ou WebP) avant optimisation.

## Noms de fichiers attendus

| Fichier source (base) | Sortie optimisée | Usage |
|----------------------|------------------|--------|
| `hub-duo.*` | `hub-duo.webp` | Hero page **Produits** (les deux produits ensemble) |
| `neutralisant.*` | `neutralisant-odeurs-oxygene.webp` | Fiche **Neutralisant** (photo 1) + vignette hub |
| `neutralisant-2.*` | `neutralisant-odeurs-oxygene-2.webp` | Fiche **Neutralisant** (photo 2, ex. contexte usage) |
| `enzymatique.*` ou `detachant-enzymatique.*` | `detachant-enzymatique.webp` | Fiche **Détachant** (photo 1) + vignette hub |
| `enzymatique-2.*` | `detachant-enzymatique-2.webp` | Fiche **Détachant** (photo 2, ex. exemple sur tissu) |

Vous pouvez ajouter d’autres variantes promotionnelles dans ce dossier pour référence, mais seules les bases ci-dessus sont traitées par le script — **ne surchargez pas le site** : gardez les extraits pour réseaux sociaux ou futures mises à jour.

## Pipeline

À la racine du projet :

```bash
npm run optimize:products
```

Le script génère les WebP dans `public/images/catalog/produits/` et met à jour `src/data/productImages.meta.json` (dimensions réelles pour `width` / `height` et SEO).

## Conseils

- **Hub duo** : photo large, lisible sur mobile, étiquettes visibles si possible.
- **Bouteilles individuelles** : cadrage vertical ou 3:4, fond propre, étiquette lisible.
- Évitez les fichiers trop lourds en entrée ; le script réduit la largeur max (1200 px hub, 960 px fiches).
