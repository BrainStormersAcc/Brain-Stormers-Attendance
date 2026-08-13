const fs = require('fs');
const path = require('path');

const srcBase = 'C:\\Users\\niaz\\Desktop\\Brain-Stormers\\Scanning-Device\\ZKFingerSDK_Windows_Standard\\ZKFinger Standard SDK 5.3.0.33\\c';
const destBase = path.join(__dirname, 'Brain-Stormers-Desktop', 'sdk');

const copyOperations = [
  {
    src: path.join(srcBase, 'libs', 'x64lib', 'libzkfp.lib'),
    dest: path.join(destBase, 'x64', 'libzkfp.lib')
  },
  {
    src: path.join(srcBase, 'libs', 'x86lib', 'libzkfp.lib'),
    dest: path.join(destBase, 'x86', 'libzkfp.lib')
  },
  {
    src: path.join(srcBase, 'libs', 'include', 'libzkfp.h'),
    dest: path.join(destBase, 'include', 'libzkfp.h')
  },
  {
    src: path.join(srcBase, 'libs', 'include', 'libzkfperrdef.h'),
    dest: path.join(destBase, 'include', 'libzkfperrdef.h')
  },
  {
    src: path.join(srcBase, 'libs', 'include', 'libzkfptype.h'),
    dest: path.join(destBase, 'include', 'libzkfptype.h')
  },
  {
    src: path.join(srcBase, 'libs', 'include', 'zkinterface.h'),
    dest: path.join(destBase, 'include', 'zkinterface.h')
  }
];

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log('Created directory:', dirPath);
  }
}

console.log('Starting SDK file copying...');

copyOperations.forEach(op => {
  try {
    if (!fs.existsSync(op.src)) {
      console.error(`Source file not found: ${op.src}`);
      return;
    }
    
    ensureDirExists(path.dirname(op.dest));
    fs.copyFileSync(op.src, op.dest);
    console.log(`Copied: ${path.basename(op.src)} -> ${op.dest}`);
  } catch (err) {
    console.error(`Failed to copy ${path.basename(op.src)}:`, err.message);
  }
});

console.log('Copy operations completed.');
