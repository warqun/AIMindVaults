---
name: create-article-note
description: 웹 글, 블로그, 문서형 페이지 또는 사용자가 준 본문을 구조화된 Obsidian 노트로 정리하는 Codex 전용 절차
---

# 웹 글 노트 생성

**목적**: URL 또는 본문 텍스트에서 핵심 개념을 추출해 Obsidian 노트로 재구성한다.
**범위**: Codex 전용 절차. Claude 커맨드와 분리해서 유지한다.

## Step 1: 입력과 대상 볼트 확정

- 입력값 확인:
  - URL인지, 붙여넣은 텍스트인지
  - 대상 볼트가 지정됐는지
  - 요약 깊이, 번역 여부, 초심자용 설명 요구가 있는지
- 대상 볼트는 주제 기준으로 라우팅한다.
- 모호하면 저장 전에 사용자에게 확인한다.

## Step 2: 본문 확보

- URL이면 본문 추출이 가장 잘 되는 경로를 먼저 쓴다.
- 페이지 본문만 확보하고 광고, CTA, 댓글, 네비게이션은 제외한다.
- 로그인이나 강한 JS 렌더링 때문에 본문 확보가 안 되면 사용자에게 텍스트 제공을 요청한다.
- 가능하면 아래 메타데이터를 함께 확보한다.
  - 원문 제목
  - 저자 또는 매체
  - 게시일
  - 원문 URL

## Step 3: 핵심 주장 분리

- 글 전체를 읽고 핵심 주장이나 개념을 3~5개 축으로 압축한다.
- 예시, 마케팅 문구, 자기소개 같은 주변부는 본문 핵심과 분리한다.
- 원문 소제목은 참고만 하고, 노트 구조는 필요에 맞게 다시 짠다.

## Step 4: 노트 구조 설계

- H1은 원문 제목 복사가 아니라 핵심 개념 기준으로 정제한다.
- 상단에 3~5줄 핵심 요약을 둔다.
- 본문은 H2 기준으로 주제별 묶음으로 재구성한다.
- 비교 가능한 내용은 표로 압축한다.
- 마지막에는 관련 위키링크와 원문 링크를 남긴다.

## Step 5: 저작권 안전선 유지

- 원문을 길게 옮기지 않는다.
- 직접 인용이 필요하면 짧은 한 문장 수준만 사용한다.
- 나머지는 자체 표현으로 재구성한다.
- 긴 연속 패러프레이즈 대신 핵심 개념과 구조를 다시 설명하는 방식으로 쓴다.

## Step 6: 노트 작성

- 저장 위치는 기본적으로 대상 볼트 `Contents/Domain/` 하위다.
- 프로젝트 작업 문맥이면 `Contents/Project/`를 사용한다.
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
  - article
  - [주제태그]
source: [원문 URL 또는 출처]
source_title: [원문 제목]
source_author: [저자 또는 매체]
created: YYYY-MM-DD
agent: codex
---
```

## Step 7: 검토

- 원문 핵심이 빠지지 않았는지 확인한다.
- 원문 문장을 길게 끌고 온 부분이 없는지 점검한다.
- 노트 작성 규칙상 필요한 frontmatter, Juggl, 위키링크를 확인한다.
- 완료 전에 반드시 아래 post-edit review를 실행하고 `POST_EDIT_INDEX_UPDATED=1`까지 확인한다.
```powershell
powershell -ExecutionPolicy Bypass -File {볼트경로}\.sync\_tools\cli\post_note_edit_review.ps1 -Root {볼트경로} -Scope Contents
```
- `POST_EDIT_INDEX_SKIPPED=1` 또는 `POST_EDIT_INDEX_UPDATED=0`이면 아래 명령으로 수동 인덱싱 후 다시 확인한다.
```powershell
powershell -ExecutionPolicy Bypass -File {볼트경로}\.sync\_tools\cli\vault_index_build.ps1 -VaultRoot {볼트경로} -Incremental
```

## 실패 시 대응

- 로그인 필요: 사용자에게 본문 제공을 요청한다.
- 본문이 너무 짧음: 짧은 노트로 정리하되 정보 한계를 명시한다.
- 다국어 문서: 한국어로 정리하되 핵심 용어는 원문 병기한다.
- 본문 추출 실패: 링크만 저장하지 말고, 실패 이유와 필요한 입력을 같이 보고한다.
