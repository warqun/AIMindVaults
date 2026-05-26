# Script Management (Mandatory)

> 모든 볼트에 동일 적용.

## 규칙

- 새 스크립트 생성 전 반드시 해당 볼트의 `_Standards/Core/Script_Registry.md` 확인 → 중복 기능 여부 판단.
- 기존 스크립트 확장으로 해결 가능하면 새 스크립트를 만들지 않는다.
- 경로 하드코딩 금지 — 스크립트 위치 기반 자동탐지(`$ScriptDir\..\..`) 사용.
- 생성 후 반드시 Script_Registry.md에 등록.
- 삭제 시 레지스트리의 "삭제된 스크립트" 섹션에 이동 + 사유 기록.
