#define AppName "CrateHub"
#define AppVersion "1.1.0"
[Setup]
AppId={{68B21850-074C-40F0-9C6A-516DF7460698}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\CrateHub
DefaultGroupName=CrateHub
PrivilegesRequired=lowest
OutputDir=..\release
OutputBaseFilename=CrateHub-1.1.0-Windows-x64-Setup
SetupIconFile=..\branding\cratehub.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\CrateHub.exe
ArchitecturesAllowed=x64compatible
[Files]
Source: "..\dist\CrateHub\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\CrateHub"; Filename: "{app}\CrateHub.exe"
Name: "{userdesktop}\CrateHub"; Filename: "{app}\CrateHub.exe"
[Run]
Filename: "{app}\CrateHub.exe"; Description: "Uruchom CrateHub"; Flags: nowait postinstall skipifsilent
