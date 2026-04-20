# Hub 공유 가이드 (Multi-Hub Phase 3)

Multi-Hub 아키텍처에서 자체 Preset Hub 또는 Core Hub 를 **GitHub 레포로 공유** 하고, 다른 사용자가 `aimv install-hub` 로 설치하는 전 과정.

## 1. 개요

AIMindVaults 는 Core Hub (정본 Core 계층) 과 N개의 Preset Hub (성격별 번들) 구조다. Phase 3 부터는 이 Hub 들을 독립 GitHub 레포로 공유할 수 있다.

### 배포 vs 공유

| | 배포 (`aimv deploy`) | 공유 (`aimv install-hub`) |
|---|---|---|
| **방향** | 제작자 → SellingVault | 제작자 ↔ 다른 사용자 |
| **대상** | AIMindVaults 전체 | 단일 Hub 볼트 |
| **레포** | `AIMindVaults` / `AIMindVaults-EN` | 임의 (사용자 자유) |
| **용도** | 제품 릴리스 | Hub 번들 재사용 |

## 2. Hub 패키징 (제작자)

### 2.1 Preset Hub 레포 만들기

Preset Hub 볼트 루트를 독립 git 레포로 초기화.

```bash
cd Vaults/BasicVaults/AIHubVault_GameDev
git init
git add -A
git commit -m "Initial: Game Development Preset Hub"
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

### 2.2 필수 메타 확인 (`hub-marker.json`)

Hub 루트의 `.sync/hub-marker.json` 에 다음이 포함되어 있어야 한다:

```json
{
  "hubId": "game-dev",
  "hubType": "preset",
  "hubName": "Game Development Preset Hub",
  "version": "1.0.0",
  "coreHub": "../CoreHub",
  "coreHubVersion": "^1.0.0",
  "description": "Unity·Unreal·게임 디자인 등 게임 개발 특화 번들"
}
```

| 필드 | 의미 | 공유 시 주의 |
|------|------|-------------|
| `hubId` | 고유 식별자 | 다른 사용자 환경과 충돌하지 않도록 중복 피하기 |
| `hubType` | `core` / `preset` | Preset 이면 `coreHub` 필수 |
| `version` | Hub 번들 버전 (semver 권장) | 릴리스마다 증가 |
| `coreHubVersion` | 요구 Core Hub 버전 | 호환성 기준 (`^1.0.0` 등) |
| `coreHub` | Core Hub 상대경로 | 설치 시 사용자 환경에 맞게 유효한 경로로 유지되도록 설계 |

### 2.3 공유 전 정리 체크리스트

- [ ] `.git` 외 per-device 파일 제거: `.obsidian/plugins/*/data.json` 중 로그인 세션/토큰 포함분
- [ ] `.obsidian/workspace.json`, `workspace-mobile.json` 등 개별 편집 상태 제거 (gitignore 권장)
- [ ] 개인 API 키·자격증명이 노트·data.json 에 없는지 확인
- [ ] `LICENSE` 파일 포함 (MIT/Apache/CC 등)
- [ ] `README.md` 에 Preset 의 용도·포함 플러그인·설치법·`coreHubVersion` 명시
- [ ] `hubId` 가 일반 명사 (`dev`, `writer`, `student` 등) 가 아닌 이름 공간 포함 (`acme-dev`, `myteam-writer`)

### 2.4 권장 `.gitignore`

```gitignore
# Obsidian per-device
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.obsidian/graph.json
.obsidian/backlink-in-document.json

# Plugin per-device data
.obsidian/plugins/obsidian-git/data.json
.obsidian/plugins/claudian/data.json

# OS
.DS_Store
Thumbs.db

# Caches
.trash/
.vault_data/
```

## 3. Hub 설치 (소비자)

### 3.1 사전 조건

- AIMindVaults 로컬 레포 보유 (Core Hub 포함)
- git 설치됨
- `aimv` CLI 사용 가능

### 3.2 설치

```bash
aimv install-hub --url https://github.com/<user>/<repo>.git
```

자동 동작:
1. 기본 경로 `Vaults/BasicVaults/<repo-name>/` 에 `git clone`
2. `.sync/hub-marker.json` 검증
3. `hubType=preset` 이면 `coreHubVersion` 대비 로컬 Core Hub 버전 호환성 체크
4. per-device 설정 제거

### 3.3 옵션

| 옵션 | 용도 |
|------|------|
| `-t, --target <path>` | 설치 경로 지정 (기본: Vaults/BasicVaults/<repo-name>) |
| `-b, --branch <name>` | 특정 브랜치 체크아웃 |
| `-d, --dry-run` | 실제 clone 없이 계획만 표시 |
| `--skip-compat-check` | `coreHubVersion` 불일치 경고 무시 |

### 3.4 호환성 불일치 시

로컬 Core Hub 버전이 설치하려는 Preset 의 `coreHubVersion` 요구를 만족하지 못하면 경고 표시:

```
[WARN]     Compatibility WARNING: 1.0.0 < required ^2.0.0
```

선택지:
- 로컬 Core Hub 업데이트 (`cd Vaults/BasicVaults/CoreHub && git pull` 또는 재설치)
- `--skip-compat-check` 로 강제 설치 (권장하지 않음)
- 설치 포기

### 3.5 설치 후

```bash
# (선택) 로컬 Core 최신분을 신규 Preset 에 반영
aimv core-sync-all --target Vaults/BasicVaults/<repo-name>

# 위성 볼트를 신규 Preset 에 바인딩
aimv rebase --hub Vaults/BasicVaults/<repo-name> --dry-run
aimv rebase --hub Vaults/BasicVaults/<repo-name>

# 또는 새 위성 생성
aimv clone --target-path <새 위성 경로> --hub Vaults/BasicVaults/<repo-name>
```

## 4. 버전 관리 (제작자)

### 4.1 변경 배포 절차

1. Preset Hub 볼트에서 변경 (Custom 플러그인 추가·규칙 수정 등)
2. `hub-marker.json` 의 `version` 필드 증가 (semver 규칙 권장)
3. Core 계층 관련 의존성 변경 시 `coreHubVersion` 갱신
4. `_WORKSPACE_VERSION.md` 엔트리 추가
5. `git commit` + `git push`

### 4.2 Core Hub 버전 변경 시

Core Hub 가 Major 버전 업그레이드 되면 기존 Preset 들의 `coreHubVersion` 재검토 필요:
- `^1.0.0` 을 `^2.0.0` 으로 올리고 Major 호환성 깨지는 부분 마이그레이션
- 구 Core 사용자를 위해 이전 브랜치 유지 (`legacy-v1`)

## 5. 운영 주의

### 5.1 Hub 간 순환 참조 금지

Preset A 의 `coreHub` 이 Preset B 를 가리키고, B 의 `coreHub` 이 A 를 가리키면 resolver 무한 루프. `coreHub` 은 항상 `hubType=core` 인 Hub 를 가리켜야 한다 (플랫 2단계 제약).

### 5.2 hubId 충돌 방지

설치 후 로컬에 `hubId="dev"` 인 Hub 가 두 개 있으면 `core-sync-all` 이 둘 다 Preset 대상으로 취급하므로 의도 불명확. 네임스페이스 포함된 `hubId` 사용 권장 (`acme-dev`).

### 5.3 라이선스

- Hub 번들에 포함되는 플러그인은 각 플러그인의 라이선스를 따름
- 규칙·스킬·표준 문서는 Hub 레포 LICENSE 의 적용을 받음
- 위성 콘텐츠는 사용자 소유 — Hub 제작자에게 권리 없음

## 6. 참조

- 설계 문서: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md`
- 스키마: `Vaults/BasicVaults/CoreHub/.sync/schemas/hub-marker.schema.json`
- CLI 레퍼런스: `docs/cli-reference.md`
