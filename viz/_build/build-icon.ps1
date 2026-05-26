# AIMindVaults Visualization — 아이콘 자체 생성기
# System.Drawing 으로 256x256 PNG 그린 뒤 ICO 컨테이너에 박는다.
# 외부 도구·라이선스 의존 0.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vizDir = Split-Path -Parent $scriptDir
$icoPath = Join-Path $vizDir 'viz.ico'

$size = 256
$bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::Transparent)

# viz 카테고리 톤 (tokens.css 와 대응)
$colors = @{
    center = [System.Drawing.Color]::FromArgb(255, 38,  42,  56)   # 짙은 회색 (중앙)
    n1     = [System.Drawing.Color]::FromArgb(255, 224, 79,  95)   # 빨강 (안전/경고)
    n2     = [System.Drawing.Color]::FromArgb(255, 79,  142, 224)  # 파랑 (인프라)
    n3     = [System.Drawing.Color]::FromArgb(255, 90,  192, 130)  # 초록 (데이터)
    n4     = [System.Drawing.Color]::FromArgb(255, 167, 119, 217)  # 보라 (메타)
    edge   = [System.Drawing.Color]::FromArgb(180, 90,  98,  120)  # 반투명 회색
}

$center  = @{ x = 128; y = 128; r = 36; color = $colors.center }
$nodes = @(
    @{ x = 56;  y = 56;  r = 30; color = $colors.n1 },
    @{ x = 200; y = 56;  r = 30; color = $colors.n2 },
    @{ x = 56;  y = 200; r = 30; color = $colors.n3 },
    @{ x = 200; y = 200; r = 30; color = $colors.n4 }
)

# 엣지 먼저 (노드 뒤로 가도록)
$edgePen = New-Object System.Drawing.Pen($colors.edge, 10)
$edgePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$edgePen.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
foreach ($n in $nodes) {
    $g.DrawLine($edgePen, $center.x, $center.y, $n.x, $n.y)
}

# 노드 (외곽 흰 테두리 → 가독성)
$borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 245, 245, 250), 6)
foreach ($n in @($center) + $nodes) {
    $brush = New-Object System.Drawing.SolidBrush($n.color)
    $g.FillEllipse($brush, $n.x - $n.r, $n.y - $n.r, $n.r * 2, $n.r * 2)
    $g.DrawEllipse($borderPen, $n.x - $n.r, $n.y - $n.r, $n.r * 2, $n.r * 2)
    $brush.Dispose()
}

$edgePen.Dispose()
$borderPen.Dispose()

# PNG → MemoryStream
$pngStream = New-Object System.IO.MemoryStream
$bmp.Save($pngStream, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $pngStream.ToArray()
$pngStream.Dispose()
$g.Dispose()
$bmp.Dispose()

# ICO 컨테이너 (PNG embedded, Vista+ 지원)
$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter($fs)

# ICONDIR
$bw.Write([uint16]0)   # reserved
$bw.Write([uint16]1)   # type = ICO
$bw.Write([uint16]1)   # count = 1

# ICONDIRENTRY
$bw.Write([byte]0)     # width 0 = 256
$bw.Write([byte]0)     # height 0 = 256
$bw.Write([byte]0)     # colorCount
$bw.Write([byte]0)     # reserved
$bw.Write([uint16]1)   # planes
$bw.Write([uint16]32)  # bitCount
$bw.Write([uint32]$pngBytes.Length)
$bw.Write([uint32]22)  # imageOffset = 6 (dir) + 16 (entry)

# PNG data
$bw.Write($pngBytes)
$bw.Close()
$fs.Close()

Write-Host "[OK] viz.ico generated: $icoPath ($($pngBytes.Length) bytes PNG)"
