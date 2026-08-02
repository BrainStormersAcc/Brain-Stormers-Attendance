import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Read local .env credentials configuration
let envText = '';
try {
  envText = fs.readFileSync('.env', 'utf8');
} catch (err) {
  console.error('Error: Could not find .env file. Please create it first.');
  process.exit(1);
}

const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    // Clean quotes if present
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const seed = async () => {
  const adminEmail = 'admin'; // Plain username
  const authEmail = `${adminEmail}@brainstormers.internal`;
  const adminPassword = 'adminpassword123'; // Default secure seeding password
  
  console.log(`Registering Admin in Firebase Auth: ${authEmail}...`);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, authEmail, adminPassword);
    const user = userCredential.user;
    
    console.log(`Writing Admin profile to Firestore: users/${user.uid}...`);
    await setDoc(doc(db, 'users', user.uid), {
      name: 'System Administrator',
      role: 'admin',
      username: adminEmail,
      phone: '+1234567890',
      active: true,
      joinDate: new Date()
    });
    
    console.log('\n=============================================');
    console.log('SUCCESS! Admin account seeded successfully.');
    console.log('Use the details below to log in:');
    console.log(`Username: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('=============================================');
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('\n=============================================');
      console.log('Notice: Admin account has already been seeded.');
      console.log('You can log in using:');
      console.log(`Username: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      console.log('=============================================');
    } else {
      console.error('\nSeeding failed:', error.message);
    }
  }
  process.exit();
};

seed();
