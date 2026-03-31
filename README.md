# GoByTel Agent

> Servicio de hardware local para el sistema POS GoByTel.  
> Permite al navegador controlar hardware físico (gaveta de caja, impresoras) sin ninguna configuración por parte del cliente.

**Autor:** [Frank Borja](https://github.com/fborjaz)  
**Versión:** 1.0.0  
**Licencia:** Propietario — GoByTel / Frank Borja. Todos los derechos reservados.

---

## Para el cliente

El cliente solo ejecuta `GoByTel-Agent-Setup-vX.X.X.exe` **una sola vez**.  
Después de esa instalación el agente:

- Se instala como **servicio de Windows** y arranca automáticamente con el PC
- Se **actualiza solo** al detectar una nueva versión en GitHub — sin intervención manual
- Está **firmado digitalmente** por Frank Borja

No se necesita ningún paso adicional.

---

## ¿Qué hace?

| Versión | Funcionalidad |
|---------|--------------|
| v1.0.0  | Apertura de gaveta de caja registradora vía WebSocket (`ws://localhost:9100`) |
| v1.1.0+ | *(próximas funcionalidades)* |

### Comunicación con el POS

El POS (navegador) se comunica con el agente vía WebSocket local:

```javascript
const ws = new WebSocket("ws://localhost:9100");

// Abrir gaveta
ws.onopen = () => ws.send(JSON.stringify({ action: "open_drawer" }));
ws.onmessage = (e) => console.log(JSON.parse(e.data));
// → { success: true, port: "COM3", version: "1.0.0" }

// Health check
ws.send(JSON.stringify({ action: "ping" }));
// → { success: true, version: "1.0.0", port: "COM3" }
```

### Configuración (auto-generada)

`C:\ProgramData\GoByTel\config.json`
```json
{ "port": "COM3", "ws_port": 9100 }
```

El puerto COM se detecta automáticamente en el primer arranque y se re-detecta si cambia.

### Logs

`C:\ProgramData\GoByTel\agent.log` — rotación automática al superar 5 MB.

---

## Publicar una nueva versión

```bash
# 1. Actualizar version en package.json
# 2. Commit
git add .
git commit -m "chore: release v1.1.0"

# 3. Tag → dispara GitHub Actions automáticamente
git tag v1.1.0
git push origin v1.1.0
```

GitHub Actions compila, firma y publica el Release. Los agentes instalados se actualizan solos.

---

## Arquitectura

```
src/
├── agent.js     — WebSocket server + control de gaveta (PowerShell/COM)
├── updater.js   — Auto-actualización desde GitHub Releases
└── logger.js    — Log con rotación automática
installer/
└── setup.iss    — Script Inno Setup (servicio NSSM, auto-start, creditos)
.github/
└── workflows/
    └── release.yml  — CI/CD: build + firma digital + GitHub Release
```
