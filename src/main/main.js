'use strict';

const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path   = require('path');
const { APP_NAME, VERSION } = require('../shared/constants');

// ── Evitar múltiples instancias ──────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); return; }

// ── Módulos internos (se cargan después de que app esté lista) ───────────
let config, logger, serial, wsServer, drawerStatus, tray, updater;

// ── Ventana de configuración ─────────────────────────────────────────────
let settingsWindow = null;

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.show();
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width:  440,
    height: 520,
    resizable:    false,
    maximizable:  false,
    fullscreenable: false,
    skipTaskbar:  false,  // ✅ Mostrar en taskbar cuando esté abierta
    show:         false,
    icon:         path.join(__dirname, '..', '..', 'build', 'icon.ico'),
    title:        `${APP_NAME} v${VERSION}`,
    webPreferences: {
      preload:            path.join(__dirname, 'preload.js'),
      contextIsolation:   true,
      nodeIntegration:    false,
      sandbox:            false,
    },
  });

  settingsWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  settingsWindow.setMenuBarVisibility(false);

  // Ocultar en vez de destruir al cerrar
  settingsWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      settingsWindow.hide();
    }
  });

  settingsWindow.on('closed', () => { settingsWindow = null; });

  return settingsWindow;
}

// Exponer para que tray.js pueda abrir la ventana
function showSettings() {
  const win = createSettingsWindow();
  win.show();
  win.focus();
}

// ── IPC Handlers ─────────────────────────────────────────────────────────
function registerIpcHandlers() {
  ipcMain.handle('get-config', () => config.get());

  ipcMain.handle('get-com-ports', async () => serial.listPorts());

  ipcMain.handle('set-com-port', async (_e, port) => {
    config.set('port', port);
    drawerStatus.restart();
    return { success: true };
  });

  ipcMain.handle('test-drawer', async () => {
    const cfg = config.get();
    if (!cfg.port) return { success: false, error: 'No hay puerto COM configurado' };
    try {
      await serial.openDrawer(cfg.port);
      return { success: true, port: cfg.port };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('get-drawer-status', () => drawerStatus.getStatus());

  ipcMain.handle('check-for-updates', async () => {
    try {
      return await updater.checkForUpdates();
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('get-update-status', () => updater.getStatus());

  ipcMain.handle('get-version', () => VERSION);

  ipcMain.handle('set-auto-start', (_e, enabled) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    config.set('auto_start', enabled);
    return { success: true };
  });

  ipcMain.handle('get-auto-start', () => {
    return app.getLoginItemSettings().openAtLogin;
  });
}

// ── Arranque principal ───────────────────────────────────────────────────
app.on('ready', async () => {
  // Cargar módulos
  config       = require('./config');
  logger       = require('./logger');
  serial       = require('./serial');
  wsServer     = require('./websocket-server');
  drawerStatus = require('./drawer-status');
  tray         = require('./tray');
  updater      = require('./updater');

  logger.info('='.repeat(50));
  logger.info(`  ${APP_NAME} v${VERSION} — Electron`);
  logger.info('='.repeat(50));

  // Configuración
  config.load();

  // Auto-detectar puerto COM si no hay uno configurado
  const cfg = config.get();
  if (!cfg.port) {
    logger.info('Detectando puerto COM...');
    const ports = await serial.listPorts();
    if (ports.length > 0) {
      config.set('port', ports[0]);
      logger.info(`Puerto COM detectado: ${ports[0]}`);
    } else {
      logger.warn('No se detectó ningún puerto COM.');
    }
  } else {
    logger.info(`Puerto COM cargado: ${cfg.port}`);
  }

  // IPC
  registerIpcHandlers();

  // WebSocket server
  wsServer.start();

  // Drawer status polling
  drawerStatus.start();

  // System tray
  tray.create(showSettings);

  // Auto-start con Windows
  if (cfg.auto_start !== false) {
    app.setLoginItemSettings({ openAtLogin: true });
  }

  // Verificar actualizaciones 15s después del arranque
  setTimeout(() => {
    updater.checkForUpdates().catch(err => {
      logger.warn(`Error verificando actualizaciones: ${err.message}`);
    });
  }, 15000);
});

// No cerrar la app cuando se cierran todas las ventanas (es una tray app)
app.on('window-all-closed', (e) => { e.preventDefault(); });

// Segunda instancia: mostrar ventana de la primera
app.on('second-instance', () => { showSettings(); });

// Flag para permitir cerrar la ventana al hacer quit
app.on('before-quit', () => { app.isQuitting = true; });

// Exportar para uso interno
module.exports = { showSettings };
