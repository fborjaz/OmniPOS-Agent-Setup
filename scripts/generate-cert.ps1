# ============================================================
# GoByTel Agent — Generador de Certificado Auto-firmado
# Ejecutar UNA SOLA VEZ como Administrador en tu PC de desarrollo
#
# Uso:
#   .\scripts\generate-cert.ps1 -Password "TuContraseñaSegura"
#
# Genera:
#   gobytel-codesign.pfx      <- Guárdalo en un lugar seguro (NO subir a GitHub)
#   gobytel-codesign-b64.txt  <- Pegar en GitHub Secret CODESIGN_PFX_BASE64
# ============================================================

param(
    [Parameter(Mandatory = $true)]
    [string]$Password
)

$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  GoByTel Agent — Generador de Certificado" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Crear certificado auto-firmado ─────────────────────────────────────
Write-Host "[1/4] Generando certificado auto-firmado..." -ForegroundColor Yellow

$cert = New-SelfSignedCertificate `
    -Subject          "CN=Frank Borja, O=GoByTel, L=Guayaquil, S=Guayas, C=EC" `
    -Type             CodeSigning `
    -KeyUsage         DigitalSignature `
    -KeyLength        2048 `
    -HashAlgorithm    SHA256 `
    -FriendlyName     "GoByTel Code Signing Certificate" `
    -NotAfter         (Get-Date).AddYears(5) `
    -CertStoreLocation "Cert:\CurrentUser\My"

Write-Host "   Certificado creado. Thumbprint: $($cert.Thumbprint)" -ForegroundColor Green

# ── 2. Exportar a .pfx ────────────────────────────────────────────────────
Write-Host "[2/4] Exportando a archivo .pfx..." -ForegroundColor Yellow

$securePassword = ConvertTo-SecureString -String $Password -Force -AsPlainText
$pfxPath        = Join-Path $PSScriptRoot "..\gobytel-codesign.pfx"
$pfxPath        = [System.IO.Path]::GetFullPath($pfxPath)

Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword | Out-Null
Write-Host "   Exportado a: $pfxPath" -ForegroundColor Green

# ── 3. Convertir a Base64 para GitHub Secrets ─────────────────────────────
Write-Host "[3/4] Generando Base64 para GitHub Secrets..." -ForegroundColor Yellow

$pfxBytes = [IO.File]::ReadAllBytes($pfxPath)
$base64   = [Convert]::ToBase64String($pfxBytes)
$b64Path  = Join-Path $PSScriptRoot "..\gobytel-codesign-b64.txt"
$b64Path  = [System.IO.Path]::GetFullPath($b64Path)

$base64 | Out-File -FilePath $b64Path -Encoding ascii -NoNewline
Write-Host "   Base64 guardado en: $b64Path" -ForegroundColor Green

# ── 4. Instrucciones finales ───────────────────────────────────────────────
Write-Host "[4/4] Listo." -ForegroundColor Yellow
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  PRÓXIMOS PASOS — Configurar GitHub Secrets" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Ve a: https://github.com/fborjaz/OmniPOS-Agent-Setup/settings/secrets/actions"
Write-Host ""
Write-Host "2. Crea el secreto: CODESIGN_PFX_BASE64"
Write-Host "   Valor: (contenido completo de gobytel-codesign-b64.txt)"
Write-Host ""
Write-Host "3. Crea el secreto: CODESIGN_PFX_PASSWORD"
Write-Host "   Valor: $Password"
Write-Host ""
Write-Host "4. ELIMINA estos archivos de tu PC (son sensibles):" -ForegroundColor Red
Write-Host "   - gobytel-codesign-b64.txt"
Write-Host ""
Write-Host "5. Guarda gobytel-codesign.pfx en un lugar seguro" -ForegroundColor Yellow
Write-Host "   (fuera del proyecto, nunca en GitHub)"
Write-Host ""
Write-Host "Una vez configurado, para publicar una versión:" -ForegroundColor Green
Write-Host "   git tag v1.0.0"
Write-Host "   git push origin v1.0.0"
Write-Host ""
Write-Host "GitHub Actions compilará, firmará y publicará automáticamente." -ForegroundColor Green
Write-Host ""
