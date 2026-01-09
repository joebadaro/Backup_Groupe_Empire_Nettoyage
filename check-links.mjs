
import fs from 'fs';
import path from 'path';

const srcDir = 'c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage/src';

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath, fileList);
        } else {
            if (filePath.endsWith('.astro')) {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

const astroFiles = walk(srcDir);
const linkRegex = /href="([^"]*)"/g;
let brokenLinks = 0;

console.log('--- Validating Internal Links ---');

astroFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
        const link = match[1];
        if (link.startsWith('/') && !link.startsWith('//')) {
            // Check if it corresponds to a page
            // Special case for root
            let targetPath;
            if (link === '/') {
                targetPath = path.join(srcDir, 'pages', 'index.astro');
            } else {
                targetPath = path.join(srcDir, 'pages', link + '.astro');
                // Try index.astro for folders
                if (!fs.existsSync(targetPath)) {
                    targetPath = path.join(srcDir, 'pages', link, 'index.astro');
                }
            }

            if (!fs.existsSync(targetPath)) {
                // Ignore hash links or query params for simple check
                if (!link.includes('#') && !link.includes('?')) {
                    // Check if public file (image/pdf)
                    const publicPath = path.join('c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage/public', link);
                    if (!fs.existsSync(publicPath)) {
                        console.error(`Broken Link in ${path.basename(file)}: ${link}`);
                        brokenLinks++;
                    }
                }
            }
        }
    }
});

if (brokenLinks === 0) {
    console.log('No broken internal links found!');
} else {
    console.log(`Found ${brokenLinks} potentially broken links.`);
}
