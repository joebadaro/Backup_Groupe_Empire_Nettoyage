
import fs from 'fs';
import path from 'path';

const directory = 'c:/Users/joeba/OneDrive/Desktop/Backup_Groupe_Empire_Nettoyage/public/images';
const threshold = 500 * 1024; // 500KB

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath, fileList);
        } else {
            if (stat.size > threshold) {
                fileList.push({ path: filePath, size: (stat.size / 1024 / 1024).toFixed(2) + ' MB' });
            }
        }
    });
    return fileList;
}

console.log('--- Checking for large images (>500KB) ---');
try {
    const largeFiles = walk(directory);
    if (largeFiles.length === 0) {
        console.log('All images are under 500KB. Great job!');
    } else {
        console.log(`Found ${largeFiles.length} large images:`);
        largeFiles.forEach(f => console.log(`${f.size} - ${f.path}`));
    }
} catch (e) {
    console.error("Error reading images:", e.message);
}
