import { ItemView, WorkspaceLeaf } from "obsidian";
import type AihubManagerPlugin from "../main";
import { RulesSection } from "./sections/RulesSection";
import { VaultSection } from "./sections/VaultSection";

export const AHM_VIEW_TYPE = "aihub-manager-view";

type TabId = "rules" | "vault";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "rules", label: "Rules",  icon: "📋" },
  { id: "vault", label: "Vault",  icon: "🗂" },
];

/**
 * AIHub Manager 우측 사이드 패널 (ItemView)
 *
 * Claudian처럼 Obsidian 우측에 고정 패널로 열린다.
 * 리본 아이콘 클릭 → plugin.activateView() → 이 뷰 표시.
 */
export class AHMView extends ItemView {
  private activeTab: TabId = "rules";
  private sectionEl!: HTMLElement;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: AihubManagerPlugin) {
    super(leaf);
  }

  getViewType(): string { return AHM_VIEW_TYPE; }
  getDisplayText(): string { return "AIHub Manager"; }
  getIcon(): string { return "vault"; }

  async onOpen(): Promise<void> {
    const root = this.containerEl.children[1] as HTMLElement;
    root.empty();
    root.addClass("ahm-view-root");

    // ── 헤더 ──────────────────────────────────────────────
    const header = root.createDiv({ cls: "ahm-header" });
    header.createEl("span", { text: "AIHub Manager", cls: "ahm-title" });

    // 설정 탭 단축 버튼
    const settingsBtn = header.createEl("button", { text: "⚙", cls: "ahm-icon-btn" });
    settingsBtn.title = "Settings";
    settingsBtn.addEventListener("click", () => {
      (this.app as { setting?: { openTabById?: (id: string) => void } })
        .setting?.openTabById?.("aihub-manager");
    });

    // ── 탭 바 ──────────────────────────────────────────────
    const tabBar = root.createDiv({ cls: "ahm-tab-bar" });
    TABS.forEach(({ id, label, icon }) => {
      const btn = tabBar.createEl("button", {
        text: `${icon} ${label}`,
        cls: `ahm-tab ${id === this.activeTab ? "ahm-tab-active" : ""}`,
      });
      btn.addEventListener("click", () => {
        tabBar.querySelectorAll(".ahm-tab").forEach((b) => b.removeClass("ahm-tab-active"));
        btn.addClass("ahm-tab-active");
        this.activeTab = id;
        this.renderSection();
      });
    });

    // ── 섹션 컨테이너 ─────────────────────────────────────
    this.sectionEl = root.createDiv({ cls: "ahm-section-body" });
    await this.renderSection();
  }

  async onClose(): Promise<void> {
    this.containerEl.empty();
  }

  private async renderSection(): Promise<void> {
    this.sectionEl.empty();
    const { plugin, app } = this;

    switch (this.activeTab) {
      case "rules":
        if (plugin.rulesManager) {
          await new RulesSection(this.sectionEl, plugin.rulesManager, app).render();
        } else {
          this.showNoRoot();
        }
        break;

      case "vault":
        new VaultSection(
          this.sectionEl,
          app,
          plugin.multiVaultRoot ?? ""
        ).render();
        break;
    }
  }

  private showNoRoot(): void {
    this.sectionEl.createEl("p", {
      text: "⚠ 멀티볼트 루트가 감지되지 않았습니다. 설정(⚙)에서 경로를 직접 입력하세요.",
      cls: "ahm-error",
    });
  }

  async refresh(): Promise<void> {
    await this.renderSection();
  }
}
