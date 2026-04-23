# Commands 매니페스트

> 배포 동기화 시 이 목록의 파일만 `core/`에서 관리한다.
> `custom/`은 동기화 대상이 아니다.

## 분류 기준

- **core/**: 배포본에 포함되는 스킬. 모든 사용자에게 필요한 제품 기능.
- **custom/**: 배포에 포함되지 않는 개인 스킬. 제작자·사용자 모두 해당.
- **신규 스킬은 custom/에 우선 생성**한다. 검증 후 필요하면 core/로 격상.
- core/로 격상 시 이 MANIFEST에 등록 + 배포 변경 로그에 기록.

## core/ — 배포 스킬 (동기화 대상)

| 파일명 | 용도 |
|--------|------|
| auto-organize.md | 노트/볼트 생성 시 폴더 자동 분류 |
| create-vault.md | 새 볼트 생성 (위성) |
| create-preset-hub.md | 새 Preset Hub 생성 (Multi-Hub 아키텍처) |
| grok-route.md | Grok 분기 라우터 |
| juggl-note.md | Juggl 포함 표준 노트 생성 |
| note-link.md | 노트 간 의미적 연결 |
| status-update.md | 상태 갱신 |
| vault-health.md | Vault 건강 진단 |
| vault-route.md | 볼트 라우팅 및 진입 |
| vault-update.md | 세션 종료 루틴 |
| install-plugin.md | Obsidian 플러그인 설치 |
| open-vault.md | Obsidian 볼트 열기 |
| open-note.md | Obsidian 노트 열기 |
| reindex.md | 볼트 콘텐츠 인덱스 재빌드 |
| open-notes.md | 복수 Obsidian 노트 새 탭 열기 (local-rest-api) |
| note-from-video.md | 영상 → 볼트 노트 변환 파이프라인 |
| note-from-article.md | 웹 글/텍스트 → 볼트 노트 변환 파이프라인 |
| note-from-pdf.md | PDF → 볼트 노트 변환 파이프라인 |
| hub-broadcast.md | Hub 파일 전체 볼트 즉시 전파 |
| sync-all.md | 전체 위성 볼트 워크스페이스 일괄 동기화 |

## custom/ — 사용자 스킬 (동기화 미대상)

사용자가 자유롭게 추가하는 개인 스킬.
배포 동기화가 이 폴더를 건드리지 않는다.

| 파일명 | 용도 |
|--------|------|
| discord-manage.md | AIMindVaults 디스코드 서버를 봇으로 관리 |
