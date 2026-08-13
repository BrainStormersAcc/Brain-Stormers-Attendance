const fs = require('fs');
const path = require('path');

const sdkPath = 'C:\\Users\\niaz\\Desktop\\Brain-Stormers\\Scanning-Device\\ZKFingerSDK_Windows_Standard';
const outputPath = path.join(__dirname, 'sdk_contents.txt');

function listFiles(dir, depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return [];
  let results = [];
  let list;
  try {
    list = fs.readdirSync(dir);
  } catch (err) {
    return [`${'  '.repeat(depth)}[ERROR: ${err.message}]`];
  }
  
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (e) {
      results.push(`${'  '.repeat(depth)}- ${file} [STAT ERROR]`);
      return;
    }
    
    if (stat && stat.isDirectory()) {
      results.push(`${'  '.repeat(depth)}📁 ${file}/`);
      results = results.concat(listFiles(fullPath, depth + 1, maxDepth));
    } else {
      results.push(`${'  '.repeat(depth)}📄 ${file} (${(stat.size / 1024).toFixed(1)} KB)`);
    }
  });
  return results;
}

console.log('Scanning Desktop for ZKFinger SDK at:', sdkPath);
const lines = [`Scanning Desktop for ZKFinger SDK at: ${sdkPath}`, ''];
lines.push(...listFiles(sdkPath, 0, 4));

fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
console.log('Done! Output written to:', outputPath);
