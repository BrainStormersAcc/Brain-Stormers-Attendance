const fs = require('fs');
const path = require('path');

const headerPath = path.join(__dirname, 'Brain-Stormers-Desktop', 'sdk', 'include', 'libzkfp.h');
if (fs.existsSync(headerPath)) {
  const content = fs.readFileSync(headerPath, 'utf8');
  console.log('Searching for DBMerge / Match / DB functions in libzkfp.h:');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('DB') || line.includes('Match') || line.includes('Merge') || line.includes('Identify')) {
      console.log(`Line ${index + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log('libzkfp.h not found at:', headerPath);
}
