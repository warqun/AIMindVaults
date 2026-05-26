/**
 * AIMindVaults Visualization — Side Panel (W1)
 * Spec § 3.5 — empty 상태와 detail panel 양방향 전환.
 *
 * createSidePanel(container) → { setEmpty(hint), setPanel(detail), clear() }
 *
 * detail = {
 *   kind: 'NODE'|'CONCEPT'|...,
 *   title: string,
 *   meta?: string,
 *   stats?: Array<{ label: string, value: string }>,
 *   sections?: Array<{ heading: string, items: string[] | string }>
 * }
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
