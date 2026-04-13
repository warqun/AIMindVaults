---
description: "볼트 콘텐츠 인덱스 재빌드"
---

# /reindex — 볼트 콘텐츠 인덱스 재빌드

## 용도

단일 볼트 또는 전체 active 볼트의 `vault_index.json`을 재빌드한다.

## 사용법

```
/reindex              — 현재 작업 중인 볼트만 증분 빌드
/reindex all          — 전체 active 볼트 순회 증분 빌드
/reindex Unity        — 특정 볼트 지정 증분 빌드
/reindex all --full   — 전체 볼트 전체 빌드 (캐시 무시)
```

## 실행 절차

### 단일 볼트

1. 대상 볼트 경로 특정 (인자 또는 현재 작업 볼트)
2. `{볼트경로}/.sync/_tools/cli-node/bin/cli.js` 존재 확인
3. 실행:
```bash
node "{볼트경로}/.sync/_tools/cli-node/bin/cli.js" index build -r "{볼트경로}" -i
```
4. `--full` 옵션 시 `-i` (incremental) 제거하여 전체 빌드

### 전체 볼트 (`all`)

1. 루트 `C:\AIMindVaults\_STATUS.md`에서 active 볼트 목록 수집
2. 각 볼트 순회:
   a. `.sync/_tools/cli-node/bin/cli.js` 존재 확인
   b. 없으면 스킵 (로그 남김)
   c. 있으면 `node cli.js index build -r "{볼트경로}" -i`로 증분 빌드 실행
3. 볼트별 결과 출력 (성공/실패/노트 수/소요 시간)
4. 전체 요약 출력

### 볼트 경로 매핑

볼트명 → 경로 매핑은 루트 `CLAUDE.md`의 볼트 레지스트리를 참조한다.
`Vaults/` 하위 디렉토리를 순회하며 볼트명과 일치하는 폴더를 찾는다.

## 결과 출력

```
=== 볼트 리인덱스 결과 ===
AIHubVault    : 114 notes, 0.12s (incremental, 2 updated)
Unity         : 183 notes, 0.21s (incremental, 0 updated)
JissouGame    : 32 notes, 0.08s (incremental, 5 new)
Search        : skipped (no indexer script)
...
전체: 15 볼트, 1 스킵, 0 실패, 총 1.2s
```

## 참조

- `aimv index build` — 인덱서 본체 (`.sync/_tools/cli-node/`)
- `aimv index search` — 검색 엔진 (`.sync/_tools/cli-node/`)
- `aimv review` — 노트 편집 후 자동 인덱서 호출
