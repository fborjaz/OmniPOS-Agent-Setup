'use strict';

const WebSocket = require('ws');
const config    = require('./config');
const serial    = require('./serial');
const logger    = require('./logger');
const { VERSION } = require('../shared/constants');

let wss = null;

function start() {
  const cfg    = config.get();
  const wsPort = cfg.ws_port || 9100;

  wss = new WebSocket.Server({ port: wsPort, host: '127.0.0.1' });

  wss.on('listening', () => {
    logger.info(`WebSocket activo en ws://127.0.0.1:${wsPort}`);
  });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    logger.info(`Nueva conexion desde ${ip}`);

    ws.on('message', async (raw) => {
      const msg = raw.toString();

      // Soporte para pulso ESC/POS directo (compatibilidad con POS)
      const isRawPulse = msg.includes('\x1B\x70');

      let action = 'open_drawer';
      try {
        const payload = JSON.parse(msg);
        action = payload.action || 'open_drawer';
      } catch (_) {
        action = isRawPulse ? 'open_drawer' : msg.trim();
      }

      logger.info(`Accion recibida: "${action}"`);

      // ── ping ──────────────────────────────────────────────────────────
      if (action === 'ping') {
        const cfg = config.get();
        ws.send(JSON.stringify({
          success: true,
          version: VERSION,
          port:    cfg.port || 'no detectado',
        }));
        return;
      }

      // ── open_drawer ───────────────────────────────────────────────────
      if (action === 'open_drawer') {
        let cfg = config.get();

        // Re-detectar puerto si no hay uno configurado
        if (!cfg.port) {
          logger.info('Sin puerto configurado, detectando...');
          const detected = await serial.detectComPort();
          if (detected) {
            config.set('port', detected);
            cfg = config.get();
            logger.info(`Puerto detectado: ${detected}`);
          }
        }

        if (!cfg.port) {
          const errMsg = 'No se encontro ningun puerto COM. Verifique que la impresora este conectada.';
          logger.error(errMsg);
          ws.send(JSON.stringify({ success: false, error: errMsg }));
          return;
        }

        try {
          await serial.openDrawer(cfg.port);
          logger.info(`Gaveta abierta en ${cfg.port}`);
          ws.send(JSON.stringify({ success: true, port: cfg.port, version: VERSION }));
        } catch (err) {
          logger.error(`Error al abrir gaveta en ${cfg.port}: ${err.message}`);

          // Intentar re-detectar
          const oldPort  = cfg.port;
          const newPort  = await serial.detectComPort();
          if (newPort && newPort !== oldPort) {
            logger.info(`Puerto cambio de ${oldPort} a ${newPort}. Reintentando...`);
            config.set('port', newPort);
            try {
              await serial.openDrawer(newPort);
              logger.info(`Gaveta abierta en ${newPort} (reintento)`);
              ws.send(JSON.stringify({ success: true, port: newPort, version: VERSION }));
              return;
            } catch (err2) {
              logger.error(`Reintento fallido: ${err2.message}`);
            }
          }

          ws.send(JSON.stringify({ success: false, error: err.message, version: VERSION }));
        }
        return;
      }

      // ── drawer_status (nueva accion) ──────────────────────────────────
      if (action === 'drawer_status') {
        const drawerStatus = require('./drawer-status');
        ws.send(JSON.stringify({
          success: true,
          drawer:  drawerStatus.getStatus(),
          version: VERSION,
        }));
        return;
      }

      // ── Accion desconocida ────────────────────────────────────────────
      ws.send(JSON.stringify({ success: false, error: `Accion desconocida: "${action}"` }));
    });

    ws.on('close', () => logger.info(`Conexion cerrada desde ${ip}`));
    ws.on('error', (err) => logger.error(`Error en conexion de ${ip}: ${err.message}`));
  });

  wss.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`El puerto ${wsPort} ya esta en uso.`);
    } else {
      logger.error(`Error en WebSocket: ${err.message}`);
    }
  });
}

module.exports = { start };
