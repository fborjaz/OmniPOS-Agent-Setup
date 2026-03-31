@echo off
setlocal enabledelayedexpansion

echo.
echo ================================================
echo   GoByTel Agent — Build Local
echo   Para pruebas en tu maquina de desarrollo
echo ================================================
echo.

:: ── Verificar Node.js ─────────────────────────────────────────────────────
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no encontrado.
    echo         Instala desde https://nodejs.org ^(version 18 o superior^)
    pause & exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER%

:: ── Crear carpeta dist ────────────────────────────────────────────────────
if not exist dist mkdir dist

:: ── Paso 1: Instalar dependencias ─────────────────────────────────────────
echo.
echo [1/4] Instalando dependencias npm...
call npm install
if %ERRORLEVEL% neq 0 ( echo [ERROR] npm install fallo & pause & exit /b 1 )
echo [OK] Dependencias instaladas.

:: ── Paso 2: Compilar ejecutable ───────────────────────────────────────────
echo.
echo [2/4] Compilando gobytel-agent.exe con pkg...
call npx pkg src/agent.js --target node18-win-x64 --output dist/gobytel-agent.exe
if %ERRORLEVEL% neq 0 ( echo [ERROR] pkg fallo & pause & exit /b 1 )
echo [OK] dist\gobytel-agent.exe generado.

:: ── Paso 3: Descargar NSSM si no existe ──────────────────────────────────
echo.
if not exist assets\nssm.exe (
    echo [3/4] Descargando NSSM ^(gestor de servicios Windows^)...
    powershell -NoProfile -Command ^
        "Invoke-WebRequest -Uri 'https://nssm.cc/release/nssm-2.24.zip' -OutFile nssm.zip; ^
         Expand-Archive nssm.zip -DestinationPath nssm-temp -Force; ^
         Copy-Item 'nssm-temp\nssm-2.24\win64\nssm.exe' 'assets\nssm.exe'; ^
         Remove-Item nssm.zip, nssm-temp -Recurse -Force"
    if %ERRORLEVEL% neq 0 ( echo [ERROR] No se pudo descargar NSSM & pause & exit /b 1 )
    echo [OK] assets\nssm.exe descargado.
) else (
    echo [3/4] NSSM ya existe. Omitiendo descarga.
)

:: ── Paso 4: Compilar instalador con Inno Setup ────────────────────────────
echo.
set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if exist %ISCC% (
    echo [4/4] Compilando instalador con Inno Setup...
    %ISCC% installer\setup.iss
    if %ERRORLEVEL% neq 0 ( echo [ERROR] Inno Setup fallo & pause & exit /b 1 )
    echo [OK] Instalador generado en dist\
) else (
    echo [4/4] Inno Setup no encontrado. Omitiendo instalador.
    echo       Para generar el instalador descarga Inno Setup 6:
    echo       https://jrsoftware.org/isdl.php
)

:: ── Resultado ─────────────────────────────────────────────────────────────
echo.
echo ================================================
echo   BUILD COMPLETADO
echo ================================================
echo.
echo Archivos generados:
dir /b dist\*.exe 2>nul | findstr /r ".*" && (
    for %%f in (dist\*.exe) do echo   %%f
) || echo   (ninguno)
echo.
echo NOTA: Este build NO esta firmado digitalmente.
echo       La firma se aplica automaticamente via GitHub Actions
echo       cuando publicas una nueva version con: git tag vX.Y.Z
echo.
pause
