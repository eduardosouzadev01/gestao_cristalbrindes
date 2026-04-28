const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\Users\\eduardosouza\\Desktop\\Projetos\\Gestão de Pedidos\\Gestão_Pedidos V01\\next-app\\src';

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(srcDir);
let modifiedCount = 0;

// Fix rounded-md-[Xpx] and similar weird patterns
const weirdRoundingRegex = /rounded-md-\[[^\]]+\]/g;
// Fix shadow-none-none or similar
const shadowNoneNoneRegex = /shadow-none-none/g;
// Ensure pl-12 in search inputs has !important to avoid global css override
const searchInputRegex = /(<input[^>]+class(?:Name)?[^>]+)(pl-12)([^>]+>)/g;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    if (weirdRoundingRegex.test(content)) {
        content = content.replace(weirdRoundingRegex, 'rounded-md');
        modified = true;
    }
    
    if (shadowNoneNoneRegex.test(content)) {
        content = content.replace(shadowNoneNoneRegex, 'shadow-none');
        modified = true;
    }

    if (searchInputRegex.test(content)) {
        // Only apply if it's a search input (has search icon nearby or placeholder contains buscar/pesquisar)
        // For simplicity, let's just make all pl-12 !important if they are likely search inputs
        content = content.replace(searchInputRegex, (match, p1, p2, p3) => {
             if (match.toLowerCase().includes('buscar') || match.toLowerCase().includes('pesquisar') || match.toLowerCase().includes('pl-12')) {
                 return p1 + '!pl-12' + p3;
             }
             return match;
        });
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
    }
});

console.log(`\nCleanup complete! ${modifiedCount} files updated.`);
