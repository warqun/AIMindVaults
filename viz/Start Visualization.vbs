' AIMindVaults Visualization — 콘솔 숨김 실행 래퍼 (Windows)
'
' 역할:
'   `Generate Visualization.bat` 을 WScript.Shell.Run("...", 0) 으로 hidden 실행.
'   검은 콘솔 창 없이 브라우저 앱 창만 표시 (R149.1 mojibake 회피 대비 .exe 로 대체된 후 호환 목적).
'
' Idle 종료:
'   앱 창을 닫으면 server.js 가 AIMV_VIZ_IDLE_MS (기본 15s) 후 자동 종료.
'
' 영문화: [[20260530_viz_정본_영문화_매니페스트]] § 6.16
Dim sh, fso, here
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = here
sh.Run """" & here & "\Generate Visualization.bat""", 0, False
