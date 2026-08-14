const admin = require('firebase-admin');
const fs = require('fs');

let db = null;
let isInitialized = false;
let currentKeyPath = null;

/**
 * Initialize the Firebase Admin SDK using a service account JSON file.
 * Returns true if successful, throws error otherwise.
 */
async function initializeAdmin(serviceAccountPath) {
  if (!serviceAccountPath) {
    throw new Error('No Firebase service account key path specified.');
  }

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Service account file not found at: ${serviceAccountPath}`);
  }

  // If already initialized with the same key, skip
  if (isInitialized && currentKeyPath === serviceAccountPath) {
    return true;
  }

  try {
    const rawData = fs.readFileSync(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(rawData);

    // Validate essential properties of a service account JSON
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      throw new Error('Invalid service account key JSON structure. Missing project_id, private_key, or client_email.');
    }

    // Clean up existing instance if any
    if (admin.apps.length > 0) {
      await admin.app().delete();
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    db = admin.firestore();
    // Enable offline persistence settings or configure timestamps in snapshots if needed
    db.settings({ ignoreUndefinedProperties: true });

    isInitialized = true;
    currentKeyPath = serviceAccountPath;
    console.log(`[Firebase Admin] Successfully initialized for project: ${serviceAccount.project_id}`);
    return true;
  } catch (err) {
    isInitialized = false;
    currentKeyPath = null;
    db = null;
    throw new Error(`Failed to initialize Firebase Admin: ${err.message}`);
  }
}

/**
 * Test the connection by reading the "users" collection and counting active staff members.
 * Returns the count of active staff members.
 */
async function testConnection() {
  if (!isInitialized || !db) {
    throw new Error('Firebase Admin is not initialized. Please configure a valid service account key.');
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .where('role', '==', 'staff')
      .where('active', '==', true)
      .get();
    
    console.log(`[Firebase Admin] Connection check successful. Active staff count: ${snapshot.size}`);
    return snapshot.size;
  } catch (err) {
    console.error('[Firebase Admin] Connection test failed:', err.message);
    throw new Error(`Firestore query failed: ${err.message}`);
  }
}

module.exports = {
  initializeAdmin,
  testConnection,
  getIsInitialized: () => isInitialized
};
