---
description: "Obsidian 노트 열기"
---

# /open-note — Obsidian 노트 열기

## 용도

지정한 Obsidian 노트를 해당 볼트에서 열어 표시한다.

## 전제조건

- Advanced URI 플러그인이 대상 볼트에 설치·활성화되어 있어야 함
- 없으면 `/install-plugin` 스킬로 설치 안내

## 실행 절차

### 1. 대상 파일 확인

- 인자로 노트 경로 또는 제목이 주어지면 사용
- 제목만 주어지면 Glob으로 검색하여 경로 특정
- 볼트명이 명시되지 않으면 경로에서 추출 또는 사용자에게 확인

### 2. 파일명 안전성 검증

- 파일명에 URI 예약문자(`#`, `%`, `&`, `?`, `+`)가 포함되어 있는지 확인
- **포함 시**: 사용자에게 안내 — "이 파일명에 `#` 등 특수문자가 포함되어 URI로 열 수 없습니다. Obsidian 내에서 파일명을 변경해주세요."
- URI로 열기를 시도하지 않음 (빈 노트 생성 방지)

### 3. 볼트 열기

```powershell
Start-Process 'obsidian://open?vault=볼트명'
```

- 3초 대기 (볼트 로딩)

### 4. 노트 열기

```powershell
Start-Process 'obsidian://advanced-uri?vault=볼트명&filepath=볼트_내_상대경로'
```

- 경로는 URL 인코딩 적용 (한국어, 공백 등)
- 확장자 `.md`는 제외

### 5. 열림 확인

- 사용자에게 노트가 열렸는지 확인
- 실패 시:
  - Advanced URI 플러그인 활성화 여부 확인 안내
  - 파일 경로 오류 가능성 안내
  - 수동으로 Obsidian 검색(`Ctrl+O`)에서 열기 안내

## 사용 예시

```
/open-note Unity의 CSharp Job System
/open-note C:\AIMindVaults\Vaults\Domains_Game\Unity\Contents\Domain\DOTS\04_Jobs_Burst\Unity의 CSharp Job System.md
```

## 제한사항

- **파일명에 `#`, `%`, `&`, `?`, `+` 포함 시 열 수 없음** — Obsidian URI 구조적 한계
- 상세: ObsidianDev 볼트 `20260320_Obsidian_URI_Hash_최종보고서.md`
- 해당 파일은 Obsidian 내에서 리네이밍 후 재시도

## 참조

- [[20260320_Obsidian_URI_Hash_최종보고서]]
- `/install-plugin` — Advanced URI 설치
- `/open-vault` — 볼트 열기
