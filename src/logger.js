'use strict';

const fs   = require('fs');
const path = require('path');

const DATA_DIR    = path.join(process.env.ProgramData || 'C:\\ProgramData', 'GoByTel');
const LOG_FILE    = path.join(DATA_DIR, 'agent.log');
const MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB — rota al superarlo

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function rotateLogs() {
  try {
    if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_LOG_SIZE) {
      const backup = LOG_FILE + '.1';
      if (fs.existsSync(backup)) fs.unlinkSync(backup);
      fs.renameSync(LOG_FILE, backup);
    }
  } catch (_) {}
}

function write(level, message) {
  const ts   = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const line = `[${ts}] [${level}] ${message}`;

  console.log(line);

  try {
    ensureDir();
    rotateLogs();
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch (_) {}
}

module.exports = {
  info:  (msg) => write('INFO ', msg),
  warn:  (msg) => write('WARN ', msg),
  error: (msg) => write('ERROR', msg),
};
