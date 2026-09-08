---
description: "AIMindVaults 루트에서 새 Claude CLI 터미널 인스턴스 실행"
---

# /spawn-claude — Claude CLI 인스턴스 spawn

## 용도

AIMindVaults 루트(`C:\AIMindVaults`)를 작업 디렉토리로 하여 새로운 Windows Terminal 창에 `claude` CLI 세션을 띄운다. 복수 인스턴스 운영·백그라운드 워커·`_AGENT_COMMS/` 큐 처리 세션 spawn 용도.

## 실행 절차

1. **인자 파싱**
   - 인자 없음 → 빈 interactive 세션
   - 인자 있음 → 첫 메시지로 전달 (interactive 유지)

2. **터미널 spawn (Bash 도구)**

   `wt` 는 `.cmd` 확장자 자동 resolution 을 못 하므로 PowerShell 래핑 필수. PowerShell 은 `PATHEXT` 로 `claude.cmd` 자동 해석 + 이후 그 창에서 일반 PS 명령 사용 가능.

   ```bash
   # 인자 없음
   wt -d "C:\AIMindVaults" powershell -NoExit -Command "claude"

   # 인자 있음 (첫 메시지 주입)
   wt -d "C:\AIMindVaults" powershell -NoExit -Command "claude '<프롬프트>'"
   ```

3. **폴백 1 — `pwsh` (PowerShell 7) 사용 시**
   ```bash
   wt -d "C:\AIMindVaults" pwsh -NoExit -Command "claude"
   ```

4. **폴백 2 — `wt` 미설치 시**
   ```bash
   cmd //c start "Claude CLI" powershell -NoExit -Command "cd 'C:\AIMindVaults'; claude"
   ```

4. **확인 보고**
   - 새 창이 열렸는지 사용자에게 확인
   - 주입 프롬프트가 있으면 내용 echo

## 사용 예시

```
/spawn-claude
/spawn-claude "_AGENT_COMMS/to_claude/ 열린 메시지 처리해"
/spawn-claude "Funding 재귀 폴더 잔존 정리. temp-file-management.md § 무한 재귀 경로 삭제 절차 따를 것"
```

## 복수 인스턴스 시나리오

- **메인 세션**(지금 여기) = 오케스트레이터 · spawn 된 터미널 = 워커
- `_AGENT_COMMS/to_claude/` 에 자기완결 프롬프트 큐잉 → spawn 워커가 소비
- 여러 번 호출해 동시 병렬 작업 가능 (각각 독립 Claude 세션)
- 결과 수집: `_AGENT_COMMS/` 완료 트리거 체인 또는 `_SESSION_HANDOFF_*.md` 경유

## 주의사항

- **spawn 세션은 독립** — 현재 세션의 메모리·맥락 공유 안 됨. 필요한 정보는 프롬프트 본문에 전부 포함 (콜드 스타트 전제).
- 같은 파일 동시 편집은 충돌 — `.claude/rules/custom/agent-ownership.md` § "동시 수정 금지 영역" 참조.
- 프롬프트에 위키링크·마크다운 쓰면 따옴표 escape 주의.
- 루트 외 다른 볼트로 cwd 가 필요하면 `wt -d "<다른경로>" claude` 로 직접 호출 (이 스킬은 AIMindVaults 루트 고정).
- `wt` 는 `C:\Users\c\AppData\Local\Microsoft\WindowsApps\wt.exe` 에 있음 (Windows Terminal 스토어 앱).
