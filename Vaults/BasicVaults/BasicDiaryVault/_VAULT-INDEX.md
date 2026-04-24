---
aliases:
  - "Diary Vault 인덱스"
tags:
  - Meta
  - BasicDiaryVault
  - Diary
type: folder-index
updated: 2026-04-22
agent: claude
---

# _VAULT-INDEX — BasicDiaryVault

> Diary Preset 클론 템플릿. 이 인덱스는 위성 복제 후에도 구조가 동일함을 전제로 한 간단 지도.

## 루트 구조

```
BasicDiaryVault/
├── CLAUDE.md              ← Claude 진입점 (템플릿 가이드 + 일기 원칙)
├── CODEX.md               ← Codex 진입점
├── README.md              ← 템플릿 설명
├── _STATUS.md             ← 상태 (템플릿 · 편집 대상 아님)
├── _VAULT-INDEX.md        ← 이 파일
├── _WORKSPACE_VERSION.md  ← 워크스페이스 버전 (템플릿 초기값)
├── Dashboard.md           ← Dataview 회고 뷰 모음
├── _Templates/            ← Templater 템플릿 (Daily Morning/Evening, Weekly, Monthly, Yearly)
├── Contents/
│   ├── Daily/2026/        ← 일일 노트 (파일명 YYYY-MM-DD)
│   ├── Weekly/            ← 주간 회고 (kkkk-'W'WW)
│   ├── Monthly/           ← 월간 회고 (YYYY-MM)
│   ├── Yearly/            ← 연간 회고 (YYYY)
│   ├── Reviews/
│   │   └── AI Summaries/  ← AI 생성 요약 (사용자 요청 시)
│   ├── _AI_Drafts/        ← AI 단독 생성 격리 · 사용자 승인 후 이동
│   └── _archive/          ← 종료·이관 노트
├── .obsidian/             ← Obsidian 설정 (플러그인 번들 · Hub rebase 시 Core 6 + Custom 4 로 정리됨)
├── .sync/                 ← 동기화 도구 (위성으로서 Hub 에서 받음)
├── .claude/               ← Claude 설정
├── .codex/                ← Codex 설정
└── _Standards/            ← Hub 동기화 기준 자료
```

## 주요 진입 파일

| 파일 | 역할 |
|------|------|
| `CLAUDE.md` | 템플릿·일기 원칙 안내 (AI scope, 프라이버시, 본문 inline field) |
| `_STATUS.md` | 템플릿 상태 |
| `Dashboard.md` | 회고 뷰 (월간 표 / 주간 평균 / 감정 태그 빈도 / 수면-기분 / 이 날의 나) |
| `_Templates/Daily_Morning.md` | Templater 아침 템플릿 |
| `_Templates/Daily_Evening.md` | Templater 저녁 섹션 (append) |
| `_Templates/Weekly_Review.md` | 주간 회고 |
| `_Templates/Monthly_Review.md` | 월간 회고 |
| `_Templates/Yearly_Review.md` | 연간 회고 |

## 참조

- Diary 스펙: `Vaults/Projects_Infra/Project_AIMindVaults/Contents/Project/plan/architecture/20260420_Diary_Hub_명세.md`
- 루트 진입점: `C:/AIMindVaults/CLAUDE.md`
