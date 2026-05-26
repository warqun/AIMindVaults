---
tags:
  - plugin
  - git
  - backup
  - timemachine
  - guide
date: 2026-03-07
---

# Obsidian Git + Time Machine 최적 설정 가이드 (2026년 기준)

**목적**: 옵시디언 볼트의 완벽한 백업과 과거 시점 타임라인 복원 시스템을 구축하기 위한 최적화된 설정 조합입니다. Obsidian Git 플러그인과 Time Machine 플러그인의 시너지를 최대화합니다.

이 조합은 실수로 내용을 지웠을 때 직관적으로 타임라인을 넘겨가며 복구(Time Machine)할 수 있게 해주고, 동시에 클라우드(GitHub)에 안전하게 장기 형상 관리 백업(Obsidian Git)을 해주는 **최고의 백업+타임라인 시스템**입니다.

---

## 1. Obsidian Git – 자동 커밋 최적 설정 (가장 중요!)

**설정 경로**: `Settings(설정)` → `Community plugins` → `Obsidian Git` 설정(⚙️) 열기

| 설정 항목 | 추천 값 | 이유 / 팁 |
| :--- | :--- | :--- |
| **Auto commit-and-sync interval** | **10분** (5~15분 사이) | 5분은 너무 자주 커밋되어 무거워질 수 있음. 10분이 가장 안정적. |
| **Auto commit-and-sync after stopping file edits** | `On` | 파일 수정이 끝나면 바로 커밋하여 실시간 백업성 증가 |
| **Auto pull interval** | **10분** | 커밋 간격과 동일하게 맞춤 |
| **Auto pull on startup** | `On` | 옵시디언을 켤 때마다 자동으로 최신 버전을 가져옴 |
| **Push on commit-and-sync** | `On` | 커밋과 동시에 GitHub 원격 저장소로 자동 푸시 (백업 확정) |
| **Author name for commit** | 본인 이름 | (필수 설정) |
| **Author email for commit** | GitHub 이메일 | (필수 설정) |
| **Commit message template** | `{{date:YYYY-MM-DD HH:mm}} {{message}}` | 커밋 메시지에 시간이 자동 기록되어 나중에 식별하기 매우 좋음 |
| **Merge strategy** | `Merge` (또는 `Rebase`) | 혼자 사용하는 개인 볼트라면 `Merge`가 가장 무난하고 안전함 |

**추가로 켜두면 좋은 옵션:**
- `Auto backup after latest commit` → `On`
- `Pull changes before commit` → `On`

> 💡 **효과:** 이렇게 설정해두면 하루에 100~200개 정도의 자동 커밋이 자연스럽게 쌓이면서도 옵시디언 성능에 무리를 주지 않습니다.

---

## 2. Time Machine – 타임라인 보는 법

Time Machine 플러그인은 **별도의 복잡한 설정이 거의 필요 없습니다**. 
Git이 이미 볼트에 연결되어 있다면, **자동으로 Git 커밋 내역과 옵시디언 기본 File Recovery 스냅샷을 하나의 타임라인으로 합쳐서 보여줍니다** (중복은 자동 제거됨).

### 타임라인 진입 방법 (3가지)

1. **가장 쉬운 방법 (추천)**
   - 과거 기록을 보고 싶은 노트를 엽니다.
   - 오른쪽 사이드바 메뉴에서 **Time Machine 아이콘(시계 모양 ⏱️)**을 클릭합니다.
   - 화면 하단에 바로 타임라인 슬라이더가 등장합니다!
2. **명령어 팔레트로 열기**
   - `Ctrl + P`를 누르고 `Time Machine: Open timeline for current file`을 검색하여 실행합니다.
3. **탐색기에서 열기**
   - 파일 탐색기에서 노트 제목을 우클릭하고 `Open Time Machine`을 선택합니다.

### 타임라인 활용 기능
- 하단의 **슬라이더를 좌우로 드래그**하면서 과거 버전(수정 내역)을 실시간 미리보기로 확인할 수 있습니다.
- 특정 시점을 선택한 뒤, 문서 전체를 롤백하는 것뿐만 아니라 **특정 문단(부분)만 복사해서 되돌리기**가 가능합니다.
- 타임라인 상의 **파란 점은 Git 커밋**을, **회색 점은 시스템 File Recovery** 스냅샷을 나타냅니다.

---

## 3. 전체 최적 조합 요약 (이대로 따라 하세요)

1. **File Recovery (코어 플러그인)** 
   - 켜기 (간격은 `5분` 추천)
2. **Obsidian Git (커뮤니티 플러그인)** 
   - 위의 최적화 표대로 10분 간격 자동 동기화 셋팅
3. **Time Machine (커뮤니티 플러그인)** 
   - 설치 및 활성화 (자동 연동됨)

이 상태를 세팅해두면:
- 실수로 노트를 날려버리면 **Time Machine 타임라인**으로 즉각 부분 복구할 수 있습니다.
- 장기적인 문서 훼손/손실을 막기 위해 **GitHub**에 안전하게 자동 저장(백업)됩니다.
- PC에서는 Git 기반, 모바일에서는 File Recovery 타임라인을 통해 언제 어디서든 방어 체계가 작동합니다.
