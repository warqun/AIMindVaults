import { Setting, Notice, App, Modal, ButtonComponent } from "obsidian";
import { RulesManager, RuleFile } from "../modules/RulesManager";
import { writeUtf8 } from "../utils/Utf8FileIO";
import * as path from "path";

/**
 * .claude/rules/ 규칙 목록 UI 컴포넌트
 *
 * SettingsTab 내에서 마운트된다.
 */
export class RulesPanel {
  constructor(
    private readonly containerEl: HTMLElement,
    private readonly rulesManager: RulesManager,
    private readonly app: App
  ) {}

  async render(): Promise<void> {
    this.containerEl.empty();

    let rules: RuleFile[];
    try {
      rules = await this.rulesManager.listRules();
    } catch {
      this.containerEl.createEl("p", {
        text: "규칙 디렉터리를 읽을 수 없습니다. 멀티볼트 루트 경로를 확인하세요.",
      });
      return;
    }

    if (rules.length === 0) {
      this.containerEl.createEl("p", { text: "규칙 파일이 없습니다." });
    }

    for (const rule of rules) {
      new Setting(this.containerEl)
        .setName(rule.filename)
        .setDesc(
          rule.active
            ? `✅ 활성 · ${rule.content.length}자`
            : `⏸ 비활성 · ${rule.content.length}자`
        )
        .addToggle((toggle) => {
          toggle.setValue(rule.active).onChange(async (value) => {
            await this.rulesManager.toggleRule(rule.filename, value);
            new Notice(
              `[AIHub] ${rule.filename}: ${value ? "활성화" : "비활성화"}`
            );
          });
        })
        .addButton((btn) => {
          btn.setButtonText("편집").onClick(() => {
            new RuleEditModal(this.app, rule, async (newContent) => {
              await this.rulesManager.writeRule(rule.filename, newContent);
              new Notice(`[AIHub] ${rule.filename} 저장됨`);
              await this.render();
            }).open();
          });
        });
    }

    // 새 규칙 추가 버튼
    new Setting(this.containerEl).addButton((btn) => {
      btn
        .setButtonText("+ 새 규칙 추가")
        .setCta()
        .onClick(() => {
          new NewRuleModal(this.app, async (filename, content) => {
            if (!filename.endsWith(".md")) filename += ".md";
            await this.rulesManager.writeRule(filename, content);
            new Notice(`[AIHub] ${filename} 생성됨`);
            await this.render();
          }).open();
        });
    });
  }
}

/** 규칙 파일 편집 모달 */
class RuleEditModal extends Modal {
  private content: string;

  constructor(
    app: App,
    private readonly rule: RuleFile,
    private readonly onSave: (content: string) => Promise<void>
  ) {
    super(app);
    this.content = rule.content;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: `편집: ${this.rule.filename}` });

    const textarea = contentEl.createEl("textarea");
    textarea.value = this.content;
    textarea.rows = 20;
    textarea.style.width = "100%";
    textarea.style.fontFamily = "var(--font-monospace)";
    textarea.style.fontSize = "0.85em";
    textarea.addEventListener("input", () => {
      this.content = textarea.value;
    });

    const btnRow = contentEl.createDiv({ cls: "ahm-modal-btn-row" });
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";
    btnRow.style.marginTop = "12px";

    new ButtonComponent(btnRow)
      .setButtonText("저장")
      .setCta()
      .onClick(async () => {
        await this.onSave(this.content);
        this.close();
      });

    new ButtonComponent(btnRow).setButtonText("취소").onClick(() => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

/** 새 규칙 파일 생성 모달 */
class NewRuleModal extends Modal {
  private filename = "";
  private content = "";

  constructor(
    app: App,
    private readonly onCreate: (filename: string, content: string) => Promise<void>
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "새 규칙 파일 생성" });

    new Setting(contentEl).setName("파일명 (.md)").addText((text) => {
      text.setPlaceholder("예: my-rule.md").onChange((v) => {
        this.filename = v;
      });
    });

    contentEl.createEl("label", { text: "내용" });
    const textarea = contentEl.createEl("textarea");
    textarea.rows = 10;
    textarea.style.width = "100%";
    textarea.style.fontFamily = "var(--font-monospace)";
    textarea.addEventListener("input", () => {
      this.content = textarea.value;
    });

    const btnRow = contentEl.createDiv();
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";
    btnRow.style.marginTop = "12px";

    new ButtonComponent(btnRow)
      .setButtonText("생성")
      .setCta()
      .onClick(async () => {
        if (!this.filename.trim()) {
          new Notice("파일명을 입력하세요.");
          return;
        }
        await this.onCreate(this.filename.trim(), this.content);
        this.close();
      });

    new ButtonComponent(btnRow).setButtonText("취소").onClick(() => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
