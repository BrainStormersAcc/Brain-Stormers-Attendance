const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getFirebaseConfig: () => ipcRenderer.invoke('get-firebase-config'),
  getLocalSettings: () => ipcRenderer.invoke('get-local-settings'),
  saveLocalSettings: (settings) => ipcRenderer.invoke('save-local-settings', settings),
  closeSettingsWindow: () => ipcRenderer.send('close-settings-window'),
  
  // IPC bridging for authenticated Firestore requests via the main window session
  requestDevices: () => ipcRenderer.invoke('request-devices'),
  onGetActiveDevices: (callback) => ipcRenderer.on('get-active-devices', (event) => callback()),
  respondActiveDevices: (devices) => ipcRenderer.send('respond-active-devices', devices),
  respondActiveDevicesError: (error) => ipcRenderer.send('respond-active-devices-error', error),
  
  onDeviceActivated: (callback) => ipcRenderer.on('device-activated', (event, deviceId) => callback(deviceId)),
  
  // Fingerprint Scan and Simulation triggers
  onFingerprintScanned: (callback) => ipcRenderer.on('fingerprint-scanned', (event, staffData) => callback(staffData)),
  onGetTestStaff: (callback) => ipcRenderer.on('get-test-staff', (event) => callback()),
  sendTestStaff: (staffData) => ipcRenderer.send('respond-test-staff', staffData),
  sendTestStaffError: (error) => ipcRenderer.send('respond-test-staff-error', error)
});
