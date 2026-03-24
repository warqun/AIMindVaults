import { App, Notice } from "obsidian";
import * as path from "path";
import { existsSync } from "fs";
import { runScript } from "./PsExecutor";
import { VaultCloneModal } from "../ui/VaultCloneModal";
import { AHMSettings } from "../settings";
import { logger } from "../utils/Logger";

/**
 * Meta Bind 버튼 커맨드를 위한 Obsidian 커맨드 등록
 *
 * create-vault / clone-vault:
 *   → VaultCloneModal에서 PARENT_PATH + VAULT_NAME 먼저 입력받은 뒤 실행
 *
 * sync-workspace:
 *   → 입력 없이 MakeCloneVault.bat 바로 실행
 *
 * 노트 내 버튼 예시:
 * ```meta-bind-button
 * label: Clone Vault
 * icon: copy
 * style: primary
 * actions:
 *   - type: command
 *     command: aihub-manager:clone-vault
 * ```
 */
export class MetaBindBridge {
  constructor(
    private readonly app: App,
    private readonly settings: AHMSettings,
    private readonly multiVaultRoot: string,
    private readonly addCommand: (cmd: {
      id: string;
      name: string;
      callback: () => void;
    }) => void
  ) {}

  register(): void {
    // sync-workspace: 입력 없이 바로 실행
    this.addCommand({
      id: "sync-workspace",
      name: "AIHub: Sync Workspace",
      callback: () => this.execDirect("syncWorkspace", "_tools/MakeCloneVault.bat"),
    });

    // clone-vault: 볼트 경로·이름 입력 모달 → clone_vault.ps1 호출
    this.addCommand({
      id: "clone-vault",
      name: "AIHub: Clone Vault",
      callback: () => this.openCloneModal(),
    });

    // create-vault: 동일한 모달 (새 볼트 생성)
    this.addCommand({
      id: "create-vault",
      name: "AIHub: Create New Vault",
      callback: () => this.openCloneModal(),
    });

    logger.info("MetaBindBridge: commands registered");
  }

  // ─── clone/create: 모달로 입력받은 뒤 실행 ──────────────────

  private openCloneModal(): void {
    const toolsDir = this.resolveToolsDir();
    if (!toolsDir) {
      new Notice("[AIHub] _tools 디렉터리를 찾을 수 없습니다. 멀티볼트 루트를 확인하세요.");
      return;
    }

    // 기본 상위 경로: 볼트 옆 Vaults/ 폴더
    const defaultParent = path.dirname(this.vaultBasePath);

    new VaultCloneModal(this.app, toolsDir, defaultParent).open();
  }

  // ─── sync-workspace: 입력 없이 직접 실행 ────────────────────

  private async execDirect(
    overrideKey: keyof AHMSettings["psScriptOverrides"],
    defaultRelativePath: string
  ): Promise<void> {
    const override = this.settings.psScriptOverrides[overrideKey];
    const scriptPath = override || this.resolveScript(defaultRelativePath);

    if (!scriptPath) {
      new Notice(`[AIHub] 스크립트를 찾을 수 없습니다: ${defaultRelativePath}`);
      return;
    }

    new Notice(`[AIHub] 실행 중: ${path.basename(scriptPath)}...`);
    const result = await runScript(scriptPath, [], this.multiVaultRoot);

    if (result.exitCode === 0) {
      new Notice(`[AIHub] 완료: ${path.basename(scriptPath)}`);
    } else {
      new Notice(`[AIHub] 오류 (exit ${result.exitCode}): ${result.stderr.slice(0, 100)}`);
      logger.error("Script failed:", result.stderr);
    }
  }

  // ─── 경로 탐색 헬퍼 ─────────────────────────────────────────

  /** 현재 볼트의 절대 경로 (FileSystemAdapter.basePath) */
  private get vaultBasePath(): string {
    return (this.app.vault.adapter as unknown as { basePath: string }).basePath;
  }

  private resolveToolsDir(): string | null {
    const candidates = [
      path.join(this.vaultBasePath, "_tools"),
      path.join(this.multiVaultRoot, "_tools"),
    ];
    return candidates.find((c) => existsSync(c)) ?? null;
  }

  private resolveScript(relativePath: string): string | null {
    const candidates = [
      path.join(this.vaultBasePath, relativePath),
      path.join(this.vaultBasePath, "_tools", path.basename(relativePath)),
      path.join(this.multiVaultRoot, relativePath),
    ];
    return candidates.find((c) => existsSync(c)) ?? null;
  }
}
