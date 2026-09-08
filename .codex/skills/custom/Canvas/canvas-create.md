---
description: Obsidian Advanced Canvas (.canvas) 시드 생성 + 시각 검증 워크플로우
---

# /canvas-create — Canvas 생성 워크플로우

> Obsidian Canvas (Advanced Canvas) 파일을 작성·열기·검증하는 표준 절차.
> 규칙 정본: `.agents/rules/custom/Canvas/canvas-design.md`.

## 트리거

- "캔버스 만들어", "구조도 그려", "다이어그램 그려"
- "advanced canvas", "Obsidian Canvas"
- ".canvas 파일", "노드 + 엣지로"
- 시스템 구조 / 데이터 흐름 / 영역 매핑 시각화 요청

## 입력

- **주제** (예: AIMindVaults 시스템 구조, viz 데이터 흐름, lat.md 매핑)
- **대상 볼트 + 경로** (기본: `Project_AIMindVaults` 의 `Contents/Project/plan/architecture/`)
- **상세 수준** (메타 / 영역별 디테일 / 단일 영역 sub-canvas)

## 워크플로우 (5단계)

### 1. 영역·노드·엣지 정리

사용자와 합의:

- 캔버스가 표현할 **큰 줄기 (3~7 영역)**
- 각 줄기 안 **노드 후보 (3~7개)** + 텍스트 요약
- 영역 간 **데이터 흐름 화살표** + 라벨

산출: 영역 표 + 노드 목록 + 엣지 목록 (마크다운 표)

### 2. 노드 크기 — 시드만 잡고 검증 우선

룰 § 2 시드 가이드 (대략 범위) 로 출발. **정확한 px 공식 외워서 적용 X**.

- 줄 수 기반 height 시드 (2줄 80~120 / 3줄 130~170 / 4줄 170~200 / 5+ 200~240)
- 가장 긴 줄 기반 width 시드 (위키링크·코드·URL 포함 시 토큰 폭 + 여유)
- 사용자 환경마다 폰트·줌 다르므로 시드는 30% 정도 오차 허용

### 3. 노드 위치 — 시드 배치

- row 별 동일 y 좌표 (위에서 아래로 데이터 흐름)
- row 안 노드 가로 흐름 (왼쪽 → 오른쪽)
- 노드 간 gap 시드: 라벨 길이 따라 100~400 사이 적당히
- 색상은 영역별 일관 (룰 § 4 매핑)

### 4. 시드 캔버스 생성 + Obsidian 열기

```bash
# 1. Write 으로 .canvas 파일 생성 (JSON)
# 2. Obsidian URI 호출
Start-Process "obsidian://open?vault=<볼트명>&file=<상대경로.canvas>"
```

파일명 규칙: `YYYYMMDD_<영문주제>.canvas` (한국어 파일명 피하면 URI 호출 안전).

### 5. 시각 검증 + 반복 조정

#### 5.0 AI 자체 캡쳐 검증 (R127 우선)

사용자에게 묻기 전 AI 가 직접:

```powershell
# 화면 캡쳐 (Obsidian 보이는 모니터)
$temp = "$env:TEMP\aimv_check_$(Get-Date -Format 'HHmmss').png"
Add-Type -AssemblyName System.Drawing; Add-Type -AssemblyName System.Windows.Forms
$bitmap = New-Object System.Drawing.Bitmap(1920, 1080)
$g = [System.Drawing.Graphics]::FromImage($bitmap)
$g.CopyFromScreen(0, 0, 0, 0, (New-Object System.Drawing.Size(1920, 1080)))
$bitmap.Save($temp)
```

그 후 Read 도구로 PNG 분석. 부분 crop + 2x 확대로 라벨 가시성 자세히:

```powershell
# crop + 2x resize
$srcW = [int]1800; $srcH = [int]200
$rect = New-Object System.Drawing.Rectangle($x, $y, $srcW, $srcH)
$dstW = [int]($srcW * 2); $dstH = [int]($srcH * 2)
$crop = New-Object System.Drawing.Bitmap($dstW, $dstH)
# DrawImage with HighQualityBicubic
```

자체 발견한 문제만 수정.

#### 5.1 사용자 시각 검증 (필요 시)

사용자가 캔버스 열어 점검:

- 스크롤바 발생 노드? → width/height 늘림
- 텍스트 wrap 의도와 다름? → width 늘림 또는 줄바꿈 명시
- 노드 겹침? → x/y 재조정 (그룹 박스 제외)
- edge 라벨 가려짐? → 노드 간 gap 늘림

수정 후 캔버스 새로고침 (`Ctrl+R`) → 다시 점검.

### 5.2 사용자 패턴 학습 (강제)

사용자 환경 (폰트·테마·줌) 에 따라 적정 크기·간격이 시드와 크게 다를 수 있음. 사용자가 직접 조정했으면:

1. **사용자 만진 노드 분석** — 줄 수·문자 종류·width/height 추출
2. **같은 캔버스 안 유사 텍스트 다른 노드에 비례 적용** — 절대값 외운 공식 X, 사용자 패턴의 상대 비율
3. **사용자 만진 노드 좌표/크기 절대 임의 변경 금지**
4. **위치 재정렬 큰 변경은 사용자 동의 후** (캔버스 전체 폭 증가 등)

## 색상 매핑 기본값

| Preset | 색 | 용도 |
|--------|-----|------|
| `1` | red | 안전·hooks·배포·경고 |
| `2` | orange | 통신·참고·외부 |
| `3` | yellow | Hub·인프라·코어 |
| `4` | green | 데이터·인덱싱·콘텐츠 |
| `5` | cyan | 룰·스킬·시각화·자동화 |
| `6` | purple | 진입점·spec·세션·메타 |

## 출력 형식

```markdown
## Canvas 생성 완료

- 파일: `<경로>.canvas`
- 노드 수: N (영역별 분포: ...)
- 엣지 수: M

### 검증 안내
1. Obsidian 에서 `Ctrl+R` 새로고침
2. 스크롤바 / wrap / 겹침 점검
3. 어색한 부분 알려주세요 (노드 ID + 문제)
```

## 금지

- 사용자 의도 확인 없이 큰 캔버스 자동 생성 (3 영역 이상 시 합의 필수)
- 사용자 만진 노드 임의 좌표 변경
- 한국어 파일명 + URI 호출 (인코딩 이슈 가능)
- group 박스 없이 노드 겹침

## 참조

- **룰 정본**: `.agents/rules/custom/Canvas/canvas-design.md`
- **참조 캔버스**:
  - `{플러그인 볼트}/Contents/Domain/reference/advanced_canvas/AdvancedCanvas_아키텍처.canvas`
- **본 스킬 도입**: 2026-05-19 R127
