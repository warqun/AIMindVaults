# CLI Toolkit (AIMindVault)

## Files
- `_tools/cli/task_router.ps1`: task text 기반 주 담당/보조 담당 추천.

## Usage
```powershell
powershell -ExecutionPolicy Bypass -File .\_tools\cli\task_router.ps1 -Task "Vault 구조 검증"
```

## Routing policy
- Claude: 목표 정의, 범위 분해, 최종 결론
- Codex: 구현/자동화/검증
- Gemini: 대안 비교/설명 재구성
- Antigravity: 리스크 점검/리뷰(선택)
