---
name: create-pdf-note
description: 로컬 PDF 또는 PDF URL에서 핵심 내용을 추려 구조화된 Obsidian 노트로 정리하는 Codex 전용 절차
---

# PDF 노트 생성

**목적**: PDF 문서의 핵심 내용을 파악해 Obsidian 노트로 재구성한다.
**범위**: Codex 전용 절차. Claude 파이프라인과 별개로 유지한다.

## Step 1: 입력과 대상 볼트 확정

- 입력값 확인:
  - 로컬 파일 경로인지, URL인지
  - 대상 볼트가 지정됐는지
  - 관심 범위나 특정 장/절이 지정됐는지
- 주제가 모호하면 저장 전에 사용자에게 확인한다.

## Step 2: 문서 확보

- 로컬 PDF면 원본을 그대로 사용한다.
- URL이면 현재 작업 규칙에 맞게 다운로드 허용 여부를 확인하고, 허용되면 `$env:TEMP` 아래에서만 받는다.
- URL에서 받은 PDF는 작업 후 삭제한다.

## Step 3: 읽기 전략 수립

- 먼저 표지, 개요, 목차, 초반부를 보고 문서 구조를 파악한다.
- 분량 기준 기본 전략:
  - 10페이지 이하: 전체 읽기
  - 10~50페이지: 목차 기반 선별 읽기
  - 50페이지 초과: 관심 범위 우선
- 부록, 참고문헌, 색인은 기본적으로 핵심 요약 범위에서 제외한다.

## Step 4: 핵심 내용 추출

- 핵심 주장과 개념을 3~5개 축으로 압축한다.
- 장/절 구조가 좋으면 참고하되 노트 구조를 그대로 복제하지는 않는다.
- 표, 도표, 그림은 텍스트 의미로 풀어서 적는다.
- 부분 페이지만 읽었으면 누락 가능성을 노트에 명시한다.

## Step 5: 노트 구조 설계

- H1은 PDF 제목 복제가 아니라 핵심 개념으로 정제한다.
- 상단에 3~5줄 핵심 요약을 둔다.
- 본문은 장/절 또는 주제군 기준 H2로 재구성한다.
- 비교 가능한 내용은 표로 압축한다.
- 마지막에는 관련 위키링크와 원문 정보, 읽은 범위 메모를 남긴다.

## Step 6: 노트 작성

- 저장 위치는 기본적으로 대상 볼트 `Contents/Domain/` 하위다.
- 프로젝트 문서로 정리하는 요청이면 `Contents/Project/`를 사용한다.
- 노트에는 아래 요소를 포함한다.
  - YAML frontmatter
  - H1
  - Juggl 블록
  - 핵심 요약
  - 구조화된 본문
  - 관련 위키링크 1개 이상

권장 frontmatter:

```yaml
---
type: domain
tags:
  - [볼트태그]
  - pdf
  - [주제태그]
source: [파일 경로 또는 URL]
source_title: [문서 제목]
source_author: [저자]
created: YYYY-MM-DD
agent: codex
---
```

## Step 7: 검토

- 실제 읽은 페이지 범위 대비 결론이 과장되지 않았는지 확인한다.
- 긴 인용이나 원문 복사가 남지 않았는지 점검한다.
- 노트 작성 규칙상 필요한 frontmatter, Juggl, 위키링크를 확인한다.
- 완료 전에 반드시 아래 post-edit review를 실행하고 `POST_EDIT_INDEX_UPDATED=1`까지 확인한다.
```powershell
powershell -ExecutionPolicy Bypass -File {볼트경로}\.sync\_tools\cli\post_note_edit_review.ps1 -Root {볼트경로} -Scope Contents
```
- `POST_EDIT_INDEX_SKIPPED=1` 또는 `POST_EDIT_INDEX_UPDATED=0`이면 아래 명령으로 수동 인덱싱 후 다시 확인한다.
```powershell
powershell -ExecutionPolicy Bypass -File {볼트경로}\.sync\_tools\cli\vault_index_build.ps1 -VaultRoot {볼트경로} -Incremental
```

## Step 8: 정리

- URL에서 받은 임시 PDF와 중간 파일을 삭제한다.
- 로컬 원본 PDF는 건드리지 않는다.

## 실패 시 대응

- 암호화 PDF: 비밀번호 필요 사실을 알린다.
- 스캔 이미지 PDF: OCR 품질 한계를 명시한다.
- 경로 오류: 잘못된 경로라고 보고하고 정확한 경로를 다시 받는다.
- 너무 큰 PDF: 관심 범위를 먼저 좁힌다.
