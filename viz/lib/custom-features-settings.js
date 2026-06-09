/**
 * AIMindVaults Visualization — 커스텀 기능 settings 페이지 adapter (R164)
 *
 * 역할:
 *   `custom-features.js` registry 중 `surfaces.type === 'settings-row'` 인 항목을
 *   settings 페이지의 "커스텀 기능" 섹션 row HTML 로 자동 변환 + 핸들러 부착.
 *   settings.js 는 본 모듈의 `renderSettingsSection()` + `attachSettingsHandlers()` 만 호출.
 *
 * 추적·구분 마커:
 *   - 모든 자동 생성 row 에 `data-custom-feature="<id>"` 속성 박힘 → DevTools/CSS/디버그 모드에서 즉시 식별.
 *   - 토글: `data-feature-toggle="<id>"`. 액션 버튼: `data-feature-action="<id>"`.
 *
 * 알려진 postSuccessHook 매핑 (registry 에서 키워드로 명시):
 *   - `restartSyncBanner` : `../components/sync-banner.js` dynamic import + `startSyncBanner()` 호출
 *
 * 데이터 흐름 (state 인터페이스):
 *   - state.container         : settings 페이지 root
 *   - state.vizPrefs[id]      : 현재 토글 값 (boolean) — settings.js 가 초기 fetch 로 채움
 *   - state.showToast(msg, ms): toast 헬퍼 (settings.js 에서 주입)
 */

import { CUSTOM_FEATURES, featuresForSurface, featureById } from './custom-features.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * "커스텀 기능" 섹션 HTML 반환. settings.js 의 패널 3 안에 그대로 삽입.
 * vizPrefs 는 초기 토글 상태만 참조 (변경 시 attach handler 측에서 갱신).
 */
export function renderSettingsSection(vizPrefs) {
  const items = featuresForSurface('settings-row');
  if (items.length === 0) {
    return `
      <div class="section" data-custom-features-section="custom-functions">
        <h2>커스텀 기능</h2>
        <p class="desc">등록된 커스텀 기능이 없습니다.</p>
      </div>`;
  }
  const rows = items.map(({ feature, surface }) => {
    const value = !!(vizPrefs && vizPrefs[feature.id]);
    const hasToggle = feature.category === 'toggle' || feature.category === 'composite';
    const action = surface.action;
    const ctrlInner = [
      action
        ? `<button class="btn" data-feature-action="${escapeHtml(feature.id)}" title="${escapeHtml(action.title || '')}" style="font-size:11px;padding:4px 10px;white-space:nowrap">${escapeHtml(action.buttonLabel)}</button>`
        : '',
      hasToggle
        ? `<div class="toggle ${value ? 'on' : ''}" data-feature-toggle="${escapeHtml(feature.id)}" title="${escapeHtml((feature.toggleApplyHint && `토글 — ${feature.toggleApplyHint}`) || feature.label)}"></div>`
        : '',
    ].filter(Boolean).join('');
    return `
      <div class="row" data-custom-feature="${escapeHtml(feature.id)}" data-feature-added-in="${escapeHtml(feature.addedIn)}">
        <div>
          <div class="label">${escapeHtml(feature.label)}</div>
          <div class="sub">${feature.sub}</div>
        </div>
        <div class="ctrl" style="display:flex;gap:10px;align-items:center">${ctrlInner}</div>
      </div>`;
  }).join('');
  return `
    <div class="section" data-custom-features-section="custom-functions">
      <h2>커스텀 기능</h2>
      <p class="desc">viz 자체 동작을 디바이스별로 켜고 끕니다. 토글 변경은 <strong>다음 viz 실행부터 적용</strong>됩니다 (현재 인스턴스 미반영). 저장 위치: <code>.vault_data/viz-prefs.json</code> (디바이스 독립). 추가/제거는 <code>viz/lib/custom-features.js</code> 정본 registry 에서 관리.</p>
      ${rows}
    </div>`;
}

/** 알려진 postSuccessHook 키워드 → 실행 함수 매핑. 새 hook 추가 시 여기에 한 줄. */
const POST_SUCCESS_HOOKS = {
  async restartSyncBanner() {
    try {
      const mod = await import('../components/sync-banner.js');
      mod.startSyncBanner?.();
    } catch { /* sync-banner import 실패 시 silent — toast 메시지로 사용자 안내됨 */ }
  },
};

/**
 * 토글 + 액션 버튼 click 위임 핸들러 부착.
 * state: { container, vizPrefs, showToast }
 *
 * 토글 동작 — POST /api/viz-prefs 후 viz-prefs.json 갱신.
 *   실패 시 UI 롤백 + 에러 toast.
 * 액션 동작 — registry 의 endpoint/method 로 호출.
 *   2xx → successToast + postSuccessHook 실행
 *   409 → conflict (이미 실행 중) toast
 *   기타 → 에러 toast
 *   요청 진행 동안 버튼 disabled + "시작 중..." 라벨.
 */
export function attachSettingsHandlers(state) {
  const c = state.container;
  // idempotent — settings.js renderAll 이 매번 호출돼도 한 번만 부착.
  if (c._customFeaturesAttached) return;
  c._customFeaturesAttached = true;
  c.addEventListener('click', async (ev) => {
    // 토글
    const t = ev.target.closest('[data-feature-toggle]');
    if (t) {
      const id = t.dataset.featureToggle;
      const feature = featureById(id);
      if (!feature) return;
      const prev = !!state.vizPrefs[id];
      state.vizPrefs[id] = !prev;
      t.classList.toggle('on', state.vizPrefs[id]);
      try {
        const r = await fetch('/api/viz-prefs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [id]: state.vizPrefs[id] }),
        });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const updated = await r.json();
        // mutation — 외부 state.vizPrefs ref 와 같은 객체 유지 (reassign 안 함)
        Object.assign(state.vizPrefs, updated);
        const hint = feature.toggleApplyHint ? ` — ${feature.toggleApplyHint}` : '';
        state.showToast(`${feature.label}: ${state.vizPrefs[id] ? 'on' : 'off'}${hint}`);
      } catch (err) {
        state.vizPrefs[id] = prev;
        t.classList.toggle('on', prev);
        state.showToast(`저장 실패: ${err.message}`, 4000);
      }
      return;
    }

    // 액션 버튼
    const btn = ev.target.closest('[data-feature-action]');
    if (btn) {
      const id = btn.dataset.featureAction;
      const feature = featureById(id);
      const surface = feature && feature.surfaces.find((s) => s.type === 'settings-row');
      const action = surface && surface.action;
      if (!action) return;
      btn.disabled = true;
      const orig = btn.textContent;
      btn.textContent = '시작 중...';
      try {
        const r = await fetch(action.endpoint, { method: action.method || 'POST' });
        if (r.status === 409) {
          const j = await r.json().catch(() => ({}));
          const key = action.conflictToastKey || 'error';
          state.showToast(j[key] || '이미 진행 중', 3000);
        } else if (r.ok) {
          if (action.successToast) state.showToast(action.successToast, 2500);
          if (action.postSuccessHook && POST_SUCCESS_HOOKS[action.postSuccessHook]) {
            POST_SUCCESS_HOOKS[action.postSuccessHook]();
          }
        } else {
          state.showToast(`요청 실패: status ${r.status}`, 3500);
        }
      } catch (err) {
        state.showToast(`요청 실패: ${err.message}`, 3500);
      } finally {
        btn.disabled = false;
        btn.textContent = orig;
      }
    }
  });
}

/** 외부 노출 — 향후 surface 추가 시 같은 패턴 반복 (custom-features-home.js 등). */
export { CUSTOM_FEATURES };
