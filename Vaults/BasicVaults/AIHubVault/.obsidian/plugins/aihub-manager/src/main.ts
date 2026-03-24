import { FileSystemAdapter, Plugin } from "obsidian";
import { AHMSettings, DEFAULT_SETTINGS } from "./settings";
import { detectMultiVaultRoot } from "./utils/VaultPathDetector";
import { RulesManager } from "./modules/RulesManager";
import { ClaudianSettingsManager } from "./modules/ClaudianSettings";
import { MetaBindBridge } from "./modules/MetaBindBridge";
import { AHMSettingsTab } from "./ui/SettingsTab";
import { AHMView, AHM_VIEW_TYPE } from "./views/AHMView";
import { logger } from "./utils/Logger";

export default class AihubManagerPlugin extends Plugin {
  // ─── 상태 ──────────────────────────────────────────────────
  settings!: AHMSettings;
  multiVaultRoot: string | null = null;

  // ─── 모듈 ──────────────────────────────────────────────────
  rulesManager: RulesManager | null = null;
  claudianSettings: ClaudianSettingsManager | null = null;
  private metaBind!: MetaBindBridge;

  // ─── 생명주기 ──────────────────────────────────────────────

  async onload(): Promise<void> {
    await this.loadSettings();
    this.resolveMultiVaultRoot();
    this.initModules();

    this.registerView(AHM_VIEW_TYPE, (leaf) => new AHMView(leaf, this));
    this.addRibbonIcon("vault", "AIHub Manager", () => this.activateView());
    this.addCommand({ id: "open-panel", name: "AIHub: 패널 열기", callback: () => this.activateView() });
    this.addSettingTab(new AHMSettingsTab(this.app, this));

    this.metaBind = new MetaBindBridge(
      this.app,
      this.settings,
      this.multiVaultRoot ?? "",
      (cmd) => this.addCommand(cmd)
    );
    this.metaBind.register();

    logger.info("Plugin loaded. multiVaultRoot:", this.multiVaultRoot);
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(AHM_VIEW_TYPE);
    logger.info("Plugin unloaded");
  }

  // ─── 설정 ──────────────────────────────────────────────────

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  // ─── 모듈 초기화 ───────────────────────────────────────────

  /** 설정 오버라이드 → 없으면 볼트 경로에서 자동 탐색 */
  private resolveMultiVaultRoot(): void {
    if (this.settings.multiVaultRootOverride) {
      this.multiVaultRoot = this.settings.multiVaultRootOverride;
      return;
    }
    const adapter = this.app.vault.adapter;
    if (adapter instanceof FileSystemAdapter) {
      const basePath = (adapter as unknown as { basePath: string }).basePath;
      this.multiVaultRoot = detectMultiVaultRoot(basePath);
    }
  }

  private initModules(): void {
    if (!this.multiVaultRoot) {
      logger.warn("multiVaultRoot not detected — 설정에서 경로를 수동 입력하세요.");
      return;
    }
    this.rulesManager = new RulesManager(this.multiVaultRoot);
    this.claudianSettings = new ClaudianSettingsManager(this.multiVaultRoot);
  }

  /** 설정 변경 후 모듈 경로를 재감지·재초기화 (settings 저장은 호출 측에서 수행) */
  async reloadModules(): Promise<void> {
    this.resolveMultiVaultRoot();
    this.initModules();
  }

  // ─── 패널 ──────────────────────────────────────────────────

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(AHM_VIEW_TYPE);
    if (existing.length > 0) {
      workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: AHM_VIEW_TYPE, active: true });
      workspace.revealLeaf(leaf);
    }
  }
}
