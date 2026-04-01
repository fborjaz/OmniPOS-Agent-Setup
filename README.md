# GoByTel Agent

> Hardware bridge para el sistema POS GoByTel.
> Controla la gaveta de caja registradora desde el navegador via WebSocket.

**Autor:** [Frank Borja](https://github.com/fborjaz)
**Version:** 2.0.0
**Licencia:** Propietario

---

## Para el cliente

Ejecutar `GoByTel-Agent-Setup-vX.X.X.exe` una sola vez.
El agente se instala, arranca con Windows y se actualiza automaticamente.

---

## Funcionalidades

- Apertura de gaveta via WebSocket (`ws://localhost:9100`)
- Deteccion de estado de gaveta (abierta/cerrada)
- Interfaz grafica minimalista con tema oscuro
- Icono en bandeja del sistema con menu contextual
- Selector de puerto COM
- Auto-actualizacion desde GitHub Releases
- Auto-inicio con Windows

---

## Comunicacion con el POS

```javascript
const ws = new WebSocket("ws://localhost:9100");

// Abrir gaveta
ws.onopen = () => ws.send(JSON.stringify({ action: "open_drawer" }));

// Health check
ws.send(JSON.stringify({ action: "ping" }));

// Estado gaveta
ws.send(JSON.stringify({ action: "drawer_status" }));
```

---

## Arquitectura

```
src/
  main/
    main.js              — Entry point Electron + IPC
    tray.js              — System tray + context menu
    websocket-server.js  — WebSocket server (puerto 9100)
    serial.js            — Control COM port (serialport)
    drawer-status.js     — Polling DLE EOT
    config.js            — Configuracion persistente
    logger.js            — Log con rotacion
    updater.js           — Auto-update (electron-updater)
    preload.js           — Bridge IPC renderer<->main
  renderer/
    index.html           — Ventana configuracion
    styles.css           — Tema oscuro
    renderer.js          — Logica UI
  shared/
    constants.js         — Constantes compartidas
build/
    installer.nsh        — Migracion NSSM v1.x
    icon.ico             — Icono app
```

---

## Publicar nueva version

```bash
# 1. Commit
git add .
git commit -m "chore: release v2.1.0"

# 2. Tag (dispara GitHub Actions)
git tag v2.1.0
git push origin v2.1.0
```
