
import fs from 'fs';
import path from 'path';

const srcDir = 'src/pages';
const destDir = 'src/pages/en';

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

const items = fs.readdirSync(srcDir);

items.forEach(item => {
    if (item === 'en') return;

    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);

    fs.cpSync(srcPath, destPath, { recursive: true });
    console.log(`Copied ${item} to ${destDir}`);
});
