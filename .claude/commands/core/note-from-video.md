# /note-from-video — 영상 → 볼트 노트 변환 파이프라인

> 영상 URL을 받아 구조화된 노트를 생성하는 정형화된 파이프라인.
> YouTube, Vimeo 등 yt-dlp 지원 플랫폼 대상.

입력: $ARGUMENTS

## 인코딩 안전 (강제)

- 한국어 노트, MOC, status, agent-comm 파일은 `Get-Content | Set-Content`, `Out-File`, 기본 redirect로 재작성하지 않는다.
- Windows PowerShell에서 `$OutputEncoding`이 `us-ascii`인 상태로 한국어 here-string이나 생성 본문을 `python -`, `node -` 같은 프로세스에 pipe하지 않는다. 이 경로는 한글이 자식 프로세스에 도달하기 전에 literal `?`로 치환될 수 있다.
- Python/Node 스크립트로 생성해야 하면 UTF-8 파일 기반 스크립트를 쓰고, Python은 `open(..., encoding='utf-8')`를 명시한다. `python -` stdin은 ASCII-only program text에 한정한다.
- 한국어 노트 생성 후에는 post-edit review와 별도로 한글 무결성 검사를 실행한다: 기대 한국어 파일의 Hangul syllables 수 > 0, `\?{3,}` 개수 = 0.

## 노트 모드 (2종, 강제 선택)

파이프라인 시작 전에 모드를 정한다. 사용자가 지정하면 그대로, 없으면 영상 성격으로 판단하고 모호하면 확인.

| 모드 | 목적 | type | 산출물 성격 |
|------|------|------|------------|
| **학습 정보 정리** (기본) | 영상이 설명하는 내용을 최대한 잡아내 영구 사용할 정보 노트 제작 | `study-note` | 개념·절차·표 중심 완결 정리 |
| **컨텐츠 요약** | 영상에 담긴 컨텐츠의 맥락을 파악해 정리 — 영상 작업·컨텐츠 제작의 레퍼런스 수집용 | `reference` | 컨텐츠 구성·연출·소재·맥락 요약 (JissouGame 컨텐츠 수집과 동일 계열) |

- 컨텐츠 요약 모드는 "무엇을 가르치나"가 아니라 "이 컨텐츠가 어떻게 구성됐나"를 기록한다: 소재 선택, 전개 구조, 연출 포인트, 참고할 요소.
- 5단계 이하의 구조화 원칙은 두 모드 공통. type 과 본문 관점만 다르다.

## 화면 정보 분석 (자막 보조·대체)

다음 경우 자막에만 의존하지 않고 **영상 프레임을 직접 확인**한다:

1. **자막 없음** — 화면 기반으로 내용 파악 (2단계 fallback)
2. **화면 비중이 높은 영상** — 개발 시연, 알고리즘 설명, 에디터 조작, 다이어그램 중심 영상은 화면 정보가 스크립트보다 중요할 때가 많다. 자막이 있어도 코드·수식·구조도가 화면에만 있으면 프레임 확인 병행.

방법:

```bash
# 저화질 다운로드 (분석용, $TEMP)
yt-dlp -f "worst[height>=480]" -o "$TEMP/aimind_yt_sub/%(id)s.mp4" "URL"
# 챕터 시작점 또는 일정 간격 프레임 추출
ffmpeg -ss {시각} -i "$TEMP/aimind_yt_sub/{id}.mp4" -frames:v 1 "$TEMP/aimind_yt_sub/f_{시각}.png"
```

- 추출한 프레임을 Read 로 분석. 챕터 시작점 우선, 없으면 30~60초 간격 샘플링 후 정보 밀도 높은 구간만 촘촘히.
- 전체 프레임 스캔 금지 — 자막·챕터로 위치를 좁힌 뒤 필요한 구간만.
- 프레임에서 읽은 코드·수식은 노트에 옮기되, 화질로 불확실한 부분은 `[?]` 표시.

## 파이프라인 단계

### 1단계: 메타데이터 수집

- yt-dlp로 영상 메타데이터 추출 (제목, 채널, 길이, 챕터)
- 명령: `yt-dlp --dump-json "URL" | jq '{title, channel, duration, chapters}'`
- 챕터가 없으면 영상 설명란에서 타임스탬프 추출 시도

### 2단계: 자막 확보

우선순위대로 시도:

1. **수동 자막 (ko)**: `yt-dlp --list-subs "URL"` → `ko` 있으면 다운로드
2. **자동생성 자막 (ko)**: 수동 없으면 자동생성 한국어 자막 다운로드
3. **자동생성 자막 (en→ko)**: 한국어 없으면 영어 자막 다운로드
4. **자막 없음**: 설명란·챕터 확보 후 **화면 정보 분석** (상단 § 참조) 으로 전환. 그래도 부족하면 한계 명시

다운로드 명령:
```bash
yt-dlp --write-sub --write-auto-sub --sub-lang ko --sub-format srt --skip-download -o "$TEMP/aimind_yt_sub/%(id)s" "URL"
```

### 3단계: 자막 정제

- SRT 파일을 읽으면서 타임코드 제거, 중복 문장 병합
- 자동생성 자막의 명백한 오인식 보정 (맥락상 명확한 것만)
  - 예: "세곤도" → "색온도", "안부" → "암부", "주강부" → "주광부"
- 보정한 항목을 노트 하단에 기록 (투명성)

### 4단계: 볼트 라우팅

- 영상 주제 키워드로 대상 볼트 판단 (루트 CLAUDE.md 볼트 진입 프로토콜 참조)
- 사용자가 볼트를 지정했으면 그대로 사용
- 모호하면 사용자에게 확인
- 대상 볼트의 Contents/Domain/ 하위에 배치 (주제별 하위폴더 있으면 활용)

### 5단계: 노트 구조화

#### 5-0. 영상 길이로 단일 노트 / 폴더 구조 분기 (강제)

1단계에서 얻은 `duration` 기준:

| 길이 | 산출물 |
|------|-------|
| **30분 미만** | 단일 노트 1개 |
| **30분 이상** | **폴더 + 폴더 노트 + 챕터 노트 N개** |

30분 이상 영상은 한 노트에 밀어넣지 않는다. 구조:

```
{대상폴더}/{노트명}/
├── {노트명}.md              ← 폴더 노트 (type: folder-index)
├── {노트명}_01_{섹션}.md     ← 챕터 노트 (type: study-note)
├── {노트명}_02_{섹션}.md
└── ...
```

- **폴더 노트**: 영상 전체 요약 3~5줄 + 원본 영상 링크 + 챕터 노트 목차 (`[[위키링크]]` 목록, 각 항목에 한 줄 설명). 세부 내용은 넣지 않는다.
- **챕터 노트**: 영상 챕터 기준으로 분할. 챕터가 없으면 주제 전환 기준. **3~8개** 목표 — 챕터가 20개짜리 강좌면 인접 챕터를 주제 단위로 묶는다. 각 노트는 그 자체로 읽히는 완결 노트.
- 챕터 노트 → 폴더 노트 역링크 1개 필수.
- 파일명 규칙 (URI 예약문자·이모지 금지) 은 폴더명에도 동일 적용.

#### 5-1. 노트 본문 원칙

챕터 기반으로 구조를 잡되, 아래 원칙 적용:

- **H1**: `{핵심 주제}` (영상 제목 그대로가 아니라 핵심 개념으로 정제)
- **핵심 요약**: 영상 전체를 3~5줄로 압축 (노트 상단)
- **본문**: 챕터 또는 주제 전환 기준으로 H2 섹션 분리
- **각 섹션**: 핵심 개념 → 구체적 설명 → 표/비교 (해당 시) 순서
- **마무리**: 관련 자료, 추천 리소스, 위키링크

Frontmatter (R119 — type=study-note, tags 5-12 PascalCase):
```yaml
---
type: study-note   # 컨텐츠 요약 모드는 reference
tags:
  - [PrimaryDomain]
  - [SecondaryDomain]
  - [Topic1]
  - [Topic2]
  - Video
source: [영상URL]
source_title: [영상 원제]
source_channel: [채널명]
created: YYYY-MM-DDTHH:MM:SS   # 생성 시각까지 (로컬). 한 번 쓰면 수정 금지 — R189
agent: claude
---
```
- type 정본: CoreHub `data/note-types.yaml` — `study-note` 권장 (외부 영상 학습 노트). 폴더 노트만 `folder-index`.
- tags 5-12개 PascalCase, 5 미만 시 post-edit-review WARN
- 폴더 구조인 경우 폴더 노트·챕터 노트 **전부** 동일한 `source` / `source_title` / `source_channel` 을 넣는다 (dedup 근거).

Juggl 임베드 포함 (파일명 기반).

#### 5-2. 영상 링크 본문 명기 (강제)

frontmatter `source` 만으로 끝내지 않는다. 모든 영상 노트는 **H1 + Juggl 바로 아래** 에 원본 링크 줄을 둔다.

```markdown
> 원본 영상: [{영상 원제}]({영상URL}) — {채널명} · {길이}
```

챕터 노트는 해당 구간 타임스탬프 링크를 쓴다 (`https://youtu.be/{id}?t={시작초}`):

```markdown
> 원본 영상: [{영상 원제} — {챕터명}](https://youtu.be/{id}?t={시작초}) · {구간 mm:ss~mm:ss}
```

### 6단계: 품질 검증

- 노트 작성 후 post-edit review 실행
- 자막 오인식에서 온 의미 불명확 부분이 있으면 `[?]` 표시
- 한국어 출력물은 생성/수정한 Markdown 전체에 대해 한글 무결성 검사를 실행하고, `HANGUL_MISSING=0`, `QMARK_CORRUPTION=0` 확인 전에는 완료하지 않는다.

```powershell
$files = @("C:\absolute\path\to\created-note.md")
$missingHangul = @()
$qmarkCorruption = @()
foreach ($file in $files) {
  $text = Get-Content -Raw -Encoding UTF8 -LiteralPath $file
  if ([regex]::Matches($text, '\p{IsHangulSyllables}').Count -eq 0) { $missingHangul += $file }
  if ([regex]::Matches($text, '\?{3,}').Count -gt 0) { $qmarkCorruption += $file }
}
"HANGUL_CHECK_FILES=$($files.Count)"
"HANGUL_MISSING=$($missingHangul.Count)"
"QMARK_CORRUPTION=$($qmarkCorruption.Count)"
if ($missingHangul.Count -gt 0 -or $qmarkCorruption.Count -gt 0) { throw "Korean text integrity check failed" }
```

### 7단계: 정리

- `$TEMP/aimind_yt_sub/` 임시 파일 삭제
- 삭제 확인 후 완료 보고

## 초심자 노트 옵션

사용자가 "초심자용", "쉽게" 등을 요청하면:
- 전문 용어에 괄호 설명 추가
- 비유/예시 보강
- 핵심 포인트를 볼드로 강조
- 표와 비교를 적극 활용

## 실패 시 대응

| 상황 | 대응 |
|------|------|
| yt-dlp 미설치 | 사용자에게 설치 안내 |
| 자막 없음 | 설명란 + 챕터로 가능한 만큼 정리, 한계 명시 |
| 영상 비공개/삭제 | 즉시 보고 |
| SRT 파싱 실패 | VTT 포맷으로 재시도 |
