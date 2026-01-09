
import fs from 'fs';
import path from 'path';

const srcDir = 'src/pages';
const destDir = 'src/pages/fr';

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const items = fs.readdirSync(srcDir);

items.forEach(item => {
    if (item === 'fr' || item === 'en') return;

    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);

    // Initial move
    fs.cpSync(srcPath, destPath, { recursive: true });
    fs.rmSync(srcPath, { recursive: true, force: true });
    console.log(`Moved ${item} to ${destDir}`);
});

// Function to recursively update imports in a directory
function updateImports(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            updateImports(filePath);
        } else if (file.endsWith('.astro') || file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.mjs')) {
            let content = fs.readFileSync(filePath, 'utf8');

            // Update relative imports adding one level of depth
            // Matches "../" and replaces with "../../"
            // Be careful not to replace existing "../../" with "../../../" blindly unless moving deeper
            // Ideally, we just replace specific known aliases if possible, or basic relative paths.
            // Simple generic approach: replace all `from "../` with `from "../../`

            // Adjust imports for consistency
            content = content.replace(/from\s+['"]\.\.\//g, 'from "../../');
            content = content.replace(/import\s+['"]\.\.\//g, 'import "../../');

            // Also Fix Layout imports (often `import Layout from "../layouts/Layout.astro"`)
            // After replace: `import Layout from "../../layouts/Layout.astro"` - Correct.

            // Fix deep nested services which were `../../layouts`
            // They are now `src/pages/fr/services/service.astro`.
            // Old path: `src/pages/services/service.astro` -> `../../layouts/Layout.astro`
            // New path: `src/pages/fr/services/service.astro` -> `../../../layouts/Layout.astro`

            // So we need to replace `../../` with `../../../` FIRST, then `../` with `../../`
            // But verify logic order.

            // Actually, we moved EVERYTHING one level deeper.
            // So ALL relative imports need ../ prepended.

            content = content.replace(/from\s+['"](\.\.\/)/g, 'from "../$1');
            content = content.replace(/import\s+['"](\.\.\/)/g, 'import "../$1');

            // Fix style imports: `import "../styles/global.css"` -> `import "../../styles/global.css"`

            fs.writeFileSync(filePath, content);
            console.log(`Updated imports in ${filePath}`);
        }
    });
}

updateImports(destDir);
