# Deploy GoByTel Agent instaladores al servidor
# Uso: .\deploy.ps1 -Version "2.0.4"

param(
    [string]$Version = (Select-String -Path "package.json" -Pattern '"version":\s*"([^"]+)"' | % { $_.Matches.Groups[1].Value } | Select-Object -First 1)
)

$DEPLOY_USER = "devfrank"
$DEPLOY_HOST = "173.249.10.36"
$DEPLOY_PATH = "/home/gobytel/htdocs/gobytel.com/uploads/downloads/"
$DEPLOY_PASSWORD = "Frank@08."

Write-Host "🚀 Deploying GoByTel Agent v$Version" -ForegroundColor Cyan
Write-Host "───────────────────────────────────────" -ForegroundColor Cyan

# Verificar que existen los archivos
$file1 = "dist\GoByTel-Agent-Setup-v${Version}.exe"
$file2 = "dist\GoByTel-Agent-Setup-latest.exe"

if (-not (Test-Path $file1)) {
    Write-Host "❌ Error: $file1 no encontrado" -ForegroundColor Red
    exit 1
}

Write-Host "📤 Enviando instaladores al servidor..." -ForegroundColor Yellow

# Usar sshpass + scp
$env:SSHPASS = $DEPLOY_PASSWORD
& sshpass -e scp -o "StrictHostKeyChecking no" -o "UserKnownHostsFile=/dev/null" `
    $file1, $file2 "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deploy completado a ${DEPLOY_HOST}:${DEPLOY_PATH}" -ForegroundColor Green

    # Cleanup old versions
    Write-Host "🧹 Limpiando versiones antiguas..." -ForegroundColor Yellow
    & sshpass -e ssh -o "StrictHostKeyChecking no" "${DEPLOY_USER}@${DEPLOY_HOST}" `
        "cd '${DEPLOY_PATH}' && ls -t GoByTel-Agent-Setup-v*.exe 2>/dev/null | tail -n +4 | xargs -r rm -v"

    Write-Host "✨ Deploy finalizado" -ForegroundColor Green
} else {
    Write-Host "❌ Error en deploy" -ForegroundColor Red
    exit 1
}
