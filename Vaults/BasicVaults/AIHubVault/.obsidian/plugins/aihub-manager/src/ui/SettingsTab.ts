import { App, PluginSettingTab, Setting } from "obsidian";
import type AihubManagerPlugin from "../main";
import { RulesPanel } from "./RulesPanel";
import { ClaudianPanel } from "./ClaudianPanel";

export class AHMSettingsTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: AihubManagerPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "AIHub Manager 설정" });

    this.renderGeneral(containerEl);
    this.renderRules(containerEl);
    this.renderClaudian(containerEl);
    this.renderPowerShell(containerEl);
  }

  // ─── General ───────────────────────────────────────────────

  private renderGeneral(container: HTMLElement): void {
    const section = this.createSection(container, "General");

    const detected = this.plugin.multiVaultRoot;
    new Setting(section)
      .setName("멀티볼트 루트 (자동 감지)")
      .setDesc(detected ?? "감지 실패 — 아래 경로를 수동 입력하세요")
      .setDisabled(true);

    new Setting(section)
      .setName("멀티볼트 루트 오버라이드")
      .setDesc("자동 감지 실패 시 직접 입력 (예: C:\\Obsidian\\AIMindVaults)")
      .addText((text) => {
        text
          .setPlaceholder("비워두면 자동 감지 사용")
          .setValue(this.plugin.settings.multiVaultRootOverride)
          .onChange(async (value) => {
            this.plugin.settings.multiVaultRootOverride = value;
            await this.plugin.saveSettings();
            await this.plugin.reloadModules();
          });
      });
  }

  // ─── Rules Manager ─────────────────────────────────────────

  private renderRules(container: HTMLElement): void {
    const section = this.createSection(container, "Rules Manager (.claude/rules/)");
    const inner = section.createDiv();

    if (this.plugin.rulesManager) {
      new RulesPanel(inner, this.plugin.rulesManager, this.app).render();
    } else {
      inner.createEl("p", { text: "멀티볼트 루트가 설정되지 않아 규칙을 로드할 수 없습니다." });
    }
  }

  // ─── Claudian Settings ─────────────────────────────────────

  private renderClaudian(container: HTMLElement): void {
    const section = this.createSection(container, "Claudian Settings");
    const inner = section.createDiv();

    if (this.plugin.claudianSettings) {
      new ClaudianPanel(inner, this.plugin.claudianSettings).render();
    } else {
      inner.createEl("p", { text: "멀티볼트 루트가 설정되지 않았습니다." });
    }
  }

  // ─── PowerShell 경로 오버라이드 ────────────────────────────

  private renderPowerShell(container: HTMLElement): void {
    const section = this.createSection(container, "PowerShell 스크립트 경로");

    section.createEl("p", {
      text: "비워두면 볼트 내 기본 경로를 자동 탐지합니다.",
    }).style.color = "var(--text-muted)";

    type PsKey = keyof typeof this.plugin.settings.psScriptOverrides;
    const scripts: Array<{ key: PsKey; label: string; default: string }> = [
      { key: "syncWorkspace", label: "Sync Workspace", default: "_tools/MakeCloneVault.bat" },
      { key: "cloneVault",    label: "Clone Vault",    default: "_tools/clone_vault.ps1" },
      { key: "createVault",   label: "Create Vault",   default: "_forge/staging/init_vault.ps1" },
    ];

    for (const { key, label, default: def } of scripts) {
      new Setting(section)
        .setName(label)
        .setDesc(`기본: ${def}`)
        .addText((text) => {
          text
            .setPlaceholder("비워두면 자동 탐지")
            .setValue(this.plugin.settings.psScriptOverrides[key])
            .onChange(async (value) => {
              this.plugin.settings.psScriptOverrides[key] = value;
              await this.plugin.saveSettings();
            });
        });
    }
  }

  // ─── Helper ────────────────────────────────────────────────

  private createSection(container: HTMLElement, title: string): HTMLElement {
    const section = container.createDiv({ cls: "ahm-section" });
    section.createEl("h3", { text: title });
    section.style.marginBottom = "24px";
    section.style.paddingBottom = "16px";
    section.style.borderBottom = "1px solid var(--background-modifier-border)";
    return section;
  }
}
