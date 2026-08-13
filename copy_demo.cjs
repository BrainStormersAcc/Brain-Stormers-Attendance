const fs = require('fs');
const path = require('path');

const src1 = 'C:\\Users\\niaz\\Desktop\\Brain-Stormers\\Scanning-Device\\ZKFingerSDK_Windows_Standard\\ZKFinger Standard SDK 5.3.0.33\\c\\MFC Demo\\libzkfpDemo2\\libzkfpDemoDlg.cpp';
const dest1 = path.join(__dirname, 'libzkfpDemoDlg.cpp.txt');

const src2 = 'C:\\Users\\niaz\\Desktop\\Brain-Stormers\\Scanning-Device\\ZKFingerSDK_Windows_Standard\\ZKFinger Standard SDK 5.3.0.33\\C#\\Demo2\\Form1.cs';
const dest2 = path.join(__dirname, 'Form1.cs.txt');

try {
  if (fs.existsSync(src1)) {
    fs.copyFileSync(src1, dest1);
    console.log('Copied libzkfpDemoDlg.cpp successfully to libzkfpDemoDlg.cpp.txt');
  } else {
    console.error('Source 1 not found:', src1);
  }

  if (fs.existsSync(src2)) {
    fs.copyFileSync(src2, dest2);
    console.log('Copied Form1.cs successfully to Form1.cs.txt');
  } else {
    console.error('Source 2 not found:', src2);
  }
} catch (err) {
  console.error('Error during copy:', err.message);
}
