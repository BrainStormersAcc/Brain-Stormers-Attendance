# Brain Stormers Desktop Wrapper

This is a standalone Electron desktop application wrapper for the **Brain Stormers Attendance** progressive web app.

## Project Structure
- `main.js`: Electron main process entry point.
- `index.html`: Desktop wrapper splash screen placeholder.
- `assets/`: Asset folder for desktop icon files.
- `.gitignore`: Scope-limited git ignore file.

## Prerequisites

Before running or building the desktop application, you **must compile the main React PWA application** to create the built resources.

1. Navigate to the project root directory (if not already there):
   ```bash
   cd ..
   ```
2. Build the production resources:
   ```bash
   npm run build
   ```
   This will create a `dist/` directory at the project root which the Electron wrapper loads directly.

## Setup & Running Locally

1. **Open your terminal and navigate to the desktop subfolder**:
   ```bash
   cd Brain-Stormers-Desktop
   ```
2. **Install dependencies** (skip if already done):
   ```bash
   npm install
   ```
3. **Launch the desktop application**:
   ```bash
   npm start
   ```

## ⚙️ Biometric Scanner Settings (Local PC Setup)

Instead of manually copy-pasting raw ZKFinger SDK license keys on every individual physical computer, the desktop application features a centralized synchronization workflow:

1. **Central Registry:** The administrator registers the PC scanner device and its license key centrally in the PWA under **Device Management > Device List**.
2. **Local Client Sync:** 
   - Launch the desktop application on the target machine.
   - Press **`Ctrl + Shift + S`** (or `Ctrl + ,` on standard focus) to open the Neumorphic **Biometric Settings** panel.
   - Click **Fetch Devices** to connect to Firestore and load all active device profiles.
   - Select the designated device name representing this physical PC (e.g. `"Reception PC Scanner"`) from the dropdown.
   - Click **Save**.
3. **Local Cache & Auto-Init:** 
   - The desktop app retrieves the ZKFinger license key, updates the device's `lastFetchedAt` connection timestamp in Firestore, and caches the activation key locally in the application's secure user profile path.
   - The main process automatically initializes the biometric scanner engine using the cached key on startup, avoiding manual key entries on subsequent launches.
   - Click **Fetch Devices** and **Save** again to re-sync if the key is updated centrally.

## Production Packaging & Installer Creation

This wrapper uses `electron-builder` to package assets and construct production installers.

### Full Build Process
1. **Compile the PWA** (once, at project root):
   ```bash
   npm run build
   ```
2. **Navigate to the desktop wrapper folder** and install dependencies if needed:
   ```bash
   cd Brain-Stormers-Desktop
   npm install
   ```
3. **Create the Windows installer**:
   ```bash
   npm run build
   ```
   The command runs `electron-builder` with the configuration defined in `package.json`. The resulting installer (`*.exe`) will be placed in the `release/` folder inside `Brain-Stormers-Desktop`.

### Installer Details
- **App ID:** `com.brainstormers.desktop`
- **Product Name:** `Brain Stormers Attendance`
- **Target:** NSIS Windows installer (`*.exe`)
- The installer bundles the compiled PWA output from `../dist/` so the installed app works offline and loads the exact same UI as the web version.

### Optional Signing
If you have a code-signing certificate, you can sign the installer by adding the appropriate `win` signing options to the `build` configuration in `package.json`.

---
## Running the Installed App
After installing, launch the app from the Start menu or a desktop shortcut. The window title will read **"Brain Stormers Attendance"**, and the app will display the same login screen, dashboards, and admin panel as the web version.

---
## Troubleshooting
- Ensure the `dist/` folder exists at the project root before building the installer.
- If the app cannot find the UI assets after installation, verify that the `release/` folder contains the bundled `dist/` resources.

---

## 🔌 Biometric Scanner Native Integration (Phase 5)

To interface with the physical fingerprint scanner on Windows, this wrapper utilizes native integration:

1. **Native FFI Library (`koffi`):**
   We use the lightweight, fast Node.js Foreign Function Interface package **`koffi`** to dynamically bind the native ZKFinger C API functions directly from JavaScript inside the Electron main process.

2. **Required Files & Folder Structure:**
   - **`/sdk`** folder inside the desktop project root contains:
     - `/sdk/x64/libzkfp.lib`: The 64-bit static import library.
     - `/sdk/x86/libzkfp.lib`: The 32-bit static import library.
     - `/sdk/include/*.h`: The C-interface header files defining ZKFinger structs, parameters, error codes, and function signatures.
   - **`libzkfp.dll`**: The runtime dynamic link library. Rather than bundling it, the desktop app references it directly from `C:\Windows\System32\libzkfp.dll` (which is installed globally on the PC by running the official driver `setup.exe`).

3. **FFI Javascript Wrapper:**
   - Housed at [`src/main/fingerprintSdk.js`](file:///c:/Users/niaz/Desktop/Brain-Stormers/Projects/Brain-Stormers-Attendance/Brain-Stormers-Desktop/src/main/fingerprintSdk.js).
   - Dynamically loads `libzkfp.dll` and exposes three async functions via Electron IPC:
     - `initDevice()`: Initialises the SDK library, verifies a connected scanner, opens device index 0, and queries sensor dimensions (Width, Height, DPI).
     - `captureFingerprint(timeoutMs)`: Spawns an asynchronous polling loop that checks for a finger touch on the sensor. On a successful touch, it captures the template and returns its base64-encoded representation and byte size.
     - `closeDevice()`: Safely terminates any active scanning loops, closes the device handle, and cleans up the library allocation.

4. **Testing UI:**
   A floating Neumorphic **Fingerprint Tester** panel is injected via [`preload.js`](file:///c:/Users/niaz/Desktop/Brain-Stormers/Projects/Brain-Stormers-Attendance/Brain-Stormers-Desktop/preload.js) at the bottom-right corner of the window. This allows developers to test hardware initialization, device detection, and end-to-end template acquisition without modifying the central React PWA code.

## ⏰ Automatic Attendance Capture & Tray Background Listening (Phase 8)

The desktop application supports continuous, background biometrics capture for automatic staff check-in/check-out.

### 1. Background Listening Mode
*   **Startup Listening:** Upon successful application load, the main process automatically begins a continuous polling loop to detect finger scans on the connected device.
*   **System Tray Integration:** Intercepts close button (`X`) clicks to hide the window to the Windows System Tray instead of quitting. This keeps the background listening active in the background. Right-click the system tray icon and select **Quit** to fully close the application.
*   **Loop Suspension:** The background loop is automatically suspended during enrollment procedures or diagnostics to prevent hardware conflicts, resuming as soon as those tasks complete.

### 2. Attendance Validation Logic
When a finger scan is captured, the main process performs the following matching sequence:
1.  **Similarity Match:** Compares the captured template against the in-memory cache of enrolled staff templates. If no match is found (match score <= 30), it alerts the frontend layout.
2.  **Date Resolution:** Resolves today's date in `YYYY-MM-DD` format.
3.  **Check-In Registration:** If no non-deleted attendance record exists for the staff member today:
    *   Creates a new attendance document in Firestore with `checkIn: now`, `checkOut: null`, `markedBy: "fingerprint"`, `markedByUserId: "fingerprint-scanner"`, and `isDeleted: false`.
    *   Sets `status` to `"Late"` or `"Present"` based on the configurable **Late Cutoff Time** saved in settings (default `09:30 AM`).
    *   Registers a `create` action in the `auditLogs` collection.
4.  **Check-Out Registration:** If an attendance record exists for today with no `checkOut` value:
    *   Updates the document in Firestore with `checkOut: now`.
    *   Registers an `update` action in the `auditLogs` collection.
5.  **Double-Scan Check:** If the staff member has already checked in and out today, the scan is blocked, showing an alert.

### 3. Settings Configuration
*   **Late Cutoff Time:** A configurable input field is added to the Biometric Settings panel (`Ctrl + Shift + S`) allowing administrators to modify the check-in grace period (e.g., `09:00`, `09:30`). This setting is persisted inside `device-settings.json`.

---
*Feel free to customize the NSIS installer (shortcuts, license, etc.) by extending the `build.win` configuration in `package.json`.*
