const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let mainWindow;
let staticServer;

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
      devTools: !app.isPackaged // devTools available in dev mode, disabled in production packages
    }
  });

  // Lock window title to prevent web overrides
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  // Register local keyboard shortcuts for Refresh (Ctrl+R) and Hard Refresh (Ctrl+Shift+R)
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
  });

  // 1. Check if the production build dist/index.html exists
  if (!fs.existsSync(INDEX_HTML_PATH)) {
    console.error("Build directory 'dist/' not found. Loading missing build error page.");
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
    return;
  }

  // 2. Load splash loading page first
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // 3. Start local HTTP server to host dist/ and bypass file:// protocol issues
  startLocalServer((port) => {
    // Transition after 1.5 seconds splash intro
    setTimeout(() => {
      mainWindow.loadURL(`http://127.0.0.1:${port}`).catch(err => {
        console.error('Failed to load local SPA server:', err);
        mainWindow.loadFile(path.join(__dirname, 'error.html'));
      });
    }, 1500);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  // Shut down static server on exit
  if (staticServer) {
    staticServer.close();
  }
  if (process.platform !== 'darwin') app.quit();
});


