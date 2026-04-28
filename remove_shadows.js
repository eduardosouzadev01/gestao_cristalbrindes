const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\Users\\eduardosouza\\Desktop\\Projetos\\Gestão de Pedidos\\Gestão_Pedidos V01\\next-app\\src';

function walk(dir) {
    let results = [];
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

// Update matching rounding to rounded-md (6px)
const roundingRegex = /rounded-sm/g;
// Remove all shadows
const shadowRegex = /\bshadow(-sm|-md|-lg|-xl|-2xl|)\b/g;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    if (roundingRegex.test(content)) {
        content = content.replace(roundingRegex, 'rounded-md');
        modified = true;
    }
    
    if (shadowRegex.test(content)) {
        content = content.replace(shadowRegex, 'shadow-none');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
        console.log(`Updated ${file}`);
    }
});

console.log(`\nReplacement complete! ${modifiedCount} files updated (rounded-md and shadow-none).`);
