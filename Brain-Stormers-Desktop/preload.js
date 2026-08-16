const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getFirebaseConfig: () => ipcRenderer.invoke('get-firebase-config'),
  getLocalSettings: () => ipcRenderer.invoke('get-local-settings'),
  saveLocalSettings: (settings) => ipcRenderer.invoke('save-local-settings', settings),
  closeSettingsWindow: () => ipcRenderer.send('close-settings-window'),
  selectServiceAccountKey: () => ipcRenderer.invoke('settings:select-service-account'),
  checkFirebaseStatus: () => ipcRenderer.invoke('firebase:check-status'),
  onFirebaseStatusChanged: (callback) => ipcRenderer.on('firebase:status-changed', (event, status) => callback(status)),
  onAttendanceScanned: (callback) => ipcRenderer.on('attendance:scanned', (event, result) => callback(result)),
  notifyRole: (role) => {
    console.log('[Preload] notifyRole invoked with role:', role);
    ipcRenderer.send('auth:role-changed', role);
  },
  
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
  sendTestStaffError: (error) => ipcRenderer.send('respond-test-staff-error', error),
  
  // App initialization retry
  retryInitialization: () => ipcRenderer.send('app:retry-init'),
  onRetryResponse: (callback) => {
    const listener = (event, status) => callback(status);
    ipcRenderer.on('app:retry-init-response', listener);
    return () => ipcRenderer.removeListener('app:retry-init-response', listener);
  }
});

contextBridge.exposeInMainWorld('fingerprintAPI', {
  initDevice: () => ipcRenderer.invoke('fingerprint:init'),
  captureFingerprint: (timeoutMs) => ipcRenderer.invoke('fingerprint:capture', timeoutMs),
  closeDevice: () => ipcRenderer.invoke('fingerprint:close'),
  matchTemplates: (temp1, temp2) => ipcRenderer.invoke('fingerprint:match-templates', temp1, temp2),
  mergeTemplates: (temp1, temp2, temp3) => ipcRenderer.invoke('fingerprint:merge-templates', temp1, temp2, temp3),
  updateFingerprintCache: (uid, template) => ipcRenderer.send('fingerprint:update-cache', { uid, template }),
  removeFingerprintCache: (uid) => ipcRenderer.send('fingerprint:remove-cache', uid)
});

contextBridge.exposeInMainWorld('autoUpdateAPI', {
  onUpdateDownloaded: (callback) => {
    const listener = (event, info) => callback(info);
    ipcRenderer.on('update:downloaded', listener);
    return () => ipcRenderer.removeListener('update:downloaded', listener);
  },
  restartAndInstall: () => ipcRenderer.send('update:restart-now')
});
