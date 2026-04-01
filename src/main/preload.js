'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gobytel', {
  // Config
  getConfig:      ()         => ipcRenderer.invoke('get-config'),
  getComPorts:    ()         => ipcRenderer.invoke('get-com-ports'),
  setComPort:     (port)     => ipcRenderer.invoke('set-com-port', port),

  // Gaveta
  testDrawer:     ()         => ipcRenderer.invoke('test-drawer'),
  getDrawerStatus:()         => ipcRenderer.invoke('get-drawer-status'),

  // Updates
  checkForUpdates:()         => ipcRenderer.invoke('check-for-updates'),
  getUpdateStatus:()         => ipcRenderer.invoke('get-update-status'),
  getVersion:     ()         => ipcRenderer.invoke('get-version'),

  // Auto-start
  setAutoStart:   (enabled)  => ipcRenderer.invoke('set-auto-start', enabled),
  getAutoStart:   ()         => ipcRenderer.invoke('get-auto-start'),

  // Suscripciones a eventos del main process
  onDrawerStatusChange: (cb) => {
    ipcRenderer.on('drawer-status-changed', (_e, status) => cb(status));
  },
  onUpdateStatusChange: (cb) => {
    ipcRenderer.on('update-status-changed', (_e, info) => cb(info));
  },
});
