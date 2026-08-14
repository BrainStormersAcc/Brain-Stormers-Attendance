const fs = require('fs');
const path = require('path');

function searchFiles(dir, query) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchFiles(fullPath, query);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(query)) {
        console.log(`Found "${query}" in: ${fullPath}`);
        // Print lines containing query
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes(query)) {
            console.log(`  Line ${index + 1}: ${line.trim()}`);
          }
        });
      }
    }
  });
}

const srcDir = path.join(__dirname, 'src');
console.log('Searching for localStorage...');
searchFiles(srcDir, 'localStorage');
console.log('Searching for sessionStorage...');
searchFiles(srcDir, 'sessionStorage');
console.log('Searching for role...');
searchFiles(srcDir, 'role');
