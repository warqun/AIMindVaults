/**
 * AIMindVaults Visualization — Settings 페이지 (W5)
 *
 * 역할:
 *   UserConfig (theme / 외관 색 / 차트 두께 / 토글 / 홈 섹션 표시) 편집 화면.
 *   4 패널 캐러셀 (외관·UI / 그래프·차트 / 프리셋·입출력 / 커스텀=홈 표시 토글) — 무한 순환 슬라이드.
 *   변경 즉시 localStorage 저장 + `aimv:user-config-changed` 이벤트 → 다른 페이지 (home 등) 실시간 반영.
 *
 * 데이터 입력:
 *   - userConfig (initPage 인자)      — defaults 와 deep merge 후 cfg state 로 보유.
 *   - lib/user-config.js              — SCHEMA_VERSION, defaultUserConfig, load/save/normalize.
 *   - lib/theme-engine.js             — THEME_VAR_GROUPS (시맨틱 변수 묶음), baseValue/setOverride/clearOverride, applyTheme, resolvedTheme.
 *
 * localStorage 키 2개:
 *   - `aimv_viz_user_config`          — UserConfig 정본 (lib/user-config.js 책임)
 *   - `aimv_viz_presets`              — 명명 프리셋 슬롯 (`{ name: configSnapshot }`)
 *
 * 주요 함수 카탈로그:
 *   - initPage                         ← 진입점, cfg state + 4 패널 + 핸들러 부착
 *   - renderHTML / renderAll           ← 4 패널 HTML 골격 + 통합 렌더
 *   - renderPresets                    ← 프리셋 목록 (패널 2)
 *   - renderAppearance                 ← THEME_VAR_GROUPS 시맨틱 색 input 그룹
 *   - attachHandlers                   ← 모든 이벤트 (탭/슬라이더/토글/테마/Export-Import/프리셋/리셋/외관 색)
 *   - buildClones                      ← 앞뒤 패널 클론 (무한 순환 + 양끝 peek)
 *   - setGroup / slideRelative         ← 그룹 전환 (직접 / 클론 거침)
 *   - applyTrack / updateHeight / updateTabs ← 캐러셀 상태 동기
 *   - applyTheme / applyLayout / broadcastChange / showToast ← 부수 헬퍼
 *
 * 표준 시그니처:
 *   export async function initPage(container, data, userConfig): Promise<PageContext>
 *   PageContext = { destroy(), refresh(newData) }
 *
 * 참조:
 *   시안:    viz_design_drafts/09_settings.html
 *   Spec:    [[20260513_시스템스펙_04_시각화]] § 8 Settings (UserConfig)
 *   테마:    [[20260525_viz_테마_엔진_설계]]
 *   영문화:  [[20260530_viz_정본_영문화_매니페스트]] § 6.9
 */

import {
  SCHEMA_VERSION,
  defaultUserConfig, loadUserConfig, saveUserConfig, normalizeUserConfig,
} from '../lib/user-config.js';
import {
  THEME_VAR_GROUPS, baseValue, setOverride, clearOverride, clearAllOverrides, resolvedTheme,
  applyTheme as applyThemeEngine,
} from '../lib/theme-engine.js';

const PRESETS_KEY = 'aimv_viz_presets';

/** 명명 프리셋 슬롯 — `{ name: configSnapshot }` 형태로 localStorage 에 영속. cfg 전체 deep clone 저장. */
export function loadPresets() {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY)) || {}; } catch { return {}; }
}
export function savePresets(p) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(p)); } catch (err) { console.error('[settings] preset save failed:', err); }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function applyTheme(cfg) {
  applyThemeEngine(cfg.themeBase || 'light', cfg.themeOverrides || {});
}

function applyLayout(cfg) {
  document.documentElement.setAttribute('data-layout', cfg && cfg.wideLayout ? 'wide' : 'normal');
}

function broadcastChange(cfg) {
  window.dispatchEvent(new CustomEvent('aimv:user-config-changed', { detail: { config: cfg } }));
}

/** 우하단 토스트 한 줄 (ms 후 fade out). 같은 인스턴스 재사용 + setTimeout 재설정. */
function showToast(text, ms = 2200) {
  let el = document.getElementById('settings-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'settings-toast';
    el.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:10px 14px;font-size:12px;color:var(--text);box-shadow:var(--shadow-hover);z-index:9999;opacity:0;transition:opacity .2s';
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.opacity = '1';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.style.opacity = '0'; }, ms);
}

/**
 * Settings 페이지 HTML 골격. 4 패널 (캐러셀 그룹):
 *   0. 외관 / UI       — 테마 토글 + 시맨틱 색 override + 레이아웃 (wide)
 *   1. 그래프 / 차트   — 노드/엣지 multiplier + autoScale
 *   2. 프리셋 / 입출력 — 명명 프리셋 + Export/Import JSON + PNG 스냅샷 + Reset
 *   3. 커스텀          — 홈 표시 토글 (kpiHero/recentActivity/vizCards/exploreCards)
 *
 * 사용자 노출 텍스트: 탭 라벨 4, 섹션 제목 8, 라벨 + sub + desc 다수.
 * 영문화 매핑 [[20260530_viz_정본_영문화_매니페스트]] § 6.9 참조.
 */
function renderHTML(state) {
  const cfg = state.cfg;
  const gi = state.groupIndex || 0;
  const tabStyle = (i) => { const on = gi === i; return `padding:5px 12px;border:1px solid ${on ? 'var(--accent)' : 'var(--border)'};border-radius:6px;cursor:pointer;font-size:12px;background:${on ? 'var(--accent-bg)' : 'var(--surface)'};color:${on ? 'var(--accent)' : 'var(--text-2)'};font-weight:${on ? '600' : '400'}`; };
  return `
    <div class="settings-page" style="max-width:840px;margin:0 auto">
      <div class="settings-swap-nav" style="display:flex;align-items:center;gap:8px;margin-bottom:16px;position:sticky;top:0;z-index:5;background:var(--bg);padding:8px 0">
        <button class="btn" id="set-grp-prev" title="이전 그룹" style="padding:4px 14px;font-size:16px;line-height:1">‹</button>
        <div class="settings-tabs" style="flex:1;display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
          <button class="set-grp-tab" data-group="0" style="${tabStyle(0)}">외관 / UI</button>
          <button class="set-grp-tab" data-group="1" style="${tabStyle(1)}">그래프 / 차트</button>
          <button class="set-grp-tab" data-group="2" style="${tabStyle(2)}">프리셋 / 입출력</button>
          <button class="set-grp-tab" data-group="3" style="${tabStyle(3)}">커스텀</button>
        </div>
        <button class="btn" id="set-grp-next" title="다음 그룹" style="padding:4px 14px;font-size:16px;line-height:1">›</button>
      </div>
      <div class="settings-viewport" style="overflow:hidden;transition:height .3s ease">
        <div class="settings-track" id="set-track" style="display:flex;align-items:flex-start;transition:transform .3s ease">

          <div class="settings-panel" style="min-width:0;box-sizing:border-box">
            <div class="section">
              <h2>테마</h2>
              <p class="desc">밝은 / 어두운 계열 전환. localStorage 영속.</p>
              <div class="row">
                <div class="label">테마</div>
                <div class="ctrl"><div class="seg" id="set-theme-seg">
                  <button class="${cfg.themeBase === 'light' ? 'on' : ''}" data-theme="light">밝게</button>
                  <button class="${cfg.themeBase === 'dark' ? 'on' : ''}" data-theme="dark">어둡게</button>
                  <button class="${cfg.themeBase === 'auto' ? 'on' : ''}" data-theme="auto">OS 따라</button>
                </div></div>
              </div>
            </div>
            <div class="section">
              <h2>외관 (테마 색)</h2>
              <p class="desc">현재 테마 위에 UI 색을 덮어씁니다. 변경 즉시 반영되고 밝게/어둡게 각각 독립 저장됩니다. ● = 변경됨, ↺ = 변수별 복원. 프리셋·JSON 내보내기에 함께 저장됩니다.</p>
              <div id="set-appearance"></div>
              <button class="btn" id="set-appearance-reset" style="margin-top:10px">↺ 이 테마 색 전체 기본값으로</button>
            </div>
            <div class="section">
              <h2>레이아웃</h2>
              <p class="desc">전체 폭 모드 — 화면이 1280px 보다 클 때 컨텐츠를 창 폭에 맞춰 확장. OFF 시 1280px 가운데 정렬 (기본).</p>
              <div class="row">
                <div><div class="label">전체 폭 모드</div><div class="sub">큰 모니터에서 양 옆 여백 최소화</div></div>
                <div class="ctrl"><div class="toggle ${cfg.wideLayout ? 'on' : ''}" data-toggle="wideLayout"></div></div>
              </div>
            </div>
          </div>

          <div class="settings-panel" style="min-width:0;box-sizing:border-box">
            <div class="section">
              <h2>차트 동작</h2>
              <p class="desc">노드·엣지 두께 multiplier + 자동 비례 토글. 0.5x ~ 3.0x 범위.</p>
              <div class="row">
                <div><div class="label">노드 크기 multiplier</div><div class="sub">force-directed graph node size</div></div>
                <div class="ctrl"><div class="range-wrap">
                  <input type="range" min="0.5" max="3" step="0.1" value="${cfg.nodeMul}" id="set-node-mul" />
                  <span class="val" id="set-node-mul-val">${cfg.nodeMul.toFixed(1)}×</span>
                </div></div>
              </div>
              <div class="row">
                <div><div class="label">엣지 두께 multiplier</div><div class="sub">network edge & sankey link width</div></div>
                <div class="ctrl"><div class="range-wrap">
                  <input type="range" min="0.5" max="3" step="0.1" value="${cfg.edgeMul}" id="set-edge-mul" />
                  <span class="val" id="set-edge-mul-val">${cfg.edgeMul.toFixed(1)}×</span>
                </div></div>
              </div>
              <div class="row">
                <div><div class="label">자동 비례</div><div class="sub">note count / link count 기반 자동 크기 조정</div></div>
                <div class="ctrl"><div class="toggle ${cfg.autoScale ? 'on' : ''}" data-toggle="autoScale"></div></div>
              </div>
            </div>
          </div>

          <div class="settings-panel" style="min-width:0;box-sizing:border-box">
            <div class="section">
              <h2>테마 프리셋</h2>
              <p class="desc">현재 색상·두께·토글·테마·레이아웃 전체를 이름 붙여 저장하고 골라 쓰기. localStorage 영속.</p>
              <div class="add-color">
                <input type="text" id="set-preset-name" placeholder="프리셋 이름 (예: 발표용 다크)" maxlength="32" />
                <button class="btn primary" id="set-preset-save">+ 현재 설정 저장</button>
              </div>
              <div class="preset-list" id="set-preset-list" style="margin-top:10px"></div>
            </div>
            <div class="section">
              <h2>입출력</h2>
              <p class="desc">색상 + 두께 + 토글 + 테마 설정을 JSON 으로 내보내고 다른 환경에서 불러올 수 있음.</p>
              <div class="io-row">
                <button class="btn" id="set-export">📥 JSON 내보내기</button>
                <button class="btn" id="set-import-trigger">📤 JSON 불러오기</button>
                <input type="file" id="set-import-file" accept=".json" hidden />
                <button class="btn" id="set-snapshot">📷 현재 화면 PNG 스냅샷</button>
              </div>
            </div>
            <div class="section danger-zone">
              <h2>리셋</h2>
              <p class="desc">사전 20색 + multiplier 1.0 + 토글 ON + 테마 light 로 초기화. 사용자 추가 색상은 모두 삭제됩니다.</p>
              <button class="btn danger" id="set-reset">⟲ 모든 설정 초기화</button>
            </div>
          </div>

          <div class="settings-panel" style="min-width:0;box-sizing:border-box">
            <div class="section">
              <h2>표시 토글</h2>
              <p class="desc">홈 화면에 표시할 영역을 켜고 끕니다. 사용자별로 홈 구성을 개인화하는 영역이며 즉시 적용됩니다.</p>
              <div class="row"><div class="label">KPI Hero</div><div class="ctrl"><div class="toggle ${cfg.homeToggles.kpiHero ? 'on' : ''}" data-home-toggle="kpiHero"></div></div></div>
              <div class="row"><div class="label">최근 활동 (7일 + 추가 항목)</div><div class="ctrl"><div class="toggle ${cfg.homeToggles.recentActivity ? 'on' : ''}" data-home-toggle="recentActivity"></div></div></div>
              <div class="row"><div class="label">시각화 카드 (4종)</div><div class="ctrl"><div class="toggle ${cfg.homeToggles.vizCards ? 'on' : ''}" data-home-toggle="vizCards"></div></div></div>
              <div class="row"><div class="label">탐색 카드 (Vault 트리 + 룰뷰어)</div><div class="ctrl"><div class="toggle ${cfg.homeToggles.exploreCards ? 'on' : ''}" data-home-toggle="exploreCards"></div></div></div>
            </div>
          </div>

        </div>
      </div>
    </div>`;
}

function renderPresets(state) {
  const wrap = state.container.querySelector('#set-preset-list');
  if (!wrap) return;
  const names = Object.keys(loadPresets()).sort();
  if (names.length === 0) {
    wrap.innerHTML = '<p class="sub" style="color:var(--text-3);font-size:11px;margin:0">저장된 프리셋 없음. 위에서 현재 설정을 이름 붙여 저장하세요.</p>';
    return;
  }
  wrap.innerHTML = names.map((name) => `
    <div class="preset-row" style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="flex:1;font-size:13px;color:var(--text)">${escapeHtml(name)}</span>
      <button class="btn preset-apply" data-preset="${escapeHtml(name)}" style="font-size:11px;padding:3px 10px">적용</button>
      <button class="btn preset-del" data-preset-del="${escapeHtml(name)}" style="font-size:11px;padding:3px 10px">삭제</button>
    </div>`).join('');
}

/**
 * 모든 사용자 인터랙션 핸들러 부착 — 한 곳에 모음 (이벤트 위임 + 직접 바인딩 혼합).
 *
 * 핸들러 그룹:
 *   - 그룹 prev/next/tab 클릭 → setGroup / slideRelative (무한 순환)
 *   - 슬라이더 (nodeMul, edgeMul) → cfg 갱신 + persist
 *   - 토글 (autoScale, wideLayout, homeToggles) — 이벤트 위임으로 한 리스너에서 분기
 *   - 테마 세그먼트 (light/dark/auto) → applyTheme + 외관 재렌더
 *   - Export (JSON) / Import (JSON, 형식·버전 검증) / Snapshot (PNG, ECharts getDataURL)
 *   - 프리셋 (save/apply/delete) — `aimv_viz_presets` localStorage
 *   - Reset (confirm) → defaultUserConfig
 *   - 외관 색 input → setOverride (현재 테마의 themeOverrides), reset 버튼 → clearOverride
 *
 * 사용자 노출 메시지: showToast / confirm (§ 6.9 카탈로그 토스트·Confirm 그룹 참조).
 */
function attachHandlers(state) {
  const cfg = state.cfg;
  const c = state.container;
  const persist = (deep = false) => {
    saveUserConfig(cfg);
    broadcastChange(cfg);
    if (deep) renderAll(state);
  };

  // 그룹 좌우 전환 (무한 순환 슬라이드)
  const grpPrev = c.querySelector('#set-grp-prev');
  const grpNext = c.querySelector('#set-grp-next');
  if (grpPrev) grpPrev.addEventListener('click', () => slideRelative(state, -1));
  if (grpNext) grpNext.addEventListener('click', () => slideRelative(state, 1));
  c.querySelectorAll('.set-grp-tab').forEach((b) => b.addEventListener('click', () => setGroup(state, Number(b.dataset.group))));


  // Sliders
  const nodeMul = c.querySelector('#set-node-mul');
  const edgeMul = c.querySelector('#set-edge-mul');
  nodeMul.addEventListener('input', () => {
    cfg.nodeMul = parseFloat(nodeMul.value);
    cfg.thicknessMultiplier = cfg.nodeMul;
    c.querySelector('#set-node-mul-val').textContent = cfg.nodeMul.toFixed(1) + '×';
    persist();
  });
  edgeMul.addEventListener('input', () => {
    cfg.edgeMul = parseFloat(edgeMul.value);
    c.querySelector('#set-edge-mul-val').textContent = cfg.edgeMul.toFixed(1) + '×';
    persist();
  });

  // Toggles (autoScale + wideLayout + homeToggles)
  c.addEventListener('click', (ev) => {
    const t = ev.target.closest('.toggle');
    if (!t) return;
    if (t.dataset.toggle === 'autoScale') {
      cfg.autoScale = !cfg.autoScale;
      t.classList.toggle('on', cfg.autoScale);
      persist();
    } else if (t.dataset.toggle === 'wideLayout') {
      cfg.wideLayout = !cfg.wideLayout;
      t.classList.toggle('on', cfg.wideLayout);
      applyLayout(cfg);
      saveUserConfig(cfg);
      broadcastChange(cfg);
    } else if (t.dataset.homeToggle) {
      const k = t.dataset.homeToggle;
      cfg.homeToggles[k] = !cfg.homeToggles[k];
      t.classList.toggle('on', cfg.homeToggles[k]);
      persist();
    }
  });

  // Theme segment
  c.querySelector('#set-theme-seg').addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-theme]');
    if (!btn) return;
    cfg.themeBase = btn.dataset.theme;
    btn.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === btn));
    saveUserConfig(cfg);
    applyTheme(cfg);
    broadcastChange(cfg);
    renderAppearance(state);
  });

  // Export / Import / Snapshot
  c.querySelector('#set-export').addEventListener('click', () => {
    const payload = { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), source: 'aimindvaults-viz', config: cfg };
    const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `aimv-viz-config_${ts}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast('config exported');
  });
  c.querySelector('#set-import-trigger').addEventListener('click', () => c.querySelector('#set-import-file').click());
  c.querySelector('#set-import-file').addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0]; if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      const normalized = obj && obj.config ? normalizeUserConfig(obj.config) : null;
      if (!normalized) {
        showToast('import 거부 — 형식 또는 버전 오류', 4000); return;
      }
      for (const k of Object.keys(cfg)) delete cfg[k];
      Object.assign(cfg, normalized);
      saveUserConfig(cfg);
      applyTheme(cfg);
      applyLayout(cfg);
      broadcastChange(cfg);
      renderAll(state);
      showToast('config imported');
    } catch (err) {
      showToast(`import 실패: ${err.message}`, 4000);
    } finally { ev.target.value = ''; }
  });
  c.querySelector('#set-snapshot').addEventListener('click', () => {
    const ec = window.echarts;
    const inst = (ec && typeof ec.getInstanceByDom === 'function')
      ? Array.from(document.querySelectorAll('.chart, .echarts')).map((el) => ec.getInstanceByDom(el)).filter(Boolean)
      : [];
    if (inst.length > 0) {
      const url = inst[0].getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: getComputedStyle(document.body).backgroundColor });
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '_');
      a.href = url; a.download = `aimv-viz-snapshot_${ts}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      showToast('스냅샷 PNG 다운로드');
    } else {
      showToast('차트 인스턴스를 찾지 못함 — 시각화 페이지에서 다시 시도', 3500);
    }
  });

  // Theme presets — 명명 슬롯 저장/적용/삭제
  c.querySelector('#set-preset-save').addEventListener('click', () => {
    const nameInput = c.querySelector('#set-preset-name');
    const name = (nameInput.value || '').trim();
    if (!name) { showToast('프리셋 이름을 입력하세요', 2500); return; }
    const presets = loadPresets();
    const existed = !!presets[name];
    presets[name] = JSON.parse(JSON.stringify(cfg));
    savePresets(presets);
    nameInput.value = '';
    renderPresets(state);
    showToast(existed ? `프리셋 덮어씀: ${name}` : `프리셋 저장: ${name}`);
  });
  c.querySelector('#set-preset-list').addEventListener('click', (ev) => {
    const applyBtn = ev.target.closest('[data-preset]');
    const delBtn = ev.target.closest('[data-preset-del]');
    if (applyBtn) {
      const snap = loadPresets()[applyBtn.dataset.preset];
      if (!snap) return;
      const merged = normalizeUserConfig(snap) || defaultUserConfig();
      for (const k of Object.keys(cfg)) delete cfg[k];
      Object.assign(cfg, merged);
      saveUserConfig(cfg);
      applyTheme(cfg);
      applyLayout(cfg);
      broadcastChange(cfg);
      renderAll(state);
      showToast(`프리셋 적용: ${applyBtn.dataset.preset}`);
    } else if (delBtn) {
      const name = delBtn.dataset.presetDel;
      const presets = loadPresets();
      if (presets[name]) { delete presets[name]; savePresets(presets); renderPresets(state); showToast(`프리셋 삭제: ${name}`); }
    }
  });

  // Reset
  c.querySelector('#set-reset').addEventListener('click', () => {
    if (!confirm('전체 리셋 — 색상·두께·토글·테마 모두 초기값. 진행?')) return;
    const fresh = defaultUserConfig();
    for (const k of Object.keys(cfg)) delete cfg[k];
    Object.assign(cfg, fresh);
    saveUserConfig(cfg);
    applyTheme(cfg);
    applyLayout(cfg);
    broadcastChange(cfg);
    renderAll(state);
    showToast('전체 리셋 완료');
  });

  // 외관 — 시맨틱 테마 색 편집기 (현재 테마의 override)
  const appear = c.querySelector('#set-appearance');
  if (appear) {
    appear.addEventListener('input', (ev) => {
      const inp = ev.target.closest('input[data-var]');
      if (!inp) return;
      const name = inp.dataset.var;
      const val = inp.value;
      const theme = resolvedTheme();
      if (!cfg.themeOverrides) cfg.themeOverrides = {};
      if (!cfg.themeOverrides[theme]) cfg.themeOverrides[theme] = {};
      cfg.themeOverrides[theme][name] = val;
      setOverride(name, val);
      saveUserConfig(cfg);
      broadcastChange(cfg);
    });
    appear.addEventListener('click', (ev) => {
      const rb = ev.target.closest('[data-var-reset]');
      if (!rb) return;
      const name = rb.dataset.varReset;
      const theme = resolvedTheme();
      if (cfg.themeOverrides && cfg.themeOverrides[theme]) delete cfg.themeOverrides[theme][name];
      clearOverride(name);
      saveUserConfig(cfg);
      broadcastChange(cfg);
      renderAppearance(state);
    });
  }

  // 외관 — 현재 테마 색 전체를 base 기본값으로 복원
  const apReset = c.querySelector('#set-appearance-reset');
  if (apReset) apReset.addEventListener('click', () => {
    const theme = resolvedTheme();
    if (cfg.themeOverrides) delete cfg.themeOverrides[theme];
    clearAllOverrides();
    saveUserConfig(cfg);
    broadcastChange(cfg);
    renderAppearance(state);
    showToast('이 테마 색을 기본값으로 복원');
  });
}

function toColorInput(v) {
  v = (v || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) return ('#' + v.slice(1).replace(/./g, (ch) => ch + ch)).toLowerCase();
  return '#000000';
}

/**
 * 외관 (테마 색) 영역 렌더. `THEME_VAR_GROUPS` (시맨틱 변수 묶음) 를 그룹별로 펼쳐 색 input 표시.
 * 각 변수: 색 picker + 변수 라벨 + override 표시 (●) + 변수별 reset (↺).
 * 색은 현재 resolvedTheme 의 override 우선, 없으면 base 값. 변경 시 themeOverrides[theme][name] 저장.
 */
function renderAppearance(state) {
  const wrap = state.container.querySelector('#set-appearance');
  if (!wrap) return;
  const cfg = state.cfg;
  const theme = resolvedTheme();
  const ov = (cfg.themeOverrides && cfg.themeOverrides[theme]) || {};
  wrap.innerHTML = THEME_VAR_GROUPS.map((g) => `
    <div class="appear-group" style="margin-bottom:12px">
      <h3 style="font-size:12px;color:var(--text-2);margin:0 0 6px;font-weight:600">${escapeHtml(g.label)}</h3>
      <div class="appear-vars" style="display:flex;flex-wrap:wrap;gap:8px">
        ${g.vars.map((v) => {
          const isOv = !!ov[v.name];
          const shown = toColorInput(ov[v.name] || baseValue(v.name));
          return `<div class="appear-row" style="display:flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:6px;padding:4px 8px;background:var(--surface-2)">
            <input type="color" data-var="${escapeHtml(v.name)}" value="${shown}" title="${escapeHtml(v.name)}" style="width:28px;height:22px;border:1px solid var(--border);border-radius:4px;cursor:pointer;background:transparent;padding:0" />
            <span style="font-size:11px;color:var(--text)">${escapeHtml(v.label)}</span>
            ${isOv ? '<span title="변경됨" style="color:var(--accent);font-size:10px">●</span>' : ''}
            <span class="var-reset" data-var-reset="${escapeHtml(v.name)}" title="기본값 복원" style="font-size:11px;color:var(--text-3);cursor:pointer">↺</span>
          </div>`;
        }).join('')}
      </div>
    </div>`).join('');
}

const CAROUSEL_PEEK = 22;
const CAROUSEL_GAP = 14;
const GROUP_COUNT = 4;

function carouselMetrics(state) {
  const vp = state.container.querySelector('.settings-viewport');
  const vpw = vp ? vp.clientWidth : 0;
  const panelW = Math.max(200, vpw - CAROUSEL_PEEK * 2 - CAROUSEL_GAP);
  return { vp, vpw, panelW };
}

// 모든 패널(클론 포함) 폭/마진을 맞추고 track 을 slot 위치로 이동. slot: 0=앞클론, 1..N=실제, N+1=뒤클론.
function applyTrack(state, slot, animate) {
  const track = state.container.querySelector('#set-track');
  if (!track) return;
  const { vpw, panelW } = carouselMetrics(state);
  track.querySelectorAll('.settings-panel').forEach((p) => {
    p.style.flex = `0 0 ${panelW}px`;
    p.style.marginRight = `${CAROUSEL_GAP}px`;
  });
  const offset = slot * (panelW + CAROUSEL_GAP) - (vpw - panelW) / 2;
  track.style.transition = animate ? 'transform .3s ease' : 'none';
  track.style.transform = `translateX(-${Math.max(0, offset)}px)`;
}

function updateTabs(state) {
  const idx = state.groupIndex || 0;
  state.container.querySelectorAll('.set-grp-tab').forEach((b) => {
    const on = Number(b.dataset.group) === idx;
    b.style.background = on ? 'var(--accent-bg)' : 'var(--surface)';
    b.style.color = on ? 'var(--accent)' : 'var(--text-2)';
    b.style.borderColor = on ? 'var(--accent)' : 'var(--border)';
    b.style.fontWeight = on ? '600' : '400';
  });
}

function updateHeight(state) {
  const vp = state.container.querySelector('.settings-viewport');
  const real = Array.from(state.container.querySelectorAll('.settings-panel'))
    .filter((p) => !p.classList.contains('settings-panel-clone'));
  const p = real[state.groupIndex || 0];
  if (vp && p) vp.style.height = p.offsetHeight + 'px';
}

/**
 * 실제 4 패널 양 끝에 클론 1 개씩 삽입 (앞에 마지막 panel 클론, 뒤에 첫 panel 클론).
 * slideRelative 이 첫·마지막 패널을 넘어 연속 슬라이드 직후 transition 없이 실제 위치로 점프 → 무한 순환.
 * 클론은 id/상호작용 (`disabled` + `tabIndex=-1` + `pointer-events:none`) 모두 제거 — 시각만.
 */
function buildClones(state) {
  const track = state.container.querySelector('#set-track');
  if (!track) return;
  track.querySelectorAll('.settings-panel-clone').forEach((n) => n.remove());
  const panels = Array.from(track.querySelectorAll('.settings-panel'));
  if (panels.length < 2) return;
  const makeClone = (src) => {
    const cl = src.cloneNode(true);
    cl.classList.add('settings-panel-clone');
    cl.setAttribute('aria-hidden', 'true');
    cl.querySelectorAll('[id]').forEach((e) => e.removeAttribute('id'));
    cl.querySelectorAll('input,button,select,textarea').forEach((e) => { e.disabled = true; e.tabIndex = -1; });
    cl.style.pointerEvents = 'none';
    return cl;
  };
  track.insertBefore(makeClone(panels[panels.length - 1]), panels[0]);
  track.appendChild(makeClone(panels[0]));
}

/** 탭 클릭 / 초기 진입 시 그룹 직접 전환 (클론 거치지 않음). logical idx 를 modulo GROUP_COUNT 로 정규화. */
function setGroup(state, idx, animate = true) {
  idx = ((idx % GROUP_COUNT) + GROUP_COUNT) % GROUP_COUNT;
  state.groupIndex = idx;
  updateTabs(state);
  applyTrack(state, idx + 1, animate);
  updateHeight(state);
}

/**
 * prev/next 버튼 시 앞·뒤 클론을 거쳐 슬라이드 → transitionend 후 실제 위치로 점프 (transition 끄고).
 * state.animating 으로 중복 호출 방지 + 420ms timeout fallback (transitionend 미발화 대비).
 */
function slideRelative(state, dir) {
  if (state.animating) return;
  const track = state.container.querySelector('#set-track');
  if (!track) return;
  const targetSlot = (state.groupIndex || 0) + 1 + dir;
  state.animating = true;
  state.groupIndex = (((state.groupIndex || 0) + dir) % GROUP_COUNT + GROUP_COUNT) % GROUP_COUNT;
  updateTabs(state);
  applyTrack(state, targetSlot, true);
  const onEnd = (e) => {
    if (e && e.propertyName !== 'transform') return;
    if (!state.animating) return;
    track.removeEventListener('transitionend', onEnd);
    let real = targetSlot;
    if (targetSlot === 0) real = GROUP_COUNT;
    else if (targetSlot === GROUP_COUNT + 1) real = 1;
    if (real !== targetSlot) applyTrack(state, real, false);
    state.animating = false;
    updateHeight(state);
  };
  track.addEventListener('transitionend', onEnd);
  setTimeout(() => { if (state.animating) onEnd(); }, 420);
}

function renderAll(state) {
  state.container.innerHTML = renderHTML(state);
  renderPresets(state);
  renderAppearance(state);
  buildClones(state);
  attachHandlers(state);
  setGroup(state, state.groupIndex || 0, false);
}

export async function initPage(container, data, userConfig) {
  // 옛 schema (nodeMul/edgeMul 등 누락) → defaults 와 deep merge 강제
  const def = defaultUserConfig();
  const cfg = userConfig
    ? {
        ...def,
        ...userConfig,
        toggles: { ...def.toggles, ...(userConfig.toggles || {}) },
        homeToggles: { ...def.homeToggles, ...(userConfig.homeToggles || {}) },
      }
    : loadUserConfig();
  const state = { container, cfg, data, groupIndex: 0 };
  applyTheme(cfg);
  renderAll(state);
  const onResize = () => { applyTrack(state, (state.groupIndex || 0) + 1, false); updateHeight(state); };
  window.addEventListener('resize', onResize);

  return {
    destroy() { window.removeEventListener('resize', onResize); container.innerHTML = ''; },
    refresh(newData) {
      state.data = newData;
      setGroup(state, state.groupIndex || 0);
    },
  };
}
