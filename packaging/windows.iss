#define AppName "CrateHub"
#define AppVersion "1.1.1"
[Setup]
AppId={{68B21850-074C-40F0-9C6A-516DF7460698}
AppName={#AppName}
AppVersion={#AppVersion}
DefaultDirName={localappdata}\Programs\CrateHub
DefaultGroupName=CrateHub
PrivilegesRequired=lowest
OutputDir=..\release
OutputBaseFilename=CrateHub-1.1.1-Windows-x64-Setup
SetupIconFile=..\branding\cratehub.ico
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
MinVersion=10.0.17763
UninstallDisplayIcon={app}\CrateHub.exe
ArchitecturesAllowed=x64compatible
[Languages]
Name: "polish"; MessagesFile: "compiler:Languages\Polish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"
[Files]
Source: "..\build\MicrosoftEdgeWebview2Setup.exe"; Flags: dontcopy
Source: "..\dist\CrateHub\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
[Icons]
Name: "{group}\CrateHub"; Filename: "{app}\CrateHub.exe"
Name: "{userdesktop}\CrateHub"; Filename: "{app}\CrateHub.exe"
[Run]
Filename: "{app}\CrateHub.exe"; Description: "Uruchom CrateHub"; Flags: nowait postinstall skipifsilent

[Code]
function RuntimePresent: Boolean;
var Version: String;
begin
 Result := (RegQueryStringValue(HKLM32, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0'));
 if not Result then
  Result := (RegQueryStringValue(HKCU, 'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', Version) and (Version <> '') and (Version <> '0.0.0.0'));
end;
function PrepareToInstall(var NeedsRestart: Boolean): String;
var ExitCode: Integer;
begin
 Result := '';
 if not RuntimePresent then begin
  ExtractTemporaryFile('MicrosoftEdgeWebview2Setup.exe');
  if not Exec(ExpandConstant('{tmp}\MicrosoftEdgeWebview2Setup.exe'), '/silent /install', '', SW_HIDE, ewWaitUntilTerminated, ExitCode) then
   Result := 'Nie udało się uruchomić instalacji Microsoft WebView2. / Could not start Microsoft WebView2 installation.'
  else if not RuntimePresent then
   Result := 'Microsoft WebView2 nie został zainstalowany. Sprawdź internet i uruchom instalator ponownie. / Microsoft WebView2 was not installed. Check your internet connection and run Setup again.';
 end;
end;
