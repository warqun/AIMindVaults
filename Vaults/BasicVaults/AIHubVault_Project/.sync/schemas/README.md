---
type: reference
tags: [schema, multi-hub, sync]
updated: 2026-04-20
---

# Multi-Hub 스키마 정의

> `.sync/hub-marker.json` · `.sync/hub-source.json` JSON Schema draft-07 정의.
> Multi-Hub 아키텍처 (설계: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260419_Multi_Hub_아키텍처_설계.md`) Phase 1 MVP 산출물.

## 파일

| 파일 | 위치 | 역할 |
|------|------|------|
| `hub-marker.schema.json` | `.sync/schemas/` | Hub 정체성 메타 (`hubId`, `hubType`, `coreHub` 등) |
| `hub-source.schema.json` | `.sync/schemas/` | 위성 볼트의 Hub 지명 (`hubPath`, `hubId`) |

## 배치

- **`hub-marker.json`** → Hub 볼트 `.sync/` 루트
- **`hub-source.json`** → 위성 볼트 `.sync/` 루트
- `.hub_marker` 빈 파일은 하위호환 목적으로 병행 유지

## 검증

`lib/hub-resolver.js` 에서 읽기 시:
- `readHubMarker()` — `hub-marker.json` 파싱 (invalid → null)
- `readHubSource()` — `hub-source.json` 파싱 (invalid → null)
- `resolveHub()` — `hubId` mismatch 시 경고 반환

정식 스키마 검증 (AJV 등)은 Phase 2 에서 추가 예정.

## 참조

- 설계 문서: `20260419_Multi_Hub_아키텍처_설계.md` § 스키마 설계 / Phase 1 스펙 상세화
