/**
 * AIMindVaults Visualization — Network Sliders 모듈 (Phase 2.7 W2)
 *
 * 역할:
 *   network 페이지 toolbar 의 force 슬라이더 4 (gravity / repulsion / edgeLen / labelCount) +
 *   리셋 버튼 setup. 변경 시 chart 에 즉시 적용 (freezeApi 경유 unfreeze→1초 후 자동 refreeze) +
 *   localStorage 영속 (400ms debounce).
 *
 * 슬라이더 범위:
 *   - gravity:    0.02 ~ 0.15 (step 0.005, default 0.04)
 *   - repulsion:  200 ~ 1500 (step 50, default 800)
 *   - edgeLen:    80 ~ 300   (step 10, default 180)
 *   - labelCount: 10 ~ 200   (step 10, default 50)
 *
 * localStorage 키:
 *   `aimv_viz_user_config` 의 `cfg.network` 영역만 read/write — settings.js 와 공유 (다른 영역 보존).
 *
 * Spec:    [[20260508_그래프뷰_안정화_인터페이스_명세]] § 2.2
 * 영문화:  [[20260530_viz_정본_영문화_매니페스트]] § 6.5
 */

const STORAGE_KEY = 'aimv_viz_user_config';
const SAVE_DEBOUNCE_MS = 400;

export const DEFAULT_NETWORK_CONFIG = Object.freeze({
  force: Object.freeze({
    gravity: 0.04,       // [0.02, 0.15]
    repulsion: 800,      // [200, 1500]
    edgeLength: 180,     // [80, 300]
  }),
  labelCount: 50,        // [10, 200]
});

const SLIDER_RANGES = Object.freeze({
  gravity:    Object.freeze({ min: 0.02, max: 0.15, step: 0.005, default: 0.04 }),
  repulsion:  Object.freeze({ min: 200,  max: 1500, step: 50,    default: 800 }),
  edgeLen:    Object.freeze({ min: 80,   max: 300,  step: 10,    default: 180 }),
  labelCount: Object.freeze({ min: 10,   max: 200,  step: 10,    default: 50 }),
});

export function loadNetworkConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (!cfg || !cfg.network) return null;
    const force = cfg.network.force || {};
    return {
      force: {
        gravity: typeof force.gravity === 'number' ? force.gravity : DEFAULT_NETWORK_CONFIG.force.gravity,
        repulsion: typeof force.repulsion === 'number' ? force.repulsion : DEFAULT_NETWORK_CONFIG.force.repulsion,
        edgeLength: typeof force.edgeLength === 'number' ? force.edgeLength : DEFAULT_NETWORK_CONFIG.force.edgeLength,
      },
      labelCount: typeof cfg.network.labelCount === 'number' ? cfg.network.labelCount : DEFAULT_NETWORK_CONFIG.labelCount,
    };
  } catch (err) {
    console.error('[network sliders] load failed:', err);
    return null;
  }
}

export function saveNetworkConfig(network) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const cfg = raw ? JSON.parse(raw) : {};
    cfg.network = {
      ...(cfg.network || {}),
      force: {
        ...((cfg.network && cfg.network.force) || {}),
        ...(network.force || {}),
      },
      labelCount: typeof network.labelCount === 'number'
        ? network.labelCount
        : (cfg.network && cfg.network.labelCount),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.error('[network sliders] save failed:', err);
  }
}

let saveTimer = null;
export function debouncedSaveNetworkConfig(network) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveNetworkConfig(network);
  }, SAVE_DEBOUNCE_MS);
}

/**
 * 슬라이더 + 리셋 버튼 setup.
 * @param {HTMLElement} toolbar 슬라이더 부모 (data-force / data-reset attribute 가진 input/button 포함)
 * @param {*} chart ECharts instance (직접 setOption 호출 X — freezeApi 경유)
 * @param {{unfreezeAndScheduleRefreeze: Function, resetFrozenFlag: Function}} freezeApi spec § 2.1 ConditionalFreezeAPI
 * @param {{updateScoreThreshold: Function, recomputeThreshold: Function}} labelsApi spec § 2.4 LabelsAPI
 * @returns {() => void} dispose
 */
export function setupSliders(toolbar, chart, freezeApi, labelsApi) {
  if (!toolbar || typeof toolbar.querySelector !== 'function') {
    throw new Error('setupSliders: toolbar 가 HTMLElement 아님');
  }
  if (!freezeApi || typeof freezeApi.unfreezeAndScheduleRefreeze !== 'function') {
    throw new Error('setupSliders: freezeApi.unfreezeAndScheduleRefreeze 누락');
  }
  if (!labelsApi || typeof labelsApi.updateScoreThreshold !== 'function') {
    throw new Error('setupSliders: labelsApi.updateScoreThreshold 누락');
  }

  const stored = loadNetworkConfig();
  const cfg = stored
    ? { force: { ...stored.force }, labelCount: stored.labelCount }
    : { force: { ...DEFAULT_NETWORK_CONFIG.force }, labelCount: DEFAULT_NETWORK_CONFIG.labelCount };

  function syncSliderUI(name, value) {
    const input = toolbar.querySelector(`input[data-force="${name}"]`);
    if (input) input.value = String(value);
    const valEl = toolbar.querySelector(`[data-force-val="${name}"]`);
    if (valEl) {
      valEl.textContent = name === 'gravity'
        ? Number(value).toFixed(3)
        : String(Math.round(value));
    }
  }

  syncSliderUI('gravity', cfg.force.gravity);
  syncSliderUI('repulsion', cfg.force.repulsion);
  syncSliderUI('edgeLen', cfg.force.edgeLength);
  syncSliderUI('labelCount', cfg.labelCount);

  function applyForceToChart() {
    freezeApi.unfreezeAndScheduleRefreeze({
      gravity: cfg.force.gravity,
      repulsion: cfg.force.repulsion,
      edgeLength: [
        Math.round(cfg.force.edgeLength * 0.66),
        Math.round(cfg.force.edgeLength * 1.33),
      ],
      friction: 0.5,
    });
  }

  function onInput(ev) {
    const t = ev.target;
    if (!t || typeof t.getAttribute !== 'function') return;
    const force = t.getAttribute('data-force');
    if (!force) return;

    const v = parseFloat(t.value);
    if (!Number.isFinite(v)) return;

    if (force === 'gravity')        cfg.force.gravity = v;
    else if (force === 'repulsion') cfg.force.repulsion = v;
    else if (force === 'edgeLen')   cfg.force.edgeLength = v;
    else if (force === 'labelCount') cfg.labelCount = Math.round(v);
    else return;

    syncSliderUI(
      force,
      force === 'edgeLen' ? cfg.force.edgeLength
        : force === 'labelCount' ? cfg.labelCount
        : v,
    );

    if (force === 'labelCount') {
      labelsApi.updateScoreThreshold(cfg.labelCount);
    } else {
      applyForceToChart();
    }

    debouncedSaveNetworkConfig(cfg);
  }

  function onResetClick(ev) {
    const t = ev.target;
    if (!t || typeof t.getAttribute !== 'function') return;
    const target = t.getAttribute('data-reset');
    if (!target) return;
    const range = SLIDER_RANGES[target];
    if (!range) return;

    if (target === 'gravity')        cfg.force.gravity = range.default;
    else if (target === 'repulsion') cfg.force.repulsion = range.default;
    else if (target === 'edgeLen')   cfg.force.edgeLength = range.default;
    else if (target === 'labelCount') cfg.labelCount = range.default;

    syncSliderUI(
      target,
      target === 'edgeLen' ? cfg.force.edgeLength
        : target === 'labelCount' ? cfg.labelCount
        : range.default,
    );

    if (target === 'labelCount') {
      labelsApi.updateScoreThreshold(cfg.labelCount);
    } else {
      applyForceToChart();
    }

    debouncedSaveNetworkConfig(cfg);
  }

  toolbar.addEventListener('input', onInput);
  toolbar.addEventListener('change', onInput);
  toolbar.addEventListener('click', onResetClick);

  applyForceToChart();

  return function dispose() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    toolbar.removeEventListener('input', onInput);
    toolbar.removeEventListener('change', onInput);
    toolbar.removeEventListener('click', onResetClick);
  };
}

export const __internal = { STORAGE_KEY, SAVE_DEBOUNCE_MS, SLIDER_RANGES };
