const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, screen } = require('electron');
const path = require('path');

let mainWindow = null;
let ballWindow = null;
let tray = null;
let isDev = !app.isPackaged;

// Determine content path
function getLoadURL() {
  if (isDev) {
    return 'http://localhost:8080';
  }
  return `file://${path.join(__dirname, '../dist/index.html')}`;
}

function createBallWindow() {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;

  ballWindow = new BrowserWindow({
    width: 60,
    height: 60,
    x: screenW - 80,
    y: screenH / 2 - 30,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  ballWindow.loadFile(path.join(__dirname, 'ball.html'));
  ballWindow.setVisibleOnAllWorkspaces(true);

  // Drag support
  ballWindow.on('will-move', () => {
    ballWindow.webContents.executeJavaScript('document.body.style.cursor = "grabbing"');
  });

  ballWindow.webContents.on('did-finish-load', () => {
    // Click handler: open main window
    ballWindow.webContents.executeJavaScript(`
      document.querySelector('.ball').addEventListener('click', () => {
        require('electron').ipcRenderer?.send?.('open-main') || window.postMessage('open-main', '*');
      });
    `).catch(() => {});
  });

  // Use simple mouse event approach for click
  ballWindow.on('focus', () => {
    // When ball is clicked/focused, open main window
    if (!mainWindow || !mainWindow.isVisible()) {
      createMainWindow();
    } else {
      mainWindow.focus();
    }
  });

  return ballWindow;
}

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    frame: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(getLoadURL());

  mainWindow.on('minimize', () => {
    // Return to ball mode on minimize
    mainWindow.hide();
    if (ballWindow && !ballWindow.isDestroyed()) {
      ballWindow.show();
    }
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (ballWindow && !ballWindow.isDestroyed()) {
        ballWindow.show();
      }
    }
  });
}

function createTray() {
  // Create a simple tray icon (16x16 purple circle)
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAbElEQVQ4T2NkoBAwUqifYdAa8B8ZMIKMQDYEm2IMA7AZQLYB2FxAtAHYXEC0AdhcQLQB2FxAtAFgF4AcQagXiDYAmwtINgCbC0g2AJsLSDYAmwtINgCbC0g2AJsLSDYAmwtINgCbC0g2gBwAANpOFBHFG8TnAAAAAElFTkSuQmCC'
  );

  tray = new Tray(icon);
  tray.setToolTip('TokenSave');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open TokenSave',
      click: () => createMainWindow(),
    },
    { type: 'separator' },
    {
      label: 'Toggle Ball',
      click: () => {
        if (ballWindow && !ballWindow.isDestroyed()) {
          ballWindow.isVisible() ? ballWindow.hide() : ballWindow.show();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => createMainWindow());
}

app.whenReady().then(() => {
  createBallWindow();
  createTray();

  // Global shortcut: Cmd/Ctrl+Shift+T to toggle
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow && mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  createMainWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
