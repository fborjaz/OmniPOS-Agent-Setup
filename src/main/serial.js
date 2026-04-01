'use strict';

const { SerialPort } = require('serialport');
const { CMD_OPEN_DRAWER, BAUD_RATE } = require('../shared/constants');
const logger = require('./logger');

// ── Mutex simple para evitar acceso concurrente al puerto ────────────────
let _busy = false;
const _queue = [];

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    _queue.push({ fn, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (_busy || _queue.length === 0) return;
  _busy = true;
  const { fn, resolve, reject } = _queue.shift();
  try {
    resolve(await fn());
  } catch (err) {
    reject(err);
  } finally {
    _busy = false;
    processQueue();
  }
}

// ── Listar puertos COM disponibles ───────────────────────────────────────
async function listPorts() {
  try {
    const ports = await SerialPort.list();
    return ports.map(p => p.path).filter(p => /^COM\d+$/i.test(p));
  } catch (err) {
    logger.warn('No se pudo listar puertos COM: ' + err.message);
    return [];
  }
}

// ── Abrir gaveta vía ESC/POS ─────────────────────────────────────────────
function openDrawer(comPort) {
  return enqueue(() => new Promise((resolve, reject) => {
    const port = new SerialPort({
      path:     comPort,
      baudRate: BAUD_RATE,
      autoOpen: false,
    });

    port.open((err) => {
      if (err) return reject(new Error(`No se pudo abrir ${comPort}: ${err.message}`));

      port.write(CMD_OPEN_DRAWER, (wErr) => {
        if (wErr) {
          port.close();
          return reject(new Error(`Error al escribir en ${comPort}: ${wErr.message}`));
        }

        // Esperar 200ms para que el pulso llegue, luego cerrar
        setTimeout(() => {
          port.close((cErr) => {
            if (cErr) logger.warn(`Error al cerrar ${comPort}: ${cErr.message}`);
            resolve();
          });
        }, 200);
      });
    });
  }));
}

// ── Enviar comando raw y leer respuesta (para DLE EOT) ───────────────────
function sendAndRead(comPort, cmdBuffer, timeoutMs = 500) {
  return enqueue(() => new Promise((resolve, reject) => {
    const port = new SerialPort({
      path:     comPort,
      baudRate: BAUD_RATE,
      autoOpen: false,
    });

    let timer;
    const chunks = [];

    port.open((err) => {
      if (err) return reject(new Error(`No se pudo abrir ${comPort}: ${err.message}`));

      port.on('data', (data) => {
        chunks.push(data);
        clearTimeout(timer);
        // Respuesta recibida — cerrar rápido
        port.close(() => resolve(Buffer.concat(chunks)));
      });

      port.write(cmdBuffer, (wErr) => {
        if (wErr) {
          port.close();
          return reject(new Error(`Error al escribir en ${comPort}: ${wErr.message}`));
        }

        // Timeout si no hay respuesta
        timer = setTimeout(() => {
          port.close(() => reject(new Error('Timeout: sin respuesta del dispositivo')));
        }, timeoutMs);
      });
    });
  }));
}

// ── Auto-detectar primer puerto COM disponible ───────────────────────────
async function detectComPort() {
  const ports = await listPorts();
  if (ports.length > 0) {
    logger.info(`Puertos COM disponibles: ${ports.join(', ')}`);
    return ports[0];
  }
  return null;
}

module.exports = { listPorts, openDrawer, sendAndRead, detectComPort };
