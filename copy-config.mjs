
import fs from 'fs';
import path from 'path';

const src = 'netlify.toml';
const dest = path.join('dist', 'netlify.toml');

if (fs.existsSync(src)) {
    // Check if dist/netlify.toml already exists and if it's identical
    if (!fs.existsSync('dist')) {
        console.error('Error: dist folder does not exist. Run build first.');
        process.exit(1);
    }

    // Strip [build] section for the manual upload version
    // (Since we are uploading the already built 'dist' folder, we don't want Netlify to try building it again)
    let content = fs.readFileSync(src, 'utf8');

    // Remove the [build] block and its keys
    // Regex matches [build] followed by anything until the next [[headers]] or [block]
    content = content.replace(/\[build\][\s\S]*?(?=\[\[headers\]\]|\[)/, '');

    fs.writeFileSync(dest, content);
    console.log(`Copied ${src} to ${dest} (with [build] section removed)`);
} else {
    console.error('Error: netlify.toml not found in root.');
}
