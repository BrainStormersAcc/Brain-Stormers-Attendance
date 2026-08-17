const koffi = require('koffi');
const path = require('path');
const fs = require('fs');

// Path to the 64-bit DLL (System32 contains 64-bit DLLs on 64-bit Windows)
const dllPath = 'C:\\Windows\\System32\\libzkfp.dll';

let lib = null;
let hDevice = null;
let hDBCache = null;
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

let ZKFPM_DBInit = null;
let ZKFPM_DBFree = null;
let ZKFPM_DBMatch = null;
let ZKFPM_DBMerge = null;

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

    ZKFPM_DBInit = lib.func('__stdcall', 'ZKFPM_DBInit', HANDLE, []);
    ZKFPM_DBFree = lib.func('__stdcall', 'ZKFPM_DBFree', 'int', [HANDLE]);
    
    ZKFPM_DBMatch = lib.func('__stdcall', 'ZKFPM_DBMatch', 'int', [
      HANDLE,
      koffi.pointer('unsigned char'),
      'unsigned int',
      koffi.pointer('unsigned char'),
      'unsigned int'
    ]);
    
    ZKFPM_DBMerge = lib.func('__stdcall', 'ZKFPM_DBMerge', 'int', [
      HANDLE,
      koffi.pointer('unsigned char'),
      koffi.pointer('unsigned char'),
      koffi.pointer('unsigned char'),
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
 * Query the number of connected fingerprint devices safely without throwing errors.
 */
function getConnectedDeviceCount() {
  try {
    loadDll();
    const initRet = ZKFPM_Init();
    if (initRet !== 0 && initRet !== 1) { // 0: OK, 1: Already Initialized
      return 0;
    }
    const count = ZKFPM_GetDeviceCount();
    return count;
  } catch (err) {
    console.error('[ZKFinger SDK] Failed to query device count:', err.message);
    return 0;
  }
}

/**
 * Initialize the fingerprint reader device.
 */
async function initDevice() {
  try {
    loadDll();

    if (hDevice) {
      console.log('[ZKFinger SDK] Device already open.');
      return { success: true, width: deviceWidth, height: deviceHeight, dpi: deviceDpi };
    }

    // Initialize library
    const initRet = ZKFPM_Init();
    if (initRet !== 0 && initRet !== 1) { // 0: OK, 1: Already Initialized
      return { success: false, error: `Failed to initialize ZKFinger library (code: ${initRet})` };
    }

    // Check device count
    const devCount = ZKFPM_GetDeviceCount();
    console.log(`[ZKFinger SDK] Detected connected devices: ${devCount}`);
    if (devCount <= 0) {
      return { success: false, noDevice: true, error: 'No fingerprint scanning devices detected.' };
    }

    // Open first device (index 0)
    hDevice = ZKFPM_OpenDevice(0);
    if (!hDevice || koffi.address(hDevice) === 0) {
      hDevice = null;
      return { success: false, error: 'Failed to open the fingerprint scanner device.' };
    }

    // Initialize DB cache
    hDBCache = ZKFPM_DBInit();
    if (!hDBCache || koffi.address(hDBCache) === 0) {
      console.error('[ZKFinger SDK] Failed to initialize DB cache.');
    } else {
      console.log('[ZKFinger SDK] DB cache initialized successfully.');
    }

    // Query device parameters
    let widthArr = [0];
    let heightArr = [0];
    let dpiArr = [0];
    const paramRet = ZKFPM_GetCaptureParamsEx(hDevice, widthArr, heightArr, dpiArr);
    
    if (paramRet !== 0) {
      await closeDevice();
      return { success: false, error: `Failed to retrieve device parameters (code: ${paramRet})` };
    }

    deviceWidth = widthArr[0];
    deviceHeight = heightArr[0];
    deviceDpi = dpiArr[0];

    console.log(`[ZKFinger SDK] Device opened successfully. Dimensions: ${deviceWidth}x${deviceHeight} @ ${deviceDpi} DPI`);
    return { success: true, width: deviceWidth, height: deviceHeight, dpi: deviceDpi };
  } catch (err) {
    console.error('[ZKFinger SDK] initDevice failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Capture a fingerprint template.
 * Polling based capture loop running in an async block to prevent blocking the main thread.
 */
async function captureFingerprint(timeoutMs = 20000) {
  try {
    if (!hDevice) {
      return { success: false, error: 'Fingerprint scanner device is not initialized. Call initDevice() first.' };
    }

    if (isCapturing) {
      return { success: false, error: 'A fingerprint capture operation is already in progress.' };
    }

    isCapturing = true;

    const startTime = Date.now();
    const maxTemplateSize = 2048;
    
    const imgBuf = Buffer.alloc(deviceWidth * deviceHeight);
    const templateBuf = Buffer.alloc(maxTemplateSize);

    console.log('[ZKFinger SDK] Waiting for finger on the sensor...');

    while (isCapturing) {
      if (Date.now() - startTime > timeoutMs) {
        isCapturing = false;
        return { success: false, error: 'Fingerprint capture timeout. No finger detected.' };
      }

      // Check device count before each acquire call to handle runtime unplugging safely
      const count = ZKFPM_GetDeviceCount();
      if (count <= 0) {
        console.warn('[ZKFinger SDK] Device unplugged during capture.');
        isCapturing = false;
        await closeDevice();
        return { success: false, noDevice: true, error: 'No fingerprint scanner detected.' };
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
          success: true,
          template: templateSlice.toString('base64'),
          length: actualLength
        };
      } else if (ret === -12 || ret === -8 || ret === -9) { // ZKFP_ERR_BUSY, ZKFP_ERR_CAPTURE, ZKFP_ERR_EXTRACT_FP
        // These are transient states (busy/no finger/bad placement). Wait 150ms and try again.
        await new Promise(resolve => setTimeout(resolve, 150));
      } else {
        isCapturing = false;
        return { success: false, error: `Critical error during fingerprint capture (code: ${ret})` };
      }
    }
  } catch (err) {
    console.error('[ZKFinger SDK] captureFingerprint failed:', err.message);
    isCapturing = false;
    return { success: false, error: err.message };
  } finally {
    isCapturing = false;
  }
}

/**
 * Close and release the fingerprint scanner.
 */
async function closeDevice() {
  try {
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

    if (hDBCache) {
      ZKFPM_DBFree(hDBCache);
      hDBCache = null;
      console.log('[ZKFinger SDK] DB cache freed.');
    }

    if (lib) {
      ZKFPM_Terminate();
      lib = null;
      console.log('[ZKFinger SDK] Library terminated.');
    }
  } catch (err) {
    console.error('[ZKFinger SDK] closeDevice failed:', err.message);
  }

  return { success: true };
}

/**
 * Merge three pre-registered templates into one registered template.
 */
async function mergeTemplates(temp1Base64, temp2Base64, temp3Base64) {
  try {
    if (!hDBCache) {
      throw new Error('Database cache is not initialized.');
    }

    const temp1 = Buffer.from(temp1Base64, 'base64');
    const temp2 = Buffer.from(temp2Base64, 'base64');
    const temp3 = Buffer.from(temp3Base64, 'base64');
    
    const regTemp = Buffer.alloc(2048);
    let cbRegTemp = [2048];

    const ret = ZKFPM_DBMerge(hDBCache, temp1, temp2, temp3, regTemp, cbRegTemp);
    if (ret !== 0) {
      throw new Error(`Failed to merge templates (code: ${ret})`);
    }

    const actualLength = cbRegTemp[0];
    const mergedSlice = regTemp.slice(0, actualLength);
    return mergedSlice.toString('base64');
  } catch (err) {
    console.error('[ZKFinger SDK] mergeTemplates failed:', err.message);
    throw err;
  }
}

/**
 * Match two fingerprint templates. Returns the match score (> 0 matches).
 */
async function matchTemplates(temp1Base64, temp2Base64) {
  try {
    if (!hDBCache) {
      throw new Error('Database cache is not initialized.');
    }

    const temp1 = Buffer.from(temp1Base64, 'base64');
    const temp2 = Buffer.from(temp2Base64, 'base64');

    const score = ZKFPM_DBMatch(hDBCache, temp1, temp1.length, temp2, temp2.length);
    return score;
  } catch (err) {
    console.error('[ZKFinger SDK] matchTemplates failed:', err.message);
    throw err;
  }
}

module.exports = {
  initDevice,
  captureFingerprint,
  closeDevice,
  mergeTemplates,
  matchTemplates,
  getConnectedDeviceCount
};
