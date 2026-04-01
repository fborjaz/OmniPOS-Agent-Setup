#!/bin/bash
# Deploy GoByTel Agent instaladores al servidor
# Uso: ./deploy.sh 2.0.4

VERSION=${1:-$(cat package.json | grep '"version"' | head -1 | cut -d'"' -f4)}
DEPLOY_USER="devfrank"
DEPLOY_HOST="173.249.10.36"
DEPLOY_PATH="/home/gobytel/htdocs/gobytel.com/uploads/downloads/"
DEPLOY_PASSWORD="Frank@08."

echo "🚀 Deploying GoByTel Agent v$VERSION"
echo "───────────────────────────────────────"

# Verificar que existen los archivos
if [ ! -f "dist/GoByTel-Agent-Setup-v${VERSION}.exe" ]; then
  echo "❌ Error: dist/GoByTel-Agent-Setup-v${VERSION}.exe no encontrado"
  exit 1
fi

echo "📤 Enviando instaladores al servidor..."

# Usar sshpass + scp para enviar archivos
sshpass -p "$DEPLOY_PASSWORD" scp \
  "dist/GoByTel-Agent-Setup-v${VERSION}.exe" \
  "dist/GoByTel-Agent-Setup-latest.exe" \
  "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PATH}" \
  && echo "✅ Deploy completado a ${DEPLOY_HOST}:${DEPLOY_PATH}" \
  || echo "❌ Error en deploy"

# Cleanup old versions
echo "🧹 Limpiando versiones antiguas (manteniendo últimas 3)..."
sshpass -p "$DEPLOY_PASSWORD" ssh "${DEPLOY_USER}@${DEPLOY_HOST}" \
  "cd '${DEPLOY_PATH}' && ls -t GoByTel-Agent-Setup-v*.exe 2>/dev/null | tail -n +4 | xargs -r rm -v"

echo "✨ Deploy finalizado"
