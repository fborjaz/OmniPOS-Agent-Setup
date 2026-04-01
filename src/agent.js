'use strict';

/**
 * GoByTel Agent v1.0.0
 * Servicio de hardware local para el sistema POS GoByTel
 *
 * Funciones en esta versión:
 *   - Abrir gaveta de caja registradora vía WebSocket (puerto 9100)
 *   - Auto-detección del puerto COM de la impresora
 *   - Auto-actualización desde GitHub Releases
 *
 * Autor: Frank Borja — https://github.com/fborjaz
 */

const WebSocket          = require('ws');
const { execSync, exec } = require('child_process');
const fs                 = require('fs');
const path               = require('path');
const logger             = require('./logger');
const updater            = require('./updater');

// ── Versión embebida (se actualiza con cada release) ──────────────────────
const VERSION = '1.0.3';

// ── Rutas de datos del agente ─────────────────────────────────────────────
const DATA_DIR   = path.join(process.env.ProgramData || 'C:\\ProgramData', 'GoByTel');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Garantizar que el directorio de datos existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Configuración (persiste en config.json) ───────────────────────────────
let config = {
  port:    null,   // Puerto COM de la impresora (ej: "COM3")
  ws_port: 9100,   // Puerto WebSocket
};

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      config = { ...config, ...saved };
    }
  } catch (e) {
    logger.warn('No se pudo leer config.json, usando configuración por defecto.');
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    logger.error('No se pudo guardar config.json: ' + e.message);
  }
}

// ── Detección automática de puerto COM ────────────────────────────────────
function detectComPort() {
  try {
    const result = execSync(
      'powershell -NoProfile -Command "[System.IO.Ports.SerialPort]::GetPortNames() -join \',\'"',
      { timeout: 5000, windowsHide: true }
    ).toString().trim();

    if (!result) return null;

    const ports = result.split(',').map(p => p.trim()).filter(Boolean);
    if (ports.length === 0) return null;

    logger.info(`Puertos COM disponibles: ${ports.join(', ')}`);
    return ports[0]; // Usar el primero detectado
  } catch (e) {
    logger.warn('No se pudo detectar puertos COM: ' + e.message);
    return null;
  }
}

// ── Pulso de apertura de gaveta vía puerto COM ────────────────────────────
// Comando ESC/POS estándar: ESC p 0 25 250 (funciona en 99% de cajas)
function openDrawer(comPort) {
  return new Promise((resolve, reject) => {
    // PowerShell maneja el puerto serial nativamente — sin dependencias nativas
    const ps = `
      try {
        $port = New-Object System.IO.Ports.SerialPort '${comPort}', 9600
        $port.ReadTimeout  = 500
        $port.WriteTimeout = 500
        $port.Open()
        $bytes = [byte[]](0x1B, 0x70, 0x00, 0x19, 0xFA)
        $port.Write($bytes, 0, $bytes.Length)
        Start-Sleep -Milliseconds 200
        $port.Close()
        Write-Output 'OK'
      } catch {
        Write-Error $_.Exception.Message
        exit 1
      }
    `.trim();

    // -EncodedCommand (base64 UTF-16 LE) evita todo problema de escaping y newlines
    const encoded = Buffer.from(ps, 'utf16le').toString('base64');
    exec(
      `powershell -NoProfile -WindowStyle Hidden -EncodedCommand ${encoded}`,
      { timeout: 6000, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          reject(new Error((stderr || err.message).trim()));
        } else {
          resolve();
        }
      }
    );
  });
}

// ── Servidor WebSocket ────────────────────────────────────────────────────
function startWebSocketServer() {
  const wsPort = config.ws_port || 9100;
  const wss    = new WebSocket.Server({ port: wsPort, host: '127.0.0.1' });

  wss.on('listening', () => {
    logger.info(`WebSocket activo en ws://127.0.0.1:${wsPort}`);
    logger.info('El agente está listo para recibir comandos del POS.');
  });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    logger.info(`Nueva conexión desde ${ip}`);

    ws.on('message', async (raw) => {
      const msg = raw.toString();

      // Soporte para el pulso ESC/POS directo (compatibilidad con el ejemplo original)
      const isRawPulse = msg.includes('\x1B\x70');

      let action = 'open_drawer';
      try {
        const payload = JSON.parse(msg);
        action = payload.action || 'open_drawer';
      } catch (_) {
        // Si no es JSON, tratar como open_drawer o raw pulse
        action = isRawPulse ? 'open_drawer' : msg.trim();
      }

      logger.info(`Acción recibida: "${action}"`);

      // ── ping: health check ────────────────────────────────────────────
      if (action === 'ping') {
        ws.send(JSON.stringify({
          success: true,
          version: VERSION,
          port:    config.port || 'no detectado',
        }));
        return;
      }

      // ── open_drawer: abrir gaveta ─────────────────────────────────────
      if (action === 'open_drawer') {
        // Re-detectar puerto si no hay uno configurado
        if (!config.port) {
          logger.info('Sin puerto configurado, detectando automáticamente...');
          config.port = detectComPort();
          if (config.port) {
            logger.info(`Puerto detectado y guardado: ${config.port}`);
            saveConfig();
          }
        }

        if (!config.port) {
          const msg = 'No se encontró ningún puerto COM. Verifique que la impresora esté conectada.';
          logger.error(msg);
          ws.send(JSON.stringify({ success: false, error: msg }));
          return;
        }

        try {
          await openDrawer(config.port);
          logger.info(`Gaveta abierta exitosamente en ${config.port}`);
          ws.send(JSON.stringify({ success: true, port: config.port, version: VERSION }));
        } catch (err) {
          logger.error(`Error al abrir gaveta en ${config.port}: ${err.message}`);
          // Intentar re-detectar el puerto (podría haber cambiado)
          const oldPort  = config.port;
          config.port    = detectComPort();
          if (config.port && config.port !== oldPort) {
            logger.info(`Puerto cambiado de ${oldPort} a ${config.port}. Reintentando...`);
            saveConfig();
            try {
              await openDrawer(config.port);
              logger.info(`Gaveta abierta exitosamente en ${config.port} (reintento)`);
              ws.send(JSON.stringify({ success: true, port: config.port, version: VERSION }));
              return;
            } catch (err2) {
              logger.error(`Reintento fallido: ${err2.message}`);
            }
          }
          ws.send(JSON.stringify({ success: false, error: err.message, version: VERSION }));
        }
        return;
      }

      // ── Acción desconocida ────────────────────────────────────────────
      ws.send(JSON.stringify({ success: false, error: `Acción desconocida: "${action}"` }));
    });

    ws.on('close', () => logger.info(`Conexión cerrada desde ${ip}`));
    ws.on('error', (err) => logger.error(`Error en conexión de ${ip}: ${err.message}`));
  });

  wss.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`El puerto ${wsPort} ya está en uso. ¿Hay otra instancia del agente corriendo?`);
    } else {
      logger.error(`Error en servidor WebSocket: ${err.message}`);
    }
    process.exit(1);
  });
}

// ── Arranque principal ────────────────────────────────────────────────────
async function start() {
  logger.info('='.repeat(60));
  logger.info(`  GoByTel Agent v${VERSION}`);
  logger.info(`  Autor: Frank Borja — https://github.com/fborjaz`);
  logger.info('='.repeat(60));

  loadConfig();

  // Detección de puerto COM al arrancar
  if (!config.port) {
    logger.info('Detectando puerto COM de la impresora...');
    config.port = detectComPort();
    if (config.port) {
      logger.info(`Puerto COM detectado: ${config.port}. Guardado en config.json`);
      saveConfig();
    } else {
      logger.warn(`No se detectó ningún puerto COM.`);
      logger.warn(`Puede configurarlo manualmente en: ${CONFIG_FILE}`);
      logger.warn(`Ejemplo: { "port": "COM3", "ws_port": 9100 }`);
    }
  } else {
    logger.info(`Puerto COM cargado desde configuración: ${config.port}`);
  }

  // Iniciar servidor WebSocket
  startWebSocketServer();

  // Verificar actualizaciones 15 segundos después del arranque
  // (no bloquea el inicio del servicio)
  setTimeout(() => {
    updater.checkForUpdates(VERSION).catch(err => {
      logger.warn(`Error verificando actualizaciones: ${err.message}`);
    });
  }, 15000);
}

start();
