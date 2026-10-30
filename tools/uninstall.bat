@echo off
rem Uninstall Moworks Studio when the app cannot open its Settings (Settings > Update > Uninstall does the same): says what goes,
rem asks once, then everything goes to the Recycle Bin from its own window. Add --models or --films to remove those too.
cd /d "%~dp0.."
node tools\uninstall.mjs %*
pause
