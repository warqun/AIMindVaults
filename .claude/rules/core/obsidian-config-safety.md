# Obsidian 설정 파일 안전 편집 (Mandatory)

> 모든 볼트에 동일 적용.

## 규칙

- `.obsidian/` 하위 파일(플러그인 설정, `community-plugins.json` 등)은 **workspace 편집**이다.
- workspace 편집 규칙에 따라 **AIHubVault에서만 수행** → `sync_workspace.ps1`로 전파한다.

## .obsidian/ JSON 파일 편집 — 안전 규칙

- **PowerShell의 `ConvertFrom-Json` → `ConvertTo-Json` 파이프라인을 사용하지 않는다.**
  - 배열 원소 1개일 때 문자열로 변환되는 버그, 인코딩 손상 위험이 있다.
- `.obsidian/` 설정 파일 편집은 **Read → Edit(텍스트 직접 수정)** 방식만 사용한다.
- 전체 덮어쓰기(`Write`)는 내용을 직접 작성할 때만 허용한다.

## 버전 기록 (강제)

- `.obsidian/` 하위 파일을 수정한 경우, **반드시** AIHubVault `_WORKSPACE_VERSION.md`에 버전을 기록한다.
- 버전 기록 없이 작업 완료 보고 금지.
- 이 규칙은 플러그인 설치, 설정 변경, JSON 편집 등 `.obsidian/` 관련 **모든** workspace 편집에 적용된다.

## 플러그인 설치/삭제

- 플러그인 설치·삭제·설정 변경은 `install-plugin` 스킬을 사용한다.
- 스킬 없이 수동 설치 시에도 이 규칙의 안전 수칙을 따른다.
