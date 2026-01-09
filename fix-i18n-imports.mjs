
import fs from 'fs';
import path from 'path';

const root = 'src/pages/en';

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath);
        } else if (file.endsWith('.astro') || file.endsWith('.js')) {
            fixImports(filePath);
        }
    }
}

function fixImports(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Calculate depth to 'src'
    // filePath: src\pages\fr\index.astro
    // relative to src: pages/fr/index.astro -> 3 segments?
    // We want path to 'src'.
    // from 'src/pages/fr' -> ../../ (to reach src)

    // Normalize path separators
    const normalized = filePath.replace(/\\/g, '/');
    const segments = normalized.split('/');
    // e.g. src/pages/fr/index.astro -> [src, pages, fr, index.astro]
    // Depth needed: length - 2 (to skip filename and src itself?)
    // No, standard `path.relative`.

    // We want relative path from DIrectory of file to 'src'
    const dir = path.dirname(filePath);
    const relativeToSrc = path.relative(dir, 'src').replace(/\\/g, '/');

    // Ensure it ends with / if not empty, but path.relative returns "..\.."
    const prefix = relativeToSrc + '/';

    // Fix Layouts
    // Matches: from "...layouts/..." or from '...layouts/...'
    // Captures the part AFTER layouts/
    content = content.replace(/(from|import)\s+['"].*?\/layouts\/(.*?)['"]/g, `$1 "${prefix}layouts/$2"`);

    // Fix Components
    content = content.replace(/(from|import)\s+['"].*?\/components\/(.*?)['"]/g, `$1 "${prefix}components/$2"`);

    // Fix Styles
    content = content.replace(/(from|import)\s+['"].*?\/styles\/(.*?)['"]/g, `$1 "${prefix}styles/$2"`);

    // Fix Scripts
    content = content.replace(/(from|import)\s+['"].*?\/scripts\/(.*?)['"]/g, `$1 "${prefix}scripts/$2"`);

    // Fix Unterminated Strings (Fallback)
    // If a line imports and has mixed quotes, fix it.
    // e.g. from "...';
    content = content.replace(/(from|import)\s+["'](.*?)['"];/g, '$1 "$2";');

    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${filePath} -> Prefix: ${prefix}`);
}

walk(root);
