' Moworks Studio: starts the app's local service with no console window, then the service opens the app window
' (packages\server\cli.mjs --background). Called by "Moworks Studio.bat" or a shortcut. Exit is the button at the top right of the app.
' A failure at start shows a message box; the log is runtime\logs\app.log.
Option Explicit
Dim fso, sh, app
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
app = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
sh.CurrentDirectory = app
sh.Run "node packages\server\cli.mjs --background", 0, False
