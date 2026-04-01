'use strict';

const { BrowserWindow } = require('electron');
const serial = require('./serial');
const config = require('./config');
const logger = require('./logger');
const { CMD_DRAWER_STATUS } = require('../shared/constants');

let _status        = 'unknown'; // 'open' | 'closed' | 'unknown'
let _supportsQuery = true;      // Se desactiva si la impresora no responde
let _timer         = null;
let _listeners     = [];

function getStatus() {
  return _status;
}

function onStatusChange(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

function _notify(newStatus) {
  if (newStatus === _status) return;
  _status = newStatus;
  _listeners.forEach(fn => fn(_status));

  // Notificar a todas las ventanas renderer abiertas
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('drawer-status-changed', _status);
    }
  });
}

async function _poll() {
  const cfg = config.get();
  if (!cfg.port || !cfg.drawer_polling || !_supportsQuery) return;

  try {
    const response = await serial.sendAndRead(cfg.port, CMD_DRAWER_STATUS, 500);
    // DLE EOT respuesta: bit 0 del primer byte indica gaveta
    // bit 0 = 0: gaveta cerrada, bit 0 = 1: gaveta abierta
    if (response && response.length > 0) {
      const drawerBit = response[0] & 0x01;
      _notify(drawerBit === 0 ? 'closed' : 'open');
    }
  } catch (_) {
    // Si falla, marcar como no soportado y parar polling
    if (_supportsQuery) {
      _supportsQuery = false;
      logger.info('Impresora no soporta DLE EOT — estado gaveta desconocido.');
      _notify('unknown');
    }
  }
}

function start() {
  // Polling cada 5 segundos
  _timer = setInterval(_poll, 5000);
  // Primera consulta inmediata
  _poll();
}

function stop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

function restart() {
  stop();
  _supportsQuery = true;
  _status = 'unknown';
  start();
}

module.exports = { getStatus, onStatusChange, start, stop, restart };
