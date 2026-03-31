# GoByTel Agent

Servicio de hardware local para el sistema POS GoByTel.  
Permite al navegador controlar hardware físico (gaveta de caja, impresoras) sin configuración manual por parte del cliente.

**Autor:** Frank Borja — [@fborjaz](https://github.com/fborjaz)  
**Versión actual:** 1.0.0

---

## ¿Qué hace?

| Versión | Funcionalidad |
|---------|--------------|
| v1.0.0  | Apertura de gaveta de caja registradora vía WebSocket |
| v1.1.0+ | *(futuras funcionalidades)* |

- Se instala como **servicio de Windows** (arranca automáticamente con el PC)
- Se **auto-actualiza** cuando publicas una nueva versión en GitHub Releases
- Firmado digitalmente por Frank Borja

---

## Para el cliente final

El cliente solo ejecuta `GoByTel-Agent-Setup-vX.X.X.exe` **una sola vez**.  
Después de eso, el agente se actualiza solo y nunca necesita intervención manual.

---

## Para el desarrollador (Frank)

### Requisitos de desarrollo
- Node.js 18+
- Windows (para compilar el .exe y el instalador)
- Inno Setup 6 → https://jrsoftware.org/isdl.php

### Configurar firma digital (solo la primera vez)

1. Abrir PowerShell como Administrador
2. Ejecutar:
```powershell
.\scripts\generate-cert.ps1 -Password "TuContraseñaSegura"
```
3. El script genera dos archivos y te da las instrucciones exactas para configurar los secretos en GitHub.

4. En GitHub → Settings → Secrets → Actions, crear:
   - `CODESIGN_PFX_BASE64` → contenido de `gobytel-codesign-b64.txt`
   - `CODESIGN_PFX_PASSWORD` → la contraseña que usaste

5. Eliminar `gobytel-codesign-b64.txt` de tu PC.  
   Guardar `gobytel-codesign.pfx` en un lugar seguro (fuera del proyecto).

### Build local (para pruebas, sin firma)

```bat
build.bat
```

Genera `dist/OmniPOS-Agent-Setup.exe` y `dist/GoByTel-Agent-Setup-vX.X.X.exe`.

### Publicar una nueva versión

```bash
# 1. Actualizar versión en package.json
# 2. Commit de los cambios
git add .
git commit -m "chore: release v1.1.0"

# 3. Crear el tag
git tag v1.1.0

# 4. Subir tag a GitHub — esto dispara el CI/CD automáticamente
git push origin v1.1.0
```

GitHub Actions se encarga del resto:
- Compila el `.exe`
- Firma el `.exe` y el instalador
- Genera el `GoByTel-Agent-Setup-v1.1.0.exe`
- Publica la Release con changelog automático
- Los agentes instalados en clientes **se actualizan solos** al detectar la nueva versión

---

## Arquitectura

```
src/
├── agent.js     ← Núcleo: WebSocket + pulso de gaveta + arranque
├── updater.js   ← Auto-actualización desde GitHub Releases
└── logger.js    ← Log con rotación automática (C:\ProgramData\GoByTel\agent.log)
```

### Comunicación con el POS (navegador)

El POS envía un mensaje WebSocket a `ws://localhost:9100`:

```javascript
// Abrir gaveta
const ws = new WebSocket("ws://localhost:9100");
ws.onopen = () => ws.send(JSON.stringify({ action: "open_drawer" }));
ws.onmessage = (e) => console.log(JSON.parse(e.data));
// Respuesta: { success: true, port: "COM3", version: "1.0.0" }

// Health check
ws.send(JSON.stringify({ action: "ping" }));
// Respuesta: { success: true, version: "1.0.0", port: "COM3" }
```

### Configuración (auto-generada en la PC del cliente)

`C:\ProgramData\GoByTel\config.json`
```json
{
  "port": "COM3",
  "ws_port": 9100
}
```

El puerto COM se detecta automáticamente al primer arranque. Si se cambia la impresora de puerto USB, se re-detecta automáticamente en el siguiente fallo.

### Logs

`C:\ProgramData\GoByTel\agent.log` — rotación automática al superar 5 MB.

---

## Estructura del repositorio

```
OmniPOS-Agent-Setup/
├── src/
│   ├── agent.js
│   ├── updater.js
│   └── logger.js
├── assets/
│   ├── icon.ico          ← Ícono GoByTel (reemplazar con el definitivo)
│   └── nssm.exe          ← Se descarga automáticamente en el build
├── installer/
│   └── setup.iss         ← Script Inno Setup
├── scripts/
│   └── generate-cert.ps1 ← Generador de certificado auto-firmado
├── .github/
│   └── workflows/
│       └── release.yml   ← CI/CD: build + firma + release automático
├── package.json
├── build.bat             ← Build local
├── .gitignore
└── README.md
```

---

## Licencia

Propietario — GoByTel / Frank Borja. Todos los derechos reservados.
