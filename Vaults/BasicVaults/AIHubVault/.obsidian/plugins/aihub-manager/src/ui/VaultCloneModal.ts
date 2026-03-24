import { App, Modal, Setting, Notice, ButtonComponent } from "obsidian";
import * as path from "path";
import { runScript } from "../modules/PsExecutor";
import { logger } from "../utils/Logger";

/**
 * 새 볼트 생성 전 입력값을 미리 받는 모달
 *
 * MakeCloneVault.bat이 set /p 로 받는 두 값을 UI에서 선수 입력:
 *  - PARENT_PATH : 상위 폴더 경로 (예: C:\Obsidian\Vaults)
 *  - VAULT_NAME  : 새 볼트 이름  (예: MyNewVault)
 *
 * 수집 후 clone_vault.ps1 -TargetPath -ProjectName 로 직접 호출.
 */
export class VaultCloneModal extends Modal {
  private parentPath = "";
  private vaultName = "";

  constructor(
    app: App,
    private readonly toolsDir: string,  // _tools/ 디렉터리 절대 경로
    private readonly defaultParent: string = ""
  ) {
    super(app);
    this.parentPath = defaultParent;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "새 볼트 생성" });

    // PARENT_PATH
    new Setting(contentEl)
      .setName("상위 폴더 경로")
      .setDesc("새 볼트가 생성될 상위 디렉터리 (예: C:\\Obsidian\\Vaults)")
      .addText((text) => {
        text
          .setPlaceholder("C:\\Obsidian\\Vaults")
          .setValue(this.parentPath)
          .onChange((v) => { this.parentPath = v.trim(); });
        text.inputEl.addClass("ahm-input");
      });

    // VAULT_NAME
    new Setting(contentEl)
      .setName("새 볼트 이름")
      .setDesc("폴더명으로 사용됩니다 (예: MyDomainVault)")
      .addText((text) => {
        text
          .setPlaceholder("MyDomainVault")
          .onChange((v) => { this.vaultName = v.trim(); });
        // 엔터로 바로 실행
        text.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") this.submit();
        });
      });

    // 미리보기
    const previewEl = contentEl.createEl("p", { cls: "ahm-clone-preview" });
    const updatePreview = () => {
      const target = this.parentPath && this.vaultName
        ? `→ ${this.parentPath}\\${this.vaultName}`
        : "(상위 폴더와 이름을 입력하면 경로가 표시됩니다)";
      previewEl.setText(target);
    };

    // 입력 값 변경 시 미리보기 갱신 (이벤트 위임)
    contentEl.addEventListener("input", updatePreview);
    updatePreview();

    // 버튼 행
    const btnRow = contentEl.createDiv({ cls: "ahm-btn-row" });

    new ButtonComponent(btnRow).setButtonText("취소").onClick(() => this.close());

    new ButtonComponent(btnRow)
      .setButtonText("볼트 생성")
      .setCta()
      .onClick(() => this.submit());
  }

  private async submit(): Promise<void> {
    if (!this.parentPath) {
      new Notice("[AIHub] 상위 폴더 경로를 입력해 주세요.");
      return;
    }
    if (!this.vaultName) {
      new Notice("[AIHub] 볼트 이름을 입력해 주세요.");
      return;
    }

    this.close();

    // MakeCloneVault.bat의 실제 작업은 clone_vault.ps1이 수행한다.
    // bat의 set /p는 Windows에서 파이프 stdin을 무시(CONIN$ 읽기)하므로
    // 모달에서 받은 값을 PS1에 직접 전달한다.
    const targetPath = `${this.parentPath}\\${this.vaultName}`;
    const ps1Script = path.join(this.toolsDir, "clone_vault.ps1");

    new Notice(`[AIHub] 볼트 생성 중: ${this.vaultName}...`);
    logger.info("VaultClone:", ps1Script, "->", targetPath);

    const result = await runScript(
      ps1Script,
      ["-TargetPath", targetPath, "-ProjectName", this.vaultName],
      this.toolsDir
    );

    if (result.exitCode === 0) {
      new Notice(`[AIHub] ✅ 볼트 생성 완료: ${targetPath}`);
    } else {
      new Notice(`[AIHub] ❌ 오류 (exit ${result.exitCode}): ${result.stderr.slice(0, 120)}`);
      logger.error("VaultClone failed:", result.stderr);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
