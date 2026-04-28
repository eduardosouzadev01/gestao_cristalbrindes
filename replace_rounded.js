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

const regex = /rounded-(lg|xl|2xl|3xl|4xl|5xl|6xl|\[.*?rem\])/g;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (regex.test(content)) {
        const newContent = content.replace(regex, 'rounded-sm');
        fs.writeFileSync(file, newContent, 'utf8');
        modifiedCount++;
        console.log(`Updated ${file}`);
    }
});

console.log(`\nReplacement complete! ${modifiedCount} files updated to rounded-sm.`);
