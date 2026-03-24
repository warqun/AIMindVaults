import * as path from "path";
import * as fs from "fs";

/**
 * 볼트 루트에서 위로 탐색하여 .claude/rules/ 디렉터리가 있는
 * 멀티볼트 루트를 자동 감지한다.
 *
 * 주의: process.cwd() 사용 금지 — worktree 환경에서 오동작.
 * 반드시 app.vault.adapter.basePath 기준으로 탐색한다.
 */
export function detectMultiVaultRoot(vaultBasePath: string): string | null {
  let dir = vaultBasePath;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, ".claude", "rules");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null; // 파일시스템 루트 도달
    dir = parent;
  }
  return null;
}

/**
 * 현재 볼트 경로에서 특정 상대 경로가 존재하는지 확인한다.
 */
export function pathExists(fullPath: string): boolean {
  return fs.existsSync(fullPath);
}
