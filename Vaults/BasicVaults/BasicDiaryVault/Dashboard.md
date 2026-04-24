---
type: reference
tags:
  - Dashboard
  - Diary
updated: 2026-04-22
agent: claude
---

# Diary Dashboard

> 회고용 Dataview 뷰 모음. `Contents/Daily/` 에 쌓인 일일 노트를 소스로 사용.
> 쿼리 경로는 본 볼트의 flat 폴더 구조 (`Contents/Daily`) 기준.

## 월간 회고 테이블

```dataview
TABLE file.link AS day, mood, energy, stress, sleep_hours, join(emotion_tags, ", ") AS emotions
FROM "Contents/Daily"
WHERE dateformat(file.day, "yyyy-MM") = dateformat(date(today), "yyyy-MM")
SORT file.day ASC
```

## 주간 감정 평균 추세 (최근 90일)

```dataview
TABLE round(avg(rows.mood), 2) AS avg_mood,
      round(avg(rows.energy), 2) AS avg_energy,
      round(avg(rows.stress), 2) AS avg_stress
FROM "Contents/Daily"
WHERE file.day >= date(today) - dur(90 days)
GROUP BY dateformat(file.day, "kkkk-'W'WW") AS week
SORT week DESC
```

## 반복 감정 태그 빈도 (최근 90일)

```dataview
TABLE length(rows) AS count
FROM "Contents/Daily"
FLATTEN emotion_tags AS emotion
WHERE file.day >= date(today) - dur(90 days)
GROUP BY emotion
SORT count DESC
LIMIT 10
```

## 수면·기분 동시 보기 (최근 30개)

```dataview
TABLE file.link AS day, sleep_hours, mood, energy, stress
FROM "Contents/Daily"
WHERE sleep_hours
SORT file.day DESC
LIMIT 30
```

## 이 날의 나 (Journal Review 대체)

```dataview
TABLE file.link AS note, mood, energy, stress
FROM "Contents/Daily"
WHERE dateformat(file.day, "MM-dd") = dateformat(date(today), "MM-dd")
SORT file.day DESC
```
