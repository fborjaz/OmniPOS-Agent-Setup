; ============================================================
; GoByTel Agent — Inno Setup Script
; Autor: Frank Borja — https://github.com/fborjaz
; ============================================================

#define AppName      "GoByTel Agent"
#define AppVersion   "1.0.0"
#define AppPublisher "Frank Borja"
#define AppURL       "https://github.com/fborjaz/OmniPOS-Agent-Setup"
#define AppExeName   "gobytel-agent.exe"
#define ServiceName  "GoByTelAgent"
#define ServiceDesc  "Servicio de hardware local para el sistema POS GoByTel"
#define AppDesc      "GoByTel Agent — Servicio de hardware local"
#define DevName      "Frank Borja"
#define DevURL       "https://github.com/fborjaz"

[Setup]
; ID único del instalador — no cambiar entre versiones
AppId={{A3F1C2D4-8B7E-4F9A-B0C1-2D3E4F5A6B7C}}

AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} v{#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}/issues
AppUpdatesURL={#AppURL}/releases

; Instalar en C:\Program Files\GoByTel\Agent
DefaultDirName={autopf}\GoByTel\Agent
DefaultGroupName=GoByTel
DisableProgramGroupPage=yes

; Salida del instalador
OutputBaseFilename=GoByTel-Agent-Setup-v{#AppVersion}
OutputDir=..\dist

; Apariencia
WizardStyle=modern
WizardSizePercent=120

; Compresión máxima
Compression=lzma2/ultra64
SolidCompression=yes

; Requiere privilegios de administrador (necesario para instalar servicios)
PrivilegesRequired=admin
MinVersion=6.1sp1

; Cerrar aplicaciones que usen los archivos antes de instalar
CloseApplications=yes
RestartApplications=no

; Información del .exe en Propiedades de Windows
VersionInfoVersion={#AppVersion}
VersionInfoCompany=GoByTel
VersionInfoDescription={#AppDesc}
VersionInfoCopyright=Copyright (C) 2026 Frank Borja
VersionInfoProductName={#AppName}
VersionInfoProductVersion={#AppVersion}


; No mostrar la carpeta de destino (es transparente para el usuario)
DisableDirPage=yes

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[CustomMessages]
spanish.InstallingService=Instalando servicio de Windows...
spanish.StartingService=Iniciando GoByTel Agent...
spanish.AlreadyInstalled=Se encontró una versión anterior. Se actualizará automáticamente.
spanish.WelcomeLabel2=Este asistente instalará [name/ver] en tu equipo.%n%nDesarrollado por {#DevName}%nhttps://github.com/fborjaz%n%nEl agente se ejecutará como servicio de Windows y se actualizará automáticamente.
spanish.FinishedLabel=La instalación de [name] ha finalizado correctamente.%n%nEl servicio GoByTel Agent está activo y se iniciará automáticamente con Windows.%n%n— {#DevName}%n  {#DevURL}

[Files]
; Ejecutable principal del agente
Source: "..\dist\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion

; NSSM — gestor de servicios Windows
Source: "..\assets\nssm.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Acceso directo en el menú inicio
Name: "{group}\{#AppName}";          Filename: "{app}\{#AppExeName}"
Name: "{group}\Desinstalar {#AppName}"; Filename: "{uninstallexe}"

[Run]
; ── PASO 1: Detener el servicio si ya existe (actualización) ─────────────
Filename: "{app}\nssm.exe";
  Parameters: "stop {#ServiceName}";
  Flags: runhidden waituntilterminated;
  StatusMsg: "Deteniendo servicio anterior...";
  Check: ServiceExists

; ── PASO 2: Eliminar servicio anterior ───────────────────────────────────
Filename: "{app}\nssm.exe";
  Parameters: "remove {#ServiceName} confirm";
  Flags: runhidden waituntilterminated;
  Check: ServiceExists

; ── PASO 3: Registrar el nuevo servicio ──────────────────────────────────
Filename: "{app}\nssm.exe";
  Parameters: "install {#ServiceName} ""{app}\{#AppExeName}""";
  Flags: runhidden waituntilterminated;
  StatusMsg: "Registrando servicio de Windows..."

; ── PASO 4: Configurar nombre visible del servicio ───────────────────────
Filename: "{app}\nssm.exe";
  Parameters: "set {#ServiceName} DisplayName ""{#AppName}""";
  Flags: runhidden waituntilterminated

; ── PASO 5: Configurar descripción ───────────────────────────────────────
Filename: "{app}\nssm.exe";
  Parameters: "set {#ServiceName} Description ""{#ServiceDesc}""";
  Flags: runhidden waituntilterminated

; ── PASO 6: Configurar inicio automático con Windows ─────────────────────
Filename: "{app}\nssm.exe";
  Parameters: "set {#ServiceName} Start SERVICE_AUTO_START";
  Flags: runhidden waituntilterminated

; ── PASO 7: Reiniciar automáticamente si el servicio falla ───────────────
Filename: "{app}\nssm.exe";
  Parameters: "set {#ServiceName} AppExit Default Restart";
  Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe";
  Parameters: "set {#ServiceName} AppRestartDelay 5000";
  Flags: runhidden waituntilterminated

; ── PASO 8: Redirigir stdout/stderr al log ───────────────────────────────
Filename: "{app}\nssm.exe";
  Parameters: "set {#ServiceName} AppStdout ""{commonappdata}\GoByTel\agent.log""";
  Flags: runhidden waituntilterminated

Filename: "{app}\nssm.exe";
  Parameters: "set {#ServiceName} AppStderr ""{commonappdata}\GoByTel\agent.log""";
  Flags: runhidden waituntilterminated

; ── PASO 9: Iniciar el servicio inmediatamente ───────────────────────────
Filename: "{app}\nssm.exe";
  Parameters: "start {#ServiceName}";
  Flags: runhidden waituntilterminated;
  StatusMsg: "Iniciando GoByTel Agent..."

[UninstallRun]
; Detener y eliminar el servicio al desinstalar
Filename: "{app}\nssm.exe"; Parameters: "stop {#ServiceName}";   Flags: runhidden waituntilterminated
Filename: "{app}\nssm.exe"; Parameters: "remove {#ServiceName} confirm"; Flags: runhidden waituntilterminated

[Code]
// Verifica si el servicio GoByTelAgent ya está registrado en Windows
function ServiceExists(): Boolean;
var
  ResultCode: Integer;
begin
  Exec(
    ExpandConstant('{app}\nssm.exe'),
    'status {#ServiceName}',
    '',
    SW_HIDE,
    ewWaitUntilTerminated,
    ResultCode
  );
  Result := (ResultCode = 0);
end;

// Abre el enlace de GitHub al hacer clic en la etiqueta
procedure LinkLabelClick(Sender: TObject);
var
  ErrorCode: Integer;
begin
  ShellExec('open', '{#DevURL}', '', '', SW_SHOWNORMAL, ewNoWait, ErrorCode);
end;

// Agrega una etiqueta de crédito en las páginas Welcome y Finished
procedure InitializeWizard();
var
  CreditLabel : TLabel;
  LinkLabel   : TLabel;
begin
  // ── Página de Bienvenida ──────────────────────────────────────────────────
  CreditLabel        := TLabel.Create(WizardForm);
  CreditLabel.Parent := WizardForm.WelcomePage;
  CreditLabel.Left   := 200;
  CreditLabel.Top    := 270;
  CreditLabel.Width  := 220;
  CreditLabel.Height := 16;
  CreditLabel.Caption := 'Desarrollado por {#DevName}';
  CreditLabel.Font.Color := $00555555;
  CreditLabel.Font.Size  := 8;

  LinkLabel        := TLabel.Create(WizardForm);
  LinkLabel.Parent := WizardForm.WelcomePage;
  LinkLabel.Left   := 200;
  LinkLabel.Top    := 288;
  LinkLabel.Width  := 220;
  LinkLabel.Height := 16;
  LinkLabel.Caption   := '{#DevURL}';
  LinkLabel.Font.Color := $00C05800;  // naranja GoByTel
  LinkLabel.Font.Size  := 8;
  LinkLabel.Cursor     := crHand;
  LinkLabel.OnClick    := @LinkLabelClick;

  // ── Página de Finalización ────────────────────────────────────────────────
  CreditLabel        := TLabel.Create(WizardForm);
  CreditLabel.Parent := WizardForm.FinishedPage;
  CreditLabel.Left   := 200;
  CreditLabel.Top    := 270;
  CreditLabel.Width  := 220;
  CreditLabel.Height := 16;
  CreditLabel.Caption := 'Desarrollado por {#DevName}';
  CreditLabel.Font.Color := $00555555;
  CreditLabel.Font.Size  := 8;

  LinkLabel        := TLabel.Create(WizardForm);
  LinkLabel.Parent := WizardForm.FinishedPage;
  LinkLabel.Left   := 200;
  LinkLabel.Top    := 288;
  LinkLabel.Width  := 220;
  LinkLabel.Height := 16;
  LinkLabel.Caption   := '{#DevURL}';
  LinkLabel.Font.Color := $00C05800;
  LinkLabel.Font.Size  := 8;
  LinkLabel.Cursor     := crHand;
  LinkLabel.OnClick    := @LinkLabelClick;
end;

// Mensaje personalizado si se detecta una instalación previa
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then begin
    if ServiceExists() then begin
      Log('Versión anterior detectada. Actualizando...');
    end;
  end;
end;
