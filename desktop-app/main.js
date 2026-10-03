const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const TARGET_URL = 'https://aimskaduna.github.io/Abubakr-international-modern-school-/';
const stateFile = path.join(app.getPath('userData'), 'window-state.json');

let mainWindow;

function loadWindowState() {
  try {
    const raw = fs.readFileSync(stateFile, 'utf-8');
    const state = JSON.parse(raw);
    if (state && typeof state.width === 'number' && typeof state.height === 'number') {
      return state;
    }
  } catch (e) { /* no saved state yet, or it's corrupt - use defaults */ }
  return { width: 1280, height: 800 };
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    const bounds = mainWindow.getBounds();
    fs.writeFileSync(stateFile, JSON.stringify(bounds));
  } catch (e) { /* non-fatal - just won't remember size next time */ }
}

function offlineHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    html,body{height:100%;margin:0}
    body{background:#0D0F14;color:#F5F0E8;font-family:-apple-system,Segoe UI,sans-serif;
      display:flex;flex-direction:column;align-items:center;justify-content:center}
    h1{font-size:22px;margin:0 0 8px}
    p{opacity:.75;margin:0 0 24px}
    button{background:#C8922A;color:#fff;border:none;padding:12px 32px;border-radius:6px;
      font-size:14px;font-weight:600;cursor:pointer}
    button:hover{opacity:.9}
  </style></head><body>
    <h1>No Internet Connection</h1>
    <p>Please check your connection and try again.</p>
    <button onclick="location.href='${TARGET_URL}'">Retry</button>
  </body></html>`;
}

function createWindow() {
  const state = loadWindowState();

  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0D0F14',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL(TARGET_URL);

  // Catch real load failures (no internet, DNS down, etc.) on the top-level page only.
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    if (errorCode === -3) return; // ERR_ABORTED - usually just a cancelled/replaced navigation, not a real failure
    mainWindow.loadURL('data:text/html,' + encodeURIComponent(offlineHtml()));
  });

  // Links that try to open a new window (target="_blank", window.open) go to the
  // system's default browser instead of spawning another Electron window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  ['resize', 'move', 'close'].forEach(evt => mainWindow.on(evt, saveWindowState));
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }]
    }] : []),
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.loadURL(TARGET_URL) },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'resetZoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Cmd+Alt+I' : 'Ctrl+Shift+I',
          click: () => mainWindow.webContents.toggleDevTools()
        }
      ]
    },
    { role: 'windowMenu' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createWindow();
  buildMenu();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
