@echo off
rem Moworks Studio launcher: builds the interface the first time, then starts the app in the background (no window stays open) and
rem opens the app window. Close the app with Exit at the top right. If the app is already running, this only opens its window again.
rem Log: runtime\logs\app.log
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto nonode
node -e "process.exit(+process.versions.node.split('.')[0] < 22 ? 1 : 0)"
if errorlevel 1 goto nonode

rem the app's own npm packages (about 80 MB): on a new computer, and again when package-lock.json changes
node tools\needs-install.mjs
if not errorlevel 1 goto built
title Moworks Studio
echo Installing the app's packages, first start only...
call npm install --no-audit --no-fund
if errorlevel 1 goto installfailed
if exist "ui\dist" rmdir /s /q "ui\dist"

:built
if exist "ui\dist\index.html" goto start
title Moworks Studio
echo Building the interface, first start only...
call npm run build
if errorlevel 1 goto failed

:start
start "" wscript.exe //nologo "%~dp0tools\start-hidden.vbs"
goto end

:nonode
title Moworks Studio
echo Node.js 22 or newer was not found. Install Node.js 22 or newer, then run this file again.
pause
goto end

:installfailed
echo.
echo Installing the app's packages failed (npm install). Check the internet connection; the lines above say what went wrong.
pause
goto end

:failed
echo.
echo Building the interface failed. The lines above say what went wrong.
pause

:end
