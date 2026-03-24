import { spawn } from "child_process";
import { Notice } from "obsidian";
import { logger } from "../utils/Logger";

export interface PsResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const TIMEOUT_MS = 30_000;

/**
 * 스크립트 파일 실행 래퍼
 *
 * - .bat  → cmd.exe /c 로 실행
 * - .ps1  → powershell.exe -ExecutionPolicy Bypass 로 실행
 * - Windows 전용 (비-Windows: Notice 표시 후 실패 반환)
 * - spawn() 사용 — exec()의 8KB 버퍼 한계 및 Shell 인젝션 방지
 * - 한글 출력 보호: chcp 65001 (.bat) / -OutputEncoding UTF8 (.ps1)
 * - 30초 타임아웃
 */
export async function runScript(
  scriptPath: string,
  args: string[] = [],
  cwd?: string,
  stdinLines?: string[]   // .bat의 set /p 에 순서대로 주입할 입력값
): Promise<PsResult> {
  if (process.platform !== "win32") {
    new Notice("[AIHub] 스크립트 실행은 Windows에서만 가능합니다.");
    return { stdout: "", stderr: "Not Windows", exitCode: 1 };
  }

  const ext = scriptPath.split(".").pop()?.toLowerCase();

  if (ext === "bat" || ext === "cmd") {
    return runBatch(scriptPath, args, cwd, stdinLines);
  } else {
    return runPowerShell(scriptPath, args, cwd);
  }
}

// ─── .bat / .cmd 실행 ──────────────────────────────────────────

/**
 * stdinLines: bat 파일의 set /p 프롬프트에 순서대로 입력할 값 목록.
 * 예) ["C:\\Vaults", "MyNewVault"] → 첫 번째 set /p에 C:\Vaults, 두 번째에 MyNewVault 전달.
 */
async function runBatch(
  scriptPath: string,
  args: string[],
  cwd?: string,
  stdinLines?: string[]
): Promise<PsResult> {
  const cmdArgs = ["/c", `"${scriptPath}" ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`];
  return spawnProcess("cmd.exe", cmdArgs, cwd ?? scriptPath.slice(0, scriptPath.lastIndexOf("\\")), stdinLines);
}

// ─── .ps1 실행 ────────────────────────────────────────────────

async function runPowerShell(
  scriptPath: string,
  args: string[],
  cwd?: string
): Promise<PsResult> {
  const psExecutable = await findPowerShell();
  if (!psExecutable) {
    new Notice("[AIHub] PowerShell 실행 파일을 찾을 수 없습니다.");
    return { stdout: "", stderr: "PowerShell not found", exitCode: 1 };
  }

  const encodingPrefix =
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; " +
    "$OutputEncoding = [System.Text.Encoding]::UTF8; ";

  const psArgs = [
    "-ExecutionPolicy",
    "Bypass",
    "-NoProfile",
    "-Command",
    `${encodingPrefix}& '${scriptPath.replace(/'/g, "''")}' ${args
      .map((a) => a.startsWith("-") ? a : `'${a.replace(/'/g, "''")}'`)
      .join(" ")}`,
  ];

  return spawnProcess(psExecutable, psArgs, cwd);
}

// ─── 공통 spawn 래퍼 ──────────────────────────────────────────

function spawnProcess(
  executable: string,
  args: string[],
  cwd?: string,
  stdinLines?: string[]   // bat set /p 프롬프트에 줄 단위로 주입
): Promise<PsResult> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      new Notice("[AIHub] 스크립트 타임아웃 (30초)");
    }, TIMEOUT_MS);

    const child = spawn(executable, args, {
      cwd: cwd ?? process.cwd(),
      windowsHide: true,
      // stdin을 pipe로 열어야 stdinLines 주입 가능
      stdio: stdinLines?.length ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
    });

    // set /p 순서대로 stdin에 값 주입
    if (stdinLines?.length && child.stdin) {
      child.stdin.write(stdinLines.join("\r\n") + "\r\n");
      child.stdin.end();
    }

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout?.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr?.on("data", (chunk: Buffer) => stderrChunks.push(chunk));

    child.on("close", (code) => {
      clearTimeout(timer);
      const stdout = new TextDecoder("utf-8").decode(Buffer.concat(stdoutChunks));
      const stderr = new TextDecoder("utf-8").decode(Buffer.concat(stderrChunks));
      const exitCode = code ?? 1;
      logger.info(`Script exit=${exitCode}`, executable);
      if (exitCode !== 0) logger.warn("stderr:", stderr);
      resolve({ stdout, stderr, exitCode });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      logger.error("spawn error:", err);
      resolve({ stdout: "", stderr: err.message, exitCode: 1 });
    });

    controller.signal.addEventListener("abort", () => child.kill());
  });
}

// ─── PowerShell 실행 파일 탐색 ────────────────────────────────

async function findPowerShell(): Promise<string | null> {
  const candidates = [
    "powershell.exe",
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    "pwsh.exe",
    "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
  ];
  for (const candidate of candidates) {
    if (await canExec(candidate)) return candidate;
  }
  return null;
}

function canExec(executable: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(executable, ["-Command", "exit 0"], { windowsHide: true });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

/** 하위 호환: 기존 runPowerShell 이름으로도 호출 가능 */
export { runPowerShell };
