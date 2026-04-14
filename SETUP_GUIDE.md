---
type: guide
tags:
  - AIMindVault
  - Meta
updated: 2026-04-15
---

# 설치 가이드

> 새 PC에 처음 세팅하거나 다른 사람에게 전달할 때 참조하는 문서.
> AI 에이전트도 온보딩 시 이 문서로 환경 점검 후 미설치 항목을 안내한다.

---

## 빠른 시작

1. `AIMindVaults` 폴더를 원하는 위치에 복사 (또는 `git clone`).
2. Obsidian 설치 후 실행.
3. 볼트 스위처 → **보관함 폴더 열기** → `Vaults/BasicVaults/AIHubVault` 선택.
4. `Vaults/BasicVaults/BasicContentsVault`도 같은 방식으로 등록.
5. 처음 열 때 **Trust author and enable plugins** 승인 → Hub-Sync가 자동 실행됩니다.

정상 경로는 여기서 끝. 이하 섹션은 문제 생겼을 때 또는 에이전트 환경 점검용입니다.

---

## 필수 소프트웨어

### 1. Obsidian (필수)

볼트 뷰어. 이게 없으면 볼 수 있는 게 없습니다.

- 다운로드: https://obsidian.md/download
- 다운로드한 설치 파일을 기본 옵션으로 설치.
- 확인: 시작 메뉴 / 런처에서 Obsidian 실행.

### 2. Obsidian CLI (필수)

터미널에서 Obsidian을 제어하는 기능. 에이전트 자동화와 스크립트 연동에 필요합니다.

- 활성화: Obsidian → 설정 (톱니바퀴) → **General** → **Enable CLI** 토글 ON.
- 확인: 터미널에서 `obsidian --help` 실행 시 도움말 출력.

> "Please download the latest installer" 메시지가 뜨면 인스톨러가 오래된 것. https://obsidian.md/download 에서 최신판 재설치하면 해결됩니다.

### 3. Node.js (조건부)

`aimv` CLI와 일부 커뮤니티 플러그인(local-rest-api 등)이 사용합니다. 에이전트 없이 Obsidian만 뷰어로 쓸 거면 생략해도 됩니다.

- 다운로드: https://nodejs.org/ (LTS 권장)
- 기본 옵션으로 설치.
- 확인: `node --version` 실행 시 버전 출력.

### 4. AI 에이전트 (선택)

사용할 에이전트를 설치합니다.

| 에이전트 | 설치 | 비고 |
|---------|------|------|
| Claude Code | `npm install -g @anthropic-ai/claude-code` | Node.js 필요 |
| Codex | Codex 데스크탑 앱 또는 CLI | 별도 설치 |

---

## 볼트를 Obsidian에 등록

1. Obsidian 실행.
2. 좌하단 볼트 스위처(금고 아이콘) 클릭.
3. **Open folder as vault** 선택.
4. `AIMindVaults/Vaults/BasicVaults/AIHubVault` 폴더 선택.
5. **Trust author and enable plugins** 승인.
6. 열고 싶은 다른 볼트도 같은 방식으로 반복.

### 처음 열 때 일어나는 일

Shell Commands 플러그인이 `on-layout-ready` 이벤트로 `syncworkspace`를 자동 실행합니다. `.sync/` 폴더가 생성되고 Hub의 workspace가 내려옵니다. 별도로 할 일은 없고, 첫 실행이 안정화될 때까지 기다리면 됩니다.

---

## 에이전트용 참조

새 환경에서 에이전트가 세션을 시작할 때:

1. `AGENT_ONBOARDING.md` §6 환경 점검으로 현재 상태 파악.
2. 미설치 항목이 있으면 위 해당 섹션을 인용하여 설치 안내.
3. 볼트가 아직 등록 안 되어 있으면 "볼트를 Obsidian에 등록" 절차 안내.
