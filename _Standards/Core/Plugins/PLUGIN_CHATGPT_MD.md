---
type: plugin-standard
plugin: chatgpt-md
updated: 2026-03-06
---

# ChatGPT MD

## 기능

- Obsidian 노트 내부에서 LLM 대화/응답 생성
- Ollama/LM Studio 등 로컬 LLM 백엔드 연결
- Agent preset 기반 역할 분리 운용

## 기본 설정 절차

1. Obsidian Community Plugins에서 `ChatGPT MD` 설치/활성화
2. 플러그인 Settings에서 Provider를 `Ollama`로 선택
3. Base URL 설정: `http://localhost:11434`
4. 기본 모델 설정(예: 로컬에 pull된 모델명)
5. 테스트 프롬프트로 응답 확인

## 플러그인 사용법 (실행 순서)

1. 커맨드 팔레트 열기 (`Ctrl/Cmd + P`)
2. `ChatGPT MD: Select Model`로 모델 선택
3. 노트에서 프롬프트 문장(또는 블록) 선택
4. `ChatGPT MD: Chat` 실행
5. 응답이 노트에 기록되는지 확인
6. 세션 초기화가 필요하면 `ChatGPT MD: Clear Chat`
7. 템플릿 기반 새 세션은 `ChatGPT MD: New Chat From Template`

## 실습 노트

- 즉시 테스트용: `Notes/Temp_ChatGPTMD_Ollama_Sandbox.md`
- 권장: Planner -> Builder -> Reviewer 순서로 같은 노트에서 실행

## 작업 활용 기준

- 초안 생성/재작성/요약: ChatGPT MD 단독 사용
- 멀티 에이전트 분업: Agent preset을 작업별로 분리
- 로컬 우선 정책: 가능하면 Ollama 연결을 기본값으로 사용

## 권장 운영 패턴

1. Planner Agent: 요구사항 분해/체크리스트 작성
2. Builder Agent: 본문 초안 생성
3. Reviewer Agent: 누락/충돌 검토

## 주의사항

- 모델 응답은 초안으로 취급하고 최종 결정은 문서 규칙(`_WORKFLOW.md`)로 확정
- Tool calling 사용 시 권한 범위를 최소로 유지
