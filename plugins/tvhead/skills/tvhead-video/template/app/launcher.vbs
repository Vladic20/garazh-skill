Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = fso.GetParentFolderName(here)
' window style 0 = hidden: no console window, the app opens in the browser
sh.Run "node """ & here & "\launch.mjs""", 0, False
