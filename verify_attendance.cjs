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
  
  // Resolve today's date string format: YYYY-MM-DD
  const todayObj = new Date();
  const yyyy = todayObj.getFullYear();
  const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
  const dd = String(todayObj.getDate()).padStart(2, '0');
  const todayDateString = `${yyyy}-${mm}-${dd}`;

  console.log(`\n=== Firestore Attendance Log Verification (${todayDateString}) ===`);

  // We will cache user profiles to look up names
  const userCache = {};

  async function getUserName(userId) {
    if (userCache[userId]) return userCache[userId];
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const name = userDoc.data().name || 'Staff Member';
        userCache[userId] = name;
        return name;
      }
    } catch (e) {}
    return 'Unknown User';
  }

  db.collection('attendance')
    .where('date', '==', todayDateString)
    .where('isDeleted', '==', false)
    .get()
    .then(async (snapshot) => {
      let logCount = 0;
      const records = [];

      snapshot.forEach(doc => {
        records.push({ id: doc.id, ...doc.data() });
      });

      for (const data of records) {
        logCount++;
        const name = await getUserName(data.userId);
        console.log(`\n👤 Staff Name: ${name}`);
        console.log(`   User ID: ${data.userId}`);
        console.log(`   Document ID: ${data.id}`);
        console.log(`   Date: ${data.date}`);
        
        const checkInTime = data.checkIn ? (typeof data.checkIn.toDate === 'function' ? data.checkIn.toDate() : new Date(data.checkIn)) : null;
        console.log(`   Check-In: ${checkInTime ? checkInTime.toLocaleTimeString() : '--:--'}`);
        
        const checkOutTime = data.checkOut ? (typeof data.checkOut.toDate === 'function' ? data.checkOut.toDate() : new Date(data.checkOut)) : null;
        console.log(`   Check-Out: ${checkOutTime ? checkOutTime.toLocaleTimeString() : '--:--'}`);
        
        console.log(`   Status: ${data.status || 'Present'}`);
        console.log(`   Marked By: ${data.markedBy || 'manual'}`);
      }

      if (logCount === 0) {
        console.log(`\nNo attendance logs found in Firestore for today (${todayDateString}).`);
      } else {
        console.log(`\n=============================================================`);
        console.log(`Total Logs Fetched: ${logCount}`);
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
