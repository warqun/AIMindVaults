---
tags:
  - plugin
  - git
  - backup
  - version-control
  - guide
date: 2026-03-07
---

# Obsidian Git 플러그인 사용 가이드

**목적**: 옵시디언 볼트를 Git 저장소와 연동하여 자동으로 백업(Commit)하고 동기화(Push/Pull)하는 강력한 버전 관리 도구입니다.

원문 링크: [GitHub - Vinzent03/obsidian-git](https://github.com/Vinzent03/obsidian-git)
상세 매뉴얼: [공식 문서 사이트](https://publish.obsidian.md/git-doc)

---

## 🛠 주요 기능 및 장점

1. **자동 커밋 및 동기화 (Auto Backup/Sync)**
   - 설정한 주기(예: 10분)마다 변경 사항을 자동으로 커밋(`commit`)하고, 원격 저장소(GitHub 등)에서 최신본을 가져오거나(`pull`) 밀어넣습니다(`push`).
   - 타이머 기반 백업을 지원하여, 글쓰기를 마친 후 옵시디언이 유휴 상태일 때 알아서 백업되게 만들 수 있습니다.
2. **시작 시 자동 풀 (Auto-pull on startup)**
   - PC나 모바일 랩탑을 여러 대 사용할 때, 옵시디언을 켜자마자 최신 상태로 강제 동기화시켜 충돌을 예방합니다.
3. **소스 컨트롤 뷰 (Source Control View)**
   - VSCode의 소스 컨트롤 탭처럼, 어떤 파일이 수정/추가/삭제되었는지 한눈에 보여주는 UI 패널을 제공합니다.
   - `Open source control view` 명령어로 열 수 있습니다.
4. **히스토리 및 디프 뷰 (History & Diff View)**
   - 커밋 내역(로그)을 열람(`Open history view`)하거나, 특정 파일의 변경 전/후 코드를 비교(`Open diff view`)할 수 있습니다.
5. **에디터 힌트 (Gutter Signs - 데스크톱 전용)**
   - 에디터 왼쪽 줄 번호 영역에 추가/수정/삭제된 줄을 색상으로 표시해 주어 내가 방금 무엇을 건드렸는지 알 수 있습니다.

---

## 🚀 수동 사용법 (자주 쓰는 명령어)

자동 백업을 켜두더라도 가끔 직접 동기화나 백업을 통제하고 싶을 때 쓰는 명령어입니다 (`Ctrl+P`로 실행).

- **`Obsidian Git: Commit all changes`**
  - 현재까지의 모든 수정 내역을 즉시 수동으로 커밋합니다. (커밋 메시지를 물어보는 프롬프트가 뜹니다)
- **`Obsidian Git: Push`**
  - 커밋된 내역을 원격 저장소(GitHub)로 즉시 전송합니다. 보통 퇴근 전/작업 종료 직전에 수동으로 눌러주는 것도 좋습니다.
- **`Obsidian Git: Pull`**
  - 다른 기기에서 작업한 내용(원격 저장소의 최신 데이터)을 현재 볼트로 즉시 불러옵니다.
- **`Obsidian Git: Open source control view`**
  - 우측 패널에 Git 소스 컨트롤 UI를 띄워 파일 단위의 세밀한 커밋 관리를 할 때 사용합니다.

---

## 💡 LatticeCore 활용 팁 및 주의사항

- **LatticeCore 최적화 환경:** 앞서 작성된 [[ObsidianGit_TimeMachine_Setup_Guide]] 노트를 참고하여 **"10분 자동 커밋+푸시"** 형태로 맞춰두시면, 개발자처럼 일일이 Git 명령어를 치지 않아도 알아서 완벽에 가까운 백업 환경이 구축됩니다.
- **Time Machine 플러그인 연동:** 데스크톱에서는 이 Git 커밋 내역이 `Time Machine` 슬라이더에 **파란 점**으로 완벽히 통합되어 표시되므로, 커밋 로그를 뒤지는 대신 타임라인으로 쉽게 과거로 돌아갈 수 있습니다.
- **모바일 관련 주의:** 모바일(iOS/Android)에서는 Git 연동이 상대적으로 불안정하거나 느릴 수 있습니다.(제작자 경고) 따라서 모바일 기기에서의 과도한 동기화 세팅보다는 가급적 PC 랩탑 위주로 Git 백업을 운영하는 것이 좋습니다.
