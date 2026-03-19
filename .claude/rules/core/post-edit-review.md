# Post-Edit Review (Mandatory)

> 모든 볼트에 동일 적용.

## 규칙

- 노트 편집 완료 직후 아래 검토를 반드시 실행:
```powershell
powershell -ExecutionPolicy Bypass -File {볼트경로}\_tools\cli\post_note_edit_review.ps1
```
- `POST_EDIT_REVIEW_BAD=0` 확인 전에는 완료 보고 금지.

## Obsidian CLI 우선 사용

- 조회/검색/히스토리 복구는 먼저 해당 볼트의 `_tools/cli/obsidian_ai_bridge.ps1`를 사용한다.
- 파일 직접 파싱은 CLI 결과로 부족할 때만 사용한다.
- 편집 후에는 `-Action post-review`로 검토를 완료한다.
