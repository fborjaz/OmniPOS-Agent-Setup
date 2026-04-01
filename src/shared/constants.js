'use strict';

const path = require('path');

const APP_NAME    = 'GoByTel Agent';
const VERSION     = '1.0.0';
const WS_PORT     = 9100;
const BAUD_RATE   = 9600;
const DATA_DIR    = path.join(process.env.ProgramData || 'C:\\ProgramData', 'GoByTel');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const LOG_FILE    = path.join(DATA_DIR, 'agent.log');

// ESC/POS: abrir gaveta  — ESC p 0 25 250
const CMD_OPEN_DRAWER = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);

// DLE EOT: consultar estado gaveta
const CMD_DRAWER_STATUS = Buffer.from([0x10, 0x04, 0x01]);

// GitHub repo para auto-update
const GH_OWNER = 'fborjaz';
const GH_REPO  = 'OmniPOS-Agent-Setup';

module.exports = {
  APP_NAME, VERSION, WS_PORT, BAUD_RATE,
  DATA_DIR, CONFIG_FILE, LOG_FILE,
  CMD_OPEN_DRAWER, CMD_DRAWER_STATUS,
  GH_OWNER, GH_REPO,
};
