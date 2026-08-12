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
*Feel free to customize the NSIS installer (shortcuts, license, etc.) by extending the `build.win` configuration in `package.json`.*
