---
type: status
tags: [BasicLabVault, Template, Lab]
agent: claude
updated: 2026-04-22
---

# STATUS — BasicLabVault

> **이 볼트는 Lab Preset 클론 템플릿이다.**
> 직접 콘텐츠 작업 금지. workspace 는 AIHubVault_Lab 에서 동기화.

## 이 볼트의 역할

### 볼트명이 BasicLabVault인 경우
> **Lab Preset 복제 소스 템플릿** — 직접 콘텐츠 작업 대상 아님. `/create-vault` Lab Preset 선택 시 사용.

### 볼트명이 BasicLabVault가 아닌 경우
> 복제 후 초기 설정 미완료. CLAUDE.md와 이 파일의 역할을 실제 Lab 위성 용도에 맞게 수정하고, 루트 `_STATUS.md` 에 등록할 것.

## Now
- 템플릿 상태. 콘텐츠 없음.

## Next
- 복제 후 위성별 개별화 (Lab_Infra · Lab_Game · Lab_Content)

## Blocked
- 없음

## Decisions
- (2026-04-22) BasicContentsVault 구조를 기반으로 생성. Contents/ 를 Lab 9 타입 구조로 재구성.
- (2026-04-22) hub-marker.json · hub-source.json 생성하지 않음 (위성은 rebase 로 Hub 바인딩).
- (2026-04-22) Custom 플러그인 추가 설치 없음 (BasicContentsVault 복사본 유지). Lab 전용 추가 플러그인 설치는 Hub 쪽에서 처리 후 sync.
