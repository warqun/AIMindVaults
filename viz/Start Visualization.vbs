' AIMindVaults Visualization — 콘솔 숨김 실행 래퍼
' 이 .vbs 를 더블클릭하면 "Generate Visualization.bat" 을 숨김(0) 으로 실행.
' 검은 콘솔 창 없이 브라우저 앱 창만 표시된다.
' 앱 창을 닫으면 server.js 가 idle 자동 종료한다 (AIMV_VIZ_IDLE_MS, 기본 15s).
Dim sh, fso, here
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = here
sh.Run """" & here & "\Generate Visualization.bat""", 0, False
