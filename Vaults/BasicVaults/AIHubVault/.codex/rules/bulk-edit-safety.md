# Codex 대량 수정 안전 규칙

> 2026-03-04 인코딩 사고 2건의 근본 원인을 방지하기 위한 강제 절차.
> 기준: `_Standards/Encoding_BulkEdit_Safety.md`

---

## 4단계 필수 프로토콜

대량 수정(2개 이상의 파일을 스크립트로 수정)은 반드시 아래 순서를 따른다:

```
Step 1 — Dry-run
  수정 없이 대상 파일 목록 + 변경 diff 요약 출력만

Step 2 — Sample 3개
  대상 3개 파일에만 먼저 적용
  → Obsidian에서 열어 시각 확인 (Juggl 블록, frontmatter, 한글 정상 여부)

Step 3 — 전체 실행
  샘플 통과 확인 후만 전체 파일에 적용

Step 4 — 사후 검증
  node ".sync/_tools/cli-node/bin/cli.js" review -r . -s Contents
  → POST_EDIT_REVIEW_BAD=0 확인
```

---

## 안전 I/O 코드 (PowerShell)

```powershell
# 읽기
$text = [System.IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)

# 쓰기 (BOM 없는 UTF-8)
[System.IO.File]::WriteAllText($path, $newText, [Text.UTF8Encoding]::new($false))
```

---

## Juggl 블록 삽입 전용 규칙

- 삽입 전: 파일에 기존 juggl 블록 있는지 확인 → 있으면 스킵
- 삽입 위치: 첫 번째 H1 바로 아래 (빈 줄 없이)
- 제외 대상: `Domain/temp/agent_packets/**` 폴더 전체
- 삽입 내용: `local:` 값은 파일명(확장자 제외)

---

## 불변 조건 (Invariants) — 전체 실행 전 확인

스크립트가 아래를 보장하는지 확인:
- [ ] 파일당 juggl 블록 1개 이하 유지
- [ ] frontmatter 블록 손상 없음 (`---` 위치 변경 없음)
- [ ] `local:` 값이 파일명과 정확히 일치
- [ ] 줄바꿈 문자(CRLF/LF) 변경 없음

---

## 긴급 중단 규칙

`BAD_COUNT > 0` 또는 한글 깨짐 발견 시:
1. 즉시 작업 중단
2. 사용자에게 보고
3. Obsidian 스냅샷에서 복구
4. 복구 확인 후 안전 방식으로 재시도

---

## 스크립트 생성 시 필수 참조

- 새 스크립트 작성 전: `_Standards/Core/Script_Creation_Rule.md` 참조
- 중복 확인: `_Standards/Core/Script_Registry.md` 확인
- 경로 코딩: 하드코딩 금지, 자동탐지 패턴 사용
