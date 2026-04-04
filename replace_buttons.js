const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.astro')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // Replace bad classes with btn-primary pulse-btn
    content = content.replace(/btn-outline-reveal/g, 'btn-primary pulse-btn');
    content = content.replace(/btn-outline/g, 'btn-primary pulse-btn');
    content = content.replace(/btn-secondary-dark/g, 'btn-primary pulse-btn');
    content = content.replace(/btn-glass-outline/g, 'btn-primary pulse-btn');
    content = content.replace(/btn-glass/g, 'btn-primary pulse-btn');
    content = content.replace(/btn-gradient-blue-green/g, 'btn-gradient-green');
    content = content.replace(/btn-outline-red/g, 'btn-primary pulse-btn');
    
    // Some buttons end up with duplicate btn classes or duplicate pulse-btn, fix it:
    content = content.replace(/btn-primary pulse-btn-red/g, 'btn-primary pulse-btn');
    content = content.replace(/btn-primary pulse-btn pulse-btn/g, 'btn-primary pulse-btn');
    content = content.replace(/btn btn-primary pulse-btn btn-primary pulse-btn/g, 'btn btn-primary pulse-btn');
    
    // Remove old style definitions
    content = content.replace(/\.btn-primary pulse-btn\s*\{[\s\S]*?\}\s*\n?/g, '');
    content = content.replace(/\.btn-primary pulse-btn:hover\s*\{[\s\S]*?\}\s*\n?/g, '');

    if (original !== content) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
    }
});
