/**
 * AIMindVaults Visualization — Side Panel (W1)
 *
 * 역할:
 *   여러 페이지의 우측 사이드 패널 공통 컴포넌트. empty 상태 (아이콘 + hint) 와
 *   detail panel (kind chip + 제목 + meta + stats grid + sections h4+ul) 양방향 전환.
 *
 * 표준 시그니처:
 *   createSidePanel(container, opts?) → { setEmpty(hint), setPanel(detail), clear() }
 *
 * detail 스키마:
 *   {
 *     kind: 'NODE' | 'CONCEPT' | ... (대문자 chip),
 *     title: string,                     // 큰 제목
 *     meta?: string,                     // 작은 메타 한 줄
 *     stats?: Array<{ label, value }>,   // 2-col grid
 *     sections?: Array<{ heading, items: string[] | string }>  // h4 + ul
 *   }
 *
 * 사용처:
 *   네트워크/커넥션/태그 등 사이드 패널 페이지에서 자체 panel HTML 대신 본 컴포넌트 가능 (현재는
 *   각 페이지가 자체 구현 — connections.js / network.js 의 사이드 패널과 향후 통합 후보).
 *
 * 참조:
 *   Spec:    [[20260513_시스템스펙_04_시각화]] § 9 (디자인 시스템)
 *   영문화:  [[20260530_viz_정본_영문화_매니페스트]] § 6.13
 */

const EMPTY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;

/**
 * @param {HTMLElement} container — already has class "side"
 * @param {{ defaultHint?: string }} opts
 */
export function createSidePanel(container, opts = {}) {
  if (!container) throw new Error('createSidePanel: container required');
  if (!container.classList.contains('side')) container.classList.add('side');
  const defaultHint = opts.defaultHint || '항목을 클릭하면 상세가 여기에 표시됩니다.';

  const setEmpty = (hint) => {
    container.innerHTML = `
      <div class="empty">
        ${EMPTY_ICON}
        <div class="hint">${escapeHtml(hint || defaultHint)}</div>
      </div>
    `;
  };

  const setPanel = (detail) => {
    if (!detail) { setEmpty(); return; }
    const stats = (detail.stats || []).map((s) => `
      <div><div class="v">${escapeHtml(String(s.value))}</div><div class="l">${escapeHtml(s.label)}</div></div>
    `).join('');
    const sections = (detail.sections || []).map((sec) => {
      const items = Array.isArray(sec.items)
        ? sec.items.map((it) => `<li>${escapeHtml(it)}</li>`).join('')
        : `<li>${escapeHtml(String(sec.items))}</li>`;
      return `<h4>${escapeHtml(sec.heading)}</h4><ul>${items}</ul>`;
    }).join('');
    container.innerHTML = `
      <div class="panel">
        ${detail.kind ? `<span class="kind">${escapeHtml(detail.kind)}</span>` : ''}
        <div class="ttl">${escapeHtml(detail.title || '')}</div>
        ${detail.meta ? `<div class="meta">${escapeHtml(detail.meta)}</div>` : ''}
        ${stats ? `<div class="stats">${stats}</div>` : ''}
        ${sections}
      </div>
    `;
  };

  const clear = () => { container.innerHTML = ''; };

  setEmpty();
  return { setEmpty, setPanel, clear };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}
