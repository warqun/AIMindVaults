# /hub-broadcast — Hub 파일 전체 볼트 전파

AIHubVault `.sync/` 내 특정 파일을 모든 위성 볼트에 즉시 전파한다.

## 사용법

```
/hub-broadcast <.sync 기준 상대경로> [옵션]
```

예시:
- `/hub-broadcast _tools/cli-node/src/commands/index-build.js` — 인덱서 전파
- `/hub-broadcast _Standards/Core/Script_Registry.md --force` — 신규 파일 포함 전파
- `/hub-broadcast _tools/cli-node/bin/cli.js --exclude TestVault` — 특정 볼트 제외
- `/hub-broadcast _tools/cli-node/package.json --dry-run` — 미리보기만

## 실행 명령

```bash
node "{AIHubVault}/.sync/_tools/cli-node/bin/cli.js" broadcast -p "<.sync 기준 상대경로>" [-d] [-f] [-e <볼트명>]
```

- `{AIHubVault}` = `C:/AIMindVaults/Vaults/BasicVaults/AIHubVault`

## 파라미터

| 파라미터 | 용도 | 기본값 |
|---------|------|--------|
| `-p, --relative-path` | `.sync/` 기준 상대경로 | 필수 |
| `-d, --dry-run` | 실제 복사 없이 대상 목록만 출력 | false |
| `-f, --force` | 대상 볼트에 파일이 없어도 강제 생성 | false |
| `-e, --exclude` | 제외할 볼트명 패턴 (복수 가능) | 없음 |

## `aimv sync`와의 차이

| 항목 | `aimv sync` | `aimv broadcast` |
|------|-------------|-------------------|
| 범위 | 전체 workspace | 특정 파일 1개 |
| 방향 | 양방향 (버전 비교) | Hub → 위성 단방향 |
| 단위 | 볼트 1개씩 실행 | 전체 볼트 일괄 |
| 용도 | 정기 동기화 | 긴급/즉시 전파 |

## 동작 규칙

- 기본: 대상 볼트에 이미 해당 파일이 존재하는 경우만 덮어쓰기
- `-Force`: 파일이 없는 볼트에도 신규 생성
- AIHubVault 자신은 항상 제외
- 소스 파일이 Hub에 없으면 에러 종료
