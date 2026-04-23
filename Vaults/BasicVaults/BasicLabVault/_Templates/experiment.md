---
id: <% tp.date.now("YYYYMMDDHHmm") %>
type: experiment
status: running
hypothesis: ""
iteration: 1
tools: []
phase: ""
result: 
created: <% tp.date.now("YYYY-MM-DD HH:mm") %>
tags: [lab, experiment]
agent: claude
---
# <% tp.file.title %> · iteration <% tp.frontmatter.iteration %>

## Hypothesis
<!-- 무엇을 검증하는가 · 기대 결과 -->

## Setup
<!-- 도구·환경·조건 -->

## Execution
<!-- 시도 단계 -->

## Result
<!-- 관찰된 결과 · 정량·정성 -->

## Learning
<!-- 이번 iteration 에서 배운 것 -->

## Next iteration
<!-- 다음 반복에서 바꿀 것 -->

## Relations
- tests-hypothesis:: 
- repro-of:: <!-- 이전 iteration 있으면 -->
- caused-failure:: <!-- 실패 발생 시 failure-log 링크 -->
- generalizes-to:: <!-- permanent 승격 후보 -->
