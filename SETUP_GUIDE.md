---
type: guide
tags:
  - AIMindVault
  - Meta
updated: 2026-04-08
---

# AIMindVaults 환경 설정 가이드

> 새 PC에 AIMindVaults를 처음 설치하거나 다른 사람에게 전달할 때 참조하는 문서.
> AI 에이전트가 온보딩 시 이 문서를 참조하여 미설치 항목을 안내할 수 있다.

---

## 빠른 시작

1. AIMindVaults 폴더를 원하는 위치에 복사 또는 `git clone`
2. Obsidian 설치 후 실행
3. 볼트 매니저 → **"보관함 폴더 열기"** → `Vaults/BasicVaults/AIHubVault` 선택
4. 같은 방식으로 `Vaults/BasicVaults/BasicContentsVault` 등록
5. 각 볼트를 처음 열면 "Trust author and enable plugins" 승인 → 자동 동기화 실행

---

## 외부 소프트웨어 설치

### 1. Obsidian (필수)

볼트 뷰어. 이것 없이는 노트를 볼 수 없다.

- **다운로드**: https://obsidian.md/download
- **설치**: 다운로드한 설치 파일 실행
- **확인**: 시작 메뉴에서 "Obsidian" 검색

### 2. Obsidian CLI (필수)

터미널에서 Obsidian을 제어하는 기능. 에이전트 자동화와 스크립트 연동에 필요.

- **활성화 방법**:
  1. Obsidian 실행
  2. 설정 (좌하단 톱니바퀴) → General
  3. **"Enable CLI"** 토글 활성화
- **확인**: 터미널에서 `obsidian --help` 실행 시 도움말 출력

> 인스톨러가 오래된 경우 "Please download the latest installer" 메시지가 나올 수 있다. 이 경우 https://obsidian.md/download 에서 최신 인스톨러를 재설치하면 해결.

### 3. Node.js (조건부)

local-rest-api 플러그인 등 일부 커뮤니티 플러그인이 필요로 한다. AI 에이전트 없이 순수 뷰어로만 쓸 경우 불필요.

- **다운로드**: https://nodejs.org/ (LTS 버전 권장)
- **설치**: 다운로드한 설치 파일 실행. 기본 옵션으로 진행.
- **확인**: 터미널에서 `node --version` 실행 시 버전 출력

### 4. AI 에이전트 (선택)

AI 에이전트를 사용하려면 해당 에이전트를 설치한다.

| 에이전트 | 설치 | 비고 |
|---------|------|------|
| Claude Code | `npm install -g @anthropic-ai/claude-code` | Node.js 필요 |
| Codex | Codex 데스크탑 앱 또는 CLI | 별도 설치 |

---

## 볼트를 Obsidian에 등록

1. Obsidian 실행
2. 좌하단 볼트 스위처 (금고 아이콘) 클릭
3. "Open folder as vault" 선택
4. `AIMindVaults/Vaults/BasicVaults/AIHubVault` 폴더 선택
5. "Trust author and enable plugins" 클릭
6. 나머지 볼트도 동일하게 반복

### 초기 동기화 트리거

각 볼트를 Obsidian에서 열면 Shell Commands 플러그인이 `on-layout-ready` 이벤트로 `syncworkspace`를 자동 실행한다. 이때 `.sync/` 폴더가 생성되고 Hub의 workspace가 동기화된다.

---

## 에이전트용 참조

에이전트가 새 환경에서 세션을 시작할 때:

1. `AGENT_ONBOARDING.md` §6 환경 점검을 수행하여 현재 상태를 파악한다
2. 미설치 항목이 있으면 이 문서의 해당 섹션을 인용하여 설치 방법을 안내한다
3. 볼트 등록이 안 되어 있으면 위 "볼트를 Obsidian에 등록" 절차를 안내한다
