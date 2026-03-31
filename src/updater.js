'use strict';

/**
 * updater.js — Auto-actualización desde GitHub Releases
 *
 * Flujo:
 *   1. Consulta la API de GitHub para obtener la última release
 *   2. Compara semver con la versión actual embebida en el agente
 *   3. Si hay versión mayor: descarga el instalador silenciosamente
 *   4. Ejecuta el instalador con /VERYSILENT → detiene servicio, actualiza, reinicia
 */

const https  = require('https');
const fs     = require('fs');
const path   = require('path');
const { exec } = require('child_process');
const logger   = require('./logger');

const GITHUB_OWNER = 'fborjaz';
const GITHUB_REPO  = 'OmniPOS-Agent-Setup';
const DATA_DIR     = path.join(process.env.ProgramData || 'C:\\ProgramData', 'GoByTel');
const UPDATES_DIR  = path.join(DATA_DIR, 'updates');

// ── Utilidad HTTP/HTTPS con soporte de redireccionamiento ──────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': `GoByTel-Agent`,
        'Accept':     'application/vnd.github+json',
      },
      timeout: 8000,
    }, (res) => {
      // Seguir redireccionamiento (301/302)
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(httpsGet(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error',   reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout consultando GitHub')); });
  });
}

// ── Descarga de archivo con soporte de redireccionamiento ──────────────────
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(UPDATES_DIR)) {
      fs.mkdirSync(UPDATES_DIR, { recursive: true });
    }

    const file = fs.createWriteStream(dest);

    function download(downloadUrl) {
      https.get(downloadUrl, { headers: { 'User-Agent': 'GoByTel-Agent' }, timeout: 120000 }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return download(res.headers.location);
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error',  (err) => { try { fs.unlinkSync(dest); } catch (_) {} reject(err); });
      }).on('error', (err) => { try { fs.unlinkSync(dest); } catch (_) {} reject(err); });
    }

    download(url);
  });
}

// ── Comparación semver: retorna true si a > b ──────────────────────────────
function semverGt(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

// ── Función principal ──────────────────────────────────────────────────────
async function checkForUpdates(currentVersion) {
  logger.info(`Verificando actualizaciones... (instalada: v${currentVersion})`);

  let release;
  try {
    const url      = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
    const response = await httpsGet(url);

    if (response.statusCode === 404) {
      logger.info('Aún no hay releases publicadas en GitHub.');
      return;
    }
    if (response.statusCode !== 200) {
      logger.warn(`GitHub API respondió con código ${response.statusCode}. Omitiendo.`);
      return;
    }

    release = JSON.parse(response.body);
  } catch (err) {
    logger.warn(`No se pudo contactar GitHub: ${err.message}. Continuando sin actualizar.`);
    return;
  }

  const latestVersion = release.tag_name || '';

  if (!latestVersion) {
    logger.warn('No se pudo leer la versión de la última release.');
    return;
  }

  if (!semverGt(latestVersion, currentVersion)) {
    logger.info(`El agente está actualizado (última release: ${latestVersion}).`);
    return;
  }

  logger.info(`Nueva versión disponible: ${latestVersion}. Iniciando descarga...`);

  // Buscar el asset del instalador (.exe que contiene "Setup")
  const asset = (release.assets || []).find(
    a => a.name.toLowerCase().endsWith('.exe') && a.name.toLowerCase().includes('setup')
  );

  if (!asset) {
    logger.warn('No se encontró el instalador en la release de GitHub. Omitiendo actualización.');
    return;
  }

  const installerPath = path.join(UPDATES_DIR, asset.name);

  try {
    await downloadFile(asset.browser_download_url, installerPath);
    logger.info(`Descarga completa: ${installerPath}`);
  } catch (err) {
    logger.error(`Error durante la descarga: ${err.message}`);
    return;
  }

  logger.info(`Instalando ${latestVersion} en segundo plano...`);

  // Ejecutar instalador en modo silencioso
  // /VERYSILENT  → sin ventanas
  // /NORESTART   → no forzar reinicio de Windows
  // /SUPPRESSMSGBOXES → sin popups
  // El propio instalador detiene el servicio → copia archivos → reinicia el servicio
  exec(
    `"${installerPath}" /VERYSILENT /NORESTART /SUPPRESSMSGBOXES`,
    { timeout: 120000 },
    (err) => {
      if (err) {
        logger.error(`Error al ejecutar el instalador: ${err.message}`);
      } else {
        logger.info(`Actualización a ${latestVersion} completada. El servicio se reiniciará automáticamente.`);
        try { fs.unlinkSync(installerPath); } catch (_) {}
      }
    }
  );
}

module.exports = { checkForUpdates };
