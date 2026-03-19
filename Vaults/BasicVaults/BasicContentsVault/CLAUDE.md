---
tags:
  - AIMindVault
  - Meta
type: workflow
updated: 2026-03-19
---

# BasicContentsVault — 볼트 복제 소스 템플릿

> **이 볼트는 `/create-vault` 스킬의 복제 소스(템플릿)이다.**
> 직접 콘텐츠 작업 금지. 새 볼트 생성 시에만 사용.

## 볼트명이 BasicContentsVault인 경우

이 볼트는 `/create-vault`의 **복제 소스 템플릿**이다.
- 직접 콘텐츠 작업 금지
- workspace는 AIHubVault에서 `sync_workspace.ps1`로 동기화
- 관련: `/create-vault` 스킬

## 볼트명이 BasicContentsVault가 아닌 경우

이 볼트는 복제 후 아직 초기 설정이 안 된 상태이다. **즉시 아래를 수행한다:**
1. 이 CLAUDE.md의 제목/역할/구조를 실제 볼트 용도에 맞게 수정
2. `_STATUS.md`의 볼트 역할도 동일하게 수정
3. 루트 `_STATUS.md` 볼트 레지스트리에 이 볼트를 등록 (미등록 시)
