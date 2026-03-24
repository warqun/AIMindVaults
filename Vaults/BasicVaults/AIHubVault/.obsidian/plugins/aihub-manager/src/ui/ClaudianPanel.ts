import { Setting, Notice, TextAreaComponent } from "obsidian";
import { ClaudianSettingsManager, ClaudianConfig } from "../modules/ClaudianSettings";

/**
 * claudian-settings.json 편집 UI 컴포넌트
 */
export class ClaudianPanel {
  constructor(
    private readonly containerEl: HTMLElement,
    private readonly claudianSettings: ClaudianSettingsManager
  ) {}

  async render(): Promise<void> {
    this.containerEl.empty();

    let config: ClaudianConfig;
    try {
      config = await this.claudianSettings.load();
    } catch {
      this.containerEl.createEl("p", {
        text: "claudian-settings.json을 읽을 수 없습니다.",
      });
      return;
    }

    // 모델
    new Setting(this.containerEl)
      .setName("모델")
      .setDesc("Claudian에서 사용할 Claude 모델")
      .addDropdown((drop) => {
        drop
          .addOption("claude-sonnet-4-6", "claude-sonnet-4-6 (Sonnet)")
          .addOption("claude-opus-4-6", "claude-opus-4-6 (Opus)")
          .addOption("claude-haiku-4-5-20251001", "claude-haiku-4-5 (Haiku)")
          .setValue(config.model ?? "claude-sonnet-4-6")
          .onChange(async (value) => {
            await this.claudianSettings.save({ model: value, lastClaudeModel: value });
            new Notice("[AIHub] 모델 저장됨");
          });
      });

    // Thinking Budget
    new Setting(this.containerEl)
      .setName("Thinking Budget")
      .setDesc("AI 사고 깊이 (low = 빠름, high = 느리지만 정확)")
      .addDropdown((drop) => {
        drop
          .addOption("low", "Low")
          .addOption("medium", "Medium")
          .addOption("high", "High")
          .setValue(config.thinkingBudget ?? "low")
          .onChange(async (value) => {
            await this.claudianSettings.save({ thinkingBudget: value });
          });
      });

    // Permission Mode
    new Setting(this.containerEl)
      .setName("Permission Mode")
      .setDesc("yolo = 자동 승인, ask = 매번 확인")
      .addDropdown((drop) => {
        drop
          .addOption("yolo", "yolo (자동 승인)")
          .addOption("ask", "ask (매번 확인)")
          .setValue(config.permissionMode ?? "yolo")
          .onChange(async (value) => {
            await this.claudianSettings.save({ permissionMode: value });
          });
      });

    // Max Tabs
    new Setting(this.containerEl)
      .setName("최대 탭 수")
      .addSlider((slider) => {
        slider
          .setLimits(1, 10, 1)
          .setValue(config.maxTabs ?? 3)
          .setDynamicTooltip()
          .onChange(async (value) => {
            await this.claudianSettings.save({ maxTabs: value });
          });
      });

    // Blocklist toggle
    new Setting(this.containerEl)
      .setName("위험 명령어 차단 활성화")
      .addToggle((toggle) => {
        toggle.setValue(config.enableBlocklist ?? true).onChange(async (value) => {
          await this.claudianSettings.save({ enableBlocklist: value });
        });
      });

    // Blocked commands — Windows
    new Setting(this.containerEl)
      .setName("차단된 명령어 (Windows)")
      .setDesc("한 줄에 하나씩 입력")
      .addTextArea((ta) => {
        ta.setValue((config.blockedCommands?.windows ?? []).join("\n"))
          .setPlaceholder("del /s /q\nrd /s /q\n...")
          .onChange(async (value) => {
            const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
            const current = await this.claudianSettings.load();
            await this.claudianSettings.save({
              blockedCommands: {
                ...current.blockedCommands,
                windows: lines,
              },
            });
          });
        ta.inputEl.rows = 6;
        ta.inputEl.style.width = "100%";
        ta.inputEl.style.fontFamily = "var(--font-monospace)";
        ta.inputEl.style.fontSize = "0.8em";
      });

    // System Prompt
    this.containerEl.createEl("h4", { text: "System Prompt" });
    const promptContainer = this.containerEl.createDiv();

    const ta = new TextAreaComponent(promptContainer);
    ta.setValue(config.systemPrompt ?? "");
    ta.inputEl.rows = 8;
    ta.inputEl.style.width = "100%";

    const saveBtn = this.containerEl.createEl("button", {
      text: "System Prompt 저장",
      cls: "mod-cta",
    });
    saveBtn.style.marginTop = "8px";
    saveBtn.addEventListener("click", async () => {
      await this.claudianSettings.save({ systemPrompt: ta.getValue() });
      new Notice("[AIHub] System Prompt 저장됨");
    });
  }
}
