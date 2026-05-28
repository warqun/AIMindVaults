/**
 * sync-banner.js — R149
 * viz `.exe` 실행 시 백그라운드 git pull + sync-all 진행 상황을 floating banner 로 표시.
 *
 * - GET /api/sync-status 5s polling
 * - 상태: idle / running / done / failed
 * - running: spinner + step + message
 * - done: ✓ 완료 메시지 + reload 안내 + 5s 후 fade
 * - failed: ✗ 에러 메시지 + 사용자 클릭 시 상세
 *
 * Start-Visualization.ps1 (R149) 가 `.vault_data/.sync-status.json` 갱신.
 * server.js (R149) 의 /api/sync-status endpoint 가 그 파일 노출.
 */

const POLL_INTERVAL_MS = 3000;
const DONE_FADE_AFTER_MS = 5000;

let bannerEl = null;
let lastStatus = null;
let fadeTimer = null;

function ensureBanner() {
  if (bannerEl) return bannerEl;
  bannerEl = document.createElement('div');
  bannerEl.id = 'sync-banner';
  bannerEl.style.cssText = [
    'position:fixed',
    'top:12px',
    'right:12px',
    'padding:8px 14px',
    'background:var(--surface, rgba(20,20,28,0.92))',
    'color:var(--text, #fff)',
    'border:1px solid var(--border, #444)',
    'border-radius:6px',
    'z-index:10000',
    'font-size:12px',
    'font-family:Inter, -apple-system, sans-serif',
    'box-shadow:0 4px 12px rgba(0,0,0,0.3)',
    'display:none',
    'align-items:center',
    'gap:8px',
    'max-width:480px',
    'cursor:default',
    'transition:opacity 0.4s',
  ].join(';');
  document.body.appendChild(bannerEl);
  return bannerEl;
}

function spinnerHtml() {
  return '<span style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:syncSpin 0.8s linear infinite;"></span>';
}

function ensureSpinnerKeyframes() {
  if (document.getElementById('sync-banner-keyframes')) return;
  const style = document.createElement('style');
  style.id = 'sync-banner-keyframes';
  style.textContent = '@keyframes syncSpin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function render(state) {
  ensureSpinnerKeyframes();
  const el = ensureBanner();

  if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }

  const status = state && state.status;

  if (status === 'running') {
    const step = state.step ? `[${escapeHtml(state.step)}]` : '';
    const msg = state.message ? escapeHtml(state.message) : '동기화 중';
    el.innerHTML = `${spinnerHtml()} <span><strong>동기화 중</strong> ${step} ${msg}</span>`;
    el.style.borderColor = 'var(--accent, #4a9eff)';
    el.style.opacity = '1';
    el.style.display = 'flex';
  } else if (status === 'done') {
    if (lastStatus === 'running') {
      // 방금 완료 — 표시 + 5s 후 fade
      const msg = state.message ? escapeHtml(state.message) : '동기화 완료';
      el.innerHTML = `<span style="color:#4ade80">✓</span> <span><strong>${msg}</strong> <a href="#" onclick="location.reload();return false;" style="color:var(--accent,#4a9eff);text-decoration:underline;">reload</a></span>`;
      el.style.borderColor = '#4ade80';
      el.style.opacity = '1';
      el.style.display = 'flex';
      fadeTimer = setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => { el.style.display = 'none'; }, 500);
      }, DONE_FADE_AFTER_MS);
    } else {
      // 처음 polling 부터 done — 표시 안 함 (이미 완료된 상태)
      el.style.display = 'none';
    }
  } else if (status === 'failed') {
    const err = state.error ? escapeHtml(state.error) : '알 수 없는 오류';
    const step = state.step ? `[${escapeHtml(state.step)}]` : '';
    el.innerHTML = `<span style="color:#f87171">✗</span> <span><strong>동기화 실패</strong> ${step} <span title="${err}">${err.slice(0, 80)}${err.length > 80 ? '...' : ''}</span></span>`;
    el.style.borderColor = '#f87171';
    el.style.opacity = '1';
    el.style.display = 'flex';
  } else {
    // idle 또는 알 수 없음 — 표시 안 함
    el.style.display = 'none';
  }

  lastStatus = status;
}

async function pollOnce() {
  try {
    const r = await fetch('/api/sync-status', { cache: 'no-cache' });
    if (!r.ok) return;
    const json = await r.json();
    render(json);
    // done / failed 상태 도달 시 polling 중단 (idempotent — 사용자가 reload 시 자연 재시작)
    if (json.status === 'done' || json.status === 'failed') {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    }
  } catch {
    // network error — silent
  }
}

let pollTimer = null;

export function startSyncBanner() {
  // 초기 1회 즉시 polling
  pollOnce();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
}

// auto-start on import
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startSyncBanner);
  } else {
    startSyncBanner();
  }
}
