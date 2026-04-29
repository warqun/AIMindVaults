---
type: standard
tags:
  - TileMapToolKit
  - AIMindVault
  - architecture
  - vault-types
created: 2026-03-18
updated: 2026-03-18
---

# 볼트 유형 정의

멀티볼트 시스템에서 사용하는 볼트 카테고리 및 각 유형의 역할/규칙 정의.

---

## 유형 목록

| 유형 | 카테고리 접두사 | 역할 | Contents 범위 |
|------|----------------|------|---------------|
| **Basic** | `BasicVaults/` | 작업환경 허브, 범용 템플릿 | Domain + Project |
| **Domain** | `Domains_<영역>/` | 특정 주제의 지식 축적 전용 | Domain 위주 |
| **Lab** | `Lab_<영역>/` | 지식 축적 + 실제 개발/실험 복합 | Domain + Project 동등 |
| **Project** | `Projects_<영역>/` | 실전 프로젝트 실행 전용 | Project 위주 |
| **Reference** | `References/` | 외부 자료 조회 전용 | 읽기 전용 (수정 금지) |

---

## Basic

- **AIHubVault**: 규칙/도구/표준의 유일한 원본. workspace 모드 편집은 여기서만.
- **BasicContentsVault**: 새 볼트 복제 시 소스로 사용되는 범용 템플릿.

## Domain

특정 주제의 지식을 축적하는 볼트. Contents/Domain에 지식 노트를 쌓는 것이 주 목적.

- 예시: Unity (게임 엔진), CapCut (영상편집), Notion (워크스페이스 운영)
- 카테고리 분류: `Domains_Game`, `Domains_Video`, `Domains_Infra`, `Domains_3D`, `Domains_AI_Asset`, `Domains_VCS`

## Lab

지식 축적(Domain)과 실제 개발/실험(Project)이 함께 이루어지는 복합 볼트. 배우면서 동시에 만드는 작업에 적합.

- 예시: ObsidianDev (플러그인 API 학습 + 실제 플러그인 개발)
- 카테고리 분류: `Lab_Infra`, `Lab_Game` 등
- Contents/Domain과 Contents/Project를 동등하게 활용

## Project

특정 목표를 가진 실전 프로젝트. 완료 시점이 있으며, 종료 후 지식은 Domain 볼트로 승급(Knowledge Promotion) 가능.

- 예시: Project_VamSurLike (뱀서라이크 게임 개발)
- 카테고리 분류: `Projects_Game` 등

## Reference

외부 자료를 조회 전용으로 보관. AI 에이전트는 읽기만 허용.

- 예시: Unity_Documentation (Unity 6.3 공식 매뉴얼)
- 수정 금지 (readonly)

---

## 볼트 생성 시 유형 선택 기준

| 질문 | 답변 → 유형 |
|------|-------------|
| 지식만 쌓을 건가? | **Domain** |
| 배우면서 동시에 개발/실험할 건가? | **Lab** |
| 명확한 목표/완료 시점이 있는 작업인가? | **Project** |
| 외부 자료를 보관만 할 건가? | **Reference** |
