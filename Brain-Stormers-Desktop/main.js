const { app, BrowserWindow, Menu, ipcMain, dialog, Tray } = require('electron');

// Force app name to ensure userData path resolves to 'brain-stormers-desktop' in both dev and production modes
app.name = 'brain-stormers-desktop';

const path = require('path');
const fs = require('fs');
const http = require('http');
const fingerprintSdk = require('./src/main/fingerprintSdk');
const firebaseAdmin = require('./src/main/firebaseAdmin');

let mainWindow;
let settingsWindow;
let staticServer;
let tray = null;

const SETTINGS_FILE = path.join(app.getPath('userData'), 'device-settings.json');

// Helper to get local cached settings
function getLocalSettings() {
  console.log('[Electron Settings] Loading local settings from:', SETTINGS_FILE);
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    } catch (e) {
      console.error('Failed to parse local device settings:', e);
      return {};
    }
  }
  return {};
}

// Helper to save settings locally
function saveLocalSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    console.log('Settings saved to:', SETTINGS_FILE);
    
    // Notify PWA that the device was activated so it can update lastFetchedAt
    if (mainWindow) {
      mainWindow.webContents.send('device-activated', settings.deviceId);
    }
    
    // Initialize/sync mock ZKFinger SDK with the new key!
    initializeZKFingerSDK(settings.licenseKey, settings.deviceName);

    // Initialize Firebase Admin with new key path
    if (settings.serviceAccountKeyPath) {
      firebaseAdmin.initializeAdmin(settings.serviceAccountKeyPath)
        .then(() => firebaseAdmin.testConnection())
        .then(count => {
          if (mainWindow) {
            mainWindow.webContents.send('firebase:status-changed', { success: true, staffCount: count });
          }
          return preloadFingerprintCache().then(() => {
            runBackgroundListeningLoop();
          });
        })
        .catch(err => {
          if (mainWindow) {
            mainWindow.webContents.send('firebase:status-changed', { success: false, error: err.message });
          }
        });
    }
  } catch (e) {
    console.error('Failed to write local device settings:', e);
  }
}

// ZKFinger SDK Initialization Mock
function initializeZKFingerSDK(licenseKey, deviceName) {
  if (!licenseKey) {
    console.log('[ZKFinger SDK] No local license key cached yet. Please configure it in settings.');
    return false;
  }
  console.log('================================================================');
  console.log('[ZKFinger SDK] Initializing biometric hardware scanner...');
  console.log(`[ZKFinger SDK] Target Device: "${deviceName}"`);
  console.log(`[ZKFinger SDK] License Key Loaded: "${licenseKey.substring(0, 4)}••••${licenseKey.substring(licenseKey.length - 4)}"`);
  console.log('[ZKFinger SDK] Biometric matching engine initialized successfully.');
  console.log('================================================================');
  return true;
}

// Read and parse environmental variables
function getFirebaseConfigFromEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('Could not find .env file at:', envPath);
    return {};
  }
  
  const envText = fs.readFileSync(envPath, 'utf8');
  const config = {};
  
  envText.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
        value = value.substring(1, value.length - 1);
      }
      config[key] = value.trim();
    }
  });

  return {
    apiKey: config.VITE_FIREBASE_API_KEY,
    authDomain: config.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: config.VITE_FIREBASE_PROJECT_ID,
    storageBucket: config.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: config.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: config.VITE_FIREBASE_APP_ID,
    measurementId: config.VITE_FIREBASE_MEASUREMENT_ID
  };
}

const DIST_DIR = path.join(__dirname, '../dist');
const INDEX_HTML_PATH = path.join(DIST_DIR, 'index.html');

// Automatically copy parent logo.png to local assets on startup for the app icon
const localAssetsDir = path.join(__dirname, 'assets');
const localIconPng = path.join(localAssetsDir, 'icon.png');
const parentLogoPath = path.join(__dirname, '../src/assets/logo.png');

if (!fs.existsSync(localAssetsDir)) {
  fs.mkdirSync(localAssetsDir, { recursive: true });
}

if (!fs.existsSync(localIconPng) && fs.existsSync(parentLogoPath)) {
  try {
    fs.copyFileSync(parentLogoPath, localIconPng);
    console.log('Successfully copied logo.png to local assets/icon.png');
  } catch (err) {
    console.error('Could not copy parent logo:', err);
  }
}

// Determine best icon file path (prefer PNG copy during dev, fall back to ICO)
let appIconPath = localIconPng;
if (!fs.existsSync(appIconPath)) {
  appIconPath = path.join(localAssetsDir, 'icon.ico');
}

// Remove default Electron menu bar globally
Menu.setApplicationMenu(null);

// Create a local HTTP server that serves the production dist/ output
// with SPA rewrite routing support (fallback to index.html)
function startLocalServer(callback) {
  staticServer = http.createServer((req, res) => {
    // Determine path based on request URL
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(DIST_DIR, reqPath);

    fs.stat(filePath, (err, stats) => {
      // If file doesn't exist or is a directory, fallback to index.html (SPA routing support)
      if (err || !stats.isFile()) {
        filePath = INDEX_HTML_PATH;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading application resource');
          return;
        }

        // Determine content type
        let contentType = 'text/html';
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
          case '.js':
            contentType = 'application/javascript';
            break;
          case '.css':
            contentType = 'text/css';
            break;
          case '.json':
            contentType = 'application/json';
            break;
          case '.png':
            contentType = 'image/png';
            break;
          case '.jpg':
          case '.jpeg':
            contentType = 'image/jpeg';
            break;
          case '.gif':
            contentType = 'image/gif';
            break;
          case '.svg':
            contentType = 'image/svg+xml';
            break;
          case '.ico':
            contentType = 'image/x-icon';
            break;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
  });

  // Listen on a dynamic free port (0 asks OS to allocate any free port)
  staticServer.listen(0, '127.0.0.1', () => {
    const port = staticServer.address().port;
    console.log(`Local SPA Server running at http://127.0.0.1:${port}`);
    callback(port);
  });
}

let appInitialized = false;

function initializeApplication() {
  if (appInitialized) return true;

  console.log('[Electron Startup] Checking INDEX_HTML_PATH:', INDEX_HTML_PATH);
  const buildExists = fs.existsSync(INDEX_HTML_PATH);
  console.log('[Electron Startup] INDEX_HTML_PATH exists:', buildExists);
  
  if (!buildExists) {
    console.error("Build directory 'dist/' not found. Loading missing build error page. Expected path:", INDEX_HTML_PATH);
    if (mainWindow) {
      mainWindow.loadFile(path.join(__dirname, 'error.html'));
    }
    return false;
  }

  // Load splash loading page first
  if (mainWindow) {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  // Initialize ZKFinger SDK with local cached settings
  const localSettings = getLocalSettings();
  initializeZKFingerSDK(localSettings.licenseKey, localSettings.deviceName);

  // Initialize Firebase Admin with local cached settings
  if (localSettings.serviceAccountKeyPath) {
    firebaseAdmin.initializeAdmin(localSettings.serviceAccountKeyPath)
      .then(() => firebaseAdmin.testConnection())
      .then(count => {
        if (mainWindow) {
          mainWindow.webContents.send('firebase:status-changed', { success: true, staffCount: count });
        }
        return preloadFingerprintCache().then(() => {
          runBackgroundListeningLoop();
        });
      })
      .catch(err => {
        if (mainWindow) {
          mainWindow.webContents.send('firebase:status-changed', { success: false, error: err.message });
        }
      });
  }

  // Start local HTTP server to host dist/ and bypass file:// protocol issues
  startLocalServer((port) => {
    // Transition after 1.5 seconds splash intro
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.loadURL(`http://127.0.0.1:${port}`).catch(err => {
          console.error('Failed to load local SPA server:', err);
          mainWindow.loadFile(path.join(__dirname, 'error.html'));
        });
      }
    }, 1500);
  });

  appInitialized = true;
  return true;
}

// IPC handler to allow retry initialization from the error page
ipcMain.on('app:retry-init', (event) => {
  console.log('[Main Process] Received retry initialization request...');
  const success = initializeApplication();
  event.reply('app:retry-init-response', { success });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: "Brain Stormers Attendance",
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: !app.isPackaged // devTools available in dev mode, disabled in production packages
    }
  });

  // Forward renderer process logs to the main process console
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message}`);
  });

  // Lock window title to prevent web overrides
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  // Register local keyboard shortcuts for Refresh (Ctrl+R), Hard Refresh (Ctrl+Shift+R), Settings (Ctrl+Shift+S), DevTools (Ctrl+Shift+I), and Mock Scan (Ctrl+Shift+F)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control && input.key.toLowerCase() === 'r') {
      if (input.shift) {
        console.log('Performing cache-bypassing hard reload...');
        mainWindow.webContents.reloadIgnoringCache();
      } else {
        console.log('Performing standard reload...');
        mainWindow.webContents.reload();
      }
      event.preventDefault();
    }

    // Ctrl + Shift + I toggles developer tools (only in development)
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i') {
      if (!app.isPackaged) {
        console.log('Toggling Developer Tools...');
        mainWindow.webContents.toggleDevTools();
      }
      event.preventDefault();
    }

    // Ctrl + Shift + S opens settings panel
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 's') {
      console.log('Opening device activation settings...');
      createSettingsWindow();
      event.preventDefault();
    }

    // Ctrl + Shift + F simulates a fingerprint scan touch
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'f') {
      console.log('Simulating fingerprint scanner touch...');
      if (mainWindow) {
        mainWindow.webContents.send('get-test-staff');
      }
      event.preventDefault();
    }
  });

  // Intercept window close to minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      console.log('[Electron Window] Hidden to tray instead of quitting.');
    }
  });

  // Attempt to initialize
  initializeApplication();
}

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 480,
    height: 480,
    resizable: false,
    title: "Device Activation Settings",
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  settingsWindow.setMenu(null);
  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// Register IPC handlers for settings API
ipcMain.handle('get-firebase-config', () => {
  return getFirebaseConfigFromEnv();
});

ipcMain.handle('get-local-settings', () => {
  return getLocalSettings();
});

ipcMain.handle('save-local-settings', (event, settings) => {
  saveLocalSettings(settings);
  return { success: true };
});

ipcMain.on('close-settings-window', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

let pendingDevicesPromise = null;

ipcMain.handle('request-devices', async () => {
  if (!mainWindow) {
    throw new Error('Main window is not available.');
  }
  
  return new Promise((resolve, reject) => {
    pendingDevicesPromise = { resolve, reject };
    // Tell PWA to fetch the devices using its active session
    mainWindow.webContents.send('get-active-devices');
    
    // Safety timeout: reject after 10 seconds if PWA doesn't respond
    setTimeout(() => {
      if (pendingDevicesPromise) {
        pendingDevicesPromise.reject(new Error('Timeout fetching devices from PWA. Make sure you are logged in.'));
        pendingDevicesPromise = null;
      }
    }, 10000);
  });
});

ipcMain.on('respond-active-devices', (event, devices) => {
  if (pendingDevicesPromise) {
    pendingDevicesPromise.resolve(devices);
    pendingDevicesPromise = null;
  }
});

ipcMain.on('respond-active-devices-error', (event, error) => {
  if (pendingDevicesPromise) {
    pendingDevicesPromise.reject(new Error(error));
    pendingDevicesPromise = null;
  }
});

ipcMain.on('respond-test-staff', (event, staffData) => {
  console.log('[Fingerprint Bridge] Match found for staff:', staffData.name);
  if (mainWindow) {
    mainWindow.webContents.send('fingerprint-scanned', staffData);
  }
});

ipcMain.on('respond-test-staff-error', (event, error) => {
  console.error('[Fingerprint Bridge] Simulation failed to fetch test staff:', error);
});

// Native Fingerprint SDK IPC Handlers
ipcMain.handle('fingerprint:init', async () => {
  try {
    // Suspend background loop
    isSuspendedForEnrollment = true;
    isBackgroundListening = false;
    
    // Allow small delay for background polling loop to exit
    await new Promise(resolve => setTimeout(resolve, 300));

    const result = await fingerprintSdk.initDevice();
    return { success: true, ...result };
  } catch (err) {
    console.error('[Fingerprint IPC] Init failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fingerprint:capture', async (event, timeoutMs) => {
  try {
    const result = await fingerprintSdk.captureFingerprint(timeoutMs);
    return { success: true, ...result };
  } catch (err) {
    console.error('[Fingerprint IPC] Capture failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fingerprint:close', async () => {
  try {
    const result = await fingerprintSdk.closeDevice();
    
    // Resume background loop
    isSuspendedForEnrollment = false;
    runBackgroundListeningLoop();

    return { success: true, ...result };
  } catch (err) {
    console.error('[Fingerprint IPC] Close failed:', err.message);
    return { success: false, error: err.message };
  }
});

// Firebase Admin IPC Handlers
ipcMain.handle('settings:select-service-account', async () => {
  const parentWindow = settingsWindow || mainWindow;
  if (!parentWindow) return null;
  
  const result = await dialog.showOpenDialog(parentWindow, {
    title: 'Select Firebase Service Account JSON Key',
    filters: [
      { name: 'JSON Files', extensions: ['json'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('firebase:check-status', async () => {
  const localSettings = getLocalSettings();
  if (!localSettings.serviceAccountKeyPath) {
    return { success: false, error: 'Not Configured' };
  }

  try {
    await firebaseAdmin.initializeAdmin(localSettings.serviceAccountKeyPath);
    const count = await firebaseAdmin.testConnection();
    return { success: true, staffCount: count };
  } catch (err) {
    console.error('[Firebase IPC] Status check failed:', err.message);
    return { success: false, error: err.message };
  }
});

let currentUserRole = null;
const enrolledTemplatesCache = new Map();

// Helper to pre-load enrolled templates into cache
async function preloadFingerprintCache() {
  const localSettings = getLocalSettings();
  if (!localSettings.serviceAccountKeyPath) return;

  try {
    const admin = require('firebase-admin');
    if (admin.apps.length === 0) return;

    const db = admin.firestore();
    const snapshot = await db.collection('users')
      .where('role', '==', 'staff')
      .where('active', '==', true)
      .get();

    enrolledTemplatesCache.clear();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.fingerprintTemplate) {
        enrolledTemplatesCache.set(doc.id, data.fingerprintTemplate);
      }
    });

    console.log(`[Firebase Cache] Successfully preloaded ${enrolledTemplatesCache.size} active staff fingerprint templates.`);
  } catch (err) {
    console.error('[Firebase Cache] Failed to preload fingerprint templates:', err.message);
  }
}

// System Tray Setup
function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  tray = new Tray(fs.existsSync(iconPath) ? iconPath : path.join(__dirname, 'index.html'));
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open App', click: () => { if (mainWindow) mainWindow.show(); } },
    { label: 'Quit', click: () => {
      app.isQuitting = true;
      app.quit();
    }}
  ]);
  
  tray.setToolTip('Brain Stormers Attendance');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
  });
}

// Background listening loop state
let isBackgroundListening = false;
let isSuspendedForEnrollment = false;

async function runBackgroundListeningLoop() {
  if (isBackgroundListening) return;
  
  isBackgroundListening = true;
  console.log('[Background Listener] Started background fingerprint listening loop...');

  while (isBackgroundListening && !isSuspendedForEnrollment) {
    try {
      // Ensure SDK is initialized
      await fingerprintSdk.initDevice();

      // Poll scanner (10 second timeout)
      const result = await fingerprintSdk.captureFingerprint(10000);
      
      if (!isBackgroundListening || isSuspendedForEnrollment) {
        break;
      }

      if (result && result.template) {
        console.log('[Background Listener] Captured fingerprint. Matching template...');
        await processBiometricScan(result.template);
      }
    } catch (err) {
      if (err.message && err.message.includes('timeout')) {
        // Expected timeout when no finger is scanned, sleep briefly and loop again
        await new Promise(resolve => setTimeout(resolve, 200));
        continue;
      }
      
      console.error('[Background Listener] Loop encountered error:', err.message);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  isBackgroundListening = false;
  console.log('[Background Listener] Background fingerprint listening loop stopped.');
}

// Process matching biometrics and register attendance in Firestore
async function processBiometricScan(capturedTemplate) {
  let matchedUid = null;
  let highestScore = 0;

  // Iterate over preloaded cache and run DB match
  for (const [uid, cachedTemplate] of enrolledTemplatesCache.entries()) {
    try {
      const score = await fingerprintSdk.matchTemplates(capturedTemplate, cachedTemplate);
      if (score > 30 && score > highestScore) {
        highestScore = score;
        matchedUid = uid;
      }
    } catch (e) {
      console.error(`[Background Listener] Matching failed for uid ${uid}:`, e.message);
    }
  }

  if (!matchedUid) {
    console.log('[Background Listener] Fingerprint not recognized.');
    if (mainWindow) {
      mainWindow.webContents.send('attendance:scanned', { success: false, error: 'Fingerprint not recognized' });
    }
    return;
  }

  console.log(`[Background Listener] Fingerprint matched user ${matchedUid} (score: ${highestScore}). Updating Firestore...`);

  try {
    const admin = require('firebase-admin');
    if (admin.apps.length === 0) {
      throw new Error('Firebase Admin SDK is not initialized.');
    }
    const db = admin.firestore();
    
    // Fetch staff profile details
    const userDoc = await db.collection('users').doc(matchedUid).get();
    if (!userDoc.exists) {
      throw new Error('Matched user document does not exist in database.');
    }
    const userData = userDoc.data();
    const name = userData.name || 'Staff Member';

    // Compute today's date string format: yyyy-mm-dd
    const todayObj = new Date();
    const yyyy = todayObj.getFullYear();
    const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
    const dd = String(todayObj.getDate()).padStart(2, '0');
    const dateString = `${yyyy}-${mm}-${dd}`;

    // Query today's non-deleted attendance
    const attendanceSnapshot = await db.collection('attendance')
      .where('userId', '==', matchedUid)
      .where('date', '==', dateString)
      .where('isDeleted', '==', false)
      .get();

    let existingRecord = null;
    let existingDocId = null;

    attendanceSnapshot.forEach(doc => {
      existingRecord = doc.data();
      existingDocId = doc.id;
    });

    const now = new Date();
    const batch = db.batch();

    if (!existingRecord) {
      // 1. Create check-in entry
      const settings = getLocalSettings();
      const cutoffStr = settings.lateCutoffTime || '09:30';
      const [cutoffHour, cutoffMinute] = cutoffStr.split(':').map(Number);
      
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      let status = 'Present';
      if (currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute > cutoffMinute)) {
        status = 'Late';
      }

      const attendanceRef = db.collection('attendance').doc();
      const attendanceId = attendanceRef.id;

      const newAttendance = {
        userId: matchedUid,
        role: userData.role || 'staff',
        date: dateString,
        checkIn: now,
        checkOut: null,
        status: status,
        markedBy: 'fingerprint',
        isDeleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        markedByUserId: 'fingerprint-scanner'
      };

      batch.set(attendanceRef, newAttendance);

      // Audit Log
      const auditLogRef = db.collection('auditLogs').doc();
      batch.set(auditLogRef, {
        action: 'create',
        targetCollection: 'attendance',
        targetDocId: attendanceId,
        performedBy: 'fingerprint-scanner',
        performedByName: 'Biometric Scanner Station',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        reason: 'Fingerprint check-in verified'
      });

      await batch.commit();
      console.log(`[Background Listener] Check-in registered for ${name} (Status: ${status})`);

      if (mainWindow) {
        mainWindow.webContents.send('attendance:scanned', { 
          success: true, 
          name, 
          status: `Checked In (${status})`, 
          time: now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) 
        });
      }
    } else if (!existingRecord.checkOut) {
      // 2. Perform check-out update
      const attendanceRef = db.collection('attendance').doc(existingDocId);
      const checkOutUpdate = {
        checkOut: now,
        status: existingRecord.status || 'Present',
        lastEditedBy: 'fingerprint-scanner',
        lastEditedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.update(attendanceRef, checkOutUpdate);

      // Audit Log
      const auditLogRef = db.collection('auditLogs').doc();
      batch.set(auditLogRef, {
        action: 'update',
        targetCollection: 'attendance',
        targetDocId: existingDocId,
        performedBy: 'fingerprint-scanner',
        performedByName: 'Biometric Scanner Station',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        reason: 'Fingerprint check-out verified',
        previousData: existingRecord,
        newData: { ...existingRecord, ...checkOutUpdate }
      });

      await batch.commit();
      console.log(`[Background Listener] Check-out recorded for ${name}`);

      if (mainWindow) {
        mainWindow.webContents.send('attendance:scanned', { 
          success: true, 
          name, 
          status: 'Checked Out', 
          time: now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) 
        });
      }
    } else {
      // 3. Already completed check-in & check-out today
      console.log(`[Background Listener] User ${name} already checked out today.`);
      if (mainWindow) {
        mainWindow.webContents.send('attendance:scanned', { 
          success: false, 
          error: `${name} has already checked out today.` 
        });
      }
    }
  } catch (err) {
    console.error('[Background Listener] Attendance logic failed:', err.message);
    if (mainWindow) {
      mainWindow.webContents.send('attendance:scanned', { success: false, error: `Database error: ${err.message}` });
    }
  }
}

ipcMain.on('auth:role-changed', (event, role) => {
  currentUserRole = role;
  console.log(`[Main Process] Received auth:role-changed event. Role: ${role}`);
});

ipcMain.handle('fingerprint:match-templates', async (event, temp1, temp2) => {
  try {
    const score = await fingerprintSdk.matchTemplates(temp1, temp2);
    console.log(`[Fingerprint IPC] Match templates score: ${score}`);
    return { success: true, score };
  } catch (err) {
    console.error('[Fingerprint IPC] Match failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fingerprint:merge-templates', async (event, temp1, temp2, temp3) => {
  try {
    const mergedTemplate = await fingerprintSdk.mergeTemplates(temp1, temp2, temp3);
    console.log('[Fingerprint IPC] Merge templates successful.');
    return { success: true, template: mergedTemplate };
  } catch (err) {
    console.error('[Fingerprint IPC] Merge failed:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.on('fingerprint:update-cache', (event, { uid, template }) => {
  enrolledTemplatesCache.set(uid, template);
  console.log(`[Main Process] Updated in-memory fingerprint cache for user: ${uid} (Total cache size: ${enrolledTemplatesCache.size})`);
});

ipcMain.on('fingerprint:remove-cache', (event, uid) => {
  enrolledTemplatesCache.delete(uid);
  console.log(`[Main Process] Removed user from fingerprint cache: ${uid} (Total cache size: ${enrolledTemplatesCache.size})`);
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  // Close fingerprint SDK device on exit
  fingerprintSdk.closeDevice().catch(err => {
    console.error('[Fingerprint SDK] Close failed on exit:', err);
  });
  
  // Shut down static server on exit
  if (staticServer) {
    staticServer.close();
  }

  if (process.platform !== 'darwin' && app.isQuitting) {
    app.quit();
  }
});


