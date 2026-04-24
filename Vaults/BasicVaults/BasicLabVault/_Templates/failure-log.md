---
id: <% tp.date.now("YYYYMMDDHHmm") %>
type: failure-log
status: active
severity: major
repro_rate: always
resolved: false
created: <% tp.date.now("YYYY-MM-DD HH:mm") %>
tags: [lab, failure]
agent: claude
---
# <% tp.file.title %>

## 증상
<!-- 무엇이 실패했는가 -->

## 재현 조건
<!-- 환경·입력·순서 -->

## Root cause
<!-- 확인된 원인 (확인되면 채움) -->

## Workaround
<!-- 임시 우회 (있다면) -->

## 해결안
<!-- 근본 해결 (있다면) -->

## Relations
- caused-by:: <!-- experiment 링크 -->
- resolves:: <!-- 해결한 experiment -->
- related-failures:: <!-- 유사 실패 클러스터 -->
