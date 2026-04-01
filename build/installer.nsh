; ── GoByTel Agent Installer Script ─────────────────────────────────────────
; © 2026 Frank Borja <https://github.com/fborjaz>
;
; Migración desde GoByTel Agent v1.x (NSSM service) ─────────────────────
; Este script detecta y elimina el servicio NSSM antiguo antes de instalar
; la nueva versión Electron. La config en ProgramData\GoByTel se preserva.

!macro customInstall
  ; Verificar si el servicio GoByTelAgent existe
  nsExec::ExecToLog 'sc query GoByTelAgent'
  Pop $0
  ${If} $0 == 0
    DetailPrint "Servicio GoByTelAgent v1.x detectado. Migrando..."

    ; Detener el servicio
    nsExec::ExecToLog 'sc stop GoByTelAgent'
    Sleep 3000

    ; Intentar eliminar con NSSM primero (si existe)
    IfFileExists "$PROGRAMFILES\GoByTel\Agent\nssm.exe" 0 +3
      nsExec::ExecToLog '"$PROGRAMFILES\GoByTel\Agent\nssm.exe" remove GoByTelAgent confirm'
      Goto +2
    ; Fallback: eliminar con sc delete
    nsExec::ExecToLog 'sc delete GoByTelAgent'

    ; Limpiar directorio de instalación viejo
    RMDir /r "$PROGRAMFILES\GoByTel\Agent"

    DetailPrint "Servicio v1.x eliminado correctamente."
  ${EndIf}
!macroend

!macro customUnInstall
  ; Eliminar entrada de auto-inicio del registro
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "GoByTel Agent"
!macroend
