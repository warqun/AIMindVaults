# AIMindVaults Visualization — viz.ico 생성기 (R191 로고 교체 이후)
#
# 역할:
#   `_build/assets/logo_source_transparent.png` (사용자 제작 AMV 원형 심볼, 투명 배경)
#   → 검정 단색화 → 여백 크롭 → 9 사이즈 PNG-embedded ICO → `viz/viz.ico` 출력.
#   로고 파일 교체 시 본 스크립트만 재실행하면 아이콘이 갱신된다.
#   외부 도구·라이선스 의존 0 (System.Drawing 만 사용).
#
# 처리 단계와 근거:
#   1. 단색화 — 알파는 그대로 두고 RGB 만 0 으로. 원본의 글로우·안티에일리어싱이
#      알파에 남아 있어 형태가 뭉개지지 않는다.
#   2. 크롭 — 원본은 사방에 투명 여백이 넓다. 콘텐츠 바운딩 박스로 잘라야
#      작은 사이즈에서 심볼이 충분히 커진다.
#   3. 알파 부스트 — 로고 선이 얇아 축소하면 회색으로 날아간다 (16·24px 에서 거의 안 보임).
#      크기가 작을수록 강하게 알파를 곱해 검정을 되살린다. 실측으로 정한 계수.
#
# 출력: `viz/viz.ico` (16/20/24/32/40/48/64/128/256, PNG-embedded ICO, Vista+)
#
# 주의:
#   - exe 에 박히는 아이콘은 별도다. 본 스크립트 실행 후 `build-exe.ps1` 도 재실행해야
#     `Generate Visualization.exe` 의 내장 아이콘이 갱신된다.
#   - .NET `System.Drawing.Icon` 은 PNG-embedded ICO 프레임을 못 읽는다. 결과 검증은
#     ICO 바이트를 직접 파싱하는 방식으로 한다 (스크립트 말미에 포함).
#
# 영문화: [[20260530_viz_정본_영문화_매니페스트]] § 6.16

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vizDir    = Split-Path -Parent $scriptDir
$srcPng    = Join-Path $scriptDir 'assets\logo_source_transparent.png'
$icoPath   = Join-Path $vizDir 'viz.ico'

if (-not (Test-Path $srcPng)) { throw "로고 원본이 없습니다: $srcPng" }

# 크기별 알파 부스트 계수 — 작을수록 강하게 (얇은 선 소실 보정)
$boost = @{ 16 = 2.8; 20 = 2.5; 24 = 2.3; 32 = 1.9; 40 = 1.6; 48 = 1.35; 64 = 1.15; 128 = 1.0; 256 = 1.0 }
$sizes = @(16, 20, 24, 32, 40, 48, 64, 128, 256)

# ── 1. 단색화 + 콘텐츠 바운딩 박스 산출 ──────────────────────────────
$src  = [System.Drawing.Bitmap]::FromFile($srcPng)
$w    = $src.Width
$h    = $src.Height
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$data = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$buf  = New-Object byte[] ($data.Stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $buf.Length)

$minX = $w; $minY = $h; $maxX = -1; $maxY = -1
for ($y = 0; $y -lt $h; $y++) {
    $row = $y * $data.Stride
    for ($x = 0; $x -lt $w; $x++) {
        $i = $row + $x * 4
        if ($buf[$i + 3] -gt 8) {          # 알파 8 초과 = 콘텐츠로 간주
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
        $buf[$i] = 0; $buf[$i + 1] = 0; $buf[$i + 2] = 0   # BGRA → RGB 만 0
    }
}
[System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $buf.Length)
$src.UnlockBits($data)

if ($maxX -lt 0) { throw "콘텐츠가 없습니다 (전부 투명): $srcPng" }

# ── 2. 정사각 캔버스로 크롭 정렬 ────────────────────────────────────
$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1
$side  = [Math]::Max($cropW, $cropH)
$square = New-Object System.Drawing.Bitmap($side, $side, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($square)
$g.InterpolationMode = 'HighQualityBicubic'
$g.DrawImage($src, [int](($side - $cropW) / 2), [int](($side - $cropH) / 2),
             (New-Object System.Drawing.Rectangle($minX, $minY, $cropW, $cropH)), 'Pixel')
$g.Dispose()
$src.Dispose()

# ── 3. 사이즈별 렌더 + 알파 부스트 ──────────────────────────────────
$frames = @()
foreach ($s in $sizes) {
    $bm = New-Object System.Drawing.Bitmap($s, $s, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bg = [System.Drawing.Graphics]::FromImage($bm)
    $bg.InterpolationMode = 'HighQualityBicubic'
    $bg.PixelOffsetMode   = 'HighQuality'
    $bg.SmoothingMode     = 'HighQuality'
    $bg.DrawImage($square, 0, 0, [int]$s, [int]$s)
    $bg.Dispose()

    $k = $boost[$s]
    if ($k -gt 1.0) {
        $r = New-Object System.Drawing.Rectangle(0, 0, $s, $s)
        $d = $bm.LockBits($r, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $b2 = New-Object byte[] ($d.Stride * $s)
        [System.Runtime.InteropServices.Marshal]::Copy($d.Scan0, $b2, 0, $b2.Length)
        for ($i = 3; $i -lt $b2.Length; $i += 4) {
            $a = [int]($b2[$i] * $k)
            if ($a -gt 255) { $a = 255 }
            $b2[$i] = [byte]$a
        }
        [System.Runtime.InteropServices.Marshal]::Copy($b2, 0, $d.Scan0, $b2.Length)
        $bm.UnlockBits($d)
    }

    $ms = New-Object System.IO.MemoryStream
    $bm.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $frames += , @($s, $ms.ToArray())
    $bm.Dispose(); $ms.Dispose()
}
$square.Dispose()

# ── 4. ICO 컨테이너 작성 (PNG-embedded) ─────────────────────────────
$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([uint16]0)                 # reserved
$bw.Write([uint16]1)                 # type = icon
$bw.Write([uint16]$frames.Count)
$offset = 6 + 16 * $frames.Count
foreach ($f in $frames) {
    $s = $f[0]; $bytes = $f[1]
    $dim = if ($s -ge 256) { 0 } else { $s }   # 256 은 0 으로 표기
    $bw.Write([byte]$dim); $bw.Write([byte]$dim)
    $bw.Write([byte]0); $bw.Write([byte]0)     # colorCount, reserved
    $bw.Write([uint16]1); $bw.Write([uint16]32) # planes, bitCount
    $bw.Write([uint32]$bytes.Length)
    $bw.Write([uint32]$offset)
    $offset += $bytes.Length
}
foreach ($f in $frames) { $bw.Write($f[1]) }
$bw.Close(); $fs.Close()

# ── 5. 검증 (바이트 파싱 — System.Drawing.Icon 은 PNG 프레임을 못 읽음) ──
$raw = [System.IO.File]::ReadAllBytes($icoPath)
$count = [BitConverter]::ToUInt16($raw, 4)
$ok = 0
for ($i = 0; $i -lt $count; $i++) {
    $e   = 6 + 16 * $i
    $len = [BitConverter]::ToUInt32($raw, $e + 8)
    $off = [BitConverter]::ToUInt32($raw, $e + 12)
    if ($raw[$off] -eq 0x89 -and $raw[$off + 1] -eq 0x50 -and ($off + $len) -le $raw.Length) { $ok++ }
}
if ($ok -ne $count) { throw "ICO 검증 실패: 유효 프레임 $ok / $count" }

Write-Host "[OK] viz.ico generated: $icoPath ($($raw.Length) bytes, $count sizes, 검증 $ok/$count)"
Write-Host "[!]  exe 내장 아이콘 갱신하려면 build-exe.ps1 도 재실행하세요."
