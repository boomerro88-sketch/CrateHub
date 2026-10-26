Unicode true
!include "MUI2.nsh"
!include "x64.nsh"
Name "CrateHub"
OutFile "../release/CrateHub-1.0.1-Windows-x64-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\CrateHub"
RequestExecutionLevel user
SetCompressor /SOLID lzma
Icon "../branding/cratehub.ico"
UninstallIcon "../branding/cratehub.ico"
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchApp
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Polish"
!insertmacro MUI_LANGUAGE "English"
Function LaunchApp
 Exec '"$INSTDIR\runtime\pythonw.exe" "$INSTDIR\desktop.py"'
FunctionEnd
Function .onInit
 !insertmacro MUI_LANGDLL_DISPLAY
FunctionEnd
Section "CrateHub"
 SetShellVarContext current
 SetOutPath "$INSTDIR"
 File /r "../windows-payload/*"
 WriteUninstaller "$INSTDIR\Uninstall.exe"
 CreateDirectory "$SMPROGRAMS\CrateHub"
 CreateShortcut "$SMPROGRAMS\CrateHub\CrateHub.lnk" "$INSTDIR\runtime\pythonw.exe" '"$INSTDIR\desktop.py"' "$INSTDIR\branding\cratehub.ico"
 CreateShortcut "$DESKTOP\CrateHub.lnk" "$INSTDIR\runtime\pythonw.exe" '"$INSTDIR\desktop.py"' "$INSTDIR\branding\cratehub.ico"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CrateHub" "DisplayName" "CrateHub"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CrateHub" "DisplayVersion" "1.0.1"
 WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CrateHub" "UninstallString" '"$INSTDIR\Uninstall.exe"'
SectionEnd
Section "Uninstall"
 SetShellVarContext current
 Delete "$DESKTOP\CrateHub.lnk"
 RMDir /r "$SMPROGRAMS\CrateHub"
 RMDir /r "$INSTDIR"
 DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CrateHub"
SectionEnd

Function .onInit
 ${IfNot} ${RunningX64}
  MessageBox MB_ICONSTOP "CrateHub wymaga Windows x64 / CrateHub requires 64-bit Windows."
  Abort
 ${EndIf}
FunctionEnd
