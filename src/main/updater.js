"use strict";

const { autoUpdater } = require("electron-updater");
const { BrowserWindow } = require("electron");
const logger = require("./logger");

let _status = {
  updateAvailable: false,
  updateVersion: null,
  downloading: false,
  downloadPercent: 0,
  downloaded: false,
  error: null,
};

function getStatus() {
  return { ..._status };
}

function _notify() {
  // Notificar a todas las ventanas renderer
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send("update-status-changed", _status);
    }
  });

  // Reconstruir menú del tray
  try {
    const tray = require("./tray");
    tray.rebuildMenu();
  } catch (_) {}
}

// ── Configurar electron-updater ──────────────────────────────────────────
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Configurar update server explícitamente para evitar errores HTTP 404
autoUpdater.setFeedURL({
  provider: "github",
  owner: "fborjaz",
  repo: "OmniPOS-Agent-Setup",
  releaseType: "release",
});

autoUpdater.on("checking-for-update", () => {
  logger.info("Verificando actualizaciones...");
});

autoUpdater.on("update-available", (info) => {
  logger.info(`Actualizacion disponible: v${info.version}`);
  _status.updateAvailable = true;
  _status.updateVersion = info.version;
  _notify();
});

autoUpdater.on("update-not-available", () => {
  logger.info("La aplicacion esta al dia.");
  _status.updateAvailable = false;
  _status.error = null;
  _notify();
});

autoUpdater.on("download-progress", (progress) => {
  _status.downloading = true;
  _status.downloadPercent = Math.round(progress.percent);
  _notify();
});

autoUpdater.on("update-downloaded", (info) => {
  logger.info(
    `Actualizacion v${info.version} descargada. Se instalara al cerrar.`,
  );
  _status.downloading = false;
  _status.downloaded = true;
  _notify();
});

autoUpdater.on("error", (err) => {
  logger.error(`Error de actualizacion: ${err.message}`);
  _status.error = err.message;
  _status.downloading = false;
  _notify();
});

// ── API publica ──────────────────────────────────────────────────────────
async function checkForUpdates() {
  try {
    const result = await autoUpdater.checkForUpdates();
    return getStatus();
  } catch (err) {
    _status.error = err.message;
    return getStatus();
  }
}

function installUpdate() {
  autoUpdater.quitAndInstall(false, true);
}

module.exports = { checkForUpdates, getStatus, installUpdate };
