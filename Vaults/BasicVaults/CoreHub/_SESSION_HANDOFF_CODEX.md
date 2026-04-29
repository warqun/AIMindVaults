---
type: session-handoff
agent: codex
session_date: 2026-04-24
---

# 세션 핸드오프 — Codex — 2026-04-24

## 작업 요약

수동 workspace sync 런처를 CoreHub 정본으로 추가했다. 루트 전체 실행은 `Sync All Vaults.*`, 볼트 단일 실행은 `Sync This Vault.*`이며, CoreHub CLI에 `sync-all`과 `install-launchers` 명령을 추가했다.

## 변경 사항

- 신규 CLI: `.sync/_tools/cli-node/src/commands/sync-all.js`
- 신규 CLI: `.sync/_tools/cli-node/src/commands/install-launchers.js`
- 신규 공통 라이브러리: `.sync/_tools/cli-node/src/lib/launchers.js`
- 신규 템플릿: `.sync/_tools/launchers/root/Sync All Vaults.bat|command|sh`
- 신규 템플릿: `.sync/_tools/launchers/vault/Sync This Vault.bat|command|sh`
- 수정: `bin/cli.js`, `sync-workspace.js`, `config.js`, `.sync/_Standards/Core/Script_Registry.md`
- CoreHub `_WORKSPACE_VERSION.md`: `202604240001`, `202604240002`
- CoreHub `bump-version --broadcast` 완료, Preset Hub 6개 버전 bump 완료

## 검증

- `aimv sync-all --help`: 통과
- `aimv install-launchers --help`: 통과
- `cmd`에서 `Sync All Vaults.bat --help`: 통과
- `bash -n` on root/vault `.sh`/`.command`: 통과
- `Project_AIMindVaults` 단일 `pre-sync`: 성공, `Sync This Vault.*` 설치 확인
- `Project_AIMindVaults/Sync This Vault.bat`: 성공, `sync.log` exit 0
- `Sync All Vaults.bat`: 전체 40볼트 성공, 실패 0
- 재실행: 전체 40볼트 성공, `npm installs: 0`, `Launchers: 0 copied`

## 결정 사항

- (2026-04-24) 런처 템플릿 정본은 CoreHub `.sync/_tools/launchers/`에 둔다.
- (2026-04-24) 루트 런처는 CoreHub CLI를 직접 호출하고, 볼트 런처는 자기 볼트의 `.sync/_tools/cli-node/bin/cli.js pre-sync`를 호출한다.
- (2026-04-24) PowerShell 의존성은 추가하지 않고 Node.js/npm과 플랫폼 기본 셸만 사용한다.
- (2026-04-24) SellingVault 배포 대상에 포함하는 것이 맞지만, 실제 배포 동기화는 별도 `/distribute` 작업으로 남긴다.

## 다음 세션 첫 작업

1. `/register-vaults` 구현 후 `Setup New Device.*` 런처와 결합할지 결정한다.
2. `20260317_배포_동기화_규칙.md` 변경 로그는 이번 작업의 `Contents/**` 수정 금지 조건 때문에 후속 Contents 작업으로 처리한다.
3. 배포 동기화 시 Korean/English SellingVault 양쪽에 root launcher와 BasicVaults/CoreHub 템플릿 포함을 확인한다.

## 주의

- 전체 sync 검증으로 위성 workspace가 Hub 기준 최신 상태로 전파됐다. 콘텐츠 노트는 수정하지 않았다.
- `sync.log`는 `.gitignore` 대상이며 commit하지 않는다.
