const koffi = require('koffi');
const path = require('path');
const fs = require('fs');

// Path to the 64-bit DLL (System32 contains 64-bit DLLs on 64-bit Windows)
const dllPath = 'C:\\Windows\\System32\\libzkfp.dll';

let lib = null;
let hDevice = null;
let deviceWidth = 0;
let deviceHeight = 0;
let deviceDpi = 0;
let isCapturing = false;

// Koffi types
const HANDLE = koffi.pointer('void');

// C Functions mapping definitions
let ZKFPM_Init = null;
let ZKFPM_Terminate = null;
let ZKFPM_GetDeviceCount = null;
let ZKFPM_OpenDevice = null;
let ZKFPM_CloseDevice = null;
let ZKFPM_GetCaptureParamsEx = null;
let ZKFPM_AcquireFingerprint = null;

function loadDll() {
  if (lib) return;
  
  if (!fs.existsSync(dllPath)) {
    throw new Error(`ZKFinger SDK DLL not found at: ${dllPath}. Please ensure the ZKFinger driver is installed.`);
  }

  try {
    lib = koffi.load(dllPath);
    
    // Bind C Functions
    ZKFPM_Init = lib.func('__stdcall', 'ZKFPM_Init', 'int', []);
    ZKFPM_Terminate = lib.func('__stdcall', 'ZKFPM_Terminate', 'int', []);
    ZKFPM_GetDeviceCount = lib.func('__stdcall', 'ZKFPM_GetDeviceCount', 'int', []);
    ZKFPM_OpenDevice = lib.func('__stdcall', 'ZKFPM_OpenDevice', HANDLE, ['int']);
    ZKFPM_CloseDevice = lib.func('__stdcall', 'ZKFPM_CloseDevice', 'int', [HANDLE]);
    
    ZKFPM_GetCaptureParamsEx = lib.func('__stdcall', 'ZKFPM_GetCaptureParamsEx', 'int', [
      HANDLE,
      koffi.out(koffi.pointer('int')),
      koffi.out(koffi.pointer('int')),
      koffi.out(koffi.pointer('int'))
    ]);
    
    ZKFPM_AcquireFingerprint = lib.func('__stdcall', 'ZKFPM_AcquireFingerprint', 'int', [
      HANDLE,
      koffi.out(koffi.pointer('unsigned char')),
      'unsigned int',
      koffi.out(koffi.pointer('unsigned char')),
      koffi.inout(koffi.pointer('unsigned int'))
    ]);
    
    console.log('[ZKFinger SDK] Native DLL loaded successfully.');
  } catch (err) {
    lib = null;
    throw new Error(`Failed to load ZKFinger DLL: ${err.message}`);
  }
}

/**
 * Initialize the fingerprint reader device.
 */
async function initDevice() {
  loadDll();

  if (hDevice) {
    console.log('[ZKFinger SDK] Device already open.');
    return { width: deviceWidth, height: deviceHeight, dpi: deviceDpi };
  }

  // Initialize library
  const initRet = ZKFPM_Init();
  if (initRet !== 0 && initRet !== 1) { // 0: OK, 1: Already Initialized
    throw new Error(`Failed to initialize ZKFinger library (code: ${initRet})`);
  }

  // Check device count
  const devCount = ZKFPM_GetDeviceCount();
  console.log(`[ZKFinger SDK] Detected connected devices: ${devCount}`);
  if (devCount <= 0) {
    ZKFPM_Terminate();
    throw new Error('No fingerprint scanning devices detected.');
  }

  // Open first device (index 0)
  hDevice = ZKFPM_OpenDevice(0);
  if (!hDevice || koffi.address(hDevice) === 0) {
    hDevice = null;
    ZKFPM_Terminate();
    throw new Error('Failed to open the fingerprint scanner device.');
  }

  // Query device parameters
  let widthArr = [0];
  let heightArr = [0];
  let dpiArr = [0];
  const paramRet = ZKFPM_GetCaptureParamsEx(hDevice, widthArr, heightArr, dpiArr);
  
  if (paramRet !== 0) {
    closeDevice();
    throw new Error(`Failed to retrieve device parameters (code: ${paramRet})`);
  }

  deviceWidth = widthArr[0];
  deviceHeight = heightArr[0];
  deviceDpi = dpiArr[0];

  console.log(`[ZKFinger SDK] Device opened successfully. Dimensions: ${deviceWidth}x${deviceHeight} @ ${deviceDpi} DPI`);
  return { width: deviceWidth, height: deviceHeight, dpi: deviceDpi };
}

/**
 * Capture a fingerprint template.
 * Polling based capture loop running in an async block to prevent blocking the main thread.
 */
async function captureFingerprint(timeoutMs = 20000) {
  if (!hDevice) {
    throw new Error('Fingerprint scanner device is not initialized. Call initDevice() first.');
  }

  if (isCapturing) {
    throw new Error('A fingerprint capture operation is already in progress.');
  }

  isCapturing = true;

  try {
    const startTime = Date.now();
    const maxTemplateSize = 2048;
    
    const imgBuf = Buffer.alloc(deviceWidth * deviceHeight);
    const templateBuf = Buffer.alloc(maxTemplateSize);

    console.log('[ZKFinger SDK] Waiting for finger on the sensor...');

    while (isCapturing) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Fingerprint capture timeout. No finger detected.');
      }

      // cbTemplate must be reset to maximum template size before each attempt
      let cbTemplate = [maxTemplateSize];
      
      const ret = ZKFPM_AcquireFingerprint(hDevice, imgBuf, imgBuf.length, templateBuf, cbTemplate);

      if (ret === 0) { // ZKFP_ERR_OK
        const actualLength = cbTemplate[0];
        console.log(`[ZKFinger SDK] Fingerprint captured successfully! Size: ${actualLength} bytes.`);
        
        // Return a slice of the buffer containing the actual template
        const templateSlice = templateBuf.slice(0, actualLength);
        isCapturing = false;
        return {
          template: templateSlice.toString('base64'),
          length: actualLength
        };
      } else if (ret === -12 || ret === -8 || ret === -9) { // ZKFP_ERR_BUSY, ZKFP_ERR_CAPTURE, ZKFP_ERR_EXTRACT_FP
        // These are transient states (busy/no finger/bad placement). Wait 150ms and try again.
        await new Promise(resolve => setTimeout(resolve, 150));
      } else {
        throw new Error(`Critical error during fingerprint capture (code: ${ret})`);
      }
    }
  } finally {
    isCapturing = false;
  }
}

/**
 * Close and release the fingerprint scanner.
 */
async function closeDevice() {
  if (isCapturing) {
    isCapturing = false;
    // Allow small delay for polling loop to exit
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  if (hDevice) {
    ZKFPM_CloseDevice(hDevice);
    hDevice = null;
    console.log('[ZKFinger SDK] Fingerprint device connection closed.');
  }

  if (lib) {
    ZKFPM_Terminate();
    lib = null;
    console.log('[ZKFinger SDK] Library terminated.');
  }

  return { success: true };
}

module.exports = {
  initDevice,
  captureFingerprint,
  closeDevice
};
