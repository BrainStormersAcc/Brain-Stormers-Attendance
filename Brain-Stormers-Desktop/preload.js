const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
  getFirebaseConfig: () => ipcRenderer.invoke('get-firebase-config'),
  getLocalSettings: () => ipcRenderer.invoke('get-local-settings'),
  saveLocalSettings: (settings) => ipcRenderer.invoke('save-local-settings', settings),
  closeSettingsWindow: () => ipcRenderer.send('close-settings-window'),
  selectServiceAccountKey: () => ipcRenderer.invoke('settings:select-service-account'),
  checkFirebaseStatus: () => ipcRenderer.invoke('firebase:check-status'),
  onFirebaseStatusChanged: (callback) => ipcRenderer.on('firebase:status-changed', (event, status) => callback(status)),
  notifyRole: (role) => {
    console.log('[Preload] notifyRole invoked with role:', role);
    ipcRenderer.send('auth:role-changed', role);
    handleRoleChange(role);
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
  sendTestStaffError: (error) => ipcRenderer.send('respond-test-staff-error', error)
});

contextBridge.exposeInMainWorld('fingerprintAPI', {
  initDevice: () => ipcRenderer.invoke('fingerprint:init'),
  captureFingerprint: (timeoutMs) => ipcRenderer.invoke('fingerprint:capture', timeoutMs),
  closeDevice: () => ipcRenderer.invoke('fingerprint:close')
});

let currentRole = null;
let domLoaded = false;

function handleRoleChange(role) {
  console.log('[Preload] handleRoleChange invoked with role:', role, 'domLoaded:', domLoaded);
  currentRole = role;
  
  if (!domLoaded) {
    console.log('[Preload] DOM not loaded yet. Caching role and waiting.');
    return;
  }

  // Exclude settings and error subpages from widget injection
  if (window.location.href.includes('settings.html') || window.location.href.includes('error.html')) {
    console.log('[Preload] Skipping widget on helper page:', window.location.href);
    return;
  }

  const existingWidget = document.getElementById('fp-test-widget');
  console.log('[Preload] Existing widget in DOM:', !!existingWidget);

  if (role === 'admin') {
    if (!existingWidget) {
      console.log('[Preload] Widget not found. Calling createWidget()...');
      createWidget();
    } else {
      console.log('[Preload] Widget found. Setting display = block');
      existingWidget.style.display = 'block';
    }
  } else {
    if (existingWidget) {
      console.log('[Preload] Role is not admin. Setting display = none');
      existingWidget.style.display = 'none';
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  console.log('[Preload] DOMContentLoaded event triggered. cached role:', currentRole);
  domLoaded = true;
  if (currentRole) {
    handleRoleChange(currentRole);
  }
});

function createWidget() {
  if (document.getElementById('fp-test-widget')) return;

  const style = document.createElement('style');
  style.id = 'fp-test-widget-style';
  style.innerHTML = `
    #fp-test-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      background: #1c1f26;
      border: 1px solid rgba(255, 255, 255, 0.03);
      box-shadow: -8px -8px 16px #252932, 8px 8px 16px #13151a;
      border-radius: 20px;
      padding: 16px;
      width: 260px;
      font-family: system-ui, -apple-system, sans-serif;
      color: #e2e8f0;
      transition: all 0.3s ease;
    }
    #fp-test-widget h3 {
      margin: 0 0 10px 0;
      font-size: 0.9rem;
      font-weight: 600;
      color: #8a9ab8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #fp-test-widget .status {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-bottom: 12px;
      background: #13151a;
      box-shadow: inset -2px -2px 4px #252932, inset 2px 2px 4px #13151a;
      padding: 8px 12px;
      border-radius: 10px;
      min-height: 40px;
      display: flex;
      align-items: center;
      word-break: break-all;
    }
    #fp-test-widget button {
      width: 100%;
      padding: 10px;
      background: #1c1f26;
      border: 1px solid rgba(255, 255, 255, 0.03);
      color: #e2e8f0;
      font-weight: 600;
      font-size: 0.85rem;
      border-radius: 10px;
      box-shadow: -4px -4px 8px #252932, 4px 4px 8px #13151a;
      cursor: pointer;
      outline: none;
      transition: all 0.1s ease;
    }
    #fp-test-widget button:active {
      box-shadow: inset -2px -2px 4px #252932, inset 2px 2px 4px #13151a;
    }
    #fp-test-widget button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }
    #fp-test-widget .close-btn {
      cursor: pointer;
      font-size: 0.8rem;
      color: #64748b;
      padding: 0 4px;
    }
  `;
  document.head.appendChild(style);

  const widget = document.createElement('div');
  widget.id = 'fp-test-widget';
  widget.innerHTML = `
    <h3>
      <span>🔍 Fingerprint Tester</span>
      <span class="close-btn" id="fp-minimize">➖</span>
    </h3>
    <div class="status" id="fp-status">Ready (DLL verified)</div>
    <button id="fp-test-btn" style="margin-bottom: 12px;">Test Capture</button>
    <div id="db-section" style="border-top: 1px solid rgba(255, 255, 255, 0.05); padding-top: 12px; margin-top: 12px;">
      <h3 style="margin-bottom: 8px; font-size: 0.8rem; color: #8a9ab8; font-weight: 600;">🔥 Firestore Status</h3>
      <div class="status" id="db-status" style="min-height: auto; font-size: 0.75rem;">Connecting...</div>
    </div>
  `;
  document.body.appendChild(widget);

  const statusEl = document.getElementById('fp-status');
  const btnEl = document.getElementById('fp-test-btn');
  const minimizeEl = document.getElementById('fp-minimize');
  const dbSection = document.getElementById('db-section');
  const dbStatusEl = document.getElementById('db-status');
  let minimized = false;

  minimizeEl.addEventListener('click', () => {
    if (!minimized) {
      statusEl.style.display = 'none';
      btnEl.style.display = 'none';
      dbSection.style.display = 'none';
      widget.style.width = '160px';
      minimizeEl.textContent = '➕';
      minimized = true;
    } else {
      statusEl.style.display = 'flex';
      btnEl.style.display = 'block';
      dbSection.style.display = 'block';
      widget.style.width = '260px';
      minimizeEl.textContent = '➖';
      minimized = false;
    }
  });

  btnEl.addEventListener('click', async () => {
    btnEl.disabled = true;
    statusEl.style.color = '#94a3b8';
    
    try {
      statusEl.textContent = 'Initializing reader...';
      const initRes = await ipcRenderer.invoke('fingerprint:init');
      if (!initRes.success) {
        throw new Error(initRes.error || 'Initialization failed');
      }

      statusEl.textContent = 'Sensor active! Place finger...';
      statusEl.style.color = '#3b82f6';

      const capRes = await ipcRenderer.invoke('fingerprint:capture', 20000);
      if (!capRes.success) {
        throw new Error(capRes.error || 'Capture failed');
      }

      statusEl.textContent = `Captured! size: ${capRes.length} bytes`;
      statusEl.style.color = '#10b981';
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
      statusEl.style.color = '#ef4444';
    } finally {
      await ipcRenderer.invoke('fingerprint:close');
      btnEl.disabled = false;
    }
  });

  // Database status handlers
  const updateDbStatus = (status) => {
    if (status.success) {
      dbStatusEl.textContent = `Connected — ${status.staffCount} active staff found`;
      dbStatusEl.style.color = '#10b981';
    } else {
      dbStatusEl.textContent = `Disconnected: ${status.error || 'Not Configured'}`;
      dbStatusEl.style.color = '#ef4444';
    }
  };

  ipcRenderer.on('firebase:status-changed', (event, status) => {
    updateDbStatus(status);
  });

  // Query initial status
  ipcRenderer.invoke('firebase:check-status')
    .then(updateDbStatus)
    .catch(err => {
      updateDbStatus({ success: false, error: err.message });
    });
}
