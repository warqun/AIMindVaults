/**
 * task_router — Keyword-based agent routing.
 * Port of task_router.ps1 (41 LOC → ~30 LOC).
 */

import * as log from '../lib/logger.js';

const RULES = [
  {
    pattern: /script|automation|자동화|batch|대량|cli|rg|regex|정규식|검증|validation|test|테스트|리팩터|refactor|파싱/i,
    primary: 'Codex', secondary: 'Claude', reason: '자동화/기술 검증/반복 처리 성격',
  },
  {
    pattern: /alternative|대안|비교|요약|재구성|문장|설명|문서화/i,
    primary: 'Gemini', secondary: 'Claude', reason: '대안 비교/설명 재구성 성격',
  },
  {
    pattern: /risk|리스크|review|리뷰|threat|위험/i,
    primary: 'Antigravity', secondary: 'Codex', reason: '리스크 탐지/검토 성격',
  },
];

const DEFAULT = { primary: 'Claude', secondary: 'Codex', reason: '기본값: 목표/구조화 중심 작업' };

/**
 * @param {object} opts
 * @param {string} opts.task
 */
export function taskRouter(opts) {
  if (!opts.task) {
    log.error('--task is required.');
    process.exitCode = 1;
    return;
  }

  const match = RULES.find(r => r.pattern.test(opts.task)) || DEFAULT;

  log.info(`Task:      ${opts.task}`);
  log.info(`Primary:   ${match.primary}`);
  log.info(`Secondary: ${match.secondary}`);
  log.info(`Reason:    ${match.reason}`);
}
