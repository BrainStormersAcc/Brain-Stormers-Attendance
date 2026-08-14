const admin = require('firebase-admin');
console.log('Keys of require("firebase-admin"):', Object.keys(admin));
console.log('admin.credential:', admin.credential);
console.log('typeof admin.initializeApp:', typeof admin.initializeApp);
