const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'Brain-Stormers-Desktop', 'sdk', 'include', 'libzkfp.h');
const dest = path.join(__dirname, 'Brain-Stormers-Desktop', 'sdk', 'include', 'libzkfp.h.txt');

if (fs.existsSync(src)) {
  fs.copyFileSync(src, dest);
  console.log('Successfully copied libzkfp.h to libzkfp.h.txt');
} else {
  console.log('Source file does not exist:', src);
}
