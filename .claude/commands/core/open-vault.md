---
description: "Obsidian 볼트 열기"
---

# /open-vault — Obsidian 볼트 열기

## 용도

지정한 Obsidian 볼트를 열어 활성화한다.

## 실행 절차

1. **볼트명 확인**
   - 인자로 볼트명이 주어지면 사용
   - 없으면 루트 `CLAUDE.md` 볼트 레지스트리에서 확인 후 사용자에게 질문

2. **볼트 열기**
   ```powershell
   Start-Process 'obsidian://open?vault=볼트명'
   ```

3. **열림 확인**
   - 사용자에게 볼트가 열렸는지 확인
   - 실패 시 볼트명 오류 가능성 안내

## 사용 예시

```
/open-vault Unity
/open-vault AIHubVault
/open-vault ObsidianDev
```

## 주의사항

- 볼트명은 Obsidian에 등록된 이름과 정확히 일치해야 함
- 볼트가 Obsidian에 등록되어 있지 않으면 실패
