import * as path from "path";
import {
  readUtf8,
  writeUtf8,
  listDir,
  moveFile,
  ensureDir,
  existsSync,
  getFileMtime,
} from "../utils/Utf8FileIO";

export interface RuleFile {
  filename: string;
  active: boolean;
  content: string;
  lastModified: number;
}

/**
 * .claude/rules/ 디렉터리의 규칙 파일들을 관리한다.
 *
 * 활성:  {multiVaultRoot}/.claude/rules/*.md
 * 비활성: {multiVaultRoot}/.claude/rules/disabled/*.md
 *
 * 토글은 파일 삭제 없이 두 디렉터리 간 이동으로 처리한다.
 */
export class RulesManager {
  private readonly activeDir: string;
  private readonly disabledDir: string;

  constructor(multiVaultRoot: string) {
    this.activeDir = path.join(multiVaultRoot, ".claude", "rules");
    this.disabledDir = path.join(multiVaultRoot, ".claude", "rules", "disabled");
  }

  async listRules(): Promise<RuleFile[]> {
    const rules: RuleFile[] = [];

    // 활성 규칙 (disabled 서브폴더 제외)
    const activeEntries = await listDir(this.activeDir);
    for (const entry of activeEntries) {
      if (!entry.endsWith(".md")) continue;
      const filePath = path.join(this.activeDir, entry);
      const content = await readUtf8(filePath).catch(() => "");
      const mtime = await getFileMtime(filePath);
      rules.push({ filename: entry, active: true, content, lastModified: mtime });
    }

    // 비활성 규칙
    const disabledEntries = await listDir(this.disabledDir);
    for (const entry of disabledEntries) {
      if (!entry.endsWith(".md")) continue;
      const filePath = path.join(this.disabledDir, entry);
      const content = await readUtf8(filePath).catch(() => "");
      const mtime = await getFileMtime(filePath);
      rules.push({ filename: entry, active: false, content, lastModified: mtime });
    }

    return rules;
  }

  async listActiveRules(): Promise<RuleFile[]> {
    const all = await this.listRules();
    return all.filter((r) => r.active);
  }

  async readRule(filename: string): Promise<string> {
    const activePath = path.join(this.activeDir, filename);
    if (existsSync(activePath)) return readUtf8(activePath);
    const disabledPath = path.join(this.disabledDir, filename);
    if (existsSync(disabledPath)) return readUtf8(disabledPath);
    throw new Error(`Rule not found: ${filename}`);
  }

  async writeRule(filename: string, content: string): Promise<void> {
    const activePath = path.join(this.activeDir, filename);
    const disabledPath = path.join(this.disabledDir, filename);

    if (existsSync(activePath)) {
      await writeUtf8(activePath, content);
    } else if (existsSync(disabledPath)) {
      await writeUtf8(disabledPath, content);
    } else {
      // 새 규칙 — 활성 디렉터리에 생성
      await writeUtf8(activePath, content);
    }
  }

  async toggleRule(filename: string, enable: boolean): Promise<void> {
    if (enable) {
      // disabled → active
      const src = path.join(this.disabledDir, filename);
      const dest = path.join(this.activeDir, filename);
      if (existsSync(src)) await moveFile(src, dest);
    } else {
      // active → disabled
      const src = path.join(this.activeDir, filename);
      const dest = path.join(this.disabledDir, filename);
      if (existsSync(src)) {
        await ensureDir(this.disabledDir);
        await moveFile(src, dest);
      }
    }
  }
}
