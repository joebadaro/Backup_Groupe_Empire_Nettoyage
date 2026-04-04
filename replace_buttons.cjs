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
    
    content = content.replace(/\bbtn-outline-reveal\b/g, 'btn-primary pulse-btn');
    content = content.replace(/\bbtn-outline\b/g, 'btn-primary pulse-btn');
    content = content.replace(/\bbtn-secondary-dark\b/g, 'btn-primary pulse-btn');
    content = content.replace(/\bbtn-glass-outline\b/g, 'btn-primary pulse-btn');
    content = content.replace(/\bbtn-glass\b/g, 'btn-primary pulse-btn');
    content = content.replace(/\bbtn-outline-red\b/g, 'btn-primary pulse-btn');
    content = content.replace(/\bbtn-gradient-blue-green-outline\b/g, 'btn-primary pulse-btn');
    content = content.replace(/\bbtn-gradient-blue-green\b/g, 'btn-primary pulse-btn');
    
    content = content.replace(/btn-primary pulse-btn pulse-btn/g, 'btn-primary pulse-btn');
    
    if (original !== content) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
    }
});
