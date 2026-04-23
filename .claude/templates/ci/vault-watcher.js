// Usage: node vault-watcher.js [vault-root]
//   Scans recursively for Windows reserved file names on startup, then watches
//   for new creations with fs.watch and logs alerts.
//
// Run as a background process alongside Obsidian (e.g. via Obsidian Shell
// Commands plugin startup hook, PM2, or a systemd/launchd unit).
//
// Source: deep research 2026-04-21 (`20260421_nul_파일_누적_생성_이슈_리서치.md`)

const fs = require("node:fs");
const path = require("node:path");

const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const root = process.argv[2] || process.cwd();

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (reserved.test(entry.name)) {
      console.error(`[ALERT] reserved Windows name detected: ${full}`);
    }
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      try { scan(full); } catch (e) { /* inaccessible dir — skip */ }
    }
  }
}

scan(root);

fs.watch(root, { recursive: true }, (_eventType, filename) => {
  if (!filename) return;
  const base = path.basename(filename.toString());
  if (reserved.test(base)) {
    console.error(`[ALERT] reserved Windows name detected: ${path.join(root, filename.toString())}`);
  }
});
