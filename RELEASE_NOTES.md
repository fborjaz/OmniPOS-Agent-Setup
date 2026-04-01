# GoByTel Agent v2.0.0 — Release Notes

## 🎯 Major Release: Electron Desktop App Migration

Migración completa desde servicio headless Node.js/NSSM a aplicación Electron con GUI.

## ✅ Fixes en v2.0.0

### 1. Auto-Updater (latest.yml)
- **Problema**: electron-updater fallaba con error HTTP 404 al buscar `latest.yml`
- **Solución**: Generar `latest.yml` automáticamente en GitHub Actions con SHA512 hash
- **Resultado**: Auto-updateador ahora funciona correctamente

### 2. Validación de Gaveta
- **Problema**: Test de gaveta siempre decía "éxito" sin validar realmente
- **Solución**:
  - Timeout de 3 segundos para detectar dispositivos no conectados
  - Mejor mensaje UI: "✓ Pulso enviado" en lugar de "Gaveta abierta"
  - Error handling para puertos COM inaccesibles
- **Resultado**: Validación real de conexión del hardware

### 3. EULA/Acuerdo de Licencia
- **Problema**: Instalador saltaba directamente sin mostrar términos de licencia
- **Solución**:
  - Cambiar `oneClick: false` en NSIS configuración
  - MessageBox que pregunta "¿Acepta los términos y condiciones?"
- **Resultado**: Usuario debe aceptar antes de instalar

### 4. Copyright & Metadata
- UI Footer: "© 2026 Frank Borja" con link a GitHub
- NSIS Header: Copyright comment
- electron-builder.yml: Copyright metadata

### 5. Estado de Gaveta
- Mostrar "Sin Configurar" cuando no hay puerto COM
- Mostrar "Desconectada" cuando el dispositivo no responde
- Mejorar UX del status en tray icon

### 6. Visibilidad de Ventana
- Cambiar `skipTaskbar: false` para que aparezca en Windows taskbar
- Ventana visible cuando está minimizada

## 📥 Download

Descargar instalador desde:
https://github.com/fborjaz/OmniPOS-Agent-Setup/releases/tag/v2.0.0

O servidor GoByTel:
```
/home/gobytel/htdocs/gobytel.com/uploads/downloads/
GoByTel-Agent-Setup-v2.0.0.exe
```

## ⚠️ Conocidos

- **SmartScreen**: Windows muestra "Editor Desconocido" por falta de code signing (requiere certificado digital)
- **DLE EOT Polling**: Algunos dispositivos de impresora no soportan consulta de estado

## 🚀 Instalación

1. Descargar `GoByTel-Agent-Setup-v2.0.0.exe`
2. Ejecutar instalador
3. Aceptar términos y condiciones
4. Seleccionar puerto COM (auto-detectado)
5. Iniciar servicio automáticamente con Windows

## 🔄 Auto-Update

La aplicación verifica actualizaciones automáticamente 15 segundos después del arranque y cada vez que haces clic en "Buscar Actualizaciones".

---

**Desarrollado por**: Frank Borja
**GitHub**: https://github.com/fborjaz
**Fecha**: 2026-04-01
