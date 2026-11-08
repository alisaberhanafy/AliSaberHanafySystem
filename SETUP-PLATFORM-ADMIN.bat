@echo off
setlocal
title Ali Saber System - Platform Admin Setup

set "EXPECTED_KEY=C:\FirebaseSecrets\staging-service-account.json"
set "ADMIN_UID=QFXgNlVXScMNnV3iHT4nHNEDGT72"

echo ==============================================
echo   Ali Saber System - Platform Admin Setup
echo   Firebase STAGING only
echo ==============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Install Node.js 20 LTS, then run this file again.
  echo https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found. Reinstall Node.js 20 LTS.
  pause
  exit /b 1
)

if not exist "%EXPECTED_KEY%" (
  echo ERROR: Service Account JSON was not found:
  echo %EXPECTED_KEY%
  echo.
  echo Put the downloaded key at that exact path.
  pause
  exit /b 1
)

echo [1/3] Installing required local packages...
pushd "%~dp0platform\functions"
if errorlevel 1 (
  echo ERROR: Cannot find platform\functions.
  pause
  exit /b 1
)
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed.
  popd
  pause
  exit /b 1
)
if not exist "node_modules\\firebase-admin\\package.json" (
  echo ERROR: firebase-admin was not installed in platform\\functions.
  popd
  pause
  exit /b 1
)
popd

echo.
echo [2/3] Setting the local credential path...
set "GOOGLE_APPLICATION_CREDENTIALS=%EXPECTED_KEY%"

echo.
echo [3/3] Assigning platformAdmin to the configured Firebase UID...
node "%~dp0platform\scripts\set-platform-admin.js" "%ADMIN_UID%"
if errorlevel 1 (
  echo.
  echo The operation did not complete. Review the error above.
  pause
  exit /b 1
)

echo.
echo IMPORTANT:
echo 1. Sign out of the staging app.
echo 2. Sign in again to refresh the Firebase ID token.
echo 3. Never upload the service-account JSON to GitHub.
echo.
pause
endlocal
