@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Ali Saber System - Firebase Tools
set "KEY=C:\FirebaseSecrets\staging-service-account.json"
set "TOOLS=%~dp0platform\admin-tools"

echo ================================================
echo   Ali Saber System - Firebase Staging Tools
echo ================================================
echo.
where node >nul 2>nul || (echo Node.js 20 or newer is required.& pause & exit /b 1)
if not exist "%KEY%" (
  echo Service Account file not found:
  echo %KEY%
  echo Put the Staging key at this path. Never upload it to GitHub.
  pause
  exit /b 1
)
if not exist "%TOOLS%\node_modules\firebase-admin\package.json" (
  echo Installing local Firebase Admin tools...
  pushd "%TOOLS%"
  call npm install
  if errorlevel 1 (popd & echo Installation failed.& pause & exit /b 1)
  popd
)
set "GOOGLE_APPLICATION_CREDENTIALS=%KEY%"
set "UID=S2aoVoKEwYNXDcOJQBm2gdtq0ge2"
set "TENANT=ws_76f0c9493172475b8a"
set /p "UID=Enter workshop owner UID [%UID%]: "
set /p "TENANT=Enter workshop Tenant ID [%TENANT%]: "
:MENU
echo.
echo [1] Check membership and tenant status (read-only)
echo [2] Preview index repair (no changes)
echo [3] Apply index repair (creates local backup first)
echo [0] Exit
echo.
set /p CHOICE=Choose: 
if "%CHOICE%"=="1" node "%TOOLS%\tenant-access.js" check --uid "%UID%" --tenant "%TENANT%"
if "%CHOICE%"=="2" node "%TOOLS%\tenant-access.js" repair --uid "%UID%" --tenant "%TENANT%"
if "%CHOICE%"=="3" goto CONFIRM
if "%CHOICE%"=="0" exit /b 0
goto MENU
:CONFIRM
echo.
echo This writes only userTenantIndex/%UID%/%TENANT% in Staging.
echo A local JSON backup is created before writing.
set /p APPROVE=Type APPLY to continue: 
if /I not "%APPROVE%"=="APPLY" (echo Cancelled. No changes made.& goto MENU)
node "%TOOLS%\tenant-access.js" repair --uid "%UID%" --tenant "%TENANT%" --apply
goto MENU
