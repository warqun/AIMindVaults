# Rules 매니페스트

> 배포 동기화 시 이 목록의 파일만 `core/`에서 관리한다.
> `custom/`은 동기화 대상이 아니다.

## 분류 기준

- **core/**: 배포본에 포함되는 규칙. 모든 사용자에게 필요한 제품 기능.
- **custom/**: 배포에 포함되지 않는 개인 규칙. 제작자·사용자 모두 해당.
- **신규 규칙은 custom/에 우선 생성**한다. 검증 후 필요하면 core/로 격상.
- core/로 격상 시 이 MANIFEST에 등록 + 배포 변경 로그에 기록.

## core/ — 배포 규칙 (동기화 대상)

| 파일명 | 용도 |
|--------|------|
| distribution-sync.md | 배포 동기화 규칙 |
| edit-mode-separation.md | 편집 모드 분리 |
| encoding-safety.md | 인코딩 안전 |
| juggl-style-sync.md | Juggl 스타일 동기화 |
| note-writing.md | 노트 작성 패턴 |
| post-edit-review.md | Post-Edit Review |
| script-creation-approval.md | 스크립트 생성 사전 승인 |
| script-management.md | 스크립트 관리 |
| session-exit.md | 세션 종료 상태 갱신 |
| temp-file-management.md | 임시 파일 관리 |
| token-optimization.md | 토큰 절약 |
| vault-routing.md | 볼트 라우팅 |
| obsidian-config-safety.md | Obsidian 설정 파일 안전 편집 |
| vault-individualization.md | 볼트 개별화 (생성 시 이름/분류/역할 구체화) |

## custom/ — 사용자 규칙 (동기화 미대상)

사용자가 자유롭게 추가하는 개인 규칙.
배포 동기화가 이 폴더를 건드리지 않는다.

| 파일명 | 용도 |
|--------|------|
| multivault-personalization.md | 멀티볼트 개인화 (에이전트/플러그인/스킬 커스텀) |
