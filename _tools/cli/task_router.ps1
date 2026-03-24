param(
    [Parameter(Mandatory=$true)]
    [string]$Task
)

$taskLower = $Task.ToLowerInvariant()

$primary = 'Claude'
$secondary = 'Codex'
$reason = '기본값: 목표/구조화 중심 작업'

if ($taskLower -match 'script|automation|자동화|batch|대량|cli|rg|regex|정규식|검증|validation|test|테스트|리팩터|refactor|파싱') {
    $primary = 'Codex'
    $secondary = 'Claude'
    $reason = '자동화/기술 검증/반복 처리 성격'
} elseif ($taskLower -match 'alternative|대안|비교|요약|재구성|문장|설명|문서화') {
    $primary = 'Gemini'
    $secondary = 'Claude'
    $reason = '대안 비교/설명 재구성 성격'
} elseif ($taskLower -match 'risk|리스크|review|리뷰|threat|위험') {
    $primary = 'Antigravity'
    $secondary = 'Codex'
    $reason = '리스크 탐지/검토 성격'
}

$handoff = @"
작업: $Task
주 담당: $primary
입력: (필요 파일/로그 1~3개)
출력: (체크리스트/패치/요약 중 1개)
완료 기준: (완료 판정 1~2개)
다음 에이전트(선택): $secondary
"@

[pscustomobject]@{
    task = $Task
    primary = $primary
    secondary = $secondary
    reason = $reason
    handoff = $handoff
} | Format-List | Out-String | Write-Output
