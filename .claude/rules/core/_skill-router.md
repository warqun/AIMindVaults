# Skill Router (Mandatory · Always Loaded)

> 에이전트는 **매 사용자 메시지 수신 시** 이 테이블을 검토하여 트리거 키워드에 해당하는 Skill을 호출하거나 규칙 파일을 수동 Read한 후 작업을 시작한다.
> 매칭 없으면 `_essentials.md`만으로 진행. 복수 매칭 시 순차 처리.
> 이미 세션 내에서 호출/Read한 규칙은 재실행 금지 (토큰 절약).

## 운영 규칙

1. 사용자 첫 메시지 + 작업 도중 새 트리거 감지 시마다 검토.
2. 매핑 값은 **Skill 호출** 또는 **Read할 규칙 파일 경로**. Skill이 있으면 Skill 우선.
3. Skill 호출은 `Skill` 도구로 `<name>` 실행. 파일 Read가 필요하면 해당 Skill 본문 지시에 따라 archive 규칙을 Read.
4. 로드된 규칙을 적용하며 작업.

## 트리거 매핑 테이블

| 작업 유형 | 트리거 키워드 | 호출 대상 |
|---------|-------------|---------------|
| 새 볼트 생성 | 볼트 생성, create-vault, 새 볼트, 볼트 분리 | `/create-vault` Skill + `.claude/rules-archive/vault-individualization.md` Read |
| 대량 편집 · 인코딩 | 대량 수정, 일괄 변경, 인코딩, mojibake, 한글 깨짐, bulk rewrite | `.claude/rules/core/encoding-safety.md` + `.claude/rules/core/temp-file-management.md` (core 주입됨) |
| 스크립트 생성 | 스크립트 생성, .ps1, .py 신규, 자동화 스크립트 | `.claude/rules/core/script-creation-approval.md` + `.claude/rules/core/script-management.md` (core 주입됨) |
| Juggl 편집 | Juggl, graph.css, Juggl 임베드 | `.claude/rules/core/juggl-style-sync.md` (core 주입됨) |
| .obsidian/ 편집 | .obsidian, 플러그인 설정, community-plugins.json | `.claude/rules/core/obsidian-config-safety.md` (core 주입됨) |
| 유저 가이드 저위험 (§1, §3, §6, §7, §9, §12) | Obsidian 열기, 노트 어디에, 어느 볼트, 플러그인 설치, 세션 종료, 끝났어, 정리해, 마무리, 노트 어디 있어, 어떻게, 뭘 해야, 모르겠, 까먹, 방법, 절차, 다음에 뭐, how to, what should I | `.claude/rules-archive/user-guidance-detail.md` Read |
| 임시 파일 · 재귀 삭제 | 임시 파일, MAX_PATH, 무한 재귀, flatten-and-delete, robocopy | `.claude/rules/core/temp-file-management.md` (core 주입됨) |

## 매칭 실패 시

- 키워드 없음 → `_essentials.md`만으로 작업.
- 필요한 규칙이 있을 것 같은데 테이블에 없음 → 사용자에게 "이 작업에 적용할 규칙이 있는지" 확인 후 진행.
- 새로운 작업 유형이 자주 발생 → `core/_skill-router.md` 또는 사용자 개인 `custom/` 규칙에 추가.

## 사용자 확장 가능

사용자는 자신의 도메인에 맞춰 이 테이블을 확장할 수 있다:

1. `.claude/commands/custom/` 에 개인 Skill을 추가
2. `.claude/rules-archive/` 에 관련 규칙 파일 배치
3. 이 테이블에 트리거 키워드 → Skill/파일 경로 행 추가

예시: Unity 작업, Blender 3D 모델링, Notion 기록 등 — 각자의 워크플로우에 맞게 Skill 생성 후 이 라우터에 등록.
