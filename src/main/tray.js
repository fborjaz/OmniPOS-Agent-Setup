'use strict';

const { Tray, Menu, nativeImage, app } = require('electron');
const path   = require('path');
const config = require('./config');
const drawerStatus = require('./drawer-status');
const { APP_NAME, VERSION } = require('../shared/constants');

let _tray        = null;
let _showSettings = null; // callback del main.js

function create(showSettingsFn) {
  _showSettings = showSettingsFn;

  const iconPath = path.join(__dirname, '..', '..', 'build', 'icon.ico');
  _tray = new Tray(iconPath);
  _tray.setToolTip(`${APP_NAME} v${VERSION}`);

  // Click izquierdo: abrir configuración
  _tray.on('click', () => _showSettings());

  // Construir menú inicial
  rebuildMenu();

  // Reconstruir menú cuando cambie el estado de la gaveta
  drawerStatus.onStatusChange(() => rebuildMenu());
}

function rebuildMenu() {
  const cfg    = config.get();
  const status = drawerStatus.getStatus();

  const statusLabel = {
    open:    'Abierta',
    closed:  'Cerrada',
    unknown: 'Desconocido',
  }[status] || 'Desconocido';

  const updater = require('./updater');
  const updateInfo = updater.getStatus();
  let updateLabel = 'Al dia';
  if (updateInfo.updateAvailable) updateLabel = `v${updateInfo.updateVersion} disponible`;
  if (updateInfo.downloading)     updateLabel = `Descargando ${updateInfo.downloadPercent}%`;
  if (updateInfo.downloaded)      updateLabel = 'Reiniciar para actualizar';

  const menu = Menu.buildFromTemplate([
    { label: `${APP_NAME} v${VERSION}`, enabled: false },
    { type: 'separator' },
    { label: `Puerto: ${cfg.port || 'no detectado'}`, enabled: false },
    { label: `Gaveta: ${statusLabel}`, enabled: false },
    { type: 'separator' },
    { label: 'Abrir Configuracion', click: () => _showSettings() },
    {
      label: updateInfo.downloaded ? 'Reiniciar y Actualizar' : 'Buscar Actualizaciones',
      click: () => {
        if (updateInfo.downloaded) {
          updater.installUpdate();
        } else {
          updater.checkForUpdates().then(() => rebuildMenu());
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Iniciar con Windows',
      type: 'checkbox',
      checked: cfg.auto_start !== false,
      click: (menuItem) => {
        app.setLoginItemSettings({ openAtLogin: menuItem.checked });
        config.set('auto_start', menuItem.checked);
      },
    },
    { type: 'separator' },
    { label: 'Salir', click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  _tray.setContextMenu(menu);
}

module.exports = { create, rebuildMenu };
