var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => AihubManagerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian10 = require("obsidian");

// src/settings.ts
var DEFAULT_SETTINGS = {
  multiVaultRootOverride: "",
  psScriptOverrides: {
    createVault: "",
    syncWorkspace: "",
    cloneVault: ""
  }
};

// src/utils/VaultPathDetector.ts
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
function detectMultiVaultRoot(vaultBasePath) {
  let dir = vaultBasePath;
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, ".claude", "rules");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir)
      return null;
    dir = parent;
  }
  return null;
}

// src/modules/RulesManager.ts
var path3 = __toESM(require("path"));

// src/utils/Utf8FileIO.ts
var fs2 = __toESM(require("fs/promises"));
var fsSync = __toESM(require("fs"));
var path2 = __toESM(require("path"));
async function readUtf8(filePath) {
  const buffer = await fs2.readFile(filePath);
  return new TextDecoder("utf-8").decode(buffer);
}
async function writeUtf8(filePath, content) {
  const dir = path2.dirname(filePath);
  await fs2.mkdir(dir, { recursive: true });
  const buffer = new TextEncoder().encode(content);
  await fs2.writeFile(filePath, buffer);
}
async function listDir(dirPath) {
  if (!fsSync.existsSync(dirPath))
    return [];
  const entries = await fs2.readdir(dirPath);
  return entries;
}
async function ensureDir(dirPath) {
  await fs2.mkdir(dirPath, { recursive: true });
}
async function moveFile(src, dest) {
  const destDir = path2.dirname(dest);
  await fs2.mkdir(destDir, { recursive: true });
  await fs2.rename(src, dest);
}
function existsSync3(filePath) {
  return fsSync.existsSync(filePath);
}
async function getFileMtime(filePath) {
  try {
    const stat2 = await fs2.stat(filePath);
    return stat2.mtimeMs;
  } catch (e) {
    return 0;
  }
}

// src/modules/RulesManager.ts
var RulesManager = class {
  constructor(multiVaultRoot) {
    this.activeDir = path3.join(multiVaultRoot, ".claude", "rules");
    this.disabledDir = path3.join(multiVaultRoot, ".claude", "rules", "disabled");
  }
  async listRules() {
    const rules = [];
    const activeEntries = await listDir(this.activeDir);
    for (const entry of activeEntries) {
      if (!entry.endsWith(".md"))
        continue;
      const filePath = path3.join(this.activeDir, entry);
      const content = await readUtf8(filePath).catch(() => "");
      const mtime = await getFileMtime(filePath);
      rules.push({ filename: entry, active: true, content, lastModified: mtime });
    }
    const disabledEntries = await listDir(this.disabledDir);
    for (const entry of disabledEntries) {
      if (!entry.endsWith(".md"))
        continue;
      const filePath = path3.join(this.disabledDir, entry);
      const content = await readUtf8(filePath).catch(() => "");
      const mtime = await getFileMtime(filePath);
      rules.push({ filename: entry, active: false, content, lastModified: mtime });
    }
    return rules;
  }
  async listActiveRules() {
    const all = await this.listRules();
    return all.filter((r) => r.active);
  }
  async readRule(filename) {
    const activePath = path3.join(this.activeDir, filename);
    if (existsSync3(activePath))
      return readUtf8(activePath);
    const disabledPath = path3.join(this.disabledDir, filename);
    if (existsSync3(disabledPath))
      return readUtf8(disabledPath);
    throw new Error(`Rule not found: ${filename}`);
  }
  async writeRule(filename, content) {
    const activePath = path3.join(this.activeDir, filename);
    const disabledPath = path3.join(this.disabledDir, filename);
    if (existsSync3(activePath)) {
      await writeUtf8(activePath, content);
    } else if (existsSync3(disabledPath)) {
      await writeUtf8(disabledPath, content);
    } else {
      await writeUtf8(activePath, content);
    }
  }
  async toggleRule(filename, enable) {
    if (enable) {
      const src = path3.join(this.disabledDir, filename);
      const dest = path3.join(this.activeDir, filename);
      if (existsSync3(src))
        await moveFile(src, dest);
    } else {
      const src = path3.join(this.activeDir, filename);
      const dest = path3.join(this.disabledDir, filename);
      if (existsSync3(src)) {
        await ensureDir(this.disabledDir);
        await moveFile(src, dest);
      }
    }
  }
};

// src/modules/ClaudianSettings.ts
var path4 = __toESM(require("path"));
var ACTIVE_RULES_START = "[ACTIVE RULES]";
var ACTIVE_RULES_END = "[/ACTIVE RULES]";
var ACTIVE_RULES_REGEX = /\[ACTIVE RULES\][\s\S]*?\[\/ACTIVE RULES\]\n?/;
var ClaudianSettingsManager = class {
  constructor(multiVaultRoot) {
    this.filePath = path4.join(multiVaultRoot, ".claude", "claudian-settings.json");
  }
  async load() {
    try {
      const raw = await readUtf8(this.filePath);
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }
  async save(partial) {
    const current = await this.load();
    const merged = { ...current, ...partial };
    await writeUtf8(this.filePath, JSON.stringify(merged, null, 2) + "\n");
  }
  async getSystemPrompt() {
    var _a;
    const config = await this.load();
    return (_a = config.systemPrompt) != null ? _a : "";
  }
  /**
   * systemPrompt에 활성 규칙 블록을 주입한다.
   * 이미 블록이 있으면 교체, 없으면 기존 프롬프트 앞에 prepend.
   * 누적 방지: [ACTIVE RULES]...[/ACTIVE RULES] 패턴을 regex로 감지하여 교체.
   */
  async injectActiveRulesBlock(rulesContent) {
    var _a;
    const config = await this.load();
    const currentPrompt = (_a = config.systemPrompt) != null ? _a : "";
    const block = `${ACTIVE_RULES_START}
${rulesContent}
${ACTIVE_RULES_END}

`;
    let newPrompt;
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
  async clearActiveRulesBlock() {
    var _a;
    const config = await this.load();
    const currentPrompt = (_a = config.systemPrompt) != null ? _a : "";
    const cleaned = currentPrompt.replace(ACTIVE_RULES_REGEX, "").trimStart();
    await this.save({ systemPrompt: cleaned });
  }
};

// src/modules/MetaBindBridge.ts
var import_obsidian3 = require("obsidian");
var path6 = __toESM(require("path"));
var import_fs = require("fs");

// src/modules/PsExecutor.ts
var import_child_process = require("child_process");
var import_obsidian = require("obsidian");

// src/utils/Logger.ts
var PREFIX = "[AIHub Manager]";
var logger = {
  info: (...args) => console.log(PREFIX, ...args),
  warn: (...args) => console.warn(PREFIX, ...args),
  error: (...args) => console.error(PREFIX, ...args),
  debug: (...args) => console.debug(PREFIX, ...args)
};

// src/modules/PsExecutor.ts
var TIMEOUT_MS = 3e4;
async function runScript(scriptPath, args = [], cwd, stdinLines) {
  var _a;
  if (process.platform !== "win32") {
    new import_obsidian.Notice("[AIHub] \uC2A4\uD06C\uB9BD\uD2B8 \uC2E4\uD589\uC740 Windows\uC5D0\uC11C\uB9CC \uAC00\uB2A5\uD569\uB2C8\uB2E4.");
    return { stdout: "", stderr: "Not Windows", exitCode: 1 };
  }
  const ext = (_a = scriptPath.split(".").pop()) == null ? void 0 : _a.toLowerCase();
  if (ext === "bat" || ext === "cmd") {
    return runBatch(scriptPath, args, cwd, stdinLines);
  } else {
    return runPowerShell(scriptPath, args, cwd);
  }
}
async function runBatch(scriptPath, args, cwd, stdinLines) {
  const cmdArgs = ["/c", `"${scriptPath}" ${args.map((a) => `"${a.replace(/"/g, '\\"')}"`).join(" ")}`];
  return spawnProcess("cmd.exe", cmdArgs, cwd != null ? cwd : scriptPath.slice(0, scriptPath.lastIndexOf("\\")), stdinLines);
}
async function runPowerShell(scriptPath, args, cwd) {
  const psExecutable = await findPowerShell();
  if (!psExecutable) {
    new import_obsidian.Notice("[AIHub] PowerShell \uC2E4\uD589 \uD30C\uC77C\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return { stdout: "", stderr: "PowerShell not found", exitCode: 1 };
  }
  const encodingPrefix = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8; ";
  const psArgs = [
    "-ExecutionPolicy",
    "Bypass",
    "-NoProfile",
    "-Command",
    `${encodingPrefix}& '${scriptPath.replace(/'/g, "''")}' ${args.map((a) => a.startsWith("-") ? a : `'${a.replace(/'/g, "''")}'`).join(" ")}`
  ];
  return spawnProcess(psExecutable, psArgs, cwd);
}
function spawnProcess(executable, args, cwd, stdinLines) {
  return new Promise((resolve) => {
    var _a, _b;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      new import_obsidian.Notice("[AIHub] \uC2A4\uD06C\uB9BD\uD2B8 \uD0C0\uC784\uC544\uC6C3 (30\uCD08)");
    }, TIMEOUT_MS);
    const child = (0, import_child_process.spawn)(executable, args, {
      cwd: cwd != null ? cwd : process.cwd(),
      windowsHide: true,
      // stdin을 pipe로 열어야 stdinLines 주입 가능
      stdio: (stdinLines == null ? void 0 : stdinLines.length) ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"]
    });
    if ((stdinLines == null ? void 0 : stdinLines.length) && child.stdin) {
      child.stdin.write(stdinLines.join("\r\n") + "\r\n");
      child.stdin.end();
    }
    const stdoutChunks = [];
    const stderrChunks = [];
    (_a = child.stdout) == null ? void 0 : _a.on("data", (chunk) => stdoutChunks.push(chunk));
    (_b = child.stderr) == null ? void 0 : _b.on("data", (chunk) => stderrChunks.push(chunk));
    child.on("close", (code) => {
      clearTimeout(timer);
      const stdout = new TextDecoder("utf-8").decode(Buffer.concat(stdoutChunks));
      const stderr = new TextDecoder("utf-8").decode(Buffer.concat(stderrChunks));
      const exitCode = code != null ? code : 1;
      logger.info(`Script exit=${exitCode}`, executable);
      if (exitCode !== 0)
        logger.warn("stderr:", stderr);
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
async function findPowerShell() {
  const candidates = [
    "powershell.exe",
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    "pwsh.exe",
    "C:\\Program Files\\PowerShell\\7\\pwsh.exe"
  ];
  for (const candidate of candidates) {
    if (await canExec(candidate))
      return candidate;
  }
  return null;
}
function canExec(executable) {
  return new Promise((resolve) => {
    const child = (0, import_child_process.spawn)(executable, ["-Command", "exit 0"], { windowsHide: true });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

// src/ui/VaultCloneModal.ts
var import_obsidian2 = require("obsidian");
var path5 = __toESM(require("path"));
var VaultCloneModal = class extends import_obsidian2.Modal {
  constructor(app, toolsDir, defaultParent = "") {
    super(app);
    this.toolsDir = toolsDir;
    this.defaultParent = defaultParent;
    this.parentPath = "";
    this.vaultName = "";
    this.parentPath = defaultParent;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "\uC0C8 \uBCFC\uD2B8 \uC0DD\uC131" });
    new import_obsidian2.Setting(contentEl).setName("\uC0C1\uC704 \uD3F4\uB354 \uACBD\uB85C").setDesc("\uC0C8 \uBCFC\uD2B8\uAC00 \uC0DD\uC131\uB420 \uC0C1\uC704 \uB514\uB809\uD130\uB9AC (\uC608: C:\\Obsidian\\Vaults)").addText((text) => {
      text.setPlaceholder("C:\\Obsidian\\Vaults").setValue(this.parentPath).onChange((v) => {
        this.parentPath = v.trim();
      });
      text.inputEl.addClass("ahm-input");
    });
    new import_obsidian2.Setting(contentEl).setName("\uC0C8 \uBCFC\uD2B8 \uC774\uB984").setDesc("\uD3F4\uB354\uBA85\uC73C\uB85C \uC0AC\uC6A9\uB429\uB2C8\uB2E4 (\uC608: MyDomainVault)").addText((text) => {
      text.setPlaceholder("MyDomainVault").onChange((v) => {
        this.vaultName = v.trim();
      });
      text.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter")
          this.submit();
      });
    });
    const previewEl = contentEl.createEl("p", { cls: "ahm-clone-preview" });
    const updatePreview = () => {
      const target = this.parentPath && this.vaultName ? `\u2192 ${this.parentPath}\\${this.vaultName}` : "(\uC0C1\uC704 \uD3F4\uB354\uC640 \uC774\uB984\uC744 \uC785\uB825\uD558\uBA74 \uACBD\uB85C\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4)";
      previewEl.setText(target);
    };
    contentEl.addEventListener("input", updatePreview);
    updatePreview();
    const btnRow = contentEl.createDiv({ cls: "ahm-btn-row" });
    new import_obsidian2.ButtonComponent(btnRow).setButtonText("\uCDE8\uC18C").onClick(() => this.close());
    new import_obsidian2.ButtonComponent(btnRow).setButtonText("\uBCFC\uD2B8 \uC0DD\uC131").setCta().onClick(() => this.submit());
  }
  async submit() {
    if (!this.parentPath) {
      new import_obsidian2.Notice("[AIHub] \uC0C1\uC704 \uD3F4\uB354 \uACBD\uB85C\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
      return;
    }
    if (!this.vaultName) {
      new import_obsidian2.Notice("[AIHub] \uBCFC\uD2B8 \uC774\uB984\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.");
      return;
    }
    this.close();
    const targetPath = `${this.parentPath}\\${this.vaultName}`;
    const ps1Script = path5.join(this.toolsDir, "clone_vault.ps1");
    new import_obsidian2.Notice(`[AIHub] \uBCFC\uD2B8 \uC0DD\uC131 \uC911: ${this.vaultName}...`);
    logger.info("VaultClone:", ps1Script, "->", targetPath);
    const result = await runScript(
      ps1Script,
      ["-TargetPath", targetPath, "-ProjectName", this.vaultName],
      this.toolsDir
    );
    if (result.exitCode === 0) {
      new import_obsidian2.Notice(`[AIHub] \u2705 \uBCFC\uD2B8 \uC0DD\uC131 \uC644\uB8CC: ${targetPath}`);
    } else {
      new import_obsidian2.Notice(`[AIHub] \u274C \uC624\uB958 (exit ${result.exitCode}): ${result.stderr.slice(0, 120)}`);
      logger.error("VaultClone failed:", result.stderr);
    }
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/modules/MetaBindBridge.ts
var MetaBindBridge = class {
  constructor(app, settings, multiVaultRoot, addCommand) {
    this.app = app;
    this.settings = settings;
    this.multiVaultRoot = multiVaultRoot;
    this.addCommand = addCommand;
  }
  register() {
    this.addCommand({
      id: "sync-workspace",
      name: "AIHub: Sync Workspace",
      callback: () => this.execDirect("syncWorkspace", "_tools/MakeCloneVault.bat")
    });
    this.addCommand({
      id: "clone-vault",
      name: "AIHub: Clone Vault",
      callback: () => this.openCloneModal()
    });
    this.addCommand({
      id: "create-vault",
      name: "AIHub: Create New Vault",
      callback: () => this.openCloneModal()
    });
    logger.info("MetaBindBridge: commands registered");
  }
  // ─── clone/create: 모달로 입력받은 뒤 실행 ──────────────────
  openCloneModal() {
    const toolsDir = this.resolveToolsDir();
    if (!toolsDir) {
      new import_obsidian3.Notice("[AIHub] _tools \uB514\uB809\uD130\uB9AC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uBA40\uD2F0\uBCFC\uD2B8 \uB8E8\uD2B8\uB97C \uD655\uC778\uD558\uC138\uC694.");
      return;
    }
    const defaultParent = path6.dirname(this.vaultBasePath);
    new VaultCloneModal(this.app, toolsDir, defaultParent).open();
  }
  // ─── sync-workspace: 입력 없이 직접 실행 ────────────────────
  async execDirect(overrideKey, defaultRelativePath) {
    const override = this.settings.psScriptOverrides[overrideKey];
    const scriptPath = override || this.resolveScript(defaultRelativePath);
    if (!scriptPath) {
      new import_obsidian3.Notice(`[AIHub] \uC2A4\uD06C\uB9BD\uD2B8\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${defaultRelativePath}`);
      return;
    }
    new import_obsidian3.Notice(`[AIHub] \uC2E4\uD589 \uC911: ${path6.basename(scriptPath)}...`);
    const result = await runScript(scriptPath, [], this.multiVaultRoot);
    if (result.exitCode === 0) {
      new import_obsidian3.Notice(`[AIHub] \uC644\uB8CC: ${path6.basename(scriptPath)}`);
    } else {
      new import_obsidian3.Notice(`[AIHub] \uC624\uB958 (exit ${result.exitCode}): ${result.stderr.slice(0, 100)}`);
      logger.error("Script failed:", result.stderr);
    }
  }
  // ─── 경로 탐색 헬퍼 ─────────────────────────────────────────
  /** 현재 볼트의 절대 경로 (FileSystemAdapter.basePath) */
  get vaultBasePath() {
    return this.app.vault.adapter.basePath;
  }
  resolveToolsDir() {
    var _a;
    const candidates = [
      path6.join(this.vaultBasePath, "_tools"),
      path6.join(this.multiVaultRoot, "_tools")
    ];
    return (_a = candidates.find((c) => (0, import_fs.existsSync)(c))) != null ? _a : null;
  }
  resolveScript(relativePath) {
    var _a;
    const candidates = [
      path6.join(this.vaultBasePath, relativePath),
      path6.join(this.vaultBasePath, "_tools", path6.basename(relativePath)),
      path6.join(this.multiVaultRoot, relativePath)
    ];
    return (_a = candidates.find((c) => (0, import_fs.existsSync)(c))) != null ? _a : null;
  }
};

// src/ui/SettingsTab.ts
var import_obsidian6 = require("obsidian");

// src/ui/RulesPanel.ts
var import_obsidian4 = require("obsidian");
var RulesPanel = class {
  constructor(containerEl, rulesManager, app) {
    this.containerEl = containerEl;
    this.rulesManager = rulesManager;
    this.app = app;
  }
  async render() {
    this.containerEl.empty();
    let rules;
    try {
      rules = await this.rulesManager.listRules();
    } catch (e) {
      this.containerEl.createEl("p", {
        text: "\uADDC\uCE59 \uB514\uB809\uD130\uB9AC\uB97C \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uBA40\uD2F0\uBCFC\uD2B8 \uB8E8\uD2B8 \uACBD\uB85C\uB97C \uD655\uC778\uD558\uC138\uC694."
      });
      return;
    }
    if (rules.length === 0) {
      this.containerEl.createEl("p", { text: "\uADDC\uCE59 \uD30C\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    for (const rule of rules) {
      new import_obsidian4.Setting(this.containerEl).setName(rule.filename).setDesc(
        rule.active ? `\u2705 \uD65C\uC131 \xB7 ${rule.content.length}\uC790` : `\u23F8 \uBE44\uD65C\uC131 \xB7 ${rule.content.length}\uC790`
      ).addToggle((toggle) => {
        toggle.setValue(rule.active).onChange(async (value) => {
          await this.rulesManager.toggleRule(rule.filename, value);
          new import_obsidian4.Notice(
            `[AIHub] ${rule.filename}: ${value ? "\uD65C\uC131\uD654" : "\uBE44\uD65C\uC131\uD654"}`
          );
        });
      }).addButton((btn) => {
        btn.setButtonText("\uD3B8\uC9D1").onClick(() => {
          new RuleEditModal(this.app, rule, async (newContent) => {
            await this.rulesManager.writeRule(rule.filename, newContent);
            new import_obsidian4.Notice(`[AIHub] ${rule.filename} \uC800\uC7A5\uB428`);
            await this.render();
          }).open();
        });
      });
    }
    new import_obsidian4.Setting(this.containerEl).addButton((btn) => {
      btn.setButtonText("+ \uC0C8 \uADDC\uCE59 \uCD94\uAC00").setCta().onClick(() => {
        new NewRuleModal(this.app, async (filename, content) => {
          if (!filename.endsWith(".md"))
            filename += ".md";
          await this.rulesManager.writeRule(filename, content);
          new import_obsidian4.Notice(`[AIHub] ${filename} \uC0DD\uC131\uB428`);
          await this.render();
        }).open();
      });
    });
  }
};
var RuleEditModal = class extends import_obsidian4.Modal {
  constructor(app, rule, onSave) {
    super(app);
    this.rule = rule;
    this.onSave = onSave;
    this.content = rule.content;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: `\uD3B8\uC9D1: ${this.rule.filename}` });
    const textarea = contentEl.createEl("textarea");
    textarea.value = this.content;
    textarea.rows = 20;
    textarea.style.width = "100%";
    textarea.style.fontFamily = "var(--font-monospace)";
    textarea.style.fontSize = "0.85em";
    textarea.addEventListener("input", () => {
      this.content = textarea.value;
    });
    const btnRow = contentEl.createDiv({ cls: "ahm-modal-btn-row" });
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";
    btnRow.style.marginTop = "12px";
    new import_obsidian4.ButtonComponent(btnRow).setButtonText("\uC800\uC7A5").setCta().onClick(async () => {
      await this.onSave(this.content);
      this.close();
    });
    new import_obsidian4.ButtonComponent(btnRow).setButtonText("\uCDE8\uC18C").onClick(() => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};
var NewRuleModal = class extends import_obsidian4.Modal {
  constructor(app, onCreate) {
    super(app);
    this.onCreate = onCreate;
    this.filename = "";
    this.content = "";
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "\uC0C8 \uADDC\uCE59 \uD30C\uC77C \uC0DD\uC131" });
    new import_obsidian4.Setting(contentEl).setName("\uD30C\uC77C\uBA85 (.md)").addText((text) => {
      text.setPlaceholder("\uC608: my-rule.md").onChange((v) => {
        this.filename = v;
      });
    });
    contentEl.createEl("label", { text: "\uB0B4\uC6A9" });
    const textarea = contentEl.createEl("textarea");
    textarea.rows = 10;
    textarea.style.width = "100%";
    textarea.style.fontFamily = "var(--font-monospace)";
    textarea.addEventListener("input", () => {
      this.content = textarea.value;
    });
    const btnRow = contentEl.createDiv();
    btnRow.style.display = "flex";
    btnRow.style.gap = "8px";
    btnRow.style.marginTop = "12px";
    new import_obsidian4.ButtonComponent(btnRow).setButtonText("\uC0DD\uC131").setCta().onClick(async () => {
      if (!this.filename.trim()) {
        new import_obsidian4.Notice("\uD30C\uC77C\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694.");
        return;
      }
      await this.onCreate(this.filename.trim(), this.content);
      this.close();
    });
    new import_obsidian4.ButtonComponent(btnRow).setButtonText("\uCDE8\uC18C").onClick(() => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/ui/ClaudianPanel.ts
var import_obsidian5 = require("obsidian");
var ClaudianPanel = class {
  constructor(containerEl, claudianSettings) {
    this.containerEl = containerEl;
    this.claudianSettings = claudianSettings;
  }
  async render() {
    var _a;
    this.containerEl.empty();
    let config;
    try {
      config = await this.claudianSettings.load();
    } catch (e) {
      this.containerEl.createEl("p", {
        text: "claudian-settings.json\uC744 \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
      });
      return;
    }
    new import_obsidian5.Setting(this.containerEl).setName("\uBAA8\uB378").setDesc("Claudian\uC5D0\uC11C \uC0AC\uC6A9\uD560 Claude \uBAA8\uB378").addDropdown((drop) => {
      var _a2;
      drop.addOption("claude-sonnet-4-6", "claude-sonnet-4-6 (Sonnet)").addOption("claude-opus-4-6", "claude-opus-4-6 (Opus)").addOption("claude-haiku-4-5-20251001", "claude-haiku-4-5 (Haiku)").setValue((_a2 = config.model) != null ? _a2 : "claude-sonnet-4-6").onChange(async (value) => {
        await this.claudianSettings.save({ model: value, lastClaudeModel: value });
        new import_obsidian5.Notice("[AIHub] \uBAA8\uB378 \uC800\uC7A5\uB428");
      });
    });
    new import_obsidian5.Setting(this.containerEl).setName("Thinking Budget").setDesc("AI \uC0AC\uACE0 \uAE4A\uC774 (low = \uBE60\uB984, high = \uB290\uB9AC\uC9C0\uB9CC \uC815\uD655)").addDropdown((drop) => {
      var _a2;
      drop.addOption("low", "Low").addOption("medium", "Medium").addOption("high", "High").setValue((_a2 = config.thinkingBudget) != null ? _a2 : "low").onChange(async (value) => {
        await this.claudianSettings.save({ thinkingBudget: value });
      });
    });
    new import_obsidian5.Setting(this.containerEl).setName("Permission Mode").setDesc("yolo = \uC790\uB3D9 \uC2B9\uC778, ask = \uB9E4\uBC88 \uD655\uC778").addDropdown((drop) => {
      var _a2;
      drop.addOption("yolo", "yolo (\uC790\uB3D9 \uC2B9\uC778)").addOption("ask", "ask (\uB9E4\uBC88 \uD655\uC778)").setValue((_a2 = config.permissionMode) != null ? _a2 : "yolo").onChange(async (value) => {
        await this.claudianSettings.save({ permissionMode: value });
      });
    });
    new import_obsidian5.Setting(this.containerEl).setName("\uCD5C\uB300 \uD0ED \uC218").addSlider((slider) => {
      var _a2;
      slider.setLimits(1, 10, 1).setValue((_a2 = config.maxTabs) != null ? _a2 : 3).setDynamicTooltip().onChange(async (value) => {
        await this.claudianSettings.save({ maxTabs: value });
      });
    });
    new import_obsidian5.Setting(this.containerEl).setName("\uC704\uD5D8 \uBA85\uB839\uC5B4 \uCC28\uB2E8 \uD65C\uC131\uD654").addToggle((toggle) => {
      var _a2;
      toggle.setValue((_a2 = config.enableBlocklist) != null ? _a2 : true).onChange(async (value) => {
        await this.claudianSettings.save({ enableBlocklist: value });
      });
    });
    new import_obsidian5.Setting(this.containerEl).setName("\uCC28\uB2E8\uB41C \uBA85\uB839\uC5B4 (Windows)").setDesc("\uD55C \uC904\uC5D0 \uD558\uB098\uC529 \uC785\uB825").addTextArea((ta2) => {
      var _a2, _b;
      ta2.setValue(((_b = (_a2 = config.blockedCommands) == null ? void 0 : _a2.windows) != null ? _b : []).join("\n")).setPlaceholder("del /s /q\nrd /s /q\n...").onChange(async (value) => {
        const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
        const current = await this.claudianSettings.load();
        await this.claudianSettings.save({
          blockedCommands: {
            ...current.blockedCommands,
            windows: lines
          }
        });
      });
      ta2.inputEl.rows = 6;
      ta2.inputEl.style.width = "100%";
      ta2.inputEl.style.fontFamily = "var(--font-monospace)";
      ta2.inputEl.style.fontSize = "0.8em";
    });
    this.containerEl.createEl("h4", { text: "System Prompt" });
    const promptContainer = this.containerEl.createDiv();
    const ta = new import_obsidian5.TextAreaComponent(promptContainer);
    ta.setValue((_a = config.systemPrompt) != null ? _a : "");
    ta.inputEl.rows = 8;
    ta.inputEl.style.width = "100%";
    const saveBtn = this.containerEl.createEl("button", {
      text: "System Prompt \uC800\uC7A5",
      cls: "mod-cta"
    });
    saveBtn.style.marginTop = "8px";
    saveBtn.addEventListener("click", async () => {
      await this.claudianSettings.save({ systemPrompt: ta.getValue() });
      new import_obsidian5.Notice("[AIHub] System Prompt \uC800\uC7A5\uB428");
    });
  }
};

// src/ui/SettingsTab.ts
var AHMSettingsTab = class extends import_obsidian6.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "AIHub Manager \uC124\uC815" });
    this.renderGeneral(containerEl);
    this.renderRules(containerEl);
    this.renderClaudian(containerEl);
    this.renderPowerShell(containerEl);
  }
  // ─── General ───────────────────────────────────────────────
  renderGeneral(container) {
    const section = this.createSection(container, "General");
    const detected = this.plugin.multiVaultRoot;
    new import_obsidian6.Setting(section).setName("\uBA40\uD2F0\uBCFC\uD2B8 \uB8E8\uD2B8 (\uC790\uB3D9 \uAC10\uC9C0)").setDesc(detected != null ? detected : "\uAC10\uC9C0 \uC2E4\uD328 \u2014 \uC544\uB798 \uACBD\uB85C\uB97C \uC218\uB3D9 \uC785\uB825\uD558\uC138\uC694").setDisabled(true);
    new import_obsidian6.Setting(section).setName("\uBA40\uD2F0\uBCFC\uD2B8 \uB8E8\uD2B8 \uC624\uBC84\uB77C\uC774\uB4DC").setDesc("\uC790\uB3D9 \uAC10\uC9C0 \uC2E4\uD328 \uC2DC \uC9C1\uC811 \uC785\uB825 (\uC608: C:\\Obsidian\\AIMindVaults)").addText((text) => {
      text.setPlaceholder("\uBE44\uC6CC\uB450\uBA74 \uC790\uB3D9 \uAC10\uC9C0 \uC0AC\uC6A9").setValue(this.plugin.settings.multiVaultRootOverride).onChange(async (value) => {
        this.plugin.settings.multiVaultRootOverride = value;
        await this.plugin.saveSettings();
        await this.plugin.reloadModules();
      });
    });
  }
  // ─── Rules Manager ─────────────────────────────────────────
  renderRules(container) {
    const section = this.createSection(container, "Rules Manager (.claude/rules/)");
    const inner = section.createDiv();
    if (this.plugin.rulesManager) {
      new RulesPanel(inner, this.plugin.rulesManager, this.app).render();
    } else {
      inner.createEl("p", { text: "\uBA40\uD2F0\uBCFC\uD2B8 \uB8E8\uD2B8\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC544 \uADDC\uCE59\uC744 \uB85C\uB4DC\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
  }
  // ─── Claudian Settings ─────────────────────────────────────
  renderClaudian(container) {
    const section = this.createSection(container, "Claudian Settings");
    const inner = section.createDiv();
    if (this.plugin.claudianSettings) {
      new ClaudianPanel(inner, this.plugin.claudianSettings).render();
    } else {
      inner.createEl("p", { text: "\uBA40\uD2F0\uBCFC\uD2B8 \uB8E8\uD2B8\uAC00 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." });
    }
  }
  // ─── PowerShell 경로 오버라이드 ────────────────────────────
  renderPowerShell(container) {
    const section = this.createSection(container, "PowerShell \uC2A4\uD06C\uB9BD\uD2B8 \uACBD\uB85C");
    section.createEl("p", {
      text: "\uBE44\uC6CC\uB450\uBA74 \uBCFC\uD2B8 \uB0B4 \uAE30\uBCF8 \uACBD\uB85C\uB97C \uC790\uB3D9 \uD0D0\uC9C0\uD569\uB2C8\uB2E4."
    }).style.color = "var(--text-muted)";
    const scripts = [
      { key: "syncWorkspace", label: "Sync Workspace", default: "_tools/MakeCloneVault.bat" },
      { key: "cloneVault", label: "Clone Vault", default: "_tools/clone_vault.ps1" },
      { key: "createVault", label: "Create Vault", default: "_forge/staging/init_vault.ps1" }
    ];
    for (const { key, label, default: def } of scripts) {
      new import_obsidian6.Setting(section).setName(label).setDesc(`\uAE30\uBCF8: ${def}`).addText((text) => {
        text.setPlaceholder("\uBE44\uC6CC\uB450\uBA74 \uC790\uB3D9 \uD0D0\uC9C0").setValue(this.plugin.settings.psScriptOverrides[key]).onChange(async (value) => {
          this.plugin.settings.psScriptOverrides[key] = value;
          await this.plugin.saveSettings();
        });
      });
    }
  }
  // ─── Helper ────────────────────────────────────────────────
  createSection(container, title) {
    const section = container.createDiv({ cls: "ahm-section" });
    section.createEl("h3", { text: title });
    section.style.marginBottom = "24px";
    section.style.paddingBottom = "16px";
    section.style.borderBottom = "1px solid var(--background-modifier-border)";
    return section;
  }
};

// src/views/AHMView.ts
var import_obsidian9 = require("obsidian");

// src/views/sections/RulesSection.ts
var import_obsidian7 = require("obsidian");
var RulesSection = class {
  constructor(container, rulesManager, app) {
    this.container = container;
    this.rulesManager = rulesManager;
    this.app = app;
  }
  async render() {
    this.container.empty();
    let rules;
    try {
      rules = await this.rulesManager.listRules();
    } catch (e) {
      this.container.createEl("p", {
        text: "\u26A0 \uADDC\uCE59 \uB514\uB809\uD130\uB9AC\uB97C \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
        cls: "ahm-error"
      });
      return;
    }
    if (rules.length === 0) {
      this.container.createEl("p", { text: "\uADDC\uCE59 \uD30C\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.", cls: "ahm-muted" });
    }
    const list = this.container.createDiv({ cls: "ahm-rules-list" });
    for (const rule of rules) {
      const row = list.createDiv({ cls: "ahm-rule-row" });
      const toggle = row.createEl("input", { type: "checkbox" });
      toggle.checked = rule.active;
      toggle.classList.add("ahm-toggle");
      toggle.addEventListener("change", async () => {
        const enabled = toggle.checked;
        await this.rulesManager.toggleRule(rule.filename, enabled);
        new import_obsidian7.Notice(`[AIHub] ${rule.filename}: ${enabled ? "\uD65C\uC131\uD654" : "\uBE44\uD65C\uC131\uD654"}`);
        row.className = `ahm-rule-row ${enabled ? "" : "ahm-disabled"}`;
      });
      const label = row.createDiv({ cls: "ahm-rule-label" });
      label.createEl("span", {
        text: rule.filename.replace(".md", ""),
        cls: "ahm-rule-name"
      });
      label.createEl("span", {
        text: rule.active ? "\u2705" : "\u23F8",
        cls: "ahm-rule-status"
      });
      if (!rule.active)
        row.addClass("ahm-disabled");
      const editBtn = row.createEl("button", { text: "\u270F", cls: "ahm-icon-btn" });
      editBtn.title = "\uD3B8\uC9D1";
      editBtn.addEventListener("click", () => {
        new RuleEditModal2(this.app, rule, async (newContent) => {
          await this.rulesManager.writeRule(rule.filename, newContent);
          new import_obsidian7.Notice(`[AIHub] ${rule.filename} \uC800\uC7A5\uB428`);
          await this.render();
        }).open();
      });
    }
    const addRow = this.container.createDiv({ cls: "ahm-add-row" });
    const addBtn = addRow.createEl("button", { text: "+ \uC0C8 \uADDC\uCE59", cls: "ahm-btn-cta" });
    addBtn.addEventListener("click", () => {
      new NewRuleModal2(this.app, async (filename, content) => {
        if (!filename.endsWith(".md"))
          filename += ".md";
        await this.rulesManager.writeRule(filename, content);
        new import_obsidian7.Notice(`[AIHub] ${filename} \uC0DD\uC131\uB428`);
        await this.render();
      }).open();
    });
    const refreshBtn = addRow.createEl("button", { text: "\u{1F504}", cls: "ahm-icon-btn" });
    refreshBtn.title = "\uC0C8\uB85C\uACE0\uCE68";
    refreshBtn.addEventListener("click", () => this.render());
  }
};
var RuleEditModal2 = class extends import_obsidian7.Modal {
  constructor(app, rule, onSave) {
    super(app);
    this.rule = rule;
    this.onSave = onSave;
    this.content = rule.content;
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: `\uD3B8\uC9D1: ${this.rule.filename}` });
    const ta = contentEl.createEl("textarea");
    ta.value = this.content;
    ta.rows = 20;
    ta.addClass("ahm-textarea");
    ta.addEventListener("input", () => {
      this.content = ta.value;
    });
    const row = contentEl.createDiv({ cls: "ahm-modal-btns" });
    new import_obsidian7.ButtonComponent(row).setButtonText("\uC800\uC7A5").setCta().onClick(async () => {
      await this.onSave(this.content);
      this.close();
    });
    new import_obsidian7.ButtonComponent(row).setButtonText("\uCDE8\uC18C").onClick(() => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};
var NewRuleModal2 = class extends import_obsidian7.Modal {
  constructor(app, onCreate) {
    super(app);
    this.onCreate = onCreate;
    this.filename = "";
    this.content = "";
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h3", { text: "\uC0C8 \uADDC\uCE59 \uD30C\uC77C \uC0DD\uC131" });
    const nameInput = contentEl.createEl("input", { type: "text" });
    nameInput.placeholder = "\uD30C\uC77C\uBA85 (\uC608: my-rule.md)";
    nameInput.addClass("ahm-input");
    nameInput.addEventListener("input", () => {
      this.filename = nameInput.value;
    });
    const ta = contentEl.createEl("textarea");
    ta.rows = 10;
    ta.placeholder = "\uADDC\uCE59 \uB0B4\uC6A9 (\uB9C8\uD06C\uB2E4\uC6B4)";
    ta.addClass("ahm-textarea");
    ta.addEventListener("input", () => {
      this.content = ta.value;
    });
    const row = contentEl.createDiv({ cls: "ahm-modal-btns" });
    new import_obsidian7.ButtonComponent(row).setButtonText("\uC0DD\uC131").setCta().onClick(async () => {
      if (!this.filename.trim()) {
        new import_obsidian7.Notice("\uD30C\uC77C\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694.");
        return;
      }
      await this.onCreate(this.filename.trim(), this.content);
      this.close();
    });
    new import_obsidian7.ButtonComponent(row).setButtonText("\uCDE8\uC18C").onClick(() => this.close());
  }
  onClose() {
    this.contentEl.empty();
  }
};

// src/views/sections/VaultSection.ts
var import_obsidian8 = require("obsidian");
var path7 = __toESM(require("path"));
var fs3 = __toESM(require("fs"));
var VaultSection = class {
  constructor(container, app, multiVaultRoot) {
    this.container = container;
    this.app = app;
    this.multiVaultRoot = multiVaultRoot;
  }
  render() {
    this.container.empty();
    this.container.createEl("p", {
      text: "\uC0C8 \uC11C\uBE0C\uBCFC\uD2B8\uB97C \uC0DD\uC131\uD569\uB2C8\uB2E4. \uC0C1\uC704 \uD3F4\uB354\uC640 \uC774\uB984\uC744 \uC785\uB825\uD558\uBA74 clone_vault.ps1 \uC774 \uC2E4\uD589\uB429\uB2C8\uB2E4.",
      cls: "ahm-desc"
    });
    const createBtn = this.container.createEl("button", {
      text: "\u2795 \uC0C8 Vault \uC0DD\uC131",
      cls: "ahm-btn-cta"
    });
    createBtn.addEventListener("click", () => {
      const toolsDir = this.resolveToolsDir();
      if (!toolsDir) {
        new import_obsidian8.Notice("[AIHub] _tools \uB514\uB809\uD130\uB9AC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        return;
      }
      const vaultBase = this.app.vault.adapter.basePath;
      new VaultCloneModal(this.app, toolsDir, path7.dirname(vaultBase)).open();
    });
  }
  resolveToolsDir() {
    var _a;
    const vaultBase = this.app.vault.adapter.basePath;
    const candidates = [
      path7.join(vaultBase, "_tools"),
      path7.join(this.multiVaultRoot, "_tools")
    ];
    return (_a = candidates.find((c) => fs3.existsSync(c))) != null ? _a : null;
  }
};

// src/views/AHMView.ts
var AHM_VIEW_TYPE = "aihub-manager-view";
var TABS = [
  { id: "rules", label: "Rules", icon: "\u{1F4CB}" },
  { id: "vault", label: "Vault", icon: "\u{1F5C2}" }
];
var AHMView = class extends import_obsidian9.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.activeTab = "rules";
  }
  getViewType() {
    return AHM_VIEW_TYPE;
  }
  getDisplayText() {
    return "AIHub Manager";
  }
  getIcon() {
    return "vault";
  }
  async onOpen() {
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("ahm-view-root");
    const header = root.createDiv({ cls: "ahm-header" });
    header.createEl("span", { text: "AIHub Manager", cls: "ahm-title" });
    const settingsBtn = header.createEl("button", { text: "\u2699", cls: "ahm-icon-btn" });
    settingsBtn.title = "Settings";
    settingsBtn.addEventListener("click", () => {
      var _a, _b;
      (_b = (_a = this.app.setting) == null ? void 0 : _a.openTabById) == null ? void 0 : _b.call(_a, "aihub-manager");
    });
    const tabBar = root.createDiv({ cls: "ahm-tab-bar" });
    TABS.forEach(({ id, label, icon }) => {
      const btn = tabBar.createEl("button", {
        text: `${icon} ${label}`,
        cls: `ahm-tab ${id === this.activeTab ? "ahm-tab-active" : ""}`
      });
      btn.addEventListener("click", () => {
        tabBar.querySelectorAll(".ahm-tab").forEach((b) => b.removeClass("ahm-tab-active"));
        btn.addClass("ahm-tab-active");
        this.activeTab = id;
        this.renderSection();
      });
    });
    this.sectionEl = root.createDiv({ cls: "ahm-section-body" });
    await this.renderSection();
  }
  async onClose() {
    this.containerEl.empty();
  }
  async renderSection() {
    var _a;
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
          (_a = plugin.multiVaultRoot) != null ? _a : ""
        ).render();
        break;
    }
  }
  showNoRoot() {
    this.sectionEl.createEl("p", {
      text: "\u26A0 \uBA40\uD2F0\uBCFC\uD2B8 \uB8E8\uD2B8\uAC00 \uAC10\uC9C0\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. \uC124\uC815(\u2699)\uC5D0\uC11C \uACBD\uB85C\uB97C \uC9C1\uC811 \uC785\uB825\uD558\uC138\uC694.",
      cls: "ahm-error"
    });
  }
  async refresh() {
    await this.renderSection();
  }
};

// src/main.ts
var AihubManagerPlugin = class extends import_obsidian10.Plugin {
  constructor() {
    super(...arguments);
    this.multiVaultRoot = null;
    // ─── 모듈 ──────────────────────────────────────────────────
    this.rulesManager = null;
    this.claudianSettings = null;
  }
  // ─── 생명주기 ──────────────────────────────────────────────
  async onload() {
    var _a;
    await this.loadSettings();
    this.resolveMultiVaultRoot();
    this.initModules();
    this.registerView(AHM_VIEW_TYPE, (leaf) => new AHMView(leaf, this));
    this.addRibbonIcon("vault", "AIHub Manager", () => this.activateView());
    this.addCommand({ id: "open-panel", name: "AIHub: \uD328\uB110 \uC5F4\uAE30", callback: () => this.activateView() });
    this.addSettingTab(new AHMSettingsTab(this.app, this));
    this.metaBind = new MetaBindBridge(
      this.app,
      this.settings,
      (_a = this.multiVaultRoot) != null ? _a : "",
      (cmd) => this.addCommand(cmd)
    );
    this.metaBind.register();
    logger.info("Plugin loaded. multiVaultRoot:", this.multiVaultRoot);
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(AHM_VIEW_TYPE);
    logger.info("Plugin unloaded");
  }
  // ─── 설정 ──────────────────────────────────────────────────
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  // ─── 모듈 초기화 ───────────────────────────────────────────
  /** 설정 오버라이드 → 없으면 볼트 경로에서 자동 탐색 */
  resolveMultiVaultRoot() {
    if (this.settings.multiVaultRootOverride) {
      this.multiVaultRoot = this.settings.multiVaultRootOverride;
      return;
    }
    const adapter = this.app.vault.adapter;
    if (adapter instanceof import_obsidian10.FileSystemAdapter) {
      const basePath = adapter.basePath;
      this.multiVaultRoot = detectMultiVaultRoot(basePath);
    }
  }
  initModules() {
    if (!this.multiVaultRoot) {
      logger.warn("multiVaultRoot not detected \u2014 \uC124\uC815\uC5D0\uC11C \uACBD\uB85C\uB97C \uC218\uB3D9 \uC785\uB825\uD558\uC138\uC694.");
      return;
    }
    this.rulesManager = new RulesManager(this.multiVaultRoot);
    this.claudianSettings = new ClaudianSettingsManager(this.multiVaultRoot);
  }
  /** 설정 변경 후 모듈 경로를 재감지·재초기화 (settings 저장은 호출 측에서 수행) */
  async reloadModules() {
    this.resolveMultiVaultRoot();
    this.initModules();
  }
  // ─── 패널 ──────────────────────────────────────────────────
  async activateView() {
    const { workspace } = this.app;
    const existing = workspace.getLeavesOfType(AHM_VIEW_TYPE);
    if (existing.length > 0) {
      workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: AHM_VIEW_TYPE, active: true });
      workspace.revealLeaf(leaf);
    }
  }
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic3JjL21haW4udHMiLCAic3JjL3NldHRpbmdzLnRzIiwgInNyYy91dGlscy9WYXVsdFBhdGhEZXRlY3Rvci50cyIsICJzcmMvbW9kdWxlcy9SdWxlc01hbmFnZXIudHMiLCAic3JjL3V0aWxzL1V0ZjhGaWxlSU8udHMiLCAic3JjL21vZHVsZXMvQ2xhdWRpYW5TZXR0aW5ncy50cyIsICJzcmMvbW9kdWxlcy9NZXRhQmluZEJyaWRnZS50cyIsICJzcmMvbW9kdWxlcy9Qc0V4ZWN1dG9yLnRzIiwgInNyYy91dGlscy9Mb2dnZXIudHMiLCAic3JjL3VpL1ZhdWx0Q2xvbmVNb2RhbC50cyIsICJzcmMvdWkvU2V0dGluZ3NUYWIudHMiLCAic3JjL3VpL1J1bGVzUGFuZWwudHMiLCAic3JjL3VpL0NsYXVkaWFuUGFuZWwudHMiLCAic3JjL3ZpZXdzL0FITVZpZXcudHMiLCAic3JjL3ZpZXdzL3NlY3Rpb25zL1J1bGVzU2VjdGlvbi50cyIsICJzcmMvdmlld3Mvc2VjdGlvbnMvVmF1bHRTZWN0aW9uLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBGaWxlU3lzdGVtQWRhcHRlciwgUGx1Z2luIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBBSE1TZXR0aW5ncywgREVGQVVMVF9TRVRUSU5HUyB9IGZyb20gXCIuL3NldHRpbmdzXCI7XG5pbXBvcnQgeyBkZXRlY3RNdWx0aVZhdWx0Um9vdCB9IGZyb20gXCIuL3V0aWxzL1ZhdWx0UGF0aERldGVjdG9yXCI7XG5pbXBvcnQgeyBSdWxlc01hbmFnZXIgfSBmcm9tIFwiLi9tb2R1bGVzL1J1bGVzTWFuYWdlclwiO1xuaW1wb3J0IHsgQ2xhdWRpYW5TZXR0aW5nc01hbmFnZXIgfSBmcm9tIFwiLi9tb2R1bGVzL0NsYXVkaWFuU2V0dGluZ3NcIjtcbmltcG9ydCB7IE1ldGFCaW5kQnJpZGdlIH0gZnJvbSBcIi4vbW9kdWxlcy9NZXRhQmluZEJyaWRnZVwiO1xuaW1wb3J0IHsgQUhNU2V0dGluZ3NUYWIgfSBmcm9tIFwiLi91aS9TZXR0aW5nc1RhYlwiO1xuaW1wb3J0IHsgQUhNVmlldywgQUhNX1ZJRVdfVFlQRSB9IGZyb20gXCIuL3ZpZXdzL0FITVZpZXdcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuL3V0aWxzL0xvZ2dlclwiO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBBaWh1Yk1hbmFnZXJQbHVnaW4gZXh0ZW5kcyBQbHVnaW4ge1xuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgXHVDMEMxXHVEMERDIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICBzZXR0aW5ncyE6IEFITVNldHRpbmdzO1xuICBtdWx0aVZhdWx0Um9vdDogc3RyaW5nIHwgbnVsbCA9IG51bGw7XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFx1QkFBOFx1QjRDOCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgcnVsZXNNYW5hZ2VyOiBSdWxlc01hbmFnZXIgfCBudWxsID0gbnVsbDtcbiAgY2xhdWRpYW5TZXR0aW5nczogQ2xhdWRpYW5TZXR0aW5nc01hbmFnZXIgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBtZXRhQmluZCE6IE1ldGFCaW5kQnJpZGdlO1xuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBcdUMwRERcdUJBODVcdUM4RkNcdUFFMzAgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgYXN5bmMgb25sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XG4gICAgdGhpcy5yZXNvbHZlTXVsdGlWYXVsdFJvb3QoKTtcbiAgICB0aGlzLmluaXRNb2R1bGVzKCk7XG5cbiAgICB0aGlzLnJlZ2lzdGVyVmlldyhBSE1fVklFV19UWVBFLCAobGVhZikgPT4gbmV3IEFITVZpZXcobGVhZiwgdGhpcykpO1xuICAgIHRoaXMuYWRkUmliYm9uSWNvbihcInZhdWx0XCIsIFwiQUlIdWIgTWFuYWdlclwiLCAoKSA9PiB0aGlzLmFjdGl2YXRlVmlldygpKTtcbiAgICB0aGlzLmFkZENvbW1hbmQoeyBpZDogXCJvcGVuLXBhbmVsXCIsIG5hbWU6IFwiQUlIdWI6IFx1RDMyOFx1QjExMCBcdUM1RjRcdUFFMzBcIiwgY2FsbGJhY2s6ICgpID0+IHRoaXMuYWN0aXZhdGVWaWV3KCkgfSk7XG4gICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBBSE1TZXR0aW5nc1RhYih0aGlzLmFwcCwgdGhpcykpO1xuXG4gICAgdGhpcy5tZXRhQmluZCA9IG5ldyBNZXRhQmluZEJyaWRnZShcbiAgICAgIHRoaXMuYXBwLFxuICAgICAgdGhpcy5zZXR0aW5ncyxcbiAgICAgIHRoaXMubXVsdGlWYXVsdFJvb3QgPz8gXCJcIixcbiAgICAgIChjbWQpID0+IHRoaXMuYWRkQ29tbWFuZChjbWQpXG4gICAgKTtcbiAgICB0aGlzLm1ldGFCaW5kLnJlZ2lzdGVyKCk7XG5cbiAgICBsb2dnZXIuaW5mbyhcIlBsdWdpbiBsb2FkZWQuIG11bHRpVmF1bHRSb290OlwiLCB0aGlzLm11bHRpVmF1bHRSb290KTtcbiAgfVxuXG4gIGFzeW5jIG9udW5sb2FkKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuYXBwLndvcmtzcGFjZS5kZXRhY2hMZWF2ZXNPZlR5cGUoQUhNX1ZJRVdfVFlQRSk7XG4gICAgbG9nZ2VyLmluZm8oXCJQbHVnaW4gdW5sb2FkZWRcIik7XG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgXHVDMTI0XHVDODE1IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGFzeW5jIGxvYWRTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcbiAgfVxuXG4gIGFzeW5jIHNhdmVTZXR0aW5ncygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFx1QkFBOFx1QjRDOCBcdUNEMDhcdUFFMzBcdUQ2NTQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgLyoqIFx1QzEyNFx1QzgxNSBcdUM2MjRcdUJDODRcdUI3N0NcdUM3NzRcdUI0REMgXHUyMTkyIFx1QzVDNlx1QzczQ1x1QkE3NCBcdUJDRkNcdUQyQjggXHVBQ0JEXHVCODVDXHVDNUQwXHVDMTFDIFx1Qzc5MFx1QjNEOSBcdUQwRDBcdUMwQzkgKi9cbiAgcHJpdmF0ZSByZXNvbHZlTXVsdGlWYXVsdFJvb3QoKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuc2V0dGluZ3MubXVsdGlWYXVsdFJvb3RPdmVycmlkZSkge1xuICAgICAgdGhpcy5tdWx0aVZhdWx0Um9vdCA9IHRoaXMuc2V0dGluZ3MubXVsdGlWYXVsdFJvb3RPdmVycmlkZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYWRhcHRlciA9IHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXI7XG4gICAgaWYgKGFkYXB0ZXIgaW5zdGFuY2VvZiBGaWxlU3lzdGVtQWRhcHRlcikge1xuICAgICAgY29uc3QgYmFzZVBhdGggPSAoYWRhcHRlciBhcyB1bmtub3duIGFzIHsgYmFzZVBhdGg6IHN0cmluZyB9KS5iYXNlUGF0aDtcbiAgICAgIHRoaXMubXVsdGlWYXVsdFJvb3QgPSBkZXRlY3RNdWx0aVZhdWx0Um9vdChiYXNlUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBpbml0TW9kdWxlcygpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubXVsdGlWYXVsdFJvb3QpIHtcbiAgICAgIGxvZ2dlci53YXJuKFwibXVsdGlWYXVsdFJvb3Qgbm90IGRldGVjdGVkIFx1MjAxNCBcdUMxMjRcdUM4MTVcdUM1RDBcdUMxMUMgXHVBQ0JEXHVCODVDXHVCOTdDIFx1QzIxOFx1QjNEOSBcdUM3ODVcdUI4MjVcdUQ1NThcdUMxMzhcdUM2OTQuXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnJ1bGVzTWFuYWdlciA9IG5ldyBSdWxlc01hbmFnZXIodGhpcy5tdWx0aVZhdWx0Um9vdCk7XG4gICAgdGhpcy5jbGF1ZGlhblNldHRpbmdzID0gbmV3IENsYXVkaWFuU2V0dGluZ3NNYW5hZ2VyKHRoaXMubXVsdGlWYXVsdFJvb3QpO1xuICB9XG5cbiAgLyoqIFx1QzEyNFx1QzgxNSBcdUJDQzBcdUFDQkQgXHVENkM0IFx1QkFBOFx1QjRDOCBcdUFDQkRcdUI4NUNcdUI5N0MgXHVDN0FDXHVBQzEwXHVDOUMwXHUwMEI3XHVDN0FDXHVDRDA4XHVBRTMwXHVENjU0IChzZXR0aW5ncyBcdUM4MDBcdUM3QTVcdUM3NDAgXHVENjM4XHVDRDlDIFx1Q0UyMVx1QzVEMFx1QzExQyBcdUMyMThcdUQ1ODkpICovXG4gIGFzeW5jIHJlbG9hZE1vZHVsZXMoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5yZXNvbHZlTXVsdGlWYXVsdFJvb3QoKTtcbiAgICB0aGlzLmluaXRNb2R1bGVzKCk7XG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgXHVEMzI4XHVCMTEwIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIGFzeW5jIGFjdGl2YXRlVmlldygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCB7IHdvcmtzcGFjZSB9ID0gdGhpcy5hcHA7XG4gICAgY29uc3QgZXhpc3RpbmcgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKEFITV9WSUVXX1RZUEUpO1xuICAgIGlmIChleGlzdGluZy5sZW5ndGggPiAwKSB7XG4gICAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihleGlzdGluZ1swXSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGxlYWYgPSB3b3Jrc3BhY2UuZ2V0UmlnaHRMZWFmKGZhbHNlKTtcbiAgICBpZiAobGVhZikge1xuICAgICAgYXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBBSE1fVklFV19UWVBFLCBhY3RpdmU6IHRydWUgfSk7XG4gICAgICB3b3Jrc3BhY2UucmV2ZWFsTGVhZihsZWFmKTtcbiAgICB9XG4gIH1cbn1cbiIsICJleHBvcnQgaW50ZXJmYWNlIEFITVNldHRpbmdzIHtcbiAgLyoqIFx1Qzc5MFx1QjNEOSBcdUFDMTBcdUM5QzAgXHVDMkU0XHVEMzI4IFx1QzJEQyBcdUMyMThcdUIzRDlcdUM3M0NcdUI4NUMgXHVDOUMwXHVDODE1XHVENTU4XHVCMjk0IFx1QkE0MFx1RDJGMFx1QkNGQ1x1RDJCOCBcdUI4RThcdUQyQjggXHVBQ0JEXHVCODVDICovXG4gIG11bHRpVmF1bHRSb290T3ZlcnJpZGU6IHN0cmluZztcblxuICAvKiogUG93ZXJTaGVsbCBcdUMyQTRcdUQwNkNcdUI5QkRcdUQyQjggXHVBQ0JEXHVCODVDIFx1QzYyNFx1QkM4NFx1Qjc3Q1x1Qzc3NFx1QjREQyAoXHVDNzkwXHVCM0Q5IFx1QUMxMFx1QzlDMCBcdUMyRTRcdUQzMjggXHVDMkRDKSAqL1xuICBwc1NjcmlwdE92ZXJyaWRlczoge1xuICAgIGNyZWF0ZVZhdWx0OiBzdHJpbmc7XG4gICAgc3luY1dvcmtzcGFjZTogc3RyaW5nO1xuICAgIGNsb25lVmF1bHQ6IHN0cmluZztcbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfU0VUVElOR1M6IEFITVNldHRpbmdzID0ge1xuICBtdWx0aVZhdWx0Um9vdE92ZXJyaWRlOiBcIlwiLFxuICBwc1NjcmlwdE92ZXJyaWRlczoge1xuICAgIGNyZWF0ZVZhdWx0OiBcIlwiLFxuICAgIHN5bmNXb3Jrc3BhY2U6IFwiXCIsXG4gICAgY2xvbmVWYXVsdDogXCJcIixcbiAgfSxcbn07XG4iLCAiaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5cbi8qKlxuICogXHVCQ0ZDXHVEMkI4IFx1QjhFOFx1RDJCOFx1QzVEMFx1QzExQyBcdUM3MDRcdUI4NUMgXHVEMEQwXHVDMEM5XHVENTU4XHVDNUVDIC5jbGF1ZGUvcnVsZXMvIFx1QjUxNFx1QjgwOVx1RDEzMFx1QjlBQ1x1QUMwMCBcdUM3ODhcdUIyOTRcbiAqIFx1QkE0MFx1RDJGMFx1QkNGQ1x1RDJCOCBcdUI4RThcdUQyQjhcdUI5N0MgXHVDNzkwXHVCM0Q5IFx1QUMxMFx1QzlDMFx1RDU1Q1x1QjJFNC5cbiAqXG4gKiBcdUM4RkNcdUM3NTg6IHByb2Nlc3MuY3dkKCkgXHVDMEFDXHVDNkE5IFx1QUUwOFx1QzlDMCBcdTIwMTQgd29ya3RyZWUgXHVENjU4XHVBQ0JEXHVDNUQwXHVDMTFDIFx1QzYyNFx1QjNEOVx1Qzc5MS5cbiAqIFx1QkMxOFx1QjREQ1x1QzJEQyBhcHAudmF1bHQuYWRhcHRlci5iYXNlUGF0aCBcdUFFMzBcdUM5MDBcdUM3M0NcdUI4NUMgXHVEMEQwXHVDMEM5XHVENTVDXHVCMkU0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGV0ZWN0TXVsdGlWYXVsdFJvb3QodmF1bHRCYXNlUGF0aDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGxldCBkaXIgPSB2YXVsdEJhc2VQYXRoO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IDY7IGkrKykge1xuICAgIGNvbnN0IGNhbmRpZGF0ZSA9IHBhdGguam9pbihkaXIsIFwiLmNsYXVkZVwiLCBcInJ1bGVzXCIpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKGNhbmRpZGF0ZSkgJiYgZnMuc3RhdFN5bmMoY2FuZGlkYXRlKS5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICByZXR1cm4gZGlyO1xuICAgIH1cbiAgICBjb25zdCBwYXJlbnQgPSBwYXRoLmRpcm5hbWUoZGlyKTtcbiAgICBpZiAocGFyZW50ID09PSBkaXIpIHJldHVybiBudWxsOyAvLyBcdUQzMENcdUM3N0NcdUMyRENcdUMyQTRcdUQxNUMgXHVCOEU4XHVEMkI4IFx1QjNDNFx1QjJFQ1xuICAgIGRpciA9IHBhcmVudDtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLyoqXG4gKiBcdUQ2MDRcdUM3QUMgXHVCQ0ZDXHVEMkI4IFx1QUNCRFx1Qjg1Q1x1QzVEMFx1QzExQyBcdUQyQjlcdUM4MTUgXHVDMEMxXHVCMzAwIFx1QUNCRFx1Qjg1Q1x1QUMwMCBcdUM4NzRcdUM3QUNcdUQ1NThcdUIyOTRcdUM5QzAgXHVENjU1XHVDNzc4XHVENTVDXHVCMkU0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gcGF0aEV4aXN0cyhmdWxsUGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIHJldHVybiBmcy5leGlzdHNTeW5jKGZ1bGxQYXRoKTtcbn1cbiIsICJpbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQge1xuICByZWFkVXRmOCxcbiAgd3JpdGVVdGY4LFxuICBsaXN0RGlyLFxuICBtb3ZlRmlsZSxcbiAgZW5zdXJlRGlyLFxuICBleGlzdHNTeW5jLFxuICBnZXRGaWxlTXRpbWUsXG59IGZyb20gXCIuLi91dGlscy9VdGY4RmlsZUlPXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUnVsZUZpbGUge1xuICBmaWxlbmFtZTogc3RyaW5nO1xuICBhY3RpdmU6IGJvb2xlYW47XG4gIGNvbnRlbnQ6IHN0cmluZztcbiAgbGFzdE1vZGlmaWVkOiBudW1iZXI7XG59XG5cbi8qKlxuICogLmNsYXVkZS9ydWxlcy8gXHVCNTE0XHVCODA5XHVEMTMwXHVCOUFDXHVDNzU4IFx1QUREQ1x1Q0U1OSBcdUQzMENcdUM3N0NcdUI0RTRcdUM3NDQgXHVBRDAwXHVCOUFDXHVENTVDXHVCMkU0LlxuICpcbiAqIFx1RDY1Q1x1QzEzMTogIHttdWx0aVZhdWx0Um9vdH0vLmNsYXVkZS9ydWxlcy8qLm1kXG4gKiBcdUJFNDRcdUQ2NUNcdUMxMzE6IHttdWx0aVZhdWx0Um9vdH0vLmNsYXVkZS9ydWxlcy9kaXNhYmxlZC8qLm1kXG4gKlxuICogXHVEMUEwXHVBRTAwXHVDNzQwIFx1RDMwQ1x1Qzc3QyBcdUMwQURcdUM4MUMgXHVDNUM2XHVDNzc0IFx1QjQ1MCBcdUI1MTRcdUI4MDlcdUQxMzBcdUI5QUMgXHVBQzA0IFx1Qzc3NFx1QjNEOVx1QzczQ1x1Qjg1QyBcdUNDOThcdUI5QUNcdUQ1NUNcdUIyRTQuXG4gKi9cbmV4cG9ydCBjbGFzcyBSdWxlc01hbmFnZXIge1xuICBwcml2YXRlIHJlYWRvbmx5IGFjdGl2ZURpcjogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IGRpc2FibGVkRGlyOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IobXVsdGlWYXVsdFJvb3Q6IHN0cmluZykge1xuICAgIHRoaXMuYWN0aXZlRGlyID0gcGF0aC5qb2luKG11bHRpVmF1bHRSb290LCBcIi5jbGF1ZGVcIiwgXCJydWxlc1wiKTtcbiAgICB0aGlzLmRpc2FibGVkRGlyID0gcGF0aC5qb2luKG11bHRpVmF1bHRSb290LCBcIi5jbGF1ZGVcIiwgXCJydWxlc1wiLCBcImRpc2FibGVkXCIpO1xuICB9XG5cbiAgYXN5bmMgbGlzdFJ1bGVzKCk6IFByb21pc2U8UnVsZUZpbGVbXT4ge1xuICAgIGNvbnN0IHJ1bGVzOiBSdWxlRmlsZVtdID0gW107XG5cbiAgICAvLyBcdUQ2NUNcdUMxMzEgXHVBRERDXHVDRTU5IChkaXNhYmxlZCBcdUMxMUNcdUJFMENcdUQzRjRcdUIzNTQgXHVDODFDXHVDNjc4KVxuICAgIGNvbnN0IGFjdGl2ZUVudHJpZXMgPSBhd2FpdCBsaXN0RGlyKHRoaXMuYWN0aXZlRGlyKTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGFjdGl2ZUVudHJpZXMpIHtcbiAgICAgIGlmICghZW50cnkuZW5kc1dpdGgoXCIubWRcIikpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4odGhpcy5hY3RpdmVEaXIsIGVudHJ5KTtcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZWFkVXRmOChmaWxlUGF0aCkuY2F0Y2goKCkgPT4gXCJcIik7XG4gICAgICBjb25zdCBtdGltZSA9IGF3YWl0IGdldEZpbGVNdGltZShmaWxlUGF0aCk7XG4gICAgICBydWxlcy5wdXNoKHsgZmlsZW5hbWU6IGVudHJ5LCBhY3RpdmU6IHRydWUsIGNvbnRlbnQsIGxhc3RNb2RpZmllZDogbXRpbWUgfSk7XG4gICAgfVxuXG4gICAgLy8gXHVCRTQ0XHVENjVDXHVDMTMxIFx1QUREQ1x1Q0U1OVxuICAgIGNvbnN0IGRpc2FibGVkRW50cmllcyA9IGF3YWl0IGxpc3REaXIodGhpcy5kaXNhYmxlZERpcik7XG4gICAgZm9yIChjb25zdCBlbnRyeSBvZiBkaXNhYmxlZEVudHJpZXMpIHtcbiAgICAgIGlmICghZW50cnkuZW5kc1dpdGgoXCIubWRcIikpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4odGhpcy5kaXNhYmxlZERpciwgZW50cnkpO1xuICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IHJlYWRVdGY4KGZpbGVQYXRoKS5jYXRjaCgoKSA9PiBcIlwiKTtcbiAgICAgIGNvbnN0IG10aW1lID0gYXdhaXQgZ2V0RmlsZU10aW1lKGZpbGVQYXRoKTtcbiAgICAgIHJ1bGVzLnB1c2goeyBmaWxlbmFtZTogZW50cnksIGFjdGl2ZTogZmFsc2UsIGNvbnRlbnQsIGxhc3RNb2RpZmllZDogbXRpbWUgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ1bGVzO1xuICB9XG5cbiAgYXN5bmMgbGlzdEFjdGl2ZVJ1bGVzKCk6IFByb21pc2U8UnVsZUZpbGVbXT4ge1xuICAgIGNvbnN0IGFsbCA9IGF3YWl0IHRoaXMubGlzdFJ1bGVzKCk7XG4gICAgcmV0dXJuIGFsbC5maWx0ZXIoKHIpID0+IHIuYWN0aXZlKTtcbiAgfVxuXG4gIGFzeW5jIHJlYWRSdWxlKGZpbGVuYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IGFjdGl2ZVBhdGggPSBwYXRoLmpvaW4odGhpcy5hY3RpdmVEaXIsIGZpbGVuYW1lKTtcbiAgICBpZiAoZXhpc3RzU3luYyhhY3RpdmVQYXRoKSkgcmV0dXJuIHJlYWRVdGY4KGFjdGl2ZVBhdGgpO1xuICAgIGNvbnN0IGRpc2FibGVkUGF0aCA9IHBhdGguam9pbih0aGlzLmRpc2FibGVkRGlyLCBmaWxlbmFtZSk7XG4gICAgaWYgKGV4aXN0c1N5bmMoZGlzYWJsZWRQYXRoKSkgcmV0dXJuIHJlYWRVdGY4KGRpc2FibGVkUGF0aCk7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBSdWxlIG5vdCBmb3VuZDogJHtmaWxlbmFtZX1gKTtcbiAgfVxuXG4gIGFzeW5jIHdyaXRlUnVsZShmaWxlbmFtZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBhY3RpdmVQYXRoID0gcGF0aC5qb2luKHRoaXMuYWN0aXZlRGlyLCBmaWxlbmFtZSk7XG4gICAgY29uc3QgZGlzYWJsZWRQYXRoID0gcGF0aC5qb2luKHRoaXMuZGlzYWJsZWREaXIsIGZpbGVuYW1lKTtcblxuICAgIGlmIChleGlzdHNTeW5jKGFjdGl2ZVBhdGgpKSB7XG4gICAgICBhd2FpdCB3cml0ZVV0ZjgoYWN0aXZlUGF0aCwgY29udGVudCk7XG4gICAgfSBlbHNlIGlmIChleGlzdHNTeW5jKGRpc2FibGVkUGF0aCkpIHtcbiAgICAgIGF3YWl0IHdyaXRlVXRmOChkaXNhYmxlZFBhdGgsIGNvbnRlbnQpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBcdUMwQzggXHVBRERDXHVDRTU5IFx1MjAxNCBcdUQ2NUNcdUMxMzEgXHVCNTE0XHVCODA5XHVEMTMwXHVCOUFDXHVDNUQwIFx1QzBERFx1QzEzMVxuICAgICAgYXdhaXQgd3JpdGVVdGY4KGFjdGl2ZVBhdGgsIGNvbnRlbnQpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIHRvZ2dsZVJ1bGUoZmlsZW5hbWU6IHN0cmluZywgZW5hYmxlOiBib29sZWFuKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGVuYWJsZSkge1xuICAgICAgLy8gZGlzYWJsZWQgXHUyMTkyIGFjdGl2ZVxuICAgICAgY29uc3Qgc3JjID0gcGF0aC5qb2luKHRoaXMuZGlzYWJsZWREaXIsIGZpbGVuYW1lKTtcbiAgICAgIGNvbnN0IGRlc3QgPSBwYXRoLmpvaW4odGhpcy5hY3RpdmVEaXIsIGZpbGVuYW1lKTtcbiAgICAgIGlmIChleGlzdHNTeW5jKHNyYykpIGF3YWl0IG1vdmVGaWxlKHNyYywgZGVzdCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGFjdGl2ZSBcdTIxOTIgZGlzYWJsZWRcbiAgICAgIGNvbnN0IHNyYyA9IHBhdGguam9pbih0aGlzLmFjdGl2ZURpciwgZmlsZW5hbWUpO1xuICAgICAgY29uc3QgZGVzdCA9IHBhdGguam9pbih0aGlzLmRpc2FibGVkRGlyLCBmaWxlbmFtZSk7XG4gICAgICBpZiAoZXhpc3RzU3luYyhzcmMpKSB7XG4gICAgICAgIGF3YWl0IGVuc3VyZURpcih0aGlzLmRpc2FibGVkRGlyKTtcbiAgICAgICAgYXdhaXQgbW92ZUZpbGUoc3JjLCBkZXN0KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiIsICJpbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcbmltcG9ydCAqIGFzIGZzU3luYyBmcm9tIFwiZnNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcblxuLyoqXG4gKiBVVEYtOCBcdUFDRTBcdUM4MTUgSS9PIFx1QzcyMFx1RDJGOFx1QjlBQ1x1RDJGMFxuICpcbiAqIFx1RDU1Q1x1QUUwMCBcdUI5QzhcdUQwNkNcdUIyRTRcdUM2QjQgXHVEMzBDXHVDNzdDIFx1QkNGNFx1RDYzOFx1Qjk3QyBcdUM3MDRcdUQ1NzQgXHVCQzE4XHVCNERDXHVDMkRDIFx1Qzc3NCBcdUJBQThcdUI0QzhcdUM3NDQgXHVEMUI1XHVENTc0XG4gKiBcdUQzMENcdUM3N0NcdUM3NDQgXHVDNzdEXHVBQ0UwIFx1QzRGNFx1QjJFNC4gR2V0LUNvbnRlbnQgfCBTZXQtQ29udGVudCBcdUQzMjhcdUQxMzQoXHVDNzc4XHVDRjU0XHVCNTI5IFx1QzBBQ1x1QUNFMCBcdUM3MjBcdUJDMUMpXG4gKiBcdUFDRkMgXHVCM0Q5XHVDNzdDXHVENTVDIFx1QzcwNFx1RDVEOFx1Qzc0NCBcdUFDMDBcdUM5QzQgXHVENTBDXHVCN0FCXHVEM0ZDIFx1QUUzMFx1QkNGOCBcdUM3NzhcdUNGNTRcdUI1MjkgXHVDMEFDXHVDNkE5XHVDNzQ0IFx1QkMyOVx1QzlDMFx1RDU1Q1x1QjJFNC5cbiAqL1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcmVhZFV0ZjgoZmlsZVBhdGg6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIGNvbnN0IGJ1ZmZlciA9IGF3YWl0IGZzLnJlYWRGaWxlKGZpbGVQYXRoKTtcbiAgcmV0dXJuIG5ldyBUZXh0RGVjb2RlcihcInV0Zi04XCIpLmRlY29kZShidWZmZXIpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGVVdGY4KGZpbGVQYXRoOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBkaXIgPSBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpO1xuICBhd2FpdCBmcy5ta2RpcihkaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBjb25zdCBidWZmZXIgPSBuZXcgVGV4dEVuY29kZXIoKS5lbmNvZGUoY29udGVudCk7XG4gIGF3YWl0IGZzLndyaXRlRmlsZShmaWxlUGF0aCwgYnVmZmVyKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxpc3REaXIoZGlyUGF0aDogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmdbXT4ge1xuICBpZiAoIWZzU3luYy5leGlzdHNTeW5jKGRpclBhdGgpKSByZXR1cm4gW107XG4gIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5yZWFkZGlyKGRpclBhdGgpO1xuICByZXR1cm4gZW50cmllcztcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZURpcihkaXJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgYXdhaXQgZnMubWtkaXIoZGlyUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtb3ZlRmlsZShzcmM6IHN0cmluZywgZGVzdDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGRlc3REaXIgPSBwYXRoLmRpcm5hbWUoZGVzdCk7XG4gIGF3YWl0IGZzLm1rZGlyKGRlc3REaXIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICBhd2FpdCBmcy5yZW5hbWUoc3JjLCBkZXN0KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4aXN0c1N5bmMoZmlsZVBhdGg6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gZnNTeW5jLmV4aXN0c1N5bmMoZmlsZVBhdGgpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZ2V0RmlsZU10aW1lKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj4ge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBmcy5zdGF0KGZpbGVQYXRoKTtcbiAgICByZXR1cm4gc3RhdC5tdGltZU1zO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gMDtcbiAgfVxufVxuIiwgImltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IHJlYWRVdGY4LCB3cml0ZVV0ZjggfSBmcm9tIFwiLi4vdXRpbHMvVXRmOEZpbGVJT1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIENsYXVkaWFuQ29uZmlnIHtcbiAgdXNlck5hbWU/OiBzdHJpbmc7XG4gIGVuYWJsZUJsb2NrbGlzdD86IGJvb2xlYW47XG4gIGJsb2NrZWRDb21tYW5kcz86IHtcbiAgICB1bml4Pzogc3RyaW5nW107XG4gICAgd2luZG93cz86IHN0cmluZ1tdO1xuICB9O1xuICBwZXJtaXNzaW9uTW9kZT86IFwieW9sb1wiIHwgXCJhc2tcIiB8IHN0cmluZztcbiAgbW9kZWw/OiBzdHJpbmc7XG4gIHRoaW5raW5nQnVkZ2V0PzogXCJsb3dcIiB8IFwibWVkaXVtXCIgfCBcImhpZ2hcIiB8IHN0cmluZztcbiAgZW5hYmxlQXV0b1RpdGxlR2VuZXJhdGlvbj86IGJvb2xlYW47XG4gIHRpdGxlR2VuZXJhdGlvbk1vZGVsPzogc3RyaW5nO1xuICBlbmFibGVDaHJvbWU/OiBib29sZWFuO1xuICBlbmFibGVCYW5nQmFzaD86IGJvb2xlYW47XG4gIGV4Y2x1ZGVkVGFncz86IHN0cmluZ1tdO1xuICBtZWRpYUZvbGRlcj86IHN0cmluZztcbiAgc3lzdGVtUHJvbXB0Pzogc3RyaW5nO1xuICBhbGxvd2VkRXhwb3J0UGF0aHM/OiBzdHJpbmdbXTtcbiAgcGVyc2lzdGVudEV4dGVybmFsQ29udGV4dFBhdGhzPzogc3RyaW5nW107XG4gIGVudmlyb25tZW50VmFyaWFibGVzPzogc3RyaW5nO1xuICBlbnZTbmlwcGV0cz86IHVua25vd25bXTtcbiAgY3VzdG9tQ29udGV4dExpbWl0cz86IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBrZXlib2FyZE5hdmlnYXRpb24/OiB7XG4gICAgc2Nyb2xsVXBLZXk/OiBzdHJpbmc7XG4gICAgc2Nyb2xsRG93bktleT86IHN0cmluZztcbiAgICBmb2N1c0lucHV0S2V5Pzogc3RyaW5nO1xuICB9O1xuICBsb2NhbGU/OiBzdHJpbmc7XG4gIGNsYXVkZUNsaVBhdGg/OiBzdHJpbmc7XG4gIGNsYXVkZUNsaVBhdGhzQnlIb3N0PzogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgbG9hZFVzZXJDbGF1ZGVTZXR0aW5ncz86IGJvb2xlYW47XG4gIGxhc3RDbGF1ZGVNb2RlbD86IHN0cmluZztcbiAgbGFzdEN1c3RvbU1vZGVsPzogc3RyaW5nO1xuICBsYXN0RW52SGFzaD86IHN0cmluZztcbiAgbWF4VGFicz86IG51bWJlcjtcbiAgdGFiQmFyUG9zaXRpb24/OiBzdHJpbmc7XG4gIGVuYWJsZUF1dG9TY3JvbGw/OiBib29sZWFuO1xuICBvcGVuSW5NYWluVGFiPzogYm9vbGVhbjtcbiAgaGlkZGVuU2xhc2hDb21tYW5kcz86IHN0cmluZ1tdO1xuICBba2V5OiBzdHJpbmddOiB1bmtub3duO1xufVxuXG5jb25zdCBBQ1RJVkVfUlVMRVNfU1RBUlQgPSBcIltBQ1RJVkUgUlVMRVNdXCI7XG5jb25zdCBBQ1RJVkVfUlVMRVNfRU5EID0gXCJbL0FDVElWRSBSVUxFU11cIjtcbmNvbnN0IEFDVElWRV9SVUxFU19SRUdFWCA9IC9cXFtBQ1RJVkUgUlVMRVNcXF1bXFxzXFxTXSo/XFxbXFwvQUNUSVZFIFJVTEVTXFxdXFxuPy87XG5cbi8qKlxuICogY2xhdWRpYW4tc2V0dGluZ3MuanNvbiBcdUM3N0RcdUFFMzAvXHVDNEYwXHVBRTMwIFx1QkFBOFx1QjRDOFxuICpcbiAqIFx1QkQ4MFx1QkQ4NCBcdUJDRDFcdUQ1NjkocGFydGlhbCBtZXJnZSkgXHVDODA0XHVCN0I1OlxuICogXHVENjA0XHVDN0FDIEpTT05cdUM3NDQgXHVCQTNDXHVDODAwIFx1Qzc3RFx1QUNFMCBcdTIxOTIgXHVCQ0MwXHVBQ0JEIFx1RDU0NFx1QjREQ1x1QjlDQyBcdUJDRDFcdUQ1NjkgXHUyMTkyIFx1QjJFNFx1QzJEQyBcdUM0RjRcdUIyRTQuXG4gKiBcdUQ1MENcdUI3RUNcdUFERjhcdUM3NzhcdUM3NzQgXHVCQUE4XHVCOTc0XHVCMjk0IFx1QzBDOCBcdUQwQTRcdUI5N0MgXHVDODA4XHVCMzAwIFx1QzBBRFx1QzgxQ1x1RDU1OFx1QzlDMCBcdUM1NEFcdUIyOTRcdUIyRTQuXG4gKi9cbmV4cG9ydCBjbGFzcyBDbGF1ZGlhblNldHRpbmdzTWFuYWdlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgZmlsZVBhdGg6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihtdWx0aVZhdWx0Um9vdDogc3RyaW5nKSB7XG4gICAgdGhpcy5maWxlUGF0aCA9IHBhdGguam9pbihtdWx0aVZhdWx0Um9vdCwgXCIuY2xhdWRlXCIsIFwiY2xhdWRpYW4tc2V0dGluZ3MuanNvblwiKTtcbiAgfVxuXG4gIGFzeW5jIGxvYWQoKTogUHJvbWlzZTxDbGF1ZGlhbkNvbmZpZz4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByYXcgPSBhd2FpdCByZWFkVXRmOCh0aGlzLmZpbGVQYXRoKTtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKHJhdykgYXMgQ2xhdWRpYW5Db25maWc7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4ge307XG4gICAgfVxuICB9XG5cbiAgYXN5bmMgc2F2ZShwYXJ0aWFsOiBQYXJ0aWFsPENsYXVkaWFuQ29uZmlnPik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGN1cnJlbnQgPSBhd2FpdCB0aGlzLmxvYWQoKTtcbiAgICBjb25zdCBtZXJnZWQgPSB7IC4uLmN1cnJlbnQsIC4uLnBhcnRpYWwgfTtcbiAgICBhd2FpdCB3cml0ZVV0ZjgodGhpcy5maWxlUGF0aCwgSlNPTi5zdHJpbmdpZnkobWVyZ2VkLCBudWxsLCAyKSArIFwiXFxuXCIpO1xuICB9XG5cbiAgYXN5bmMgZ2V0U3lzdGVtUHJvbXB0KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgY29uc3QgY29uZmlnID0gYXdhaXQgdGhpcy5sb2FkKCk7XG4gICAgcmV0dXJuIGNvbmZpZy5zeXN0ZW1Qcm9tcHQgPz8gXCJcIjtcbiAgfVxuXG4gIC8qKlxuICAgKiBzeXN0ZW1Qcm9tcHRcdUM1RDAgXHVENjVDXHVDMTMxIFx1QUREQ1x1Q0U1OSBcdUJFMTRcdUI4NURcdUM3NDQgXHVDOEZDXHVDNzg1XHVENTVDXHVCMkU0LlxuICAgKiBcdUM3NzRcdUJCRjggXHVCRTE0XHVCODVEXHVDNzc0IFx1Qzc4OFx1QzczQ1x1QkE3NCBcdUFENTBcdUNDQjQsIFx1QzVDNlx1QzczQ1x1QkE3NCBcdUFFMzBcdUM4NzQgXHVENTA0XHVCODZDXHVENTA0XHVEMkI4IFx1QzU1RVx1QzVEMCBwcmVwZW5kLlxuICAgKiBcdUIyMDRcdUM4MDEgXHVCQzI5XHVDOUMwOiBbQUNUSVZFIFJVTEVTXS4uLlsvQUNUSVZFIFJVTEVTXSBcdUQzMjhcdUQxMzRcdUM3NDQgcmVnZXhcdUI4NUMgXHVBQzEwXHVDOUMwXHVENTU4XHVDNUVDIFx1QUQ1MFx1Q0NCNC5cbiAgICovXG4gIGFzeW5jIGluamVjdEFjdGl2ZVJ1bGVzQmxvY2socnVsZXNDb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBjb25maWcgPSBhd2FpdCB0aGlzLmxvYWQoKTtcbiAgICBjb25zdCBjdXJyZW50UHJvbXB0ID0gY29uZmlnLnN5c3RlbVByb21wdCA/PyBcIlwiO1xuICAgIGNvbnN0IGJsb2NrID0gYCR7QUNUSVZFX1JVTEVTX1NUQVJUfVxcbiR7cnVsZXNDb250ZW50fVxcbiR7QUNUSVZFX1JVTEVTX0VORH1cXG5cXG5gO1xuXG4gICAgbGV0IG5ld1Byb21wdDogc3RyaW5nO1xuICAgIGlmIChBQ1RJVkVfUlVMRVNfUkVHRVgudGVzdChjdXJyZW50UHJvbXB0KSkge1xuICAgICAgbmV3UHJvbXB0ID0gY3VycmVudFByb21wdC5yZXBsYWNlKEFDVElWRV9SVUxFU19SRUdFWCwgYmxvY2spO1xuICAgIH0gZWxzZSB7XG4gICAgICBuZXdQcm9tcHQgPSBibG9jayArIGN1cnJlbnRQcm9tcHQ7XG4gICAgfVxuXG4gICAgYXdhaXQgdGhpcy5zYXZlKHsgc3lzdGVtUHJvbXB0OiBuZXdQcm9tcHQgfSk7XG4gIH1cblxuICAvKipcbiAgICogc3lzdGVtUHJvbXB0XHVDNUQwXHVDMTFDIFx1RDY1Q1x1QzEzMSBcdUFERENcdUNFNTkgXHVCRTE0XHVCODVEXHVDNzQ0IFx1QzgxQ1x1QUM3MFx1RDU1Q1x1QjJFNC5cbiAgICovXG4gIGFzeW5jIGNsZWFyQWN0aXZlUnVsZXNCbG9jaygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBjb25maWcgPSBhd2FpdCB0aGlzLmxvYWQoKTtcbiAgICBjb25zdCBjdXJyZW50UHJvbXB0ID0gY29uZmlnLnN5c3RlbVByb21wdCA/PyBcIlwiO1xuICAgIGNvbnN0IGNsZWFuZWQgPSBjdXJyZW50UHJvbXB0LnJlcGxhY2UoQUNUSVZFX1JVTEVTX1JFR0VYLCBcIlwiKS50cmltU3RhcnQoKTtcbiAgICBhd2FpdCB0aGlzLnNhdmUoeyBzeXN0ZW1Qcm9tcHQ6IGNsZWFuZWQgfSk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBBcHAsIE5vdGljZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgcnVuU2NyaXB0IH0gZnJvbSBcIi4vUHNFeGVjdXRvclwiO1xuaW1wb3J0IHsgVmF1bHRDbG9uZU1vZGFsIH0gZnJvbSBcIi4uL3VpL1ZhdWx0Q2xvbmVNb2RhbFwiO1xuaW1wb3J0IHsgQUhNU2V0dGluZ3MgfSBmcm9tIFwiLi4vc2V0dGluZ3NcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuLi91dGlscy9Mb2dnZXJcIjtcblxuLyoqXG4gKiBNZXRhIEJpbmQgXHVCQzg0XHVEMkJDIFx1Q0VFNFx1QjlFOFx1QjREQ1x1Qjk3QyBcdUM3MDRcdUQ1NUMgT2JzaWRpYW4gXHVDRUU0XHVCOUU4XHVCNERDIFx1QjRGMVx1Qjg1RFxuICpcbiAqIGNyZWF0ZS12YXVsdCAvIGNsb25lLXZhdWx0OlxuICogICBcdTIxOTIgVmF1bHRDbG9uZU1vZGFsXHVDNUQwXHVDMTFDIFBBUkVOVF9QQVRIICsgVkFVTFRfTkFNRSBcdUJBM0NcdUM4MDAgXHVDNzg1XHVCODI1XHVCQzFCXHVDNzQwIFx1QjRBNCBcdUMyRTRcdUQ1ODlcbiAqXG4gKiBzeW5jLXdvcmtzcGFjZTpcbiAqICAgXHUyMTkyIFx1Qzc4NVx1QjgyNSBcdUM1QzZcdUM3NzQgTWFrZUNsb25lVmF1bHQuYmF0IFx1QkMxNFx1Qjg1QyBcdUMyRTRcdUQ1ODlcbiAqXG4gKiBcdUIxNzhcdUQyQjggXHVCMEI0IFx1QkM4NFx1RDJCQyBcdUM2MDhcdUMyREM6XG4gKiBgYGBtZXRhLWJpbmQtYnV0dG9uXG4gKiBsYWJlbDogQ2xvbmUgVmF1bHRcbiAqIGljb246IGNvcHlcbiAqIHN0eWxlOiBwcmltYXJ5XG4gKiBhY3Rpb25zOlxuICogICAtIHR5cGU6IGNvbW1hbmRcbiAqICAgICBjb21tYW5kOiBhaWh1Yi1tYW5hZ2VyOmNsb25lLXZhdWx0XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIE1ldGFCaW5kQnJpZGdlIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiBBSE1TZXR0aW5ncyxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG11bHRpVmF1bHRSb290OiBzdHJpbmcsXG4gICAgcHJpdmF0ZSByZWFkb25seSBhZGRDb21tYW5kOiAoY21kOiB7XG4gICAgICBpZDogc3RyaW5nO1xuICAgICAgbmFtZTogc3RyaW5nO1xuICAgICAgY2FsbGJhY2s6ICgpID0+IHZvaWQ7XG4gICAgfSkgPT4gdm9pZFxuICApIHt9XG5cbiAgcmVnaXN0ZXIoKTogdm9pZCB7XG4gICAgLy8gc3luYy13b3Jrc3BhY2U6IFx1Qzc4NVx1QjgyNSBcdUM1QzZcdUM3NzQgXHVCQzE0XHVCODVDIFx1QzJFNFx1RDU4OVxuICAgIHRoaXMuYWRkQ29tbWFuZCh7XG4gICAgICBpZDogXCJzeW5jLXdvcmtzcGFjZVwiLFxuICAgICAgbmFtZTogXCJBSUh1YjogU3luYyBXb3Jrc3BhY2VcIixcbiAgICAgIGNhbGxiYWNrOiAoKSA9PiB0aGlzLmV4ZWNEaXJlY3QoXCJzeW5jV29ya3NwYWNlXCIsIFwiX3Rvb2xzL01ha2VDbG9uZVZhdWx0LmJhdFwiKSxcbiAgICB9KTtcblxuICAgIC8vIGNsb25lLXZhdWx0OiBcdUJDRkNcdUQyQjggXHVBQ0JEXHVCODVDXHUwMEI3XHVDNzc0XHVCOTg0IFx1Qzc4NVx1QjgyNSBcdUJBQThcdUIyRUMgXHUyMTkyIGNsb25lX3ZhdWx0LnBzMSBcdUQ2MzhcdUNEOUNcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwiY2xvbmUtdmF1bHRcIixcbiAgICAgIG5hbWU6IFwiQUlIdWI6IENsb25lIFZhdWx0XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5vcGVuQ2xvbmVNb2RhbCgpLFxuICAgIH0pO1xuXG4gICAgLy8gY3JlYXRlLXZhdWx0OiBcdUIzRDlcdUM3N0NcdUQ1NUMgXHVCQUE4XHVCMkVDIChcdUMwQzggXHVCQ0ZDXHVEMkI4IFx1QzBERFx1QzEzMSlcbiAgICB0aGlzLmFkZENvbW1hbmQoe1xuICAgICAgaWQ6IFwiY3JlYXRlLXZhdWx0XCIsXG4gICAgICBuYW1lOiBcIkFJSHViOiBDcmVhdGUgTmV3IFZhdWx0XCIsXG4gICAgICBjYWxsYmFjazogKCkgPT4gdGhpcy5vcGVuQ2xvbmVNb2RhbCgpLFxuICAgIH0pO1xuXG4gICAgbG9nZ2VyLmluZm8oXCJNZXRhQmluZEJyaWRnZTogY29tbWFuZHMgcmVnaXN0ZXJlZFwiKTtcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBjbG9uZS9jcmVhdGU6IFx1QkFBOFx1QjJFQ1x1Qjg1QyBcdUM3ODVcdUI4MjVcdUJDMUJcdUM3NDAgXHVCNEE0IFx1QzJFNFx1RDU4OSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIG9wZW5DbG9uZU1vZGFsKCk6IHZvaWQge1xuICAgIGNvbnN0IHRvb2xzRGlyID0gdGhpcy5yZXNvbHZlVG9vbHNEaXIoKTtcbiAgICBpZiAoIXRvb2xzRGlyKSB7XG4gICAgICBuZXcgTm90aWNlKFwiW0FJSHViXSBfdG9vbHMgXHVCNTE0XHVCODA5XHVEMTMwXHVCOUFDXHVCOTdDIFx1Q0MzRVx1Qzc0NCBcdUMyMTggXHVDNUM2XHVDMkI1XHVCMkM4XHVCMkU0LiBcdUJBNDBcdUQyRjBcdUJDRkNcdUQyQjggXHVCOEU4XHVEMkI4XHVCOTdDIFx1RDY1NVx1Qzc3OFx1RDU1OFx1QzEzOFx1QzY5NC5cIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gXHVBRTMwXHVCQ0Y4IFx1QzBDMVx1QzcwNCBcdUFDQkRcdUI4NUM6IFx1QkNGQ1x1RDJCOCBcdUM2MDYgVmF1bHRzLyBcdUQzRjRcdUIzNTRcbiAgICBjb25zdCBkZWZhdWx0UGFyZW50ID0gcGF0aC5kaXJuYW1lKHRoaXMudmF1bHRCYXNlUGF0aCk7XG5cbiAgICBuZXcgVmF1bHRDbG9uZU1vZGFsKHRoaXMuYXBwLCB0b29sc0RpciwgZGVmYXVsdFBhcmVudCkub3BlbigpO1xuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIHN5bmMtd29ya3NwYWNlOiBcdUM3ODVcdUI4MjUgXHVDNUM2XHVDNzc0IFx1QzlDMVx1QzgxMSBcdUMyRTRcdUQ1ODkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSBhc3luYyBleGVjRGlyZWN0KFxuICAgIG92ZXJyaWRlS2V5OiBrZXlvZiBBSE1TZXR0aW5nc1tcInBzU2NyaXB0T3ZlcnJpZGVzXCJdLFxuICAgIGRlZmF1bHRSZWxhdGl2ZVBhdGg6IHN0cmluZ1xuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBvdmVycmlkZSA9IHRoaXMuc2V0dGluZ3MucHNTY3JpcHRPdmVycmlkZXNbb3ZlcnJpZGVLZXldO1xuICAgIGNvbnN0IHNjcmlwdFBhdGggPSBvdmVycmlkZSB8fCB0aGlzLnJlc29sdmVTY3JpcHQoZGVmYXVsdFJlbGF0aXZlUGF0aCk7XG5cbiAgICBpZiAoIXNjcmlwdFBhdGgpIHtcbiAgICAgIG5ldyBOb3RpY2UoYFtBSUh1Yl0gXHVDMkE0XHVEMDZDXHVCOUJEXHVEMkI4XHVCOTdDIFx1Q0MzRVx1Qzc0NCBcdUMyMTggXHVDNUM2XHVDMkI1XHVCMkM4XHVCMkU0OiAke2RlZmF1bHRSZWxhdGl2ZVBhdGh9YCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbmV3IE5vdGljZShgW0FJSHViXSBcdUMyRTRcdUQ1ODkgXHVDOTExOiAke3BhdGguYmFzZW5hbWUoc2NyaXB0UGF0aCl9Li4uYCk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcnVuU2NyaXB0KHNjcmlwdFBhdGgsIFtdLCB0aGlzLm11bHRpVmF1bHRSb290KTtcblxuICAgIGlmIChyZXN1bHQuZXhpdENvZGUgPT09IDApIHtcbiAgICAgIG5ldyBOb3RpY2UoYFtBSUh1Yl0gXHVDNjQ0XHVCOENDOiAke3BhdGguYmFzZW5hbWUoc2NyaXB0UGF0aCl9YCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ldyBOb3RpY2UoYFtBSUh1Yl0gXHVDNjI0XHVCOTU4IChleGl0ICR7cmVzdWx0LmV4aXRDb2RlfSk6ICR7cmVzdWx0LnN0ZGVyci5zbGljZSgwLCAxMDApfWApO1xuICAgICAgbG9nZ2VyLmVycm9yKFwiU2NyaXB0IGZhaWxlZDpcIiwgcmVzdWx0LnN0ZGVycik7XG4gICAgfVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFx1QUNCRFx1Qjg1QyBcdUQwRDBcdUMwQzkgXHVENUVDXHVEMzdDIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIC8qKiBcdUQ2MDRcdUM3QUMgXHVCQ0ZDXHVEMkI4XHVDNzU4IFx1QzgwOFx1QjMwMCBcdUFDQkRcdUI4NUMgKEZpbGVTeXN0ZW1BZGFwdGVyLmJhc2VQYXRoKSAqL1xuICBwcml2YXRlIGdldCB2YXVsdEJhc2VQYXRoKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuICh0aGlzLmFwcC52YXVsdC5hZGFwdGVyIGFzIHVua25vd24gYXMgeyBiYXNlUGF0aDogc3RyaW5nIH0pLmJhc2VQYXRoO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlVG9vbHNEaXIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgY29uc3QgY2FuZGlkYXRlcyA9IFtcbiAgICAgIHBhdGguam9pbih0aGlzLnZhdWx0QmFzZVBhdGgsIFwiX3Rvb2xzXCIpLFxuICAgICAgcGF0aC5qb2luKHRoaXMubXVsdGlWYXVsdFJvb3QsIFwiX3Rvb2xzXCIpLFxuICAgIF07XG4gICAgcmV0dXJuIGNhbmRpZGF0ZXMuZmluZCgoYykgPT4gZXhpc3RzU3luYyhjKSkgPz8gbnVsbDtcbiAgfVxuXG4gIHByaXZhdGUgcmVzb2x2ZVNjcmlwdChyZWxhdGl2ZVBhdGg6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBbXG4gICAgICBwYXRoLmpvaW4odGhpcy52YXVsdEJhc2VQYXRoLCByZWxhdGl2ZVBhdGgpLFxuICAgICAgcGF0aC5qb2luKHRoaXMudmF1bHRCYXNlUGF0aCwgXCJfdG9vbHNcIiwgcGF0aC5iYXNlbmFtZShyZWxhdGl2ZVBhdGgpKSxcbiAgICAgIHBhdGguam9pbih0aGlzLm11bHRpVmF1bHRSb290LCByZWxhdGl2ZVBhdGgpLFxuICAgIF07XG4gICAgcmV0dXJuIGNhbmRpZGF0ZXMuZmluZCgoYykgPT4gZXhpc3RzU3luYyhjKSkgPz8gbnVsbDtcbiAgfVxufVxuIiwgImltcG9ydCB7IHNwYXduIH0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IE5vdGljZSB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4uL3V0aWxzL0xvZ2dlclwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBzUmVzdWx0IHtcbiAgc3Rkb3V0OiBzdHJpbmc7XG4gIHN0ZGVycjogc3RyaW5nO1xuICBleGl0Q29kZTogbnVtYmVyO1xufVxuXG5jb25zdCBUSU1FT1VUX01TID0gMzBfMDAwO1xuXG4vKipcbiAqIFx1QzJBNFx1RDA2Q1x1QjlCRFx1RDJCOCBcdUQzMENcdUM3N0MgXHVDMkU0XHVENTg5IFx1Qjc5OFx1RDM3Q1xuICpcbiAqIC0gLmJhdCAgXHUyMTkyIGNtZC5leGUgL2MgXHVCODVDIFx1QzJFNFx1RDU4OVxuICogLSAucHMxICBcdTIxOTIgcG93ZXJzaGVsbC5leGUgLUV4ZWN1dGlvblBvbGljeSBCeXBhc3MgXHVCODVDIFx1QzJFNFx1RDU4OVxuICogLSBXaW5kb3dzIFx1QzgwNFx1QzZBOSAoXHVCRTQ0LVdpbmRvd3M6IE5vdGljZSBcdUQ0NUNcdUMyREMgXHVENkM0IFx1QzJFNFx1RDMyOCBcdUJDMThcdUQ2NTgpXG4gKiAtIHNwYXduKCkgXHVDMEFDXHVDNkE5IFx1MjAxNCBleGVjKClcdUM3NTggOEtCIFx1QkM4NFx1RDM3QyBcdUQ1NUNcdUFDQzQgXHVCQzBGIFNoZWxsIFx1Qzc3OFx1QzgxRFx1QzE1OCBcdUJDMjlcdUM5QzBcbiAqIC0gXHVENTVDXHVBRTAwIFx1Q0Q5Q1x1QjgyNSBcdUJDRjRcdUQ2Mzg6IGNoY3AgNjUwMDEgKC5iYXQpIC8gLU91dHB1dEVuY29kaW5nIFVURjggKC5wczEpXG4gKiAtIDMwXHVDRDA4IFx1RDBDMFx1Qzc4NFx1QzU0NFx1QzZDM1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2NyaXB0KFxuICBzY3JpcHRQYXRoOiBzdHJpbmcsXG4gIGFyZ3M6IHN0cmluZ1tdID0gW10sXG4gIGN3ZD86IHN0cmluZyxcbiAgc3RkaW5MaW5lcz86IHN0cmluZ1tdICAgLy8gLmJhdFx1Qzc1OCBzZXQgL3AgXHVDNUQwIFx1QzIxQ1x1QzExQ1x1QjMwMFx1Qjg1QyBcdUM4RkNcdUM3ODVcdUQ1NjAgXHVDNzg1XHVCODI1XHVBQzEyXG4pOiBQcm9taXNlPFBzUmVzdWx0PiB7XG4gIGlmIChwcm9jZXNzLnBsYXRmb3JtICE9PSBcIndpbjMyXCIpIHtcbiAgICBuZXcgTm90aWNlKFwiW0FJSHViXSBcdUMyQTRcdUQwNkNcdUI5QkRcdUQyQjggXHVDMkU0XHVENTg5XHVDNzQwIFdpbmRvd3NcdUM1RDBcdUMxMUNcdUI5Q0MgXHVBQzAwXHVCMkE1XHVENTY5XHVCMkM4XHVCMkU0LlwiKTtcbiAgICByZXR1cm4geyBzdGRvdXQ6IFwiXCIsIHN0ZGVycjogXCJOb3QgV2luZG93c1wiLCBleGl0Q29kZTogMSB9O1xuICB9XG5cbiAgY29uc3QgZXh0ID0gc2NyaXB0UGF0aC5zcGxpdChcIi5cIikucG9wKCk/LnRvTG93ZXJDYXNlKCk7XG5cbiAgaWYgKGV4dCA9PT0gXCJiYXRcIiB8fCBleHQgPT09IFwiY21kXCIpIHtcbiAgICByZXR1cm4gcnVuQmF0Y2goc2NyaXB0UGF0aCwgYXJncywgY3dkLCBzdGRpbkxpbmVzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcnVuUG93ZXJTaGVsbChzY3JpcHRQYXRoLCBhcmdzLCBjd2QpO1xuICB9XG59XG5cbi8vIFx1MjUwMFx1MjUwMFx1MjUwMCAuYmF0IC8gLmNtZCBcdUMyRTRcdUQ1ODkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbi8qKlxuICogc3RkaW5MaW5lczogYmF0IFx1RDMwQ1x1Qzc3Q1x1Qzc1OCBzZXQgL3AgXHVENTA0XHVCODZDXHVENTA0XHVEMkI4XHVDNUQwIFx1QzIxQ1x1QzExQ1x1QjMwMFx1Qjg1QyBcdUM3ODVcdUI4MjVcdUQ1NjAgXHVBQzEyIFx1QkFBOVx1Qjg1RC5cbiAqIFx1QzYwOCkgW1wiQzpcXFxcVmF1bHRzXCIsIFwiTXlOZXdWYXVsdFwiXSBcdTIxOTIgXHVDQ0FCIFx1QkM4OFx1QzlGOCBzZXQgL3BcdUM1RDAgQzpcXFZhdWx0cywgXHVCNDUwIFx1QkM4OFx1QzlGOFx1QzVEMCBNeU5ld1ZhdWx0IFx1QzgwNFx1QjJFQy5cbiAqL1xuYXN5bmMgZnVuY3Rpb24gcnVuQmF0Y2goXG4gIHNjcmlwdFBhdGg6IHN0cmluZyxcbiAgYXJnczogc3RyaW5nW10sXG4gIGN3ZD86IHN0cmluZyxcbiAgc3RkaW5MaW5lcz86IHN0cmluZ1tdXG4pOiBQcm9taXNlPFBzUmVzdWx0PiB7XG4gIGNvbnN0IGNtZEFyZ3MgPSBbXCIvY1wiLCBgXCIke3NjcmlwdFBhdGh9XCIgJHthcmdzLm1hcCgoYSkgPT4gYFwiJHthLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKX1cImApLmpvaW4oXCIgXCIpfWBdO1xuICByZXR1cm4gc3Bhd25Qcm9jZXNzKFwiY21kLmV4ZVwiLCBjbWRBcmdzLCBjd2QgPz8gc2NyaXB0UGF0aC5zbGljZSgwLCBzY3JpcHRQYXRoLmxhc3RJbmRleE9mKFwiXFxcXFwiKSksIHN0ZGluTGluZXMpO1xufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgLnBzMSBcdUMyRTRcdUQ1ODkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmFzeW5jIGZ1bmN0aW9uIHJ1blBvd2VyU2hlbGwoXG4gIHNjcmlwdFBhdGg6IHN0cmluZyxcbiAgYXJnczogc3RyaW5nW10sXG4gIGN3ZD86IHN0cmluZ1xuKTogUHJvbWlzZTxQc1Jlc3VsdD4ge1xuICBjb25zdCBwc0V4ZWN1dGFibGUgPSBhd2FpdCBmaW5kUG93ZXJTaGVsbCgpO1xuICBpZiAoIXBzRXhlY3V0YWJsZSkge1xuICAgIG5ldyBOb3RpY2UoXCJbQUlIdWJdIFBvd2VyU2hlbGwgXHVDMkU0XHVENTg5IFx1RDMwQ1x1Qzc3Q1x1Qzc0NCBcdUNDM0VcdUM3NDQgXHVDMjE4IFx1QzVDNlx1QzJCNVx1QjJDOFx1QjJFNC5cIik7XG4gICAgcmV0dXJuIHsgc3Rkb3V0OiBcIlwiLCBzdGRlcnI6IFwiUG93ZXJTaGVsbCBub3QgZm91bmRcIiwgZXhpdENvZGU6IDEgfTtcbiAgfVxuXG4gIGNvbnN0IGVuY29kaW5nUHJlZml4ID1cbiAgICBcIltDb25zb2xlXTo6T3V0cHV0RW5jb2RpbmcgPSBbU3lzdGVtLlRleHQuRW5jb2RpbmddOjpVVEY4OyBcIiArXG4gICAgXCIkT3V0cHV0RW5jb2RpbmcgPSBbU3lzdGVtLlRleHQuRW5jb2RpbmddOjpVVEY4OyBcIjtcblxuICBjb25zdCBwc0FyZ3MgPSBbXG4gICAgXCItRXhlY3V0aW9uUG9saWN5XCIsXG4gICAgXCJCeXBhc3NcIixcbiAgICBcIi1Ob1Byb2ZpbGVcIixcbiAgICBcIi1Db21tYW5kXCIsXG4gICAgYCR7ZW5jb2RpbmdQcmVmaXh9JiAnJHtzY3JpcHRQYXRoLnJlcGxhY2UoLycvZywgXCInJ1wiKX0nICR7YXJnc1xuICAgICAgLm1hcCgoYSkgPT4gYS5zdGFydHNXaXRoKFwiLVwiKSA/IGEgOiBgJyR7YS5yZXBsYWNlKC8nL2csIFwiJydcIil9J2ApXG4gICAgICAuam9pbihcIiBcIil9YCxcbiAgXTtcblxuICByZXR1cm4gc3Bhd25Qcm9jZXNzKHBzRXhlY3V0YWJsZSwgcHNBcmdzLCBjd2QpO1xufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgXHVBQ0Y1XHVEMUI1IHNwYXduIFx1Qjc5OFx1RDM3QyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuZnVuY3Rpb24gc3Bhd25Qcm9jZXNzKFxuICBleGVjdXRhYmxlOiBzdHJpbmcsXG4gIGFyZ3M6IHN0cmluZ1tdLFxuICBjd2Q/OiBzdHJpbmcsXG4gIHN0ZGluTGluZXM/OiBzdHJpbmdbXSAgIC8vIGJhdCBzZXQgL3AgXHVENTA0XHVCODZDXHVENTA0XHVEMkI4XHVDNUQwIFx1QzkwNCBcdUIyRThcdUM3MDRcdUI4NUMgXHVDOEZDXHVDNzg1XG4pOiBQcm9taXNlPFBzUmVzdWx0PiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XG4gICAgY29uc3QgdGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGNvbnRyb2xsZXIuYWJvcnQoKTtcbiAgICAgIG5ldyBOb3RpY2UoXCJbQUlIdWJdIFx1QzJBNFx1RDA2Q1x1QjlCRFx1RDJCOCBcdUQwQzBcdUM3ODRcdUM1NDRcdUM2QzMgKDMwXHVDRDA4KVwiKTtcbiAgICB9LCBUSU1FT1VUX01TKTtcblxuICAgIGNvbnN0IGNoaWxkID0gc3Bhd24oZXhlY3V0YWJsZSwgYXJncywge1xuICAgICAgY3dkOiBjd2QgPz8gcHJvY2Vzcy5jd2QoKSxcbiAgICAgIHdpbmRvd3NIaWRlOiB0cnVlLFxuICAgICAgLy8gc3RkaW5cdUM3NDQgcGlwZVx1Qjg1QyBcdUM1RjRcdUM1QjRcdUM1N0Mgc3RkaW5MaW5lcyBcdUM4RkNcdUM3ODUgXHVBQzAwXHVCMkE1XG4gICAgICBzdGRpbzogc3RkaW5MaW5lcz8ubGVuZ3RoID8gW1wicGlwZVwiLCBcInBpcGVcIiwgXCJwaXBlXCJdIDogW1wiaWdub3JlXCIsIFwicGlwZVwiLCBcInBpcGVcIl0sXG4gICAgfSk7XG5cbiAgICAvLyBzZXQgL3AgXHVDMjFDXHVDMTFDXHVCMzAwXHVCODVDIHN0ZGluXHVDNUQwIFx1QUMxMiBcdUM4RkNcdUM3ODVcbiAgICBpZiAoc3RkaW5MaW5lcz8ubGVuZ3RoICYmIGNoaWxkLnN0ZGluKSB7XG4gICAgICBjaGlsZC5zdGRpbi53cml0ZShzdGRpbkxpbmVzLmpvaW4oXCJcXHJcXG5cIikgKyBcIlxcclxcblwiKTtcbiAgICAgIGNoaWxkLnN0ZGluLmVuZCgpO1xuICAgIH1cblxuICAgIGNvbnN0IHN0ZG91dENodW5rczogQnVmZmVyW10gPSBbXTtcbiAgICBjb25zdCBzdGRlcnJDaHVua3M6IEJ1ZmZlcltdID0gW107XG5cbiAgICBjaGlsZC5zdGRvdXQ/Lm9uKFwiZGF0YVwiLCAoY2h1bms6IEJ1ZmZlcikgPT4gc3Rkb3V0Q2h1bmtzLnB1c2goY2h1bmspKTtcbiAgICBjaGlsZC5zdGRlcnI/Lm9uKFwiZGF0YVwiLCAoY2h1bms6IEJ1ZmZlcikgPT4gc3RkZXJyQ2h1bmtzLnB1c2goY2h1bmspKTtcblxuICAgIGNoaWxkLm9uKFwiY2xvc2VcIiwgKGNvZGUpID0+IHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICBjb25zdCBzdGRvdXQgPSBuZXcgVGV4dERlY29kZXIoXCJ1dGYtOFwiKS5kZWNvZGUoQnVmZmVyLmNvbmNhdChzdGRvdXRDaHVua3MpKTtcbiAgICAgIGNvbnN0IHN0ZGVyciA9IG5ldyBUZXh0RGVjb2RlcihcInV0Zi04XCIpLmRlY29kZShCdWZmZXIuY29uY2F0KHN0ZGVyckNodW5rcykpO1xuICAgICAgY29uc3QgZXhpdENvZGUgPSBjb2RlID8/IDE7XG4gICAgICBsb2dnZXIuaW5mbyhgU2NyaXB0IGV4aXQ9JHtleGl0Q29kZX1gLCBleGVjdXRhYmxlKTtcbiAgICAgIGlmIChleGl0Q29kZSAhPT0gMCkgbG9nZ2VyLndhcm4oXCJzdGRlcnI6XCIsIHN0ZGVycik7XG4gICAgICByZXNvbHZlKHsgc3Rkb3V0LCBzdGRlcnIsIGV4aXRDb2RlIH0pO1xuICAgIH0pO1xuXG4gICAgY2hpbGQub24oXCJlcnJvclwiLCAoZXJyKSA9PiB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgbG9nZ2VyLmVycm9yKFwic3Bhd24gZXJyb3I6XCIsIGVycik7XG4gICAgICByZXNvbHZlKHsgc3Rkb3V0OiBcIlwiLCBzdGRlcnI6IGVyci5tZXNzYWdlLCBleGl0Q29kZTogMSB9KTtcbiAgICB9KTtcblxuICAgIGNvbnRyb2xsZXIuc2lnbmFsLmFkZEV2ZW50TGlzdGVuZXIoXCJhYm9ydFwiLCAoKSA9PiBjaGlsZC5raWxsKCkpO1xuICB9KTtcbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFBvd2VyU2hlbGwgXHVDMkU0XHVENTg5IFx1RDMwQ1x1Qzc3QyBcdUQwRDBcdUMwQzkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbmFzeW5jIGZ1bmN0aW9uIGZpbmRQb3dlclNoZWxsKCk6IFByb21pc2U8c3RyaW5nIHwgbnVsbD4ge1xuICBjb25zdCBjYW5kaWRhdGVzID0gW1xuICAgIFwicG93ZXJzaGVsbC5leGVcIixcbiAgICBcIkM6XFxcXFdpbmRvd3NcXFxcU3lzdGVtMzJcXFxcV2luZG93c1Bvd2VyU2hlbGxcXFxcdjEuMFxcXFxwb3dlcnNoZWxsLmV4ZVwiLFxuICAgIFwicHdzaC5leGVcIixcbiAgICBcIkM6XFxcXFByb2dyYW0gRmlsZXNcXFxcUG93ZXJTaGVsbFxcXFw3XFxcXHB3c2guZXhlXCIsXG4gIF07XG4gIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICBpZiAoYXdhaXQgY2FuRXhlYyhjYW5kaWRhdGUpKSByZXR1cm4gY2FuZGlkYXRlO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBjYW5FeGVjKGV4ZWN1dGFibGU6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCBjaGlsZCA9IHNwYXduKGV4ZWN1dGFibGUsIFtcIi1Db21tYW5kXCIsIFwiZXhpdCAwXCJdLCB7IHdpbmRvd3NIaWRlOiB0cnVlIH0pO1xuICAgIGNoaWxkLm9uKFwiY2xvc2VcIiwgKGNvZGUpID0+IHJlc29sdmUoY29kZSA9PT0gMCkpO1xuICAgIGNoaWxkLm9uKFwiZXJyb3JcIiwgKCkgPT4gcmVzb2x2ZShmYWxzZSkpO1xuICB9KTtcbn1cblxuLyoqIFx1RDU1OFx1QzcwNCBcdUQ2MzhcdUQ2NTg6IFx1QUUzMFx1Qzg3NCBydW5Qb3dlclNoZWxsIFx1Qzc3NFx1Qjk4NFx1QzczQ1x1Qjg1Q1x1QjNDNCBcdUQ2MzhcdUNEOUMgXHVBQzAwXHVCMkE1ICovXG5leHBvcnQgeyBydW5Qb3dlclNoZWxsIH07XG4iLCAiY29uc3QgUFJFRklYID0gXCJbQUlIdWIgTWFuYWdlcl1cIjtcblxuZXhwb3J0IGNvbnN0IGxvZ2dlciA9IHtcbiAgaW5mbzogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gY29uc29sZS5sb2coUFJFRklYLCAuLi5hcmdzKSxcbiAgd2FybjogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gY29uc29sZS53YXJuKFBSRUZJWCwgLi4uYXJncyksXG4gIGVycm9yOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiBjb25zb2xlLmVycm9yKFBSRUZJWCwgLi4uYXJncyksXG4gIGRlYnVnOiAoLi4uYXJnczogdW5rbm93bltdKSA9PiBjb25zb2xlLmRlYnVnKFBSRUZJWCwgLi4uYXJncyksXG59O1xuIiwgImltcG9ydCB7IEFwcCwgTW9kYWwsIFNldHRpbmcsIE5vdGljZSwgQnV0dG9uQ29tcG9uZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBydW5TY3JpcHQgfSBmcm9tIFwiLi4vbW9kdWxlcy9Qc0V4ZWN1dG9yXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vdXRpbHMvTG9nZ2VyXCI7XG5cbi8qKlxuICogXHVDMEM4IFx1QkNGQ1x1RDJCOCBcdUMwRERcdUMxMzEgXHVDODA0IFx1Qzc4NVx1QjgyNVx1QUMxMlx1Qzc0NCBcdUJCRjhcdUI5QUMgXHVCQzFCXHVCMjk0IFx1QkFBOFx1QjJFQ1xuICpcbiAqIE1ha2VDbG9uZVZhdWx0LmJhdFx1Qzc3NCBzZXQgL3AgXHVCODVDIFx1QkMxQlx1QjI5NCBcdUI0NTAgXHVBQzEyXHVDNzQ0IFVJXHVDNUQwXHVDMTFDIFx1QzEyMFx1QzIxOCBcdUM3ODVcdUI4MjU6XG4gKiAgLSBQQVJFTlRfUEFUSCA6IFx1QzBDMVx1QzcwNCBcdUQzRjRcdUIzNTQgXHVBQ0JEXHVCODVDIChcdUM2MDg6IEM6XFxPYnNpZGlhblxcVmF1bHRzKVxuICogIC0gVkFVTFRfTkFNRSAgOiBcdUMwQzggXHVCQ0ZDXHVEMkI4IFx1Qzc3NFx1Qjk4NCAgKFx1QzYwODogTXlOZXdWYXVsdClcbiAqXG4gKiBcdUMyMThcdUM5RDEgXHVENkM0IGNsb25lX3ZhdWx0LnBzMSAtVGFyZ2V0UGF0aCAtUHJvamVjdE5hbWUgXHVCODVDIFx1QzlDMVx1QzgxMSBcdUQ2MzhcdUNEOUMuXG4gKi9cbmV4cG9ydCBjbGFzcyBWYXVsdENsb25lTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIHByaXZhdGUgcGFyZW50UGF0aCA9IFwiXCI7XG4gIHByaXZhdGUgdmF1bHROYW1lID0gXCJcIjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHRvb2xzRGlyOiBzdHJpbmcsICAvLyBfdG9vbHMvIFx1QjUxNFx1QjgwOVx1RDEzMFx1QjlBQyBcdUM4MDhcdUIzMDAgXHVBQ0JEXHVCODVDXG4gICAgcHJpdmF0ZSByZWFkb25seSBkZWZhdWx0UGFyZW50OiBzdHJpbmcgPSBcIlwiXG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gICAgdGhpcy5wYXJlbnRQYXRoID0gZGVmYXVsdFBhcmVudDtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiXHVDMEM4IFx1QkNGQ1x1RDJCOCBcdUMwRERcdUMxMzFcIiB9KTtcblxuICAgIC8vIFBBUkVOVF9QQVRIXG4gICAgbmV3IFNldHRpbmcoY29udGVudEVsKVxuICAgICAgLnNldE5hbWUoXCJcdUMwQzFcdUM3MDQgXHVEM0Y0XHVCMzU0IFx1QUNCRFx1Qjg1Q1wiKVxuICAgICAgLnNldERlc2MoXCJcdUMwQzggXHVCQ0ZDXHVEMkI4XHVBQzAwIFx1QzBERFx1QzEzMVx1QjQyMCBcdUMwQzFcdUM3MDQgXHVCNTE0XHVCODA5XHVEMTMwXHVCOUFDIChcdUM2MDg6IEM6XFxcXE9ic2lkaWFuXFxcXFZhdWx0cylcIilcbiAgICAgIC5hZGRUZXh0KCh0ZXh0KSA9PiB7XG4gICAgICAgIHRleHRcbiAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoXCJDOlxcXFxPYnNpZGlhblxcXFxWYXVsdHNcIilcbiAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wYXJlbnRQYXRoKVxuICAgICAgICAgIC5vbkNoYW5nZSgodikgPT4geyB0aGlzLnBhcmVudFBhdGggPSB2LnRyaW0oKTsgfSk7XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRDbGFzcyhcImFobS1pbnB1dFwiKTtcbiAgICAgIH0pO1xuXG4gICAgLy8gVkFVTFRfTkFNRVxuICAgIG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcbiAgICAgIC5zZXROYW1lKFwiXHVDMEM4IFx1QkNGQ1x1RDJCOCBcdUM3NzRcdUI5ODRcIilcbiAgICAgIC5zZXREZXNjKFwiXHVEM0Y0XHVCMzU0XHVCQTg1XHVDNzNDXHVCODVDIFx1QzBBQ1x1QzZBOVx1QjQyOVx1QjJDOFx1QjJFNCAoXHVDNjA4OiBNeURvbWFpblZhdWx0KVwiKVxuICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgdGV4dFxuICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcihcIk15RG9tYWluVmF1bHRcIilcbiAgICAgICAgICAub25DaGFuZ2UoKHYpID0+IHsgdGhpcy52YXVsdE5hbWUgPSB2LnRyaW0oKTsgfSk7XG4gICAgICAgIC8vIFx1QzVENFx1RDEzMFx1Qjg1QyBcdUJDMTRcdUI4NUMgXHVDMkU0XHVENTg5XG4gICAgICAgIHRleHQuaW5wdXRFbC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCAoZSkgPT4ge1xuICAgICAgICAgIGlmIChlLmtleSA9PT0gXCJFbnRlclwiKSB0aGlzLnN1Ym1pdCgpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgLy8gXHVCQkY4XHVCOUFDXHVCQ0Y0XHVBRTMwXG4gICAgY29uc3QgcHJldmlld0VsID0gY29udGVudEVsLmNyZWF0ZUVsKFwicFwiLCB7IGNsczogXCJhaG0tY2xvbmUtcHJldmlld1wiIH0pO1xuICAgIGNvbnN0IHVwZGF0ZVByZXZpZXcgPSAoKSA9PiB7XG4gICAgICBjb25zdCB0YXJnZXQgPSB0aGlzLnBhcmVudFBhdGggJiYgdGhpcy52YXVsdE5hbWVcbiAgICAgICAgPyBgXHUyMTkyICR7dGhpcy5wYXJlbnRQYXRofVxcXFwke3RoaXMudmF1bHROYW1lfWBcbiAgICAgICAgOiBcIihcdUMwQzFcdUM3MDQgXHVEM0Y0XHVCMzU0XHVDNjQwIFx1Qzc3NFx1Qjk4NFx1Qzc0NCBcdUM3ODVcdUI4MjVcdUQ1NThcdUJBNzQgXHVBQ0JEXHVCODVDXHVBQzAwIFx1RDQ1Q1x1QzJEQ1x1QjQyOVx1QjJDOFx1QjJFNClcIjtcbiAgICAgIHByZXZpZXdFbC5zZXRUZXh0KHRhcmdldCk7XG4gICAgfTtcblxuICAgIC8vIFx1Qzc4NVx1QjgyNSBcdUFDMTIgXHVCQ0MwXHVBQ0JEIFx1QzJEQyBcdUJCRjhcdUI5QUNcdUJDRjRcdUFFMzAgXHVBQzMxXHVDMkUwIChcdUM3NzRcdUJDQTRcdUQyQjggXHVDNzA0XHVDNzg0KVxuICAgIGNvbnRlbnRFbC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgdXBkYXRlUHJldmlldyk7XG4gICAgdXBkYXRlUHJldmlldygpO1xuXG4gICAgLy8gXHVCQzg0XHVEMkJDIFx1RDU4OVxuICAgIGNvbnN0IGJ0blJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwiYWhtLWJ0bi1yb3dcIiB9KTtcblxuICAgIG5ldyBCdXR0b25Db21wb25lbnQoYnRuUm93KS5zZXRCdXR0b25UZXh0KFwiXHVDREU4XHVDMThDXCIpLm9uQ2xpY2soKCkgPT4gdGhpcy5jbG9zZSgpKTtcblxuICAgIG5ldyBCdXR0b25Db21wb25lbnQoYnRuUm93KVxuICAgICAgLnNldEJ1dHRvblRleHQoXCJcdUJDRkNcdUQyQjggXHVDMEREXHVDMTMxXCIpXG4gICAgICAuc2V0Q3RhKClcbiAgICAgIC5vbkNsaWNrKCgpID0+IHRoaXMuc3VibWl0KCkpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBzdWJtaXQoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCF0aGlzLnBhcmVudFBhdGgpIHtcbiAgICAgIG5ldyBOb3RpY2UoXCJbQUlIdWJdIFx1QzBDMVx1QzcwNCBcdUQzRjRcdUIzNTQgXHVBQ0JEXHVCODVDXHVCOTdDIFx1Qzc4NVx1QjgyNVx1RDU3NCBcdUM4RkNcdUMxMzhcdUM2OTQuXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXRoaXMudmF1bHROYW1lKSB7XG4gICAgICBuZXcgTm90aWNlKFwiW0FJSHViXSBcdUJDRkNcdUQyQjggXHVDNzc0XHVCOTg0XHVDNzQ0IFx1Qzc4NVx1QjgyNVx1RDU3NCBcdUM4RkNcdUMxMzhcdUM2OTQuXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRoaXMuY2xvc2UoKTtcblxuICAgIC8vIE1ha2VDbG9uZVZhdWx0LmJhdFx1Qzc1OCBcdUMyRTRcdUM4MUMgXHVDNzkxXHVDNUM1XHVDNzQwIGNsb25lX3ZhdWx0LnBzMVx1Qzc3NCBcdUMyMThcdUQ1ODlcdUQ1NUNcdUIyRTQuXG4gICAgLy8gYmF0XHVDNzU4IHNldCAvcFx1QjI5NCBXaW5kb3dzXHVDNUQwXHVDMTFDIFx1RDMwQ1x1Qzc3NFx1RDUwNCBzdGRpblx1Qzc0NCBcdUJCMzRcdUMyREMoQ09OSU4kIFx1Qzc3RFx1QUUzMClcdUQ1NThcdUJCQzBcdUI4NUNcbiAgICAvLyBcdUJBQThcdUIyRUNcdUM1RDBcdUMxMUMgXHVCQzFCXHVDNzQwIFx1QUMxMlx1Qzc0NCBQUzFcdUM1RDAgXHVDOUMxXHVDODExIFx1QzgwNFx1QjJFQ1x1RDU1Q1x1QjJFNC5cbiAgICBjb25zdCB0YXJnZXRQYXRoID0gYCR7dGhpcy5wYXJlbnRQYXRofVxcXFwke3RoaXMudmF1bHROYW1lfWA7XG4gICAgY29uc3QgcHMxU2NyaXB0ID0gcGF0aC5qb2luKHRoaXMudG9vbHNEaXIsIFwiY2xvbmVfdmF1bHQucHMxXCIpO1xuXG4gICAgbmV3IE5vdGljZShgW0FJSHViXSBcdUJDRkNcdUQyQjggXHVDMEREXHVDMTMxIFx1QzkxMTogJHt0aGlzLnZhdWx0TmFtZX0uLi5gKTtcbiAgICBsb2dnZXIuaW5mbyhcIlZhdWx0Q2xvbmU6XCIsIHBzMVNjcmlwdCwgXCItPlwiLCB0YXJnZXRQYXRoKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJ1blNjcmlwdChcbiAgICAgIHBzMVNjcmlwdCxcbiAgICAgIFtcIi1UYXJnZXRQYXRoXCIsIHRhcmdldFBhdGgsIFwiLVByb2plY3ROYW1lXCIsIHRoaXMudmF1bHROYW1lXSxcbiAgICAgIHRoaXMudG9vbHNEaXJcbiAgICApO1xuXG4gICAgaWYgKHJlc3VsdC5leGl0Q29kZSA9PT0gMCkge1xuICAgICAgbmV3IE5vdGljZShgW0FJSHViXSBcdTI3MDUgXHVCQ0ZDXHVEMkI4IFx1QzBERFx1QzEzMSBcdUM2NDRcdUI4Q0M6ICR7dGFyZ2V0UGF0aH1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmV3IE5vdGljZShgW0FJSHViXSBcdTI3NEMgXHVDNjI0XHVCOTU4IChleGl0ICR7cmVzdWx0LmV4aXRDb2RlfSk6ICR7cmVzdWx0LnN0ZGVyci5zbGljZSgwLCAxMjApfWApO1xuICAgICAgbG9nZ2VyLmVycm9yKFwiVmF1bHRDbG9uZSBmYWlsZWQ6XCIsIHJlc3VsdC5zdGRlcnIpO1xuICAgIH1cbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IEFwcCwgUGx1Z2luU2V0dGluZ1RhYiwgU2V0dGluZyB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHR5cGUgQWlodWJNYW5hZ2VyUGx1Z2luIGZyb20gXCIuLi9tYWluXCI7XG5pbXBvcnQgeyBSdWxlc1BhbmVsIH0gZnJvbSBcIi4vUnVsZXNQYW5lbFwiO1xuaW1wb3J0IHsgQ2xhdWRpYW5QYW5lbCB9IGZyb20gXCIuL0NsYXVkaWFuUGFuZWxcIjtcblxuZXhwb3J0IGNsYXNzIEFITVNldHRpbmdzVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogQWlodWJNYW5hZ2VyUGx1Z2luKSB7XG4gICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xuICB9XG5cbiAgZGlzcGxheSgpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRhaW5lckVsIH0gPSB0aGlzO1xuICAgIGNvbnRhaW5lckVsLmVtcHR5KCk7XG4gICAgY29udGFpbmVyRWwuY3JlYXRlRWwoXCJoMlwiLCB7IHRleHQ6IFwiQUlIdWIgTWFuYWdlciBcdUMxMjRcdUM4MTVcIiB9KTtcblxuICAgIHRoaXMucmVuZGVyR2VuZXJhbChjb250YWluZXJFbCk7XG4gICAgdGhpcy5yZW5kZXJSdWxlcyhjb250YWluZXJFbCk7XG4gICAgdGhpcy5yZW5kZXJDbGF1ZGlhbihjb250YWluZXJFbCk7XG4gICAgdGhpcy5yZW5kZXJQb3dlclNoZWxsKGNvbnRhaW5lckVsKTtcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBHZW5lcmFsIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcmVuZGVyR2VuZXJhbChjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3Qgc2VjdGlvbiA9IHRoaXMuY3JlYXRlU2VjdGlvbihjb250YWluZXIsIFwiR2VuZXJhbFwiKTtcblxuICAgIGNvbnN0IGRldGVjdGVkID0gdGhpcy5wbHVnaW4ubXVsdGlWYXVsdFJvb3Q7XG4gICAgbmV3IFNldHRpbmcoc2VjdGlvbilcbiAgICAgIC5zZXROYW1lKFwiXHVCQTQwXHVEMkYwXHVCQ0ZDXHVEMkI4IFx1QjhFOFx1RDJCOCAoXHVDNzkwXHVCM0Q5IFx1QUMxMFx1QzlDMClcIilcbiAgICAgIC5zZXREZXNjKGRldGVjdGVkID8/IFwiXHVBQzEwXHVDOUMwIFx1QzJFNFx1RDMyOCBcdTIwMTQgXHVDNTQ0XHVCNzk4IFx1QUNCRFx1Qjg1Q1x1Qjk3QyBcdUMyMThcdUIzRDkgXHVDNzg1XHVCODI1XHVENTU4XHVDMTM4XHVDNjk0XCIpXG4gICAgICAuc2V0RGlzYWJsZWQodHJ1ZSk7XG5cbiAgICBuZXcgU2V0dGluZyhzZWN0aW9uKVxuICAgICAgLnNldE5hbWUoXCJcdUJBNDBcdUQyRjBcdUJDRkNcdUQyQjggXHVCOEU4XHVEMkI4IFx1QzYyNFx1QkM4NFx1Qjc3Q1x1Qzc3NFx1QjREQ1wiKVxuICAgICAgLnNldERlc2MoXCJcdUM3OTBcdUIzRDkgXHVBQzEwXHVDOUMwIFx1QzJFNFx1RDMyOCBcdUMyREMgXHVDOUMxXHVDODExIFx1Qzc4NVx1QjgyNSAoXHVDNjA4OiBDOlxcXFxPYnNpZGlhblxcXFxBSU1pbmRWYXVsdHMpXCIpXG4gICAgICAuYWRkVGV4dCgodGV4dCkgPT4ge1xuICAgICAgICB0ZXh0XG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKFwiXHVCRTQ0XHVDNkNDXHVCNDUwXHVCQTc0IFx1Qzc5MFx1QjNEOSBcdUFDMTBcdUM5QzAgXHVDMEFDXHVDNkE5XCIpXG4gICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm11bHRpVmF1bHRSb290T3ZlcnJpZGUpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubXVsdGlWYXVsdFJvb3RPdmVycmlkZSA9IHZhbHVlO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5yZWxvYWRNb2R1bGVzKCk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgfVxuXG4gIC8vIFx1MjUwMFx1MjUwMFx1MjUwMCBSdWxlcyBNYW5hZ2VyIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG4gIHByaXZhdGUgcmVuZGVyUnVsZXMoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IHNlY3Rpb24gPSB0aGlzLmNyZWF0ZVNlY3Rpb24oY29udGFpbmVyLCBcIlJ1bGVzIE1hbmFnZXIgKC5jbGF1ZGUvcnVsZXMvKVwiKTtcbiAgICBjb25zdCBpbm5lciA9IHNlY3Rpb24uY3JlYXRlRGl2KCk7XG5cbiAgICBpZiAodGhpcy5wbHVnaW4ucnVsZXNNYW5hZ2VyKSB7XG4gICAgICBuZXcgUnVsZXNQYW5lbChpbm5lciwgdGhpcy5wbHVnaW4ucnVsZXNNYW5hZ2VyLCB0aGlzLmFwcCkucmVuZGVyKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlubmVyLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiXHVCQTQwXHVEMkYwXHVCQ0ZDXHVEMkI4IFx1QjhFOFx1RDJCOFx1QUMwMCBcdUMxMjRcdUM4MTVcdUI0MThcdUM5QzAgXHVDNTRBXHVDNTQ0IFx1QUREQ1x1Q0U1OVx1Qzc0NCBcdUI4NUNcdUI0RENcdUQ1NjAgXHVDMjE4IFx1QzVDNlx1QzJCNVx1QjJDOFx1QjJFNC5cIiB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBcdTI1MDBcdTI1MDBcdTI1MDAgQ2xhdWRpYW4gU2V0dGluZ3MgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG5cbiAgcHJpdmF0ZSByZW5kZXJDbGF1ZGlhbihjb250YWluZXI6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gICAgY29uc3Qgc2VjdGlvbiA9IHRoaXMuY3JlYXRlU2VjdGlvbihjb250YWluZXIsIFwiQ2xhdWRpYW4gU2V0dGluZ3NcIik7XG4gICAgY29uc3QgaW5uZXIgPSBzZWN0aW9uLmNyZWF0ZURpdigpO1xuXG4gICAgaWYgKHRoaXMucGx1Z2luLmNsYXVkaWFuU2V0dGluZ3MpIHtcbiAgICAgIG5ldyBDbGF1ZGlhblBhbmVsKGlubmVyLCB0aGlzLnBsdWdpbi5jbGF1ZGlhblNldHRpbmdzKS5yZW5kZXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaW5uZXIuY3JlYXRlRWwoXCJwXCIsIHsgdGV4dDogXCJcdUJBNDBcdUQyRjBcdUJDRkNcdUQyQjggXHVCOEU4XHVEMkI4XHVBQzAwIFx1QzEyNFx1QzgxNVx1QjQxOFx1QzlDMCBcdUM1NEFcdUM1NThcdUMyQjVcdUIyQzhcdUIyRTQuXCIgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFBvd2VyU2hlbGwgXHVBQ0JEXHVCODVDIFx1QzYyNFx1QkM4NFx1Qjc3Q1x1Qzc3NFx1QjREQyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIHJlbmRlclBvd2VyU2hlbGwoY29udGFpbmVyOiBIVE1MRWxlbWVudCk6IHZvaWQge1xuICAgIGNvbnN0IHNlY3Rpb24gPSB0aGlzLmNyZWF0ZVNlY3Rpb24oY29udGFpbmVyLCBcIlBvd2VyU2hlbGwgXHVDMkE0XHVEMDZDXHVCOUJEXHVEMkI4IFx1QUNCRFx1Qjg1Q1wiKTtcblxuICAgIHNlY3Rpb24uY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiXHVCRTQ0XHVDNkNDXHVCNDUwXHVCQTc0IFx1QkNGQ1x1RDJCOCBcdUIwQjQgXHVBRTMwXHVCQ0Y4IFx1QUNCRFx1Qjg1Q1x1Qjk3QyBcdUM3OTBcdUIzRDkgXHVEMEQwXHVDOUMwXHVENTY5XHVCMkM4XHVCMkU0LlwiLFxuICAgIH0pLnN0eWxlLmNvbG9yID0gXCJ2YXIoLS10ZXh0LW11dGVkKVwiO1xuXG4gICAgdHlwZSBQc0tleSA9IGtleW9mIHR5cGVvZiB0aGlzLnBsdWdpbi5zZXR0aW5ncy5wc1NjcmlwdE92ZXJyaWRlcztcbiAgICBjb25zdCBzY3JpcHRzOiBBcnJheTx7IGtleTogUHNLZXk7IGxhYmVsOiBzdHJpbmc7IGRlZmF1bHQ6IHN0cmluZyB9PiA9IFtcbiAgICAgIHsga2V5OiBcInN5bmNXb3Jrc3BhY2VcIiwgbGFiZWw6IFwiU3luYyBXb3Jrc3BhY2VcIiwgZGVmYXVsdDogXCJfdG9vbHMvTWFrZUNsb25lVmF1bHQuYmF0XCIgfSxcbiAgICAgIHsga2V5OiBcImNsb25lVmF1bHRcIiwgICAgbGFiZWw6IFwiQ2xvbmUgVmF1bHRcIiwgICAgZGVmYXVsdDogXCJfdG9vbHMvY2xvbmVfdmF1bHQucHMxXCIgfSxcbiAgICAgIHsga2V5OiBcImNyZWF0ZVZhdWx0XCIsICAgbGFiZWw6IFwiQ3JlYXRlIFZhdWx0XCIsICAgZGVmYXVsdDogXCJfZm9yZ2Uvc3RhZ2luZy9pbml0X3ZhdWx0LnBzMVwiIH0sXG4gICAgXTtcblxuICAgIGZvciAoY29uc3QgeyBrZXksIGxhYmVsLCBkZWZhdWx0OiBkZWYgfSBvZiBzY3JpcHRzKSB7XG4gICAgICBuZXcgU2V0dGluZyhzZWN0aW9uKVxuICAgICAgICAuc2V0TmFtZShsYWJlbClcbiAgICAgICAgLnNldERlc2MoYFx1QUUzMFx1QkNGODogJHtkZWZ9YClcbiAgICAgICAgLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgICAgICB0ZXh0XG4gICAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoXCJcdUJFNDRcdUM2Q0NcdUI0NTBcdUJBNzQgXHVDNzkwXHVCM0Q5IFx1RDBEMFx1QzlDMFwiKVxuICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLnBzU2NyaXB0T3ZlcnJpZGVzW2tleV0pXG4gICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLnBzU2NyaXB0T3ZlcnJpZGVzW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gXHUyNTAwXHUyNTAwXHUyNTAwIEhlbHBlciBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuICBwcml2YXRlIGNyZWF0ZVNlY3Rpb24oY29udGFpbmVyOiBIVE1MRWxlbWVudCwgdGl0bGU6IHN0cmluZyk6IEhUTUxFbGVtZW50IHtcbiAgICBjb25zdCBzZWN0aW9uID0gY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJhaG0tc2VjdGlvblwiIH0pO1xuICAgIHNlY3Rpb24uY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IHRpdGxlIH0pO1xuICAgIHNlY3Rpb24uc3R5bGUubWFyZ2luQm90dG9tID0gXCIyNHB4XCI7XG4gICAgc2VjdGlvbi5zdHlsZS5wYWRkaW5nQm90dG9tID0gXCIxNnB4XCI7XG4gICAgc2VjdGlvbi5zdHlsZS5ib3JkZXJCb3R0b20gPSBcIjFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcilcIjtcbiAgICByZXR1cm4gc2VjdGlvbjtcbiAgfVxufVxuIiwgImltcG9ydCB7IFNldHRpbmcsIE5vdGljZSwgQXBwLCBNb2RhbCwgQnV0dG9uQ29tcG9uZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBSdWxlc01hbmFnZXIsIFJ1bGVGaWxlIH0gZnJvbSBcIi4uL21vZHVsZXMvUnVsZXNNYW5hZ2VyXCI7XG5pbXBvcnQgeyB3cml0ZVV0ZjggfSBmcm9tIFwiLi4vdXRpbHMvVXRmOEZpbGVJT1wiO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG4vKipcbiAqIC5jbGF1ZGUvcnVsZXMvIFx1QUREQ1x1Q0U1OSBcdUJBQTlcdUI4NUQgVUkgXHVDRUY0XHVEM0VDXHVCMTBDXHVEMkI4XG4gKlxuICogU2V0dGluZ3NUYWIgXHVCMEI0XHVDNUQwXHVDMTFDIFx1QjlDOFx1QzZCNFx1RDJCOFx1QjQxQ1x1QjJFNC5cbiAqL1xuZXhwb3J0IGNsYXNzIFJ1bGVzUGFuZWwge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJ1bGVzTWFuYWdlcjogUnVsZXNNYW5hZ2VyLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgYXBwOiBBcHBcbiAgKSB7fVxuXG4gIGFzeW5jIHJlbmRlcigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XG5cbiAgICBsZXQgcnVsZXM6IFJ1bGVGaWxlW107XG4gICAgdHJ5IHtcbiAgICAgIHJ1bGVzID0gYXdhaXQgdGhpcy5ydWxlc01hbmFnZXIubGlzdFJ1bGVzKCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICAgIHRleHQ6IFwiXHVBRERDXHVDRTU5IFx1QjUxNFx1QjgwOVx1RDEzMFx1QjlBQ1x1Qjk3QyBcdUM3N0RcdUM3NDQgXHVDMjE4IFx1QzVDNlx1QzJCNVx1QjJDOFx1QjJFNC4gXHVCQTQwXHVEMkYwXHVCQ0ZDXHVEMkI4IFx1QjhFOFx1RDJCOCBcdUFDQkRcdUI4NUNcdUI5N0MgXHVENjU1XHVDNzc4XHVENTU4XHVDMTM4XHVDNjk0LlwiLFxuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKHJ1bGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5jb250YWluZXJFbC5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIlx1QUREQ1x1Q0U1OSBcdUQzMENcdUM3N0NcdUM3NzQgXHVDNUM2XHVDMkI1XHVCMkM4XHVCMkU0LlwiIH0pO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgcnVsZSBvZiBydWxlcykge1xuICAgICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbClcbiAgICAgICAgLnNldE5hbWUocnVsZS5maWxlbmFtZSlcbiAgICAgICAgLnNldERlc2MoXG4gICAgICAgICAgcnVsZS5hY3RpdmVcbiAgICAgICAgICAgID8gYFx1MjcwNSBcdUQ2NUNcdUMxMzEgXHUwMEI3ICR7cnVsZS5jb250ZW50Lmxlbmd0aH1cdUM3OTBgXG4gICAgICAgICAgICA6IGBcdTIzRjggXHVCRTQ0XHVENjVDXHVDMTMxIFx1MDBCNyAke3J1bGUuY29udGVudC5sZW5ndGh9XHVDNzkwYFxuICAgICAgICApXG4gICAgICAgIC5hZGRUb2dnbGUoKHRvZ2dsZSkgPT4ge1xuICAgICAgICAgIHRvZ2dsZS5zZXRWYWx1ZShydWxlLmFjdGl2ZSkub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJ1bGVzTWFuYWdlci50b2dnbGVSdWxlKHJ1bGUuZmlsZW5hbWUsIHZhbHVlKTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXG4gICAgICAgICAgICAgIGBbQUlIdWJdICR7cnVsZS5maWxlbmFtZX06ICR7dmFsdWUgPyBcIlx1RDY1Q1x1QzEzMVx1RDY1NFwiIDogXCJcdUJFNDRcdUQ2NUNcdUMxMzFcdUQ2NTRcIn1gXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KVxuICAgICAgICAuYWRkQnV0dG9uKChidG4pID0+IHtcbiAgICAgICAgICBidG4uc2V0QnV0dG9uVGV4dChcIlx1RDNCOFx1QzlEMVwiKS5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICAgIG5ldyBSdWxlRWRpdE1vZGFsKHRoaXMuYXBwLCBydWxlLCBhc3luYyAobmV3Q29udGVudCkgPT4ge1xuICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJ1bGVzTWFuYWdlci53cml0ZVJ1bGUocnVsZS5maWxlbmFtZSwgbmV3Q29udGVudCk7XG4gICAgICAgICAgICAgIG5ldyBOb3RpY2UoYFtBSUh1Yl0gJHtydWxlLmZpbGVuYW1lfSBcdUM4MDBcdUM3QTVcdUI0MjhgKTtcbiAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXIoKTtcbiAgICAgICAgICAgIH0pLm9wZW4oKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gXHVDMEM4IFx1QUREQ1x1Q0U1OSBcdUNEOTRcdUFDMDAgXHVCQzg0XHVEMkJDXG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbCkuYWRkQnV0dG9uKChidG4pID0+IHtcbiAgICAgIGJ0blxuICAgICAgICAuc2V0QnV0dG9uVGV4dChcIisgXHVDMEM4IFx1QUREQ1x1Q0U1OSBcdUNEOTRcdUFDMDBcIilcbiAgICAgICAgLnNldEN0YSgpXG4gICAgICAgIC5vbkNsaWNrKCgpID0+IHtcbiAgICAgICAgICBuZXcgTmV3UnVsZU1vZGFsKHRoaXMuYXBwLCBhc3luYyAoZmlsZW5hbWUsIGNvbnRlbnQpID0+IHtcbiAgICAgICAgICAgIGlmICghZmlsZW5hbWUuZW5kc1dpdGgoXCIubWRcIikpIGZpbGVuYW1lICs9IFwiLm1kXCI7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJ1bGVzTWFuYWdlci53cml0ZVJ1bGUoZmlsZW5hbWUsIGNvbnRlbnQpO1xuICAgICAgICAgICAgbmV3IE5vdGljZShgW0FJSHViXSAke2ZpbGVuYW1lfSBcdUMwRERcdUMxMzFcdUI0MjhgKTtcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyKCk7XG4gICAgICAgICAgfSkub3BlbigpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG4vKiogXHVBRERDXHVDRTU5IFx1RDMwQ1x1Qzc3QyBcdUQzQjhcdUM5RDEgXHVCQUE4XHVCMkVDICovXG5jbGFzcyBSdWxlRWRpdE1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIGNvbnRlbnQ6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IHJ1bGU6IFJ1bGVGaWxlLFxuICAgIHByaXZhdGUgcmVhZG9ubHkgb25TYXZlOiAoY29udGVudDogc3RyaW5nKSA9PiBQcm9taXNlPHZvaWQ+XG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gICAgdGhpcy5jb250ZW50ID0gcnVsZS5jb250ZW50O1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogYFx1RDNCOFx1QzlEMTogJHt0aGlzLnJ1bGUuZmlsZW5hbWV9YCB9KTtcblxuICAgIGNvbnN0IHRleHRhcmVhID0gY29udGVudEVsLmNyZWF0ZUVsKFwidGV4dGFyZWFcIik7XG4gICAgdGV4dGFyZWEudmFsdWUgPSB0aGlzLmNvbnRlbnQ7XG4gICAgdGV4dGFyZWEucm93cyA9IDIwO1xuICAgIHRleHRhcmVhLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XG4gICAgdGV4dGFyZWEuc3R5bGUuZm9udEZhbWlseSA9IFwidmFyKC0tZm9udC1tb25vc3BhY2UpXCI7XG4gICAgdGV4dGFyZWEuc3R5bGUuZm9udFNpemUgPSBcIjAuODVlbVwiO1xuICAgIHRleHRhcmVhLmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiB7XG4gICAgICB0aGlzLmNvbnRlbnQgPSB0ZXh0YXJlYS52YWx1ZTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGJ0blJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwiYWhtLW1vZGFsLWJ0bi1yb3dcIiB9KTtcbiAgICBidG5Sb3cuc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiO1xuICAgIGJ0blJvdy5zdHlsZS5nYXAgPSBcIjhweFwiO1xuICAgIGJ0blJvdy5zdHlsZS5tYXJnaW5Ub3AgPSBcIjEycHhcIjtcblxuICAgIG5ldyBCdXR0b25Db21wb25lbnQoYnRuUm93KVxuICAgICAgLnNldEJ1dHRvblRleHQoXCJcdUM4MDBcdUM3QTVcIilcbiAgICAgIC5zZXRDdGEoKVxuICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICBhd2FpdCB0aGlzLm9uU2F2ZSh0aGlzLmNvbnRlbnQpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcblxuICAgIG5ldyBCdXR0b25Db21wb25lbnQoYnRuUm93KS5zZXRCdXR0b25UZXh0KFwiXHVDREU4XHVDMThDXCIpLm9uQ2xpY2soKCkgPT4gdGhpcy5jbG9zZSgpKTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuXG4vKiogXHVDMEM4IFx1QUREQ1x1Q0U1OSBcdUQzMENcdUM3N0MgXHVDMEREXHVDMTMxIFx1QkFBOFx1QjJFQyAqL1xuY2xhc3MgTmV3UnVsZU1vZGFsIGV4dGVuZHMgTW9kYWwge1xuICBwcml2YXRlIGZpbGVuYW1lID0gXCJcIjtcbiAgcHJpdmF0ZSBjb250ZW50ID0gXCJcIjtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uQ3JlYXRlOiAoZmlsZW5hbWU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA9PiBQcm9taXNlPHZvaWQ+XG4gICkge1xuICAgIHN1cGVyKGFwcCk7XG4gIH1cblxuICBvbk9wZW4oKTogdm9pZCB7XG4gICAgY29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XG4gICAgY29udGVudEVsLmVtcHR5KCk7XG4gICAgY29udGVudEVsLmNyZWF0ZUVsKFwiaDNcIiwgeyB0ZXh0OiBcIlx1QzBDOCBcdUFERENcdUNFNTkgXHVEMzBDXHVDNzdDIFx1QzBERFx1QzEzMVwiIH0pO1xuXG4gICAgbmV3IFNldHRpbmcoY29udGVudEVsKS5zZXROYW1lKFwiXHVEMzBDXHVDNzdDXHVCQTg1ICgubWQpXCIpLmFkZFRleHQoKHRleHQpID0+IHtcbiAgICAgIHRleHQuc2V0UGxhY2Vob2xkZXIoXCJcdUM2MDg6IG15LXJ1bGUubWRcIikub25DaGFuZ2UoKHYpID0+IHtcbiAgICAgICAgdGhpcy5maWxlbmFtZSA9IHY7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImxhYmVsXCIsIHsgdGV4dDogXCJcdUIwQjRcdUM2QTlcIiB9KTtcbiAgICBjb25zdCB0ZXh0YXJlYSA9IGNvbnRlbnRFbC5jcmVhdGVFbChcInRleHRhcmVhXCIpO1xuICAgIHRleHRhcmVhLnJvd3MgPSAxMDtcbiAgICB0ZXh0YXJlYS5zdHlsZS53aWR0aCA9IFwiMTAwJVwiO1xuICAgIHRleHRhcmVhLnN0eWxlLmZvbnRGYW1pbHkgPSBcInZhcigtLWZvbnQtbW9ub3NwYWNlKVwiO1xuICAgIHRleHRhcmVhLmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiB7XG4gICAgICB0aGlzLmNvbnRlbnQgPSB0ZXh0YXJlYS52YWx1ZTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGJ0blJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoKTtcbiAgICBidG5Sb3cuc3R5bGUuZGlzcGxheSA9IFwiZmxleFwiO1xuICAgIGJ0blJvdy5zdHlsZS5nYXAgPSBcIjhweFwiO1xuICAgIGJ0blJvdy5zdHlsZS5tYXJnaW5Ub3AgPSBcIjEycHhcIjtcblxuICAgIG5ldyBCdXR0b25Db21wb25lbnQoYnRuUm93KVxuICAgICAgLnNldEJ1dHRvblRleHQoXCJcdUMwRERcdUMxMzFcIilcbiAgICAgIC5zZXRDdGEoKVxuICAgICAgLm9uQ2xpY2soYXN5bmMgKCkgPT4ge1xuICAgICAgICBpZiAoIXRoaXMuZmlsZW5hbWUudHJpbSgpKSB7XG4gICAgICAgICAgbmV3IE5vdGljZShcIlx1RDMwQ1x1Qzc3Q1x1QkE4NVx1Qzc0NCBcdUM3ODVcdUI4MjVcdUQ1NThcdUMxMzhcdUM2OTQuXCIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCB0aGlzLm9uQ3JlYXRlKHRoaXMuZmlsZW5hbWUudHJpbSgpLCB0aGlzLmNvbnRlbnQpO1xuICAgICAgICB0aGlzLmNsb3NlKCk7XG4gICAgICB9KTtcblxuICAgIG5ldyBCdXR0b25Db21wb25lbnQoYnRuUm93KS5zZXRCdXR0b25UZXh0KFwiXHVDREU4XHVDMThDXCIpLm9uQ2xpY2soKCkgPT4gdGhpcy5jbG9zZSgpKTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5jb250ZW50RWwuZW1wdHkoKTtcbiAgfVxufVxuIiwgImltcG9ydCB7IFNldHRpbmcsIE5vdGljZSwgVGV4dEFyZWFDb21wb25lbnQgfSBmcm9tIFwib2JzaWRpYW5cIjtcbmltcG9ydCB7IENsYXVkaWFuU2V0dGluZ3NNYW5hZ2VyLCBDbGF1ZGlhbkNvbmZpZyB9IGZyb20gXCIuLi9tb2R1bGVzL0NsYXVkaWFuU2V0dGluZ3NcIjtcblxuLyoqXG4gKiBjbGF1ZGlhbi1zZXR0aW5ncy5qc29uIFx1RDNCOFx1QzlEMSBVSSBcdUNFRjRcdUQzRUNcdUIxMENcdUQyQjhcbiAqL1xuZXhwb3J0IGNsYXNzIENsYXVkaWFuUGFuZWwge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNsYXVkaWFuU2V0dGluZ3M6IENsYXVkaWFuU2V0dGluZ3NNYW5hZ2VyXG4gICkge31cblxuICBhc3luYyByZW5kZXIoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5jb250YWluZXJFbC5lbXB0eSgpO1xuXG4gICAgbGV0IGNvbmZpZzogQ2xhdWRpYW5Db25maWc7XG4gICAgdHJ5IHtcbiAgICAgIGNvbmZpZyA9IGF3YWl0IHRoaXMuY2xhdWRpYW5TZXR0aW5ncy5sb2FkKCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZUVsKFwicFwiLCB7XG4gICAgICAgIHRleHQ6IFwiY2xhdWRpYW4tc2V0dGluZ3MuanNvblx1Qzc0NCBcdUM3N0RcdUM3NDQgXHVDMjE4IFx1QzVDNlx1QzJCNVx1QjJDOFx1QjJFNC5cIixcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIFx1QkFBOFx1QjM3OFxuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1QkFBOFx1QjM3OFwiKVxuICAgICAgLnNldERlc2MoXCJDbGF1ZGlhblx1QzVEMFx1QzExQyBcdUMwQUNcdUM2QTlcdUQ1NjAgQ2xhdWRlIFx1QkFBOFx1QjM3OFwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wKSA9PiB7XG4gICAgICAgIGRyb3BcbiAgICAgICAgICAuYWRkT3B0aW9uKFwiY2xhdWRlLXNvbm5ldC00LTZcIiwgXCJjbGF1ZGUtc29ubmV0LTQtNiAoU29ubmV0KVwiKVxuICAgICAgICAgIC5hZGRPcHRpb24oXCJjbGF1ZGUtb3B1cy00LTZcIiwgXCJjbGF1ZGUtb3B1cy00LTYgKE9wdXMpXCIpXG4gICAgICAgICAgLmFkZE9wdGlvbihcImNsYXVkZS1oYWlrdS00LTUtMjAyNTEwMDFcIiwgXCJjbGF1ZGUtaGFpa3UtNC01IChIYWlrdSlcIilcbiAgICAgICAgICAuc2V0VmFsdWUoY29uZmlnLm1vZGVsID8/IFwiY2xhdWRlLXNvbm5ldC00LTZcIilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNsYXVkaWFuU2V0dGluZ3Muc2F2ZSh7IG1vZGVsOiB2YWx1ZSwgbGFzdENsYXVkZU1vZGVsOiB2YWx1ZSB9KTtcbiAgICAgICAgICAgIG5ldyBOb3RpY2UoXCJbQUlIdWJdIFx1QkFBOFx1QjM3OCBcdUM4MDBcdUM3QTVcdUI0MjhcIik7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgIC8vIFRoaW5raW5nIEJ1ZGdldFxuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlRoaW5raW5nIEJ1ZGdldFwiKVxuICAgICAgLnNldERlc2MoXCJBSSBcdUMwQUNcdUFDRTAgXHVBRTRBXHVDNzc0IChsb3cgPSBcdUJFNjBcdUI5ODQsIGhpZ2ggPSBcdUIyOTBcdUI5QUNcdUM5QzBcdUI5Q0MgXHVDODE1XHVENjU1KVwiKVxuICAgICAgLmFkZERyb3Bkb3duKChkcm9wKSA9PiB7XG4gICAgICAgIGRyb3BcbiAgICAgICAgICAuYWRkT3B0aW9uKFwibG93XCIsIFwiTG93XCIpXG4gICAgICAgICAgLmFkZE9wdGlvbihcIm1lZGl1bVwiLCBcIk1lZGl1bVwiKVxuICAgICAgICAgIC5hZGRPcHRpb24oXCJoaWdoXCIsIFwiSGlnaFwiKVxuICAgICAgICAgIC5zZXRWYWx1ZShjb25maWcudGhpbmtpbmdCdWRnZXQgPz8gXCJsb3dcIilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCB0aGlzLmNsYXVkaWFuU2V0dGluZ3Muc2F2ZSh7IHRoaW5raW5nQnVkZ2V0OiB2YWx1ZSB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgLy8gUGVybWlzc2lvbiBNb2RlXG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiUGVybWlzc2lvbiBNb2RlXCIpXG4gICAgICAuc2V0RGVzYyhcInlvbG8gPSBcdUM3OTBcdUIzRDkgXHVDMkI5XHVDNzc4LCBhc2sgPSBcdUI5RTRcdUJDODggXHVENjU1XHVDNzc4XCIpXG4gICAgICAuYWRkRHJvcGRvd24oKGRyb3ApID0+IHtcbiAgICAgICAgZHJvcFxuICAgICAgICAgIC5hZGRPcHRpb24oXCJ5b2xvXCIsIFwieW9sbyAoXHVDNzkwXHVCM0Q5IFx1QzJCOVx1Qzc3OClcIilcbiAgICAgICAgICAuYWRkT3B0aW9uKFwiYXNrXCIsIFwiYXNrIChcdUI5RTRcdUJDODggXHVENjU1XHVDNzc4KVwiKVxuICAgICAgICAgIC5zZXRWYWx1ZShjb25maWcucGVybWlzc2lvbk1vZGUgPz8gXCJ5b2xvXCIpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jbGF1ZGlhblNldHRpbmdzLnNhdmUoeyBwZXJtaXNzaW9uTW9kZTogdmFsdWUgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgIC8vIE1heCBUYWJzXG4gICAgbmV3IFNldHRpbmcodGhpcy5jb250YWluZXJFbClcbiAgICAgIC5zZXROYW1lKFwiXHVDRDVDXHVCMzAwIFx1RDBFRCBcdUMyMThcIilcbiAgICAgIC5hZGRTbGlkZXIoKHNsaWRlcikgPT4ge1xuICAgICAgICBzbGlkZXJcbiAgICAgICAgICAuc2V0TGltaXRzKDEsIDEwLCAxKVxuICAgICAgICAgIC5zZXRWYWx1ZShjb25maWcubWF4VGFicyA/PyAzKVxuICAgICAgICAgIC5zZXREeW5hbWljVG9vbHRpcCgpXG4gICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jbGF1ZGlhblNldHRpbmdzLnNhdmUoeyBtYXhUYWJzOiB2YWx1ZSB9KTtcbiAgICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgLy8gQmxvY2tsaXN0IHRvZ2dsZVxuICAgIG5ldyBTZXR0aW5nKHRoaXMuY29udGFpbmVyRWwpXG4gICAgICAuc2V0TmFtZShcIlx1QzcwNFx1RDVEOCBcdUJBODVcdUI4MzlcdUM1QjQgXHVDQzI4XHVCMkU4IFx1RDY1Q1x1QzEzMVx1RDY1NFwiKVxuICAgICAgLmFkZFRvZ2dsZSgodG9nZ2xlKSA9PiB7XG4gICAgICAgIHRvZ2dsZS5zZXRWYWx1ZShjb25maWcuZW5hYmxlQmxvY2tsaXN0ID8/IHRydWUpLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xuICAgICAgICAgIGF3YWl0IHRoaXMuY2xhdWRpYW5TZXR0aW5ncy5zYXZlKHsgZW5hYmxlQmxvY2tsaXN0OiB2YWx1ZSB9KTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgIC8vIEJsb2NrZWQgY29tbWFuZHMgXHUyMDE0IFdpbmRvd3NcbiAgICBuZXcgU2V0dGluZyh0aGlzLmNvbnRhaW5lckVsKVxuICAgICAgLnNldE5hbWUoXCJcdUNDMjhcdUIyRThcdUI0MUMgXHVCQTg1XHVCODM5XHVDNUI0IChXaW5kb3dzKVwiKVxuICAgICAgLnNldERlc2MoXCJcdUQ1NUMgXHVDOTA0XHVDNUQwIFx1RDU1OFx1QjA5OFx1QzUyOSBcdUM3ODVcdUI4MjVcIilcbiAgICAgIC5hZGRUZXh0QXJlYSgodGEpID0+IHtcbiAgICAgICAgdGEuc2V0VmFsdWUoKGNvbmZpZy5ibG9ja2VkQ29tbWFuZHM/LndpbmRvd3MgPz8gW10pLmpvaW4oXCJcXG5cIikpXG4gICAgICAgICAgLnNldFBsYWNlaG9sZGVyKFwiZGVsIC9zIC9xXFxucmQgL3MgL3FcXG4uLi5cIilcbiAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBsaW5lcyA9IHZhbHVlLnNwbGl0KFwiXFxuXCIpLm1hcCgobCkgPT4gbC50cmltKCkpLmZpbHRlcihCb29sZWFuKTtcbiAgICAgICAgICAgIGNvbnN0IGN1cnJlbnQgPSBhd2FpdCB0aGlzLmNsYXVkaWFuU2V0dGluZ3MubG9hZCgpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5jbGF1ZGlhblNldHRpbmdzLnNhdmUoe1xuICAgICAgICAgICAgICBibG9ja2VkQ29tbWFuZHM6IHtcbiAgICAgICAgICAgICAgICAuLi5jdXJyZW50LmJsb2NrZWRDb21tYW5kcyxcbiAgICAgICAgICAgICAgICB3aW5kb3dzOiBsaW5lcyxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB0YS5pbnB1dEVsLnJvd3MgPSA2O1xuICAgICAgICB0YS5pbnB1dEVsLnN0eWxlLndpZHRoID0gXCIxMDAlXCI7XG4gICAgICAgIHRhLmlucHV0RWwuc3R5bGUuZm9udEZhbWlseSA9IFwidmFyKC0tZm9udC1tb25vc3BhY2UpXCI7XG4gICAgICAgIHRhLmlucHV0RWwuc3R5bGUuZm9udFNpemUgPSBcIjAuOGVtXCI7XG4gICAgICB9KTtcblxuICAgIC8vIFN5c3RlbSBQcm9tcHRcbiAgICB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZUVsKFwiaDRcIiwgeyB0ZXh0OiBcIlN5c3RlbSBQcm9tcHRcIiB9KTtcbiAgICBjb25zdCBwcm9tcHRDb250YWluZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdigpO1xuXG4gICAgY29uc3QgdGEgPSBuZXcgVGV4dEFyZWFDb21wb25lbnQocHJvbXB0Q29udGFpbmVyKTtcbiAgICB0YS5zZXRWYWx1ZShjb25maWcuc3lzdGVtUHJvbXB0ID8/IFwiXCIpO1xuICAgIHRhLmlucHV0RWwucm93cyA9IDg7XG4gICAgdGEuaW5wdXRFbC5zdHlsZS53aWR0aCA9IFwiMTAwJVwiO1xuXG4gICAgY29uc3Qgc2F2ZUJ0biA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRWwoXCJidXR0b25cIiwge1xuICAgICAgdGV4dDogXCJTeXN0ZW0gUHJvbXB0IFx1QzgwMFx1QzdBNVwiLFxuICAgICAgY2xzOiBcIm1vZC1jdGFcIixcbiAgICB9KTtcbiAgICBzYXZlQnRuLnN0eWxlLm1hcmdpblRvcCA9IFwiOHB4XCI7XG4gICAgc2F2ZUJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgdGhpcy5jbGF1ZGlhblNldHRpbmdzLnNhdmUoeyBzeXN0ZW1Qcm9tcHQ6IHRhLmdldFZhbHVlKCkgfSk7XG4gICAgICBuZXcgTm90aWNlKFwiW0FJSHViXSBTeXN0ZW0gUHJvbXB0IFx1QzgwMFx1QzdBNVx1QjQyOFwiKTtcbiAgICB9KTtcbiAgfVxufVxuIiwgImltcG9ydCB7IEl0ZW1WaWV3LCBXb3Jrc3BhY2VMZWFmIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgdHlwZSBBaWh1Yk1hbmFnZXJQbHVnaW4gZnJvbSBcIi4uL21haW5cIjtcbmltcG9ydCB7IFJ1bGVzU2VjdGlvbiB9IGZyb20gXCIuL3NlY3Rpb25zL1J1bGVzU2VjdGlvblwiO1xuaW1wb3J0IHsgVmF1bHRTZWN0aW9uIH0gZnJvbSBcIi4vc2VjdGlvbnMvVmF1bHRTZWN0aW9uXCI7XG5cbmV4cG9ydCBjb25zdCBBSE1fVklFV19UWVBFID0gXCJhaWh1Yi1tYW5hZ2VyLXZpZXdcIjtcblxudHlwZSBUYWJJZCA9IFwicnVsZXNcIiB8IFwidmF1bHRcIjtcblxuY29uc3QgVEFCUzogeyBpZDogVGFiSWQ7IGxhYmVsOiBzdHJpbmc7IGljb246IHN0cmluZyB9W10gPSBbXG4gIHsgaWQ6IFwicnVsZXNcIiwgbGFiZWw6IFwiUnVsZXNcIiwgIGljb246IFwiXHVEODNEXHVEQ0NCXCIgfSxcbiAgeyBpZDogXCJ2YXVsdFwiLCBsYWJlbDogXCJWYXVsdFwiLCAgaWNvbjogXCJcdUQ4M0RcdUREQzJcIiB9LFxuXTtcblxuLyoqXG4gKiBBSUh1YiBNYW5hZ2VyIFx1QzZCMFx1Q0UyMSBcdUMwQUNcdUM3NzRcdUI0REMgXHVEMzI4XHVCMTEwIChJdGVtVmlldylcbiAqXG4gKiBDbGF1ZGlhblx1Q0M5OFx1QjdGQyBPYnNpZGlhbiBcdUM2QjBcdUNFMjFcdUM1RDAgXHVBQ0UwXHVDODE1IFx1RDMyOFx1QjExMFx1Qjg1QyBcdUM1RjRcdUI5QjBcdUIyRTQuXG4gKiBcdUI5QUNcdUJDRjggXHVDNTQ0XHVDNzc0XHVDRjU4IFx1RDA3NFx1QjlBRCBcdTIxOTIgcGx1Z2luLmFjdGl2YXRlVmlldygpIFx1MjE5MiBcdUM3NzQgXHVCREYwIFx1RDQ1Q1x1QzJEQy5cbiAqL1xuZXhwb3J0IGNsYXNzIEFITVZpZXcgZXh0ZW5kcyBJdGVtVmlldyB7XG4gIHByaXZhdGUgYWN0aXZlVGFiOiBUYWJJZCA9IFwicnVsZXNcIjtcbiAgcHJpdmF0ZSBzZWN0aW9uRWwhOiBIVE1MRWxlbWVudDtcblxuICBjb25zdHJ1Y3RvcihsZWFmOiBXb3Jrc3BhY2VMZWFmLCBwcml2YXRlIHJlYWRvbmx5IHBsdWdpbjogQWlodWJNYW5hZ2VyUGx1Z2luKSB7XG4gICAgc3VwZXIobGVhZik7XG4gIH1cblxuICBnZXRWaWV3VHlwZSgpOiBzdHJpbmcgeyByZXR1cm4gQUhNX1ZJRVdfVFlQRTsgfVxuICBnZXREaXNwbGF5VGV4dCgpOiBzdHJpbmcgeyByZXR1cm4gXCJBSUh1YiBNYW5hZ2VyXCI7IH1cbiAgZ2V0SWNvbigpOiBzdHJpbmcgeyByZXR1cm4gXCJ2YXVsdFwiOyB9XG5cbiAgYXN5bmMgb25PcGVuKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJvb3QgPSB0aGlzLmNvbnRhaW5lckVsLmNoaWxkcmVuWzFdIGFzIEhUTUxFbGVtZW50O1xuICAgIHJvb3QuZW1wdHkoKTtcbiAgICByb290LmFkZENsYXNzKFwiYWhtLXZpZXctcm9vdFwiKTtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBcdUQ1RTRcdUIzNTQgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgY29uc3QgaGVhZGVyID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6IFwiYWhtLWhlYWRlclwiIH0pO1xuICAgIGhlYWRlci5jcmVhdGVFbChcInNwYW5cIiwgeyB0ZXh0OiBcIkFJSHViIE1hbmFnZXJcIiwgY2xzOiBcImFobS10aXRsZVwiIH0pO1xuXG4gICAgLy8gXHVDMTI0XHVDODE1IFx1RDBFRCBcdUIyRThcdUNEOTUgXHVCQzg0XHVEMkJDXG4gICAgY29uc3Qgc2V0dGluZ3NCdG4gPSBoZWFkZXIuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIlx1MjY5OVwiLCBjbHM6IFwiYWhtLWljb24tYnRuXCIgfSk7XG4gICAgc2V0dGluZ3NCdG4udGl0bGUgPSBcIlNldHRpbmdzXCI7XG4gICAgc2V0dGluZ3NCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgICh0aGlzLmFwcCBhcyB7IHNldHRpbmc/OiB7IG9wZW5UYWJCeUlkPzogKGlkOiBzdHJpbmcpID0+IHZvaWQgfSB9KVxuICAgICAgICAuc2V0dGluZz8ub3BlblRhYkJ5SWQ/LihcImFpaHViLW1hbmFnZXJcIik7XG4gICAgfSk7XG5cbiAgICAvLyBcdTI1MDBcdTI1MDAgXHVEMEVEIFx1QkMxNCBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICBjb25zdCB0YWJCYXIgPSByb290LmNyZWF0ZURpdih7IGNsczogXCJhaG0tdGFiLWJhclwiIH0pO1xuICAgIFRBQlMuZm9yRWFjaCgoeyBpZCwgbGFiZWwsIGljb24gfSkgPT4ge1xuICAgICAgY29uc3QgYnRuID0gdGFiQmFyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcbiAgICAgICAgdGV4dDogYCR7aWNvbn0gJHtsYWJlbH1gLFxuICAgICAgICBjbHM6IGBhaG0tdGFiICR7aWQgPT09IHRoaXMuYWN0aXZlVGFiID8gXCJhaG0tdGFiLWFjdGl2ZVwiIDogXCJcIn1gLFxuICAgICAgfSk7XG4gICAgICBidG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgICAgdGFiQmFyLnF1ZXJ5U2VsZWN0b3JBbGwoXCIuYWhtLXRhYlwiKS5mb3JFYWNoKChiKSA9PiBiLnJlbW92ZUNsYXNzKFwiYWhtLXRhYi1hY3RpdmVcIikpO1xuICAgICAgICBidG4uYWRkQ2xhc3MoXCJhaG0tdGFiLWFjdGl2ZVwiKTtcbiAgICAgICAgdGhpcy5hY3RpdmVUYWIgPSBpZDtcbiAgICAgICAgdGhpcy5yZW5kZXJTZWN0aW9uKCk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIC8vIFx1MjUwMFx1MjUwMCBcdUMxMzlcdUMxNTggXHVDRUU4XHVEMTRDXHVDNzc0XHVCMTA4IFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuICAgIHRoaXMuc2VjdGlvbkVsID0gcm9vdC5jcmVhdGVEaXYoeyBjbHM6IFwiYWhtLXNlY3Rpb24tYm9keVwiIH0pO1xuICAgIGF3YWl0IHRoaXMucmVuZGVyU2VjdGlvbigpO1xuICB9XG5cbiAgYXN5bmMgb25DbG9zZSgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHJlbmRlclNlY3Rpb24oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdGhpcy5zZWN0aW9uRWwuZW1wdHkoKTtcbiAgICBjb25zdCB7IHBsdWdpbiwgYXBwIH0gPSB0aGlzO1xuXG4gICAgc3dpdGNoICh0aGlzLmFjdGl2ZVRhYikge1xuICAgICAgY2FzZSBcInJ1bGVzXCI6XG4gICAgICAgIGlmIChwbHVnaW4ucnVsZXNNYW5hZ2VyKSB7XG4gICAgICAgICAgYXdhaXQgbmV3IFJ1bGVzU2VjdGlvbih0aGlzLnNlY3Rpb25FbCwgcGx1Z2luLnJ1bGVzTWFuYWdlciwgYXBwKS5yZW5kZXIoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnNob3dOb1Jvb3QoKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSBcInZhdWx0XCI6XG4gICAgICAgIG5ldyBWYXVsdFNlY3Rpb24oXG4gICAgICAgICAgdGhpcy5zZWN0aW9uRWwsXG4gICAgICAgICAgYXBwLFxuICAgICAgICAgIHBsdWdpbi5tdWx0aVZhdWx0Um9vdCA/PyBcIlwiXG4gICAgICAgICkucmVuZGVyKCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgc2hvd05vUm9vdCgpOiB2b2lkIHtcbiAgICB0aGlzLnNlY3Rpb25FbC5jcmVhdGVFbChcInBcIiwge1xuICAgICAgdGV4dDogXCJcdTI2QTAgXHVCQTQwXHVEMkYwXHVCQ0ZDXHVEMkI4IFx1QjhFOFx1RDJCOFx1QUMwMCBcdUFDMTBcdUM5QzBcdUI0MThcdUM5QzAgXHVDNTRBXHVDNTU4XHVDMkI1XHVCMkM4XHVCMkU0LiBcdUMxMjRcdUM4MTUoXHUyNjk5KVx1QzVEMFx1QzExQyBcdUFDQkRcdUI4NUNcdUI5N0MgXHVDOUMxXHVDODExIFx1Qzc4NVx1QjgyNVx1RDU1OFx1QzEzOFx1QzY5NC5cIixcbiAgICAgIGNsczogXCJhaG0tZXJyb3JcIixcbiAgICB9KTtcbiAgfVxuXG4gIGFzeW5jIHJlZnJlc2goKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5yZW5kZXJTZWN0aW9uKCk7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBBcHAsIE5vdGljZSwgTW9kYWwsIEJ1dHRvbkNvbXBvbmVudCB9IGZyb20gXCJvYnNpZGlhblwiO1xuaW1wb3J0IHsgUnVsZXNNYW5hZ2VyLCBSdWxlRmlsZSB9IGZyb20gXCIuLi8uLi9tb2R1bGVzL1J1bGVzTWFuYWdlclwiO1xuXG4vKipcbiAqIFJ1bGVzIFx1QzEzOVx1QzE1OCBcdTIwMTQgXHVDMEFDXHVDNzc0XHVCNERDIFx1RDMyOFx1QjExMCBcdUIwQjQgXHVBRERDXHVDRTU5IFx1QkFBOVx1Qjg1RCArIFx1RDFBMFx1QUUwMCArIFx1RDNCOFx1QzlEMVxuICovXG5leHBvcnQgY2xhc3MgUnVsZXNTZWN0aW9uIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHJpdmF0ZSByZWFkb25seSBjb250YWluZXI6IEhUTUxFbGVtZW50LFxuICAgIHByaXZhdGUgcmVhZG9ubHkgcnVsZXNNYW5hZ2VyOiBSdWxlc01hbmFnZXIsXG4gICAgcHJpdmF0ZSByZWFkb25seSBhcHA6IEFwcFxuICApIHt9XG5cbiAgYXN5bmMgcmVuZGVyKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMuY29udGFpbmVyLmVtcHR5KCk7XG5cbiAgICBsZXQgcnVsZXM6IFJ1bGVGaWxlW107XG4gICAgdHJ5IHtcbiAgICAgIHJ1bGVzID0gYXdhaXQgdGhpcy5ydWxlc01hbmFnZXIubGlzdFJ1bGVzKCk7XG4gICAgfSBjYXRjaCB7XG4gICAgICB0aGlzLmNvbnRhaW5lci5jcmVhdGVFbChcInBcIiwge1xuICAgICAgICB0ZXh0OiBcIlx1MjZBMCBcdUFERENcdUNFNTkgXHVCNTE0XHVCODA5XHVEMTMwXHVCOUFDXHVCOTdDIFx1Qzc3RFx1Qzc0NCBcdUMyMTggXHVDNUM2XHVDMkI1XHVCMkM4XHVCMkU0LlwiLFxuICAgICAgICBjbHM6IFwiYWhtLWVycm9yXCIsXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAocnVsZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLmNvbnRhaW5lci5jcmVhdGVFbChcInBcIiwgeyB0ZXh0OiBcIlx1QUREQ1x1Q0U1OSBcdUQzMENcdUM3N0NcdUM3NzQgXHVDNUM2XHVDMkI1XHVCMkM4XHVCMkU0LlwiLCBjbHM6IFwiYWhtLW11dGVkXCIgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgbGlzdCA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJhaG0tcnVsZXMtbGlzdFwiIH0pO1xuXG4gICAgZm9yIChjb25zdCBydWxlIG9mIHJ1bGVzKSB7XG4gICAgICBjb25zdCByb3cgPSBsaXN0LmNyZWF0ZURpdih7IGNsczogXCJhaG0tcnVsZS1yb3dcIiB9KTtcblxuICAgICAgLy8gXHVEMUEwXHVBRTAwXG4gICAgICBjb25zdCB0b2dnbGUgPSByb3cuY3JlYXRlRWwoXCJpbnB1dFwiLCB7IHR5cGU6IFwiY2hlY2tib3hcIiB9IGFzIERvbUVsZW1lbnRJbmZvKTtcbiAgICAgICh0b2dnbGUgYXMgSFRNTElucHV0RWxlbWVudCkuY2hlY2tlZCA9IHJ1bGUuYWN0aXZlO1xuICAgICAgdG9nZ2xlLmNsYXNzTGlzdC5hZGQoXCJhaG0tdG9nZ2xlXCIpO1xuICAgICAgdG9nZ2xlLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgYXN5bmMgKCkgPT4ge1xuICAgICAgICBjb25zdCBlbmFibGVkID0gKHRvZ2dsZSBhcyBIVE1MSW5wdXRFbGVtZW50KS5jaGVja2VkO1xuICAgICAgICBhd2FpdCB0aGlzLnJ1bGVzTWFuYWdlci50b2dnbGVSdWxlKHJ1bGUuZmlsZW5hbWUsIGVuYWJsZWQpO1xuICAgICAgICBuZXcgTm90aWNlKGBbQUlIdWJdICR7cnVsZS5maWxlbmFtZX06ICR7ZW5hYmxlZCA/IFwiXHVENjVDXHVDMTMxXHVENjU0XCIgOiBcIlx1QkU0NFx1RDY1Q1x1QzEzMVx1RDY1NFwifWApO1xuICAgICAgICByb3cuY2xhc3NOYW1lID0gYGFobS1ydWxlLXJvdyAke2VuYWJsZWQgPyBcIlwiIDogXCJhaG0tZGlzYWJsZWRcIn1gO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFx1RDMwQ1x1Qzc3Q1x1QkE4NSArIFx1QzBDMVx1RDBEQ1xuICAgICAgY29uc3QgbGFiZWwgPSByb3cuY3JlYXRlRGl2KHsgY2xzOiBcImFobS1ydWxlLWxhYmVsXCIgfSk7XG4gICAgICBsYWJlbC5jcmVhdGVFbChcInNwYW5cIiwge1xuICAgICAgICB0ZXh0OiBydWxlLmZpbGVuYW1lLnJlcGxhY2UoXCIubWRcIiwgXCJcIiksXG4gICAgICAgIGNsczogXCJhaG0tcnVsZS1uYW1lXCIsXG4gICAgICB9KTtcbiAgICAgIGxhYmVsLmNyZWF0ZUVsKFwic3BhblwiLCB7XG4gICAgICAgIHRleHQ6IHJ1bGUuYWN0aXZlID8gXCJcdTI3MDVcIiA6IFwiXHUyM0Y4XCIsXG4gICAgICAgIGNsczogXCJhaG0tcnVsZS1zdGF0dXNcIixcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIXJ1bGUuYWN0aXZlKSByb3cuYWRkQ2xhc3MoXCJhaG0tZGlzYWJsZWRcIik7XG5cbiAgICAgIC8vIFx1RDNCOFx1QzlEMSBcdUJDODRcdUQyQkNcbiAgICAgIGNvbnN0IGVkaXRCdG4gPSByb3cuY3JlYXRlRWwoXCJidXR0b25cIiwgeyB0ZXh0OiBcIlx1MjcwRlwiLCBjbHM6IFwiYWhtLWljb24tYnRuXCIgfSk7XG4gICAgICBlZGl0QnRuLnRpdGxlID0gXCJcdUQzQjhcdUM5RDFcIjtcbiAgICAgIGVkaXRCdG4uYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcbiAgICAgICAgbmV3IFJ1bGVFZGl0TW9kYWwodGhpcy5hcHAsIHJ1bGUsIGFzeW5jIChuZXdDb250ZW50KSA9PiB7XG4gICAgICAgICAgYXdhaXQgdGhpcy5ydWxlc01hbmFnZXIud3JpdGVSdWxlKHJ1bGUuZmlsZW5hbWUsIG5ld0NvbnRlbnQpO1xuICAgICAgICAgIG5ldyBOb3RpY2UoYFtBSUh1Yl0gJHtydWxlLmZpbGVuYW1lfSBcdUM4MDBcdUM3QTVcdUI0MjhgKTtcbiAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlcigpO1xuICAgICAgICB9KS5vcGVuKCk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBcdUMwQzggXHVBRERDXHVDRTU5IFx1QkM4NFx1RDJCQ1xuICAgIGNvbnN0IGFkZFJvdyA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJhaG0tYWRkLXJvd1wiIH0pO1xuICAgIGNvbnN0IGFkZEJ0biA9IGFkZFJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiKyBcdUMwQzggXHVBRERDXHVDRTU5XCIsIGNsczogXCJhaG0tYnRuLWN0YVwiIH0pO1xuICAgIGFkZEJ0bi5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xuICAgICAgbmV3IE5ld1J1bGVNb2RhbCh0aGlzLmFwcCwgYXN5bmMgKGZpbGVuYW1lLCBjb250ZW50KSA9PiB7XG4gICAgICAgIGlmICghZmlsZW5hbWUuZW5kc1dpdGgoXCIubWRcIikpIGZpbGVuYW1lICs9IFwiLm1kXCI7XG4gICAgICAgIGF3YWl0IHRoaXMucnVsZXNNYW5hZ2VyLndyaXRlUnVsZShmaWxlbmFtZSwgY29udGVudCk7XG4gICAgICAgIG5ldyBOb3RpY2UoYFtBSUh1Yl0gJHtmaWxlbmFtZX0gXHVDMEREXHVDMTMxXHVCNDI4YCk7XG4gICAgICAgIGF3YWl0IHRoaXMucmVuZGVyKCk7XG4gICAgICB9KS5vcGVuKCk7XG4gICAgfSk7XG5cbiAgICAvLyBcdUMwQzhcdUI4NUNcdUFDRTBcdUNFNjggXHVCQzg0XHVEMkJDXG4gICAgY29uc3QgcmVmcmVzaEJ0biA9IGFkZFJvdy5jcmVhdGVFbChcImJ1dHRvblwiLCB7IHRleHQ6IFwiXHVEODNEXHVERDA0XCIsIGNsczogXCJhaG0taWNvbi1idG5cIiB9KTtcbiAgICByZWZyZXNoQnRuLnRpdGxlID0gXCJcdUMwQzhcdUI4NUNcdUFDRTBcdUNFNjhcIjtcbiAgICByZWZyZXNoQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB0aGlzLnJlbmRlcigpKTtcbiAgfVxufVxuXG4vLyBcdTI1MDBcdTI1MDBcdTI1MDAgXHVEM0I4XHVDOUQxIFx1QkFBOFx1QjJFQyBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcblxuY2xhc3MgUnVsZUVkaXRNb2RhbCBleHRlbmRzIE1vZGFsIHtcbiAgcHJpdmF0ZSBjb250ZW50OiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgYXBwOiBBcHAsXG4gICAgcHJpdmF0ZSByZWFkb25seSBydWxlOiBSdWxlRmlsZSxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG9uU2F2ZTogKGNvbnRlbnQ6IHN0cmluZykgPT4gUHJvbWlzZTx2b2lkPlxuICApIHtcbiAgICBzdXBlcihhcHApO1xuICAgIHRoaXMuY29udGVudCA9IHJ1bGUuY29udGVudDtcbiAgfVxuXG4gIG9uT3BlbigpOiB2b2lkIHtcbiAgICBjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcbiAgICBjb250ZW50RWwuZW1wdHkoKTtcbiAgICBjb250ZW50RWwuY3JlYXRlRWwoXCJoM1wiLCB7IHRleHQ6IGBcdUQzQjhcdUM5RDE6ICR7dGhpcy5ydWxlLmZpbGVuYW1lfWAgfSk7XG5cbiAgICBjb25zdCB0YSA9IGNvbnRlbnRFbC5jcmVhdGVFbChcInRleHRhcmVhXCIpO1xuICAgIHRhLnZhbHVlID0gdGhpcy5jb250ZW50O1xuICAgIHRhLnJvd3MgPSAyMDtcbiAgICB0YS5hZGRDbGFzcyhcImFobS10ZXh0YXJlYVwiKTtcbiAgICB0YS5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKCkgPT4geyB0aGlzLmNvbnRlbnQgPSB0YS52YWx1ZTsgfSk7XG5cbiAgICBjb25zdCByb3cgPSBjb250ZW50RWwuY3JlYXRlRGl2KHsgY2xzOiBcImFobS1tb2RhbC1idG5zXCIgfSk7XG4gICAgbmV3IEJ1dHRvbkNvbXBvbmVudChyb3cpLnNldEJ1dHRvblRleHQoXCJcdUM4MDBcdUM3QTVcIikuc2V0Q3RhKCkub25DbGljayhhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCB0aGlzLm9uU2F2ZSh0aGlzLmNvbnRlbnQpO1xuICAgICAgdGhpcy5jbG9zZSgpO1xuICAgIH0pO1xuICAgIG5ldyBCdXR0b25Db21wb25lbnQocm93KS5zZXRCdXR0b25UZXh0KFwiXHVDREU4XHVDMThDXCIpLm9uQ2xpY2soKCkgPT4gdGhpcy5jbG9zZSgpKTtcbiAgfVxuXG4gIG9uQ2xvc2UoKTogdm9pZCB7IHRoaXMuY29udGVudEVsLmVtcHR5KCk7IH1cbn1cblxuLy8gXHUyNTAwXHUyNTAwXHUyNTAwIFx1QzBDOCBcdUFERENcdUNFNTkgXHVCQUE4XHVCMkVDIFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFx1MjUwMFxuXG5jbGFzcyBOZXdSdWxlTW9kYWwgZXh0ZW5kcyBNb2RhbCB7XG4gIHByaXZhdGUgZmlsZW5hbWUgPSBcIlwiO1xuICBwcml2YXRlIGNvbnRlbnQgPSBcIlwiO1xuXG4gIGNvbnN0cnVjdG9yKGFwcDogQXBwLCBwcml2YXRlIHJlYWRvbmx5IG9uQ3JlYXRlOiAoZjogc3RyaW5nLCBjOiBzdHJpbmcpID0+IFByb21pc2U8dm9pZD4pIHtcbiAgICBzdXBlcihhcHApO1xuICB9XG5cbiAgb25PcGVuKCk6IHZvaWQge1xuICAgIGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xuICAgIGNvbnRlbnRFbC5lbXB0eSgpO1xuICAgIGNvbnRlbnRFbC5jcmVhdGVFbChcImgzXCIsIHsgdGV4dDogXCJcdUMwQzggXHVBRERDXHVDRTU5IFx1RDMwQ1x1Qzc3QyBcdUMwRERcdUMxMzFcIiB9KTtcblxuICAgIGNvbnN0IG5hbWVJbnB1dCA9IGNvbnRlbnRFbC5jcmVhdGVFbChcImlucHV0XCIsIHsgdHlwZTogXCJ0ZXh0XCIgfSBhcyBEb21FbGVtZW50SW5mbykgYXMgSFRNTElucHV0RWxlbWVudDtcbiAgICBuYW1lSW5wdXQucGxhY2Vob2xkZXIgPSBcIlx1RDMwQ1x1Qzc3Q1x1QkE4NSAoXHVDNjA4OiBteS1ydWxlLm1kKVwiO1xuICAgIG5hbWVJbnB1dC5hZGRDbGFzcyhcImFobS1pbnB1dFwiKTtcbiAgICBuYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsICgpID0+IHsgdGhpcy5maWxlbmFtZSA9IG5hbWVJbnB1dC52YWx1ZTsgfSk7XG5cbiAgICBjb25zdCB0YSA9IGNvbnRlbnRFbC5jcmVhdGVFbChcInRleHRhcmVhXCIpO1xuICAgIHRhLnJvd3MgPSAxMDtcbiAgICB0YS5wbGFjZWhvbGRlciA9IFwiXHVBRERDXHVDRTU5IFx1QjBCNFx1QzZBOSAoXHVCOUM4XHVEMDZDXHVCMkU0XHVDNkI0KVwiO1xuICAgIHRhLmFkZENsYXNzKFwiYWhtLXRleHRhcmVhXCIpO1xuICAgIHRhLmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCAoKSA9PiB7IHRoaXMuY29udGVudCA9IHRhLnZhbHVlOyB9KTtcblxuICAgIGNvbnN0IHJvdyA9IGNvbnRlbnRFbC5jcmVhdGVEaXYoeyBjbHM6IFwiYWhtLW1vZGFsLWJ0bnNcIiB9KTtcbiAgICBuZXcgQnV0dG9uQ29tcG9uZW50KHJvdykuc2V0QnV0dG9uVGV4dChcIlx1QzBERFx1QzEzMVwiKS5zZXRDdGEoKS5vbkNsaWNrKGFzeW5jICgpID0+IHtcbiAgICAgIGlmICghdGhpcy5maWxlbmFtZS50cmltKCkpIHsgbmV3IE5vdGljZShcIlx1RDMwQ1x1Qzc3Q1x1QkE4NVx1Qzc0NCBcdUM3ODVcdUI4MjVcdUQ1NThcdUMxMzhcdUM2OTQuXCIpOyByZXR1cm47IH1cbiAgICAgIGF3YWl0IHRoaXMub25DcmVhdGUodGhpcy5maWxlbmFtZS50cmltKCksIHRoaXMuY29udGVudCk7XG4gICAgICB0aGlzLmNsb3NlKCk7XG4gICAgfSk7XG4gICAgbmV3IEJ1dHRvbkNvbXBvbmVudChyb3cpLnNldEJ1dHRvblRleHQoXCJcdUNERThcdUMxOENcIikub25DbGljaygoKSA9PiB0aGlzLmNsb3NlKCkpO1xuICB9XG5cbiAgb25DbG9zZSgpOiB2b2lkIHsgdGhpcy5jb250ZW50RWwuZW1wdHkoKTsgfVxufVxuIiwgImltcG9ydCB7IEFwcCwgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XG5pbXBvcnQgeyBWYXVsdENsb25lTW9kYWwgfSBmcm9tIFwiLi4vLi4vdWkvVmF1bHRDbG9uZU1vZGFsXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcblxuLyoqXG4gKiBWYXVsdCBcdUMwRERcdUMxMzEgXHVDMTM5XHVDMTU4XG4gKiBNYWtlQ2xvbmVWYXVsdC5iYXQgXHVDNzU4IFx1QzJFNCBcdUM3OTFcdUM1QzVcdUM3OTBcdUM3NzggY2xvbmVfdmF1bHQucHMxIFx1Qzc0NCBcdUQ2MzhcdUNEOUNcdUQ1NUNcdUIyRTQuXG4gKi9cbmV4cG9ydCBjbGFzcyBWYXVsdFNlY3Rpb24ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwcml2YXRlIHJlYWRvbmx5IGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXG4gICAgcHJpdmF0ZSByZWFkb25seSBhcHA6IEFwcCxcbiAgICBwcml2YXRlIHJlYWRvbmx5IG11bHRpVmF1bHRSb290OiBzdHJpbmdcbiAgKSB7fVxuXG4gIHJlbmRlcigpOiB2b2lkIHtcbiAgICB0aGlzLmNvbnRhaW5lci5lbXB0eSgpO1xuXG4gICAgdGhpcy5jb250YWluZXIuY3JlYXRlRWwoXCJwXCIsIHtcbiAgICAgIHRleHQ6IFwiXHVDMEM4IFx1QzExQ1x1QkUwQ1x1QkNGQ1x1RDJCOFx1Qjk3QyBcdUMwRERcdUMxMzFcdUQ1NjlcdUIyQzhcdUIyRTQuIFx1QzBDMVx1QzcwNCBcdUQzRjRcdUIzNTRcdUM2NDAgXHVDNzc0XHVCOTg0XHVDNzQ0IFx1Qzc4NVx1QjgyNVx1RDU1OFx1QkE3NCBjbG9uZV92YXVsdC5wczEgXHVDNzc0IFx1QzJFNFx1RDU4OVx1QjQyOVx1QjJDOFx1QjJFNC5cIixcbiAgICAgIGNsczogXCJhaG0tZGVzY1wiLFxuICAgIH0pO1xuXG4gICAgY29uc3QgY3JlYXRlQnRuID0gdGhpcy5jb250YWluZXIuY3JlYXRlRWwoXCJidXR0b25cIiwge1xuICAgICAgdGV4dDogXCJcdTI3OTUgXHVDMEM4IFZhdWx0IFx1QzBERFx1QzEzMVwiLFxuICAgICAgY2xzOiBcImFobS1idG4tY3RhXCIsXG4gICAgfSk7XG4gICAgY3JlYXRlQnRuLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XG4gICAgICBjb25zdCB0b29sc0RpciA9IHRoaXMucmVzb2x2ZVRvb2xzRGlyKCk7XG4gICAgICBpZiAoIXRvb2xzRGlyKSB7XG4gICAgICAgIG5ldyBOb3RpY2UoXCJbQUlIdWJdIF90b29scyBcdUI1MTRcdUI4MDlcdUQxMzBcdUI5QUNcdUI5N0MgXHVDQzNFXHVDNzQ0IFx1QzIxOCBcdUM1QzZcdUMyQjVcdUIyQzhcdUIyRTQuXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCB2YXVsdEJhc2UgPSAodGhpcy5hcHAudmF1bHQuYWRhcHRlciBhcyB1bmtub3duIGFzIHsgYmFzZVBhdGg6IHN0cmluZyB9KS5iYXNlUGF0aDtcbiAgICAgIG5ldyBWYXVsdENsb25lTW9kYWwodGhpcy5hcHAsIHRvb2xzRGlyLCBwYXRoLmRpcm5hbWUodmF1bHRCYXNlKSkub3BlbigpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNvbHZlVG9vbHNEaXIoKTogc3RyaW5nIHwgbnVsbCB7XG4gICAgY29uc3QgdmF1bHRCYXNlID0gKHRoaXMuYXBwLnZhdWx0LmFkYXB0ZXIgYXMgdW5rbm93biBhcyB7IGJhc2VQYXRoOiBzdHJpbmcgfSkuYmFzZVBhdGg7XG4gICAgY29uc3QgY2FuZGlkYXRlcyA9IFtcbiAgICAgIHBhdGguam9pbih2YXVsdEJhc2UsIFwiX3Rvb2xzXCIpLFxuICAgICAgcGF0aC5qb2luKHRoaXMubXVsdGlWYXVsdFJvb3QsIFwiX3Rvb2xzXCIpLFxuICAgIF07XG4gICAgcmV0dXJuIGNhbmRpZGF0ZXMuZmluZCgoYykgPT4gZnMuZXhpc3RzU3luYyhjKSkgPz8gbnVsbDtcbiAgfVxufVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFBQUEsb0JBQTBDOzs7QUNZbkMsSUFBTSxtQkFBZ0M7QUFBQSxFQUMzQyx3QkFBd0I7QUFBQSxFQUN4QixtQkFBbUI7QUFBQSxJQUNqQixhQUFhO0FBQUEsSUFDYixlQUFlO0FBQUEsSUFDZixZQUFZO0FBQUEsRUFDZDtBQUNGOzs7QUNuQkEsV0FBc0I7QUFDdEIsU0FBb0I7QUFTYixTQUFTLHFCQUFxQixlQUFzQztBQUN6RSxNQUFJLE1BQU07QUFDVixXQUFTLElBQUksR0FBRyxJQUFJLEdBQUcsS0FBSztBQUMxQixVQUFNLFlBQWlCLFVBQUssS0FBSyxXQUFXLE9BQU87QUFDbkQsUUFBTyxjQUFXLFNBQVMsS0FBUSxZQUFTLFNBQVMsRUFB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QUFLLFNBQVMsS0FBSyxRQUFRO0FBQUEsRUFDbkM7QUFBQTtBQUFBO0FBQUEsRUFLUSx3QkFBOEI7QUFDcEMsUUFBSSxLQUFLLFNBQVMsd0JBQXdCO0FBQ3hDLFdBQUssaUJBQWlCLEtBQUssU0FBUztBQUNwQztBQUFBLElBQ0Y7QUFDQSxVQUFNLFVBQVUsS0FBSyxJQUFJLE1BQU07QUFDL0IsUUFBSSxtQkFBbUIscUNBQW1CO0FBQ3hDLFlBQU0sV0FBWSxRQUE0QztBQUM5RCxXQUFLLGlCQUFpQixxQkFBcUIsUUFBUTtBQUFBLElBQ3JEO0FBQUEsRUFDRjtBQUFBLEVBRVEsY0FBb0I7QUFDMUIsUUFBSSxDQUFDLEtBQUssZ0JBQWdCO0FBQ3hCLGFBQU8sS0FBSyw2SEFBa0Q7QUFDOUQ7QUFBQSxJQUNGO0FBQ0EsU0FBSyxlQUFlLElBQUksYUFBYSxLQUFLLGNBQWM7QUFDeEQsU0FBSyxtQkFBbUIsSUFBSSx3QkFBd0IsS0FBSyxjQUFjO0FBQUEsRUFDekU7QUFBQTtBQUFBLEVBR0EsTUFBTSxnQkFBK0I7QUFDbkMsU0FBSyxzQkFBc0I7QUFDM0IsU0FBSyxZQUFZO0FBQUEsRUFDbkI7QUFBQTtBQUFBLEVBSUEsTUFBTSxlQUE4QjtBQUNsQyxVQUFNLEVBQUUsVUFBVSxJQUFJLEtBQUs7QUFDM0IsVUFBTSxXQUFXLFVBQVUsZ0JBQWdCLGFBQWE7QUFDeEQsUUFBSSxTQUFTLFNBQVMsR0FBRztBQUN2QixnQkFBVSxXQUFXLFNBQVMsQ0FBQyxDQUFDO0FBQ2hDO0FBQUEsSUFDRjtBQUNBLFVBQU0sT0FBTyxVQUFVLGFBQWEsS0FBSztBQUN6QyxRQUFJLE1BQU07QUFDUixZQUFNLEtBQUssYUFBYSxFQUFFLE1BQU0sZUFBZSxRQUFRLEtBQUssQ0FBQztBQUM3RCxnQkFBVSxXQUFXLElBQUk7QUFBQSxJQUMzQjtBQUFBLEVBQ0Y7QUFDRjsiLAogICJuYW1lcyI6IFsiaW1wb3J0X29ic2lkaWFuIiwgInBhdGgiLCAiZnMiLCAicGF0aCIsICJleGlzdHNTeW5jIiwgInN0YXQiLCAiZXhpc3RzU3luYyIsICJwYXRoIiwgImltcG9ydF9vYnNpZGlhbiIsICJwYXRoIiwgImltcG9ydF9vYnNpZGlhbiIsICJwYXRoIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiaW1wb3J0X29ic2lkaWFuIiwgIl9hIiwgInRhIiwgImltcG9ydF9vYnNpZGlhbiIsICJpbXBvcnRfb2JzaWRpYW4iLCAiUnVsZUVkaXRNb2RhbCIsICJOZXdSdWxlTW9kYWwiLCAiaW1wb3J0X29ic2lkaWFuIiwgInBhdGgiLCAiZnMiXQp9Cg==
