const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// Find device-settings.json path inside OS AppData Roaming folder
const appDataPath = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : path.join(process.env.HOME, '.config'));
let settingsPath = path.join(appDataPath, 'brain-stormers-desktop', 'device-settings.json');

if (!fs.existsSync(settingsPath)) {
  settingsPath = path.join(appDataPath, 'Electron', 'device-settings.json');
}
if (!fs.existsSync(settingsPath)) {
  settingsPath = path.join(appDataPath, 'brain-stormers-attendance', 'device-settings.json');
}

console.log('Searching for settings file at:', settingsPath);

if (!fs.existsSync(settingsPath)) {
  console.error('Error: device-settings.json not found. Checked folders: "brain-stormers-desktop", "Electron", and "brain-stormers-attendance" in AppData/Roaming.');
  process.exit(1);
}

let settings;
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch (e) {
  console.error('Error parsing settings file:', e.message);
  process.exit(1);
}

const keyPath = settings.serviceAccountKeyPath;
if (!keyPath) {
  console.error('Error: Firebase Service Account Key path is not configured in settings.');
  process.exit(1);
}

console.log('Using Firebase Service Account Key from:', keyPath);

if (!fs.existsSync(keyPath)) {
  console.error('Error: Service account key file not found at:', keyPath);
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  
  // Initialize Firebase Admin using v14 modular syntax
  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();
  console.log('\n=== Firestore Biometric Enrollment Verification ===');
  
  db.collection('users')
    .where('role', '==', 'staff')
    .get()
    .then(snapshot => {
      let enrolledCount = 0;
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.fingerprintTemplate) {
          enrolledCount++;
          console.log(`\n👤 Staff Member: ${data.name}`);
          console.log(`   ID: ${doc.id}`);
          console.log(`   Username: ${data.username || 'no-username'}`);
          console.log(`   Fingerprint Template Size: ${Buffer.from(data.fingerprintTemplate, 'base64').length} bytes`);
          const enrolledAt = data.fingerprintEnrolledAt ? data.fingerprintEnrolledAt.toDate().toLocaleString() : 'N/A';
          console.log(`   Enrolled At: ${enrolledAt}`);
        }
      });

      if (enrolledCount === 0) {
        console.log('\nNo staff members are currently enrolled with a fingerprint.');
      } else {
        console.log(`\n===================================================`);
        console.log(`Total Enrolled Staff: ${enrolledCount}`);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Firestore query failed:', err.message);
      process.exit(1);
    });
} catch (err) {
  console.error('Failed to connect to Firebase Admin:', err.message);
  process.exit(1);
}
