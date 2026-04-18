# /create-vault — 새 볼트 생성

신규 Obsidian 볼트를 생성한다. BasicContentsVault를 소스로 복제.

## 사용법

```
/create-vault <카테고리>/<볼트명>
```

예시:
- `/create-vault Domains_Infra/Notion`
- `/create-vault Domains_Game/Unreal`
- `/create-vault Projects_GameTool/Project_RPG`

## 프로세스

### 1. 경로 확인

- 대상 경로: `C:/AIMindVaults/Vaults/<카테고리>/<볼트명>`
- 카테고리 폴더가 없으면 생성 불가 — 사용자에게 확인
- 이미 존재하는 볼트명이면 중단

### 2. clone 커맨드 실행 (강제 — 수동 복사 금지)

```bash
node "{BasicContentsVault}/.sync/_tools/cli-node/bin/cli.js" clone -t "C:/AIMindVaults/Vaults/<카테고리>/<볼트명>" -n "<볼트명>"
```

- 소스: **BasicContentsVault** (범용 볼트 템플릿, 자동 감지)
- 반드시 이 CLI를 사용한다. `Copy-Item`, `cp`, `xcopy` 등 수동 복사 금지.
- AIHubVault는 소스로 사용하지 않음 (작업환경 허브라 구조가 무거움)
- **상세 규칙(필수 결정 항목·후속 작업·상위 폴더 분류·배포 제외 항목) 참조**: `.claude/rules-archive/vault-individualization.md` Read

### 3. 생성 후 필수 작업

1. 새 볼트의 `CLAUDE.md` 수정:
   - 제목을 `# <볼트명> — <볼트 역할 설명>`으로 변경
   - "이 볼트의 역할" 섹션을 실제 용도에 맞게 변경
   - 디렉토리 구조를 실제 구조에 맞게 변경
   - tags에 볼트 고유 태그 추가
2. 새 볼트의 `_STATUS.md` 초기화:
   - "이 볼트의 역할"을 실제 용도에 맞게 변경 (복제 소스 설명 제거)
   - Now/Next/Blocked 비우기
3. 루트 `CLAUDE.md` 볼트 레지스트리에 새 볼트 등록
4. 루트 `_STATUS.md` 볼트 레지스트리에 새 볼트 행 추가 (타입, 콘텐츠 설명, 작업 에이전트)
5. `_ROOT_VERSION.md`에 변경 기록

### 4. Obsidian에 볼트 등록 안내

사용자에게 직접 등록하도록 안내한다:

> Obsidian 볼트 매니저 → "보관함 폴더 열기" → `{생성된 볼트 경로}` 선택

**`obsidian://open?path=` URI로 미등록 볼트를 여는 것을 금지한다.**
URI 방식은 앱 상태 전환 + 등록 + 플러그인 로드를 동시 처리하여 로딩이 매우 느리다.
이미 등록된 볼트 전환에만 `obsidian://open?vault=` URI를 사용한다.

### 5. 완료 보고

생성된 볼트 경로와 수행한 후속 작업을 사용자에게 보고.
