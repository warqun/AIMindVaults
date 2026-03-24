import * as fs from "fs/promises";
import * as fsSync from "fs";
import * as path from "path";

/**
 * UTF-8 고정 I/O 유틸리티
 *
 * 한글 마크다운 파일 보호를 위해 반드시 이 모듈을 통해
 * 파일을 읽고 쓴다. Get-Content | Set-Content 패턴(인코딩 사고 유발)
 * 과 동일한 위험을 가진 플랫폼 기본 인코딩 사용을 방지한다.
 */

export async function readUtf8(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return new TextDecoder("utf-8").decode(buffer);
}

export async function writeUtf8(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const buffer = new TextEncoder().encode(content);
  await fs.writeFile(filePath, buffer);
}

export async function listDir(dirPath: string): Promise<string[]> {
  if (!fsSync.existsSync(dirPath)) return [];
  const entries = await fs.readdir(dirPath);
  return entries;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function moveFile(src: string, dest: string): Promise<void> {
  const destDir = path.dirname(dest);
  await fs.mkdir(destDir, { recursive: true });
  await fs.rename(src, dest);
}

export function existsSync(filePath: string): boolean {
  return fsSync.existsSync(filePath);
}

export async function getFileMtime(filePath: string): Promise<number> {
  try {
    const stat = await fs.stat(filePath);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}
