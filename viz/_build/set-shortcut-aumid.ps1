# AIMindVaults Visualization — 바로가기 AppUserModelID 설정 (R205)
#
# 왜 필요한가:
#   런처(`Generate Visualization.exe`)는 서버를 띄운 뒤 `chrome --app=<url>` 로 창을 연다.
#   그래서 **작업표시줄에 뜨는 창은 exe 가 아니라 Chrome 앱 창**이다.
#   Windows 는 AppUserModelID(AUMID) 로 작업표시줄 버튼을 묶는데
#     - 고정 바로가기 : AUMID 없음 → exe 경로로 자동 생성
#     - Chrome 앱 창  : `Chrome.localhost_/`
#   값이 달라 **고정 아이콘과 실행 창이 별개 버튼으로 갈린다** (2026-09-03 사용자 보고).
#   바로가기에 같은 AUMID 를 박으면 하나로 합쳐진다.
#
# AUMID 값이 `Chrome.localhost_/` 인 이유:
#   Chrome 이 `--app` URL 의 **호스트명만으로** 만든다. 포트가 안 들어가므로
#   포트 fallback(8765→8766→8767)이 나도 그대로 묶인다 — 의도한 이득이다.
#   반대급부: 다른 localhost 웹앱을 `chrome --app` 으로 띄우면 같은 버튼에 묶인다.
#
# 이 설정은 **로컬 바로가기 파일의 속성**이라 git 에 안 담긴다.
# 새 디바이스·재설치·바로가기 재생성 때마다 다시 실행해야 한다.
#
#   .\set-shortcut-aumid.ps1              고정·시작메뉴·바탕화면 바로가기에 적용
#   .\set-shortcut-aumid.ps1 -Report      현재 값만 출력 (변경 없음)
#
# 적용 후 작업표시줄에 즉시 반영되지 않으면 explorer 재시작:
#   Stop-Process -Name explorer -Force

[CmdletBinding()]
param(
    [string]$Aumid = 'Chrome.localhost_/',
    [switch]$Report
)

$ErrorActionPreference = 'Stop'

$src = @'
using System;
using System.Runtime.InteropServices;
public static class AimvLnkAumid {
  [ComImport, Guid("00021401-0000-0000-C000-000000000046")] class ShellLink {}
  [ComImport, Guid("0000010b-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPersistFile { void GetClassID(out Guid c); int IsDirty(); void Load(string f, int m);
    void Save(string f, bool r); void SaveCompleted(string f); void GetCurFile(out IntPtr f); }
  [ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPropertyStore { int GetCount(out uint c); int GetAt(uint i, out PropertyKey k);
    int GetValue(ref PropertyKey k, out PropVariant v); int SetValue(ref PropertyKey k, ref PropVariant v); int Commit(); }
  [StructLayout(LayoutKind.Sequential)] struct PropertyKey { public Guid fmtid; public uint pid; }
  [StructLayout(LayoutKind.Sequential)] struct PropVariant { public ushort vt; ushort a, b, c; public IntPtr p; IntPtr p2;
    public string S() { return vt == 31 ? Marshal.PtrToStringUni(p) : null; } }
  // PKEY_AppUserModel_ID
  static PropertyKey Key() { return new PropertyKey {
    fmtid = new Guid("9F4C2855-9F79-4B39-A8D0-E1D42DE1D5F3"), pid = 5 }; }
  public static string Read(string lnk) {
    var o = new ShellLink(); ((IPersistFile)o).Load(lnk, 0);
    var k = Key(); PropVariant v; ((IPropertyStore)o).GetValue(ref k, out v); return v.S() ?? "(none)";
  }
  public static void Write(string lnk, string id) {
    var o = new ShellLink(); var pf = (IPersistFile)o;
    pf.Load(lnk, 2);                                  // STGM_READWRITE
    var ps = (IPropertyStore)o; var k = Key();
    var v = new PropVariant { vt = 31, p = Marshal.StringToCoTaskMemUni(id) };  // VT_LPWSTR
    ps.SetValue(ref k, ref v); ps.Commit();
    pf.Save(lnk, true);
    Marshal.FreeCoTaskMem(v.p);
  }
}
'@
if (-not ('AimvLnkAumid' -as [type])) { Add-Type -TypeDefinition $src -Language CSharp }

# 대상 — 있는 것만 처리한다. 셋 다 없으면 아직 바로가기를 안 만든 것.
$targets = @(
    (Join-Path $env:APPDATA 'Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\AIMindVaults.lnk'),
    (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\AIMindVaults.lnk'),
    (Join-Path ([Environment]::GetFolderPath('Desktop')) 'AIMindVaults 시각화.lnk')
) | Where-Object { Test-Path -LiteralPath $_ }

if ($targets.Count -eq 0) {
    Write-Host '[SKIP] 대상 바로가기가 없습니다. create-shortcut.ps1 을 먼저 실행하거나 작업표시줄에 고정하세요.'
    return
}

if ($Report) {
    foreach ($p in $targets) { "{0,-14} {1}" -f ([IO.Path]::GetFileName($p)), [AimvLnkAumid]::Read($p) }
    return
}

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$changed = 0
foreach ($p in $targets) {
    $before = [AimvLnkAumid]::Read($p)
    if ($before -eq $Aumid) { Write-Host "[SAME] $p"; continue }
    Copy-Item -LiteralPath $p -Destination "$p.bak_$stamp" -Force   # 되돌릴 수 있게
    [AimvLnkAumid]::Write($p, $Aumid)
    $after = [AimvLnkAumid]::Read($p)
    if ($after -ne $Aumid) { throw "AUMID 설정 실패: $p (읽은 값 '$after')" }
    Write-Host "[SET ] $p"
    Write-Host "       $before -> $after"
    $changed++
}
Write-Host "[OK] $changed 건 변경 (백업 접미사 .bak_$stamp)"
if ($changed -gt 0) {
    Write-Host '     작업표시줄에 즉시 반영되지 않으면: Stop-Process -Name explorer -Force'
}
