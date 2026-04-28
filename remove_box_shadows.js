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

// Remove boxShadow properties in style objects
const shadowProperties = [
    /boxShadow:\s*'[^']+'/g,
    /boxShadow:\s*`[^`]+`/g,
    /boxShadow:\s*"[^"]+"/g
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    shadowProperties.forEach(regex => {
        if (regex.test(content)) {
            content = content.replace(regex, "boxShadow: 'none'");
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        modifiedCount++;
    }
});

console.log(`\nShadow property removal complete! ${modifiedCount} files updated.`);
