# AIMindVaults CLI 레퍼런스

Node.js 기반 크로스플랫폼 CLI 도구. 볼트 인덱싱, 동기화, 리뷰, 볼트 관리 등 AIMindVaults 핵심 기능을 제공한다.

- 위치: `.sync/_tools/cli-node/bin/cli.js`
- 프로그램명: `aimv`
- 런타임: Node.js ESM
- 플랫폼: Windows / macOS / Linux

## 실행 방법

```bash
node "{볼트경로}/.sync/_tools/cli-node/bin/cli.js" <command> [options]
```

전역 설치 또는 alias 설정 후:

```bash
aimv <command> [options]
```

---

## 인덱서

### index build

볼트 콘텐츠 인덱스를 빌드한다. `vault_index.json`을 생성하며, 이후 `index search`의 검색 소스가 된다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-r, --vault-root <path>` | 볼트 경로 | 자동탐지 |
| `-i, --incremental` | 변경된 파일만 증분 빌드 | false |
| `-v, --verbose` | 상세 출력 | false |

```bash
# 전체 빌드
node cli.js index build -r "/path/to/vault"

# 증분 빌드 (변경된 파일만)
node cli.js index build -r "/path/to/vault" -i
```

---

### index search

인덱스에서 노트를 검색한다. 키워드, 태그, type 필터를 조합할 수 있다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-r, --vault-root <path>` | 볼트 경로 | 자동탐지 |
| `-q, --query <keyword>` | 키워드 검색 (title, tags, headings 가중 랭킹) | |
| `-t, --tag <tag>` | 태그 필터 | |
| `--type <type>` | frontmatter type 필터 | |
| `-f, --format <fmt>` | 출력 형식 (`table` \| `compact`) | `table` |
| `-n, --top <n>` | 최대 결과 수 | 10 |

```bash
# 키워드 검색
node cli.js index search -q "색채학"

# 태그 + compact 출력
node cli.js index search -q "색채학" -t "knowledge" -f compact

# type 필터
node cli.js index search --type "study-note" -n 5
```

---

### index master-build

AIMindVaults 전체 볼트에 걸친 크로스볼트 마스터 인덱스를 빌드한다. 볼트 경계를 넘어 노트를 검색할 때 사용한다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-r, --root <path>` | AIMindVaults 루트 경로 | 자동탐지 |
| `--vault-name <name>` | 특정 볼트만 부분 업데이트 | |

```bash
# 전체 마스터 인덱스 빌드
node cli.js index master-build

# 특정 볼트만 갱신
node cli.js index master-build --vault-name "Unity"
```

---

### index master-search

마스터 인덱스에서 크로스볼트 검색을 수행한다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-r, --root <path>` | AIMindVaults 루트 경로 | 자동탐지 |
| `-q, --query <keyword>` | 키워드 검색 | |
| `-t, --tag <tag>` | 태그 필터 | |
| `--vault <vault>` | 볼트명 필터 | |
| `-f, --format <fmt>` | 출력 형식 (`table` \| `compact`) | `table` |
| `-n, --top <n>` | 최대 결과 수 | 15 |
| `-c, --concepts-only` | 크로스볼트 컨셉 맵만 표시 | false |

```bash
# 크로스볼트 키워드 검색
node cli.js index master-search -q "스킬 시스템"

# 특정 볼트 내 검색
node cli.js index master-search -q "ECS" --vault "Unity"

# 크로스볼트 컨셉 맵만 확인
node cli.js index master-search -c
```

---

## 리뷰

### review

노트 편집 후 UTF-8 인코딩 검증 및 자동 인덱싱을 수행한다. 편집 완료 직후 반드시 실행해야 한다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-r, --vault-root <path>` | 볼트 경로 | 자동탐지 |
| `-s, --scope <name>` | 검사 범위 폴더명 | |
| `-v, --verbose` | 상세 출력 | false |

**출력 코드:**

| 출력 | 의미 |
|------|------|
| `POST_EDIT_REVIEW_BAD=0` | 인코딩 오류 없음 (정상) |
| `POST_EDIT_REVIEW_BAD=N` | N건 오류 — 해당 파일 수정 필요 |
| `POST_EDIT_INDEX_UPDATED=1` | 인덱싱 완료 |
| `POST_EDIT_INDEX_SKIPPED=1` | 인덱싱 건너뜀 — 수동 빌드 필요 |

검토 통과 시 자동으로 `index build -i`를 호출한다.

```bash
# 기본 리뷰
node cli.js review -r "/path/to/vault"

# Contents 폴더 한정 검사
node cli.js review -r "/path/to/vault" -s "Contents"
```

`POST_EDIT_INDEX_SKIPPED=1`이 출력되면 수동으로 인덱스를 갱신한다:

```bash
node cli.js index build -r "/path/to/vault" -i
```

---

## 동기화

### sync

Hub(AIHubVault)와 위성볼트 간 workspace 파일을 동기화한다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-r, --vault-root <path>` | 볼트 경로 | 자동탐지 |
| `--hub-path <path>` | Hub 경로 | 자동탐지 |
| `-d, --dry-run` | 실제 변경 없이 미리보기 | false |
| `--no-prune` | 타겟에만 있는 파일 삭제 안 함 | false |
| `--verify-content` | 버전 일치해도 파일 해시 강제 검증 | false |

```bash
# 동기화 미리보기
node cli.js sync -r "/path/to/vault" -d

# 실제 동기화
node cli.js sync -r "/path/to/vault"

# 파일 삭제 없이 동기화
node cli.js sync -r "/path/to/vault" --no-prune
```

---

### pre-sync

트램펄린 커맨드. 현재 실행 중인 `cli.js`와 Hub의 `cli.js`를 해시 비교하여, 구버전이면 Hub 버전으로 자동 교체 후 `sync`를 실행한다.

Obsidian의 Shell Commands 플러그인 on-layout-ready 이벤트에 연결되어 볼트 열기 시 자동 실행된다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-r, --vault-root <path>` | 볼트 경로 | 자동탐지 |

```bash
node cli.js pre-sync -r "/path/to/vault"
```

---

## 볼트 관리

### clone

BasicContentsVault를 기반으로 새 볼트를 클론한다. 수동 폴더 복사 대신 이 커맨드를 사용한다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-t, --target-path <path>` | 생성할 볼트 경로 (필수) | |
| `-n, --project-name <name>` | 볼트 표시 이름 | |
| `-s, --source-path <path>` | 소스 볼트 경로 | 자동탐지 |

```bash
node cli.js clone \
  -t "/path/to/Vaults/Domains_Game/NewVault" \
  -n "NewVault"
```

---

### broadcast

Hub의 `.sync/` 내 특정 파일을 전체 위성볼트에 전파한다. 특정 스크립트나 설정 파일을 단일 파일 단위로 배포할 때 사용한다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-p, --relative-path <path>` | `.sync/` 기준 상대 경로 (필수) | |
| `-d, --dry-run` | 미리보기 | false |
| `-f, --force` | 타겟에 파일이 없어도 생성 | false |
| `-e, --exclude <patterns...>` | 제외할 볼트명 패턴 | |
| `--vaults-root <path>` | `Vaults/` 폴더 경로 | 자동탐지 |

```bash
# 미리보기
node cli.js broadcast -p "_tools/cli-node/bin/cli.js" -d

# 전파 실행
node cli.js broadcast -p "_tools/cli-node/bin/cli.js"

# 특정 볼트 제외
node cli.js broadcast -p "_tools/cli-node/bin/cli.js" -e "BasicContentsVault"
```

---

## 유틸리티

### trash-clean

각 볼트의 `.trash/` 폴더를 일괄 정리한다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-v, --vault <names...>` | 특정 볼트만 지정 | 전체 |
| `-d, --dry-run` | 미리보기 | false |
| `--vaults-root <path>` | `Vaults/` 폴더 경로 | 자동탐지 |

```bash
# 전체 볼트 미리보기
node cli.js trash-clean -d

# 특정 볼트만 정리
node cli.js trash-clean -v "Unity" "GameDesign"

# 실제 삭제
node cli.js trash-clean
```

---

### open

`pre-sync`를 실행한 후 Obsidian에서 해당 볼트를 연다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-r, --vault-root <path>` | 볼트 경로 | 자동탐지 |

```bash
node cli.js open -r "/path/to/vault"
```

---

### bridge

Obsidian local-rest-api 플러그인과 연동하는 CLI 래퍼. 노트 읽기/쓰기, 검색, 히스토리 조회 등을 수행한다.

| 옵션 | 설명 |
|------|------|
| `-a, --action <action>` | 실행할 액션 (아래 목록 참조) |
| `-r, --vault-root <path>` | 볼트 경로 |
| `--vault-name <name>` | 볼트명 |
| `-p, --path <path>` | 대상 노트 경로 |
| `-q, --query <query>` | 검색어 |
| `-c, --content <text>` | 추가/생성할 내용 |
| `--version` | 버전 정보 |
| `--from` | 히스토리 시작 날짜 |
| `--to` | 히스토리 종료 날짜 |
| `-l` | 목록 출력 |
| `--plugin-id` | 플러그인 ID |
| `-s` | 간략 출력 |

**지원 액션:**

| 액션 | 설명 |
|------|------|
| `vault-info` | 볼트 정보 조회 |
| `search` | 노트 전문 검색 |
| `read` | 노트 내용 읽기 |
| `open` | Obsidian에서 노트 열기 |
| `append` | 노트에 내용 추가 |
| `create` | 노트 생성 |
| `history` | 편집 히스토리 조회 |
| `plugins-list` | 설치된 플러그인 목록 |
| `post-review` | 편집 후 리뷰 트리거 |

```bash
# 볼트 정보 확인
node cli.js bridge -a vault-info -r "/path/to/vault"

# 노트 읽기
node cli.js bridge -a read -p "Contents/Domain/note-title.md" -r "/path/to/vault"

# 노트에 내용 추가
node cli.js bridge -a append -p "Contents/Domain/note.md" -c "추가할 내용" -r "/path/to/vault"
```

---

### route

작업 설명을 입력하면 적합한 에이전트와 볼트를 추천한다.

| 옵션 | 설명 |
|------|------|
| `-t, --task <description>` | 작업 설명 (필수) |

```bash
node cli.js route -t "Unity 타일맵 렌더링 최적화 작업"
```

---

### standards

볼트의 `_Standards/` 디렉토리 구조를 확인한다.

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `-r, --vault-root <path>` | 볼트 경로 | 자동탐지 |
| `-d, --deep` | 하위 폴더까지 표시 | false |

```bash
# 기본 구조 확인
node cli.js standards -r "/path/to/vault"

# 하위 폴더 포함
node cli.js standards -r "/path/to/vault" -d
```

---

## 자주 쓰는 워크플로우

### 노트 편집 후 리뷰

노트 편집을 마치면 반드시 `review`를 실행한다. `POST_EDIT_REVIEW_BAD=0`과 `POST_EDIT_INDEX_UPDATED=1`을 확인한다.

```bash
node cli.js review -r "/path/to/vault"
```

### 전체 볼트 인덱스 갱신

인덱스가 오래됐거나 대량 노트를 추가한 후 실행한다.

```bash
# 증분 빌드 (권장)
node cli.js index build -r "/path/to/vault" -i

# 전체 재빌드
node cli.js index build -r "/path/to/vault"
```

### 수동 동기화

볼트를 열 때 자동 실행되지 않은 경우 수동으로 실행한다.

```bash
# 미리보기 후 실행
node cli.js sync -r "/path/to/vault" -d
node cli.js sync -r "/path/to/vault"
```

### 전체 위성볼트 일괄 sync (bash 루프)

AIHubVault를 제외한 모든 위성볼트에 순서대로 동기화를 실행한다.

```bash
VAULTS_ROOT="/c/AIMindVaults/Vaults"
CLI="/c/AIMindVaults/Vaults/BasicVaults/AIHubVault/.sync/_tools/cli-node/bin/cli.js"

for vault_dir in "$VAULTS_ROOT"/*/*; do
  [ -d "$vault_dir" ] || continue
  vault_name=$(basename "$vault_dir")
  [ "$vault_name" = "AIHubVault" ] && continue
  echo "--- Syncing: $vault_name"
  node "$CLI" sync -r "$vault_dir"
done
```

---

## 참고

- PS1 스크립트에서 전환됨 (2026-04-13)
- 이전 스크립트: `.sync/_tools/cli/vault_index_build.ps1`, `vault_index_search.ps1`, `post_note_edit_review.ps1`, `sync_workspace.ps1`
- 인덱서 우선 검색 규칙: 노트 탐색 시 Grep/Glob 전에 `index search`를 먼저 사용한다 (`token-optimization.md` § 0 참조)
