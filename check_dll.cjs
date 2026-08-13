const fs = require('fs');
const path = require('path');

const sys32Path = 'C:\\Windows\\System32\\libzkfp.dll';
const sysWow64Path = 'C:\\Windows\\SysWOW64\\libzkfp.dll';

console.log('Checking for libzkfp.dll in Windows directories...');
console.log('System32 path exists:', fs.existsSync(sys32Path));
if (fs.existsSync(sys32Path)) {
  const stat = fs.statSync(sys32Path);
  console.log(`System32 size: ${(stat.size / 1024).toFixed(1)} KB`);
}

console.log('SysWOW64 path exists:', fs.existsSync(sysWow64Path));
if (fs.existsSync(sysWow64Path)) {
  const stat = fs.statSync(sysWow64Path);
  console.log(`SysWOW64 size: ${(stat.size / 1024).toFixed(1)} KB`);
}
