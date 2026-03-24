import * as path from "path";
import { readUtf8, writeUtf8 } from "../utils/Utf8FileIO";

export interface ClaudianConfig {
  userName?: string;
  enableBlocklist?: boolean;
  blockedCommands?: {
    unix?: string[];
    windows?: string[];
  };
  permissionMode?: "yolo" | "ask" | string;
  model?: string;
  thinkingBudget?: "low" | "medium" | "high" | string;
  enableAutoTitleGeneration?: boolean;
  titleGenerationModel?: string;
  enableChrome?: boolean;
  enableBangBash?: boolean;
  excludedTags?: string[];
  mediaFolder?: string;
  systemPrompt?: string;
  allowedExportPaths?: string[];
  persistentExternalContextPaths?: string[];
  environmentVariables?: string;
  envSnippets?: unknown[];
  customContextLimits?: Record<string, unknown>;
  keyboardNavigation?: {
    scrollUpKey?: string;
    scrollDownKey?: string;
    focusInputKey?: string;
  };
  locale?: string;
  claudeCliPath?: string;
  claudeCliPathsByHost?: Record<string, string>;
  loadUserClaudeSettings?: boolean;
  lastClaudeModel?: string;
  lastCustomModel?: string;
  lastEnvHash?: string;
  maxTabs?: number;
  tabBarPosition?: string;
  enableAutoScroll?: boolean;
  openInMainTab?: boolean;
  hiddenSlashCommands?: string[];
  [key: string]: unknown;
}

const ACTIVE_RULES_START = "[ACTIVE RULES]";
const ACTIVE_RULES_END = "[/ACTIVE RULES]";
const ACTIVE_RULES_REGEX = /\[ACTIVE RULES\][\s\S]*?\[\/ACTIVE RULES\]\n?/;

/**
 * claudian-settings.json 읽기/쓰기 모듈
 *
 * 부분 병합(partial merge) 전략:
 * 현재 JSON을 먼저 읽고 → 변경 필드만 병합 → 다시 쓴다.
 * 플러그인이 모르는 새 키를 절대 삭제하지 않는다.
 */
export class ClaudianSettingsManager {
  private readonly filePath: string;

  constructor(multiVaultRoot: string) {
    this.filePath = path.join(multiVaultRoot, ".claude", "claudian-settings.json");
  }

  async load(): Promise<ClaudianConfig> {
    try {
      const raw = await readUtf8(this.filePath);
      return JSON.parse(raw) as ClaudianConfig;
    } catch {
      return {};
    }
  }

  async save(partial: Partial<ClaudianConfig>): Promise<void> {
    const current = await this.load();
    const merged = { ...current, ...partial };
    await writeUtf8(this.filePath, JSON.stringify(merged, null, 2) + "\n");
  }

  async getSystemPrompt(): Promise<string> {
    const config = await this.load();
    return config.systemPrompt ?? "";
  }

  /**
   * systemPrompt에 활성 규칙 블록을 주입한다.
   * 이미 블록이 있으면 교체, 없으면 기존 프롬프트 앞에 prepend.
   * 누적 방지: [ACTIVE RULES]...[/ACTIVE RULES] 패턴을 regex로 감지하여 교체.
   */
  async injectActiveRulesBlock(rulesContent: string): Promise<void> {
    const config = await this.load();
    const currentPrompt = config.systemPrompt ?? "";
    const block = `${ACTIVE_RULES_START}\n${rulesContent}\n${ACTIVE_RULES_END}\n\n`;

    let newPrompt: string;
    if (ACTIVE_RULES_REGEX.test(currentPrompt)) {
      newPrompt = currentPrompt.replace(ACTIVE_RULES_REGEX, block);
    } else {
      newPrompt = block + currentPrompt;
    }

    await this.save({ systemPrompt: newPrompt });
  }

  /**
   * systemPrompt에서 활성 규칙 블록을 제거한다.
   */
  async clearActiveRulesBlock(): Promise<void> {
    const config = await this.load();
    const currentPrompt = config.systemPrompt ?? "";
    const cleaned = currentPrompt.replace(ACTIVE_RULES_REGEX, "").trimStart();
    await this.save({ systemPrompt: cleaned });
  }
}
