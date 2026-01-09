
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Cheerio removed to avoid dependency issues. Using Regex.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'dist');

async function crawlDist(dir) {
    let files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files = files.concat(await crawlDist(fullPath));
        } else if (entry.name.endsWith('.html')) {
            files.push(fullPath);
        }
    }
    return files;
}

async function analyzePages() {
    console.log("Starting Audit...");
    if (!fs.existsSync(DIST_DIR)) {
        console.error("DIST directory not found. Please build first.");
        return;
    }

    const pages = await crawlDist(DIST_DIR);
    console.log(`Found ${pages.length} HTML files.`);

    const pageData = [];

    for (const pagePath of pages) {
        const content = fs.readFileSync(pagePath, 'utf-8');

        // Simple Regex parsing if Cheerio fails (or just use regex for speed/simplicity here)
        const getTag = (tag) => {
            const match = content.match(new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'i')) || content.match(new RegExp(`<${tag}[^>]*content=["'](.*?)["']`, 'i'));
            return match ? match[1] : '';
        };

        const getMeta = (name) => {
            const match = content.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["'](.*?)["']`, 'i'));
            return match ? match[1] : '';
        };

        const relPath = path.relative(DIST_DIR, pagePath).replace(/\\/g, '/');
        const title = getTag('title');
        const h1 = getTag('h1'); // simplistic
        const desc = getMeta('description');
        const canonical = (content.match(/<link[^>]*rel=["']canonical["'][^>]*href=["'](.*?)["']/) || [])[1] || '';

        pageData.push({
            path: relPath,
            title,
            h1,
            desc,
            canonical
        });
    }

    // Check for Duplicates
    const duplicates = [];
    const seenTitles = {};
    for (const page of pageData) {
        if (seenTitles[page.title]) {
            duplicates.push({
                original: seenTitles[page.title],
                duplicate: page.path,
                title: page.title
            });
        } else {
            seenTitles[page.title] = page.path;
        }
    }

    console.log("\n--- DUPLICATE CONTENT DETECTION ---");
    if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} potential duplicates (by Title):`);
        duplicates.forEach(d => {
            console.log(`- "${d.title}"`);
            console.log(`  File A: ${d.original}`);
            console.log(`  File B: ${d.duplicate}`);
        });
    } else {
        console.log("No exact title duplicates found.");
    }

    console.log("\n--- PAGE INVENTORY ---");
    pageData.forEach(p => {
        console.log(`[${p.path}]`);
        console.log(`  Title: ${p.title}`);
        console.log(`  Canonical: ${p.canonical}`);
    });

    // Check Sitemap presence
    if (fs.existsSync(path.join(DIST_DIR, 'sitemap-index.xml')) || fs.existsSync(path.join(DIST_DIR, 'sitemap.xml'))) {
        console.log("\n[OK] Sitemap found.");
    } else {
        console.log("\n[FAIL] Sitemap NOT found.");
    }

    // Check Robots.txt
    if (fs.existsSync(path.join(DIST_DIR, 'robots.txt'))) {
        console.log("[OK] robots.txt found.");
    } else {
        console.log("[FAIL] robots.txt NOT found.");
    }
}

analyzePages();
