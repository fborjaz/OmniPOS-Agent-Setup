'use strict';

const fs   = require('fs');
const path = require('path');
const { DATA_DIR, CONFIG_FILE, WS_PORT } = require('../shared/constants');

const DEFAULTS = {
  port:           null,    // Puerto COM (ej: "COM3")
  ws_port:        WS_PORT, // Puerto WebSocket
  auto_start:     true,    // Iniciar con Windows
  drawer_polling: true,    // Polling DLE EOT
};

let _config = { ...DEFAULTS };

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function load() {
  ensureDir();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      _config = { ...DEFAULTS, ...saved };
    }
  } catch (_) {
    // Si no se puede leer, usar defaults
  }
  return _config;
}

function save() {
  ensureDir();
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(_config, null, 2));
  } catch (_) {
    // Silenciar errores de escritura
  }
}

function get() {
  return { ..._config };
}

function set(key, value) {
  _config[key] = value;
  save();
}

module.exports = { load, save, get, set };
