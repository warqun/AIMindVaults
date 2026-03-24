import { App, Notice } from "obsidian";
import { VaultCloneModal } from "../../ui/VaultCloneModal";
import * as path from "path";
import * as fs from "fs";

/**
 * Vault 생성 섹션
 * MakeCloneVault.bat 의 실 작업자인 clone_vault.ps1 을 호출한다.
 */
export class VaultSection {
  constructor(
    private readonly container: HTMLElement,
    private readonly app: App,
    private readonly multiVaultRoot: string
  ) {}

  render(): void {
    this.container.empty();

    this.container.createEl("p", {
      text: "새 서브볼트를 생성합니다. 상위 폴더와 이름을 입력하면 clone_vault.ps1 이 실행됩니다.",
      cls: "ahm-desc",
    });

    const createBtn = this.container.createEl("button", {
      text: "➕ 새 Vault 생성",
      cls: "ahm-btn-cta",
    });
    createBtn.addEventListener("click", () => {
      const toolsDir = this.resolveToolsDir();
      if (!toolsDir) {
        new Notice("[AIHub] _tools 디렉터리를 찾을 수 없습니다.");
        return;
      }
      const vaultBase = (this.app.vault.adapter as unknown as { basePath: string }).basePath;
      new VaultCloneModal(this.app, toolsDir, path.dirname(vaultBase)).open();
    });
  }

  private resolveToolsDir(): string | null {
    const vaultBase = (this.app.vault.adapter as unknown as { basePath: string }).basePath;
    const candidates = [
      path.join(vaultBase, "_tools"),
      path.join(this.multiVaultRoot, "_tools"),
    ];
    return candidates.find((c) => fs.existsSync(c)) ?? null;
  }
}
