import { App, Notice, Modal, ButtonComponent } from "obsidian";
import { RulesManager, RuleFile } from "../../modules/RulesManager";

/**
 * Rules 섹션 — 사이드 패널 내 규칙 목록 + 토글 + 편집
 */
export class RulesSection {
  constructor(
    private readonly container: HTMLElement,
    private readonly rulesManager: RulesManager,
    private readonly app: App
  ) {}

  async render(): Promise<void> {
    this.container.empty();

    let rules: RuleFile[];
    try {
      rules = await this.rulesManager.listRules();
    } catch {
      this.container.createEl("p", {
        text: "⚠ 규칙 디렉터리를 읽을 수 없습니다.",
        cls: "ahm-error",
      });
      return;
    }

    if (rules.length === 0) {
      this.container.createEl("p", { text: "규칙 파일이 없습니다.", cls: "ahm-muted" });
    }

    const list = this.container.createDiv({ cls: "ahm-rules-list" });

    for (const rule of rules) {
      const row = list.createDiv({ cls: "ahm-rule-row" });

      // 토글
      const toggle = row.createEl("input", { type: "checkbox" } as DomElementInfo);
      (toggle as HTMLInputElement).checked = rule.active;
      toggle.classList.add("ahm-toggle");
      toggle.addEventListener("change", async () => {
        const enabled = (toggle as HTMLInputElement).checked;
        await this.rulesManager.toggleRule(rule.filename, enabled);
        new Notice(`[AIHub] ${rule.filename}: ${enabled ? "활성화" : "비활성화"}`);
        row.className = `ahm-rule-row ${enabled ? "" : "ahm-disabled"}`;
      });

      // 파일명 + 상태
      const label = row.createDiv({ cls: "ahm-rule-label" });
      label.createEl("span", {
        text: rule.filename.replace(".md", ""),
        cls: "ahm-rule-name",
      });
      label.createEl("span", {
        text: rule.active ? "✅" : "⏸",
        cls: "ahm-rule-status",
      });

      if (!rule.active) row.addClass("ahm-disabled");

      // 편집 버튼
      const editBtn = row.createEl("button", { text: "✏", cls: "ahm-icon-btn" });
      editBtn.title = "편집";
      editBtn.addEventListener("click", () => {
        new RuleEditModal(this.app, rule, async (newContent) => {
          await this.rulesManager.writeRule(rule.filename, newContent);
          new Notice(`[AIHub] ${rule.filename} 저장됨`);
          await this.render();
        }).open();
      });
    }

    // 새 규칙 버튼
    const addRow = this.container.createDiv({ cls: "ahm-add-row" });
    const addBtn = addRow.createEl("button", { text: "+ 새 규칙", cls: "ahm-btn-cta" });
    addBtn.addEventListener("click", () => {
      new NewRuleModal(this.app, async (filename, content) => {
        if (!filename.endsWith(".md")) filename += ".md";
        await this.rulesManager.writeRule(filename, content);
        new Notice(`[AIHub] ${filename} 생성됨`);
        await this.render();
      }).open();
    });

    // 새로고침 버튼
    const refreshBtn = addRow.createEl("button", { text: "🔄", cls: "ahm-icon-btn" });
    refreshBtn.title = "새로고침";
    refreshBtn.addEventListener("click", () => this.render());
  }
}

// ─── 편집 모달 ──────────────────────────────────────────────

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

    const ta = contentEl.createEl("textarea");
    ta.value = this.content;
    ta.rows = 20;
    ta.addClass("ahm-textarea");
    ta.addEventListener("input", () => { this.content = ta.value; });

    const row = contentEl.createDiv({ cls: "ahm-modal-btns" });
    new ButtonComponent(row).setButtonText("저장").setCta().onClick(async () => {
      await this.onSave(this.content);
      this.close();
    });
    new ButtonComponent(row).setButtonText("취소").onClick(() => this.close());
  }

  onClose(): void { this.contentEl.empty(); }
}

// ─── 새 규칙 모달 ────────────────────────────────────────────

class NewRuleModal extends Modal {
  private filename = "";
  private content = "";

  constructor(app: App, private readonly onCreate: (f: string, c: string) => Promise<void>) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "새 규칙 파일 생성" });

    const nameInput = contentEl.createEl("input", { type: "text" } as DomElementInfo) as HTMLInputElement;
    nameInput.placeholder = "파일명 (예: my-rule.md)";
    nameInput.addClass("ahm-input");
    nameInput.addEventListener("input", () => { this.filename = nameInput.value; });

    const ta = contentEl.createEl("textarea");
    ta.rows = 10;
    ta.placeholder = "규칙 내용 (마크다운)";
    ta.addClass("ahm-textarea");
    ta.addEventListener("input", () => { this.content = ta.value; });

    const row = contentEl.createDiv({ cls: "ahm-modal-btns" });
    new ButtonComponent(row).setButtonText("생성").setCta().onClick(async () => {
      if (!this.filename.trim()) { new Notice("파일명을 입력하세요."); return; }
      await this.onCreate(this.filename.trim(), this.content);
      this.close();
    });
    new ButtonComponent(row).setButtonText("취소").onClick(() => this.close());
  }

  onClose(): void { this.contentEl.empty(); }
}
