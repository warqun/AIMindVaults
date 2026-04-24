---
type: moc
status: active
created: <% tp.date.now("YYYY-MM-DD HH:mm") %>
tags: [lab, moc]
agent: claude
---
# <% tp.file.title %>

## Core questions

## Key notes

## Subtopics

## Open gaps

## Auto list

```dataview
LIST
FROM "02_Permanent"
WHERE contains(file.outlinks, this.file.link)
SORT file.mtime DESC
```
