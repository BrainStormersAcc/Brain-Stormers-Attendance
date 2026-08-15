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
  console.error('Error: device-settings.json not found.');
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
  
  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();

  async function runMigration() {
    console.log('Fetching users collection...');
    const usersSnapshot = await db.collection('users').get();
    
    console.log(`Found ${usersSnapshot.size} users. Starting backfill into usernameIndex...`);
    
    const batch = db.batch();
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.username) {
        const usernameLower = data.username.toLowerCase().trim();
        const authEmail = data.username.includes('@') ? data.username : `${data.username}@brainstormers.internal`;
        
        console.log(`Mapping username "${data.username}" -> email "${authEmail}" (role: ${data.role || 'staff'})`);
        const indexDocRef = db.collection('usernameIndex').doc(usernameLower);
        batch.set(indexDocRef, {
          email: authEmail,
          role: data.role || 'staff',
          uid: doc.id
        });
      }
    });

    await batch.commit();
    console.log('Backfill migration completed successfully.');
  }

  runMigration();
} catch (err) {
  console.error('Migration failed:', err);
}
