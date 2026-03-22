# /create-vault — 새 볼트 생성

신규 Obsidian 볼트를 생성한다. BasicContentsVault를 소스로 복제.

## 사용법

```
/create-vault <카테고리>/<볼트명>
```

예시:
- `/create-vault Domains_Infra/Notion`
- `/create-vault Domains_Game/Unreal`
- `/create-vault Projects_Game/Project_RPG`

## 프로세스

### 1. 경로 확인

- 대상 경로: `C:/AIMindVaults/Vaults/<카테고리>/<볼트명>`
- 카테고리 폴더가 없으면 생성 불가 — 사용자에게 확인
- 이미 존재하는 볼트명이면 중단

### 2. clone_vault.ps1 실행

```powershell
powershell -ExecutionPolicy Bypass -File "C:/AIMindVaults/Vaults/BasicVaults/BasicContentsVault/_tools/clone_vault.ps1" -TargetPath "C:/AIMindVaults/Vaults/<카테고리>/<볼트명>" -ProjectName "<볼트명>"
```

- 소스: **BasicContentsVault** (범용 볼트 템플릿)
- AIHubVault는 소스로 사용하지 않음 (작업환경 허브라 구조가 무거움)

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

### 4. 완료 보고

생성된 볼트 경로와 수행한 후속 작업을 사용자에게 보고.
