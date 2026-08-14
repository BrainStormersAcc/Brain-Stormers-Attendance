const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const authContextPath = path.join(rootDir, 'src', 'contexts', 'AuthContext.jsx');
const distIndexPath = path.join(rootDir, 'dist', 'index.html');

console.log('Sanity Checking Build Timestamps:');

if (fs.existsSync(authContextPath)) {
  const stat = fs.statSync(authContextPath);
  console.log(`- AuthContext.jsx Last Modified: ${stat.mtime}`);
} else {
  console.log('- AuthContext.jsx NOT FOUND!');
}

if (fs.existsSync(distIndexPath)) {
  const stat = fs.statSync(distIndexPath);
  console.log(`- dist/index.html Last Modified: ${stat.mtime}`);
} else {
  console.log('- dist/index.html NOT FOUND!');
}

// Find files in dist/assets
const assetsDir = path.join(rootDir, 'dist', 'assets');
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  console.log(`\nFiles in dist/assets (${files.length} files):`);
  files.forEach(file => {
    const filePath = path.join(assetsDir, file);
    const stat = fs.statSync(filePath);
    console.log(`- ${file} (${stat.size} bytes, modified: ${stat.mtime})`);
  });
} else {
  console.log('\ndist/assets NOT FOUND!');
}
