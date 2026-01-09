
import fs from 'fs';
import path from 'path';

const srcDir = 'src/pages/fr';
const destDir = 'src/pages';

if (fs.existsSync(srcDir)) {
    const items = fs.readdirSync(srcDir);
    items.forEach(item => {
        const srcPath = path.join(srcDir, item);
        const destPath = path.join(destDir, item);

        fs.renameSync(srcPath, destPath);
        console.log(`Restored ${item} to ${destDir}`);
    });
    fs.rmdirSync(srcDir);
} else {
    console.log("No 'fr' folder found, skipping restore.");
}
