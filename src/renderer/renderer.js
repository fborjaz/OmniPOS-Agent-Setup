'use strict';

const $ = (sel) => document.querySelector(sel);

// ── Elementos ────────────────────────────────────────────────────────────
const elComPort       = $('#com-port');
const elRefreshPorts  = $('#btn-refresh-ports');
const elDrawerDot     = $('#drawer-dot');
const elDrawerStatus  = $('#drawer-status');
const elTestDrawer    = $('#btn-test-drawer');
const elTestResult    = $('#test-result');
const elCurrentVer    = $('#current-version');
const elUpdateStatus  = $('#update-status');
const elCheckUpdate   = $('#btn-check-update');
const elAutoStart     = $('#auto-start');

// ── Labels de estado ─────────────────────────────────────────────────────
const STATUS_LABELS = {
  open:           'Abierta',
  closed:         'Cerrada',
  unknown:        'Desconectada',
  not_configured: 'Sin Configurar',
};

// ── Cargar puertos COM ───────────────────────────────────────────────────
async function loadPorts() {
  const ports  = await window.gobytel.getComPorts();
  const config = await window.gobytel.getConfig();

  elComPort.innerHTML = '';

  if (ports.length === 0) {
    elComPort.innerHTML = '<option value="">Sin puertos</option>';
    return;
  }

  ports.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    if (p === config.port) opt.selected = true;
    elComPort.appendChild(opt);
  });

  // Si no hay puerto configurado, seleccionar el primero
  if (!config.port && ports.length > 0) {
    window.gobytel.setComPort(ports[0]);
  }
}

// ── Actualizar indicador de gaveta ───────────────────────────────────────
function updateDrawerUI(status) {
  elDrawerDot.className = 'status-dot ' + status;
  elDrawerStatus.textContent = STATUS_LABELS[status] || 'Desconocido';
}

// ── Actualizar estado de updates ─────────────────────────────────────────
function updateUpdateUI(info) {
  if (!info || info.error) {
    elUpdateStatus.textContent = info?.error || 'Error al verificar';
    return;
  }
  if (info.downloaded) {
    elUpdateStatus.textContent = `v${info.updateVersion} lista — reiniciar para instalar`;
    elCheckUpdate.textContent  = 'Reiniciar y Actualizar';
  } else if (info.downloading) {
    elUpdateStatus.textContent = `Descargando v${info.updateVersion}... ${info.downloadPercent}%`;
    elCheckUpdate.disabled     = true;
  } else if (info.updateAvailable) {
    elUpdateStatus.textContent = `v${info.updateVersion} disponible`;
  } else {
    elUpdateStatus.textContent = 'Al dia';
  }
}

// ── Event listeners ──────────────────────────────────────────────────────

// Cambiar puerto COM
elComPort.addEventListener('change', () => {
  window.gobytel.setComPort(elComPort.value);
  elTestResult.textContent = '';
  elTestResult.className   = 'test-result';
});

// Refrescar puertos
elRefreshPorts.addEventListener('click', () => loadPorts());

// Probar gaveta
elTestDrawer.addEventListener('click', async () => {
  elTestDrawer.disabled      = true;
  elTestResult.textContent   = 'Enviando pulso...';
  elTestResult.className     = 'test-result';

  const result = await window.gobytel.testDrawer();

  if (result.success) {
    elTestResult.textContent = `Gaveta abierta en ${result.port}`;
    elTestResult.className   = 'test-result success';
  } else {
    elTestResult.textContent = result.error;
    elTestResult.className   = 'test-result error';
  }

  elTestDrawer.disabled = false;
});

// Buscar actualizaciones
elCheckUpdate.addEventListener('click', async () => {
  elCheckUpdate.disabled     = true;
  elUpdateStatus.textContent = 'Verificando...';

  const info = await window.gobytel.checkForUpdates();
  updateUpdateUI(info);

  elCheckUpdate.disabled = false;
});

// Iniciar con Windows
elAutoStart.addEventListener('change', () => {
  window.gobytel.setAutoStart(elAutoStart.checked);
});

// ── Suscripciones a eventos del main process ─────────────────────────────
window.gobytel.onDrawerStatusChange((status) => updateDrawerUI(status));
window.gobytel.onUpdateStatusChange((info)   => updateUpdateUI(info));

// ── Inicialización ───────────────────────────────────────────────────────
(async function init() {
  // Version
  const version = await window.gobytel.getVersion();
  elCurrentVer.textContent = `v${version}`;
  $('#version').textContent = `v${version}`;

  // Puertos
  await loadPorts();

  // Estado gaveta
  const status = await window.gobytel.getDrawerStatus();
  updateDrawerUI(status);

  // Auto-start
  const autoStart = await window.gobytel.getAutoStart();
  elAutoStart.checked = autoStart;

  // Update status
  const updateInfo = await window.gobytel.getUpdateStatus();
  updateUpdateUI(updateInfo);
})();
