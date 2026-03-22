---
description: "Obsidian 플러그인 설치 (AIHubVault 기준)"
---

# /install-plugin — Obsidian 플러그인 설치

## 사용법

```
/install-plugin <플러그인명 또는 GitHub URL>
```

## 절차

### 1. 대상 확인

- 설치 대상 볼트: **AIHubVault만** (workspace 편집 규칙)
- 플러그인 경로: `AIHubVault/.obsidian/plugins/<플러그인ID>/`

### 2. 플러그인 다운로드

```powershell
$pluginDir = 'C:/AIMindVaults/Vaults/BasicVaults/AIHubVault/.obsidian/plugins/<플러그인ID>'
New-Item -ItemType Directory -Path $pluginDir -Force
```

- GitHub Releases API에서 최신 릴리스의 `main.js`, `manifest.json`, `styles.css` 다운로드
- `styles.css`가 없는 플러그인도 있음 (정상)

### 3. community-plugins.json 등록

**금지**: PowerShell `ConvertFrom-Json` → `ConvertTo-Json` 파이프라인 사용 금지 (배열 손상 위험)

**올바른 방법**: `Read` 도구로 파일을 읽고, `Edit` 도구로 플러그인ID를 배열에 직접 추가

```
기존:
  "templater-obsidian",
  "ytranscript"
]

변경:
  "templater-obsidian",
  "ytranscript",
  "<새 플러그인ID>"
]
```

### 4. 다른 볼트 전파

- `sync_workspace.ps1` 실행으로 대상 볼트에 플러그인 전파 (Batch 0 병합 방식)
- 사용자에게 전파 실행 여부 확인 후 진행

### 5. 활성화 확인

- 대상 볼트를 Obsidian에서 열기/재시작 안내
- **사용자가 플러그인 활성화를 확인할 때까지 후속 작업(노트 열기 등)을 진행하지 않는다**
- 활성화 확인 방법: Obsidian 설정 → Community plugins → 해당 플러그인 토글 ON

### 6. 버전 기록

- AIHubVault `_WORKSPACE_VERSION.md`에 버전 기록 (workspace 편집 규칙)

## 노트 열기 시 사전 조건

AI가 `obsidian://advanced-uri`로 노트를 열기 전에 반드시 확인:

1. **대상 볼트에 Advanced URI 플러그인이 설치되어 있는가** — `.obsidian/plugins/obsidian-advanced-uri/` 존재 확인
2. **`community-plugins.json`에 등록되어 있는가** — `obsidian-advanced-uri` 포함 확인
3. 위 조건 미충족 시 → 이 스킬(`/install-plugin`)로 설치 먼저 수행
4. 설치 후 → 5단계(활성화 확인)까지 완료된 후에만 노트 열기 시도

## 주의사항

- `.obsidian/` JSON 파일은 PowerShell JSON 파이프라인 대신 텍스트 직접 편집만 사용
- 플러그인 삭제 시에도 동일: `community-plugins.json`에서 해당 줄 제거 + 폴더 삭제
- 베타 플러그인(BRAT 경유)은 이 스킬 대상이 아님
