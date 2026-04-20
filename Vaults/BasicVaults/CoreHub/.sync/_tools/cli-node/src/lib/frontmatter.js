/**
 * Frontmatter parsing and line-based patching.
 *
 * Strategy (from research):
 * - gray-matter for boundary detection + read-only parsing
 * - Line-based regex replacement for edits (stringify() destroys formatting)
 */

import matter from 'gray-matter';

/**
 * Parse frontmatter from markdown content.
 * Returns parsed data object + raw frontmatter string + body.
 * @param {string} content - Full markdown file content.
 * @returns {{ data: object, raw: string, body: string }}
 */
export function parseFrontmatter(content) {
  const result = matter(content);
  return {
    data: result.data,
    raw: result.matter,    // raw YAML string between ---
    body: result.content,  // everything after closing ---
  };
}

/**
 * Check if content has valid frontmatter.
 * @param {string} content
 * @returns {boolean}
 */
export function hasFrontmatter(content) {
  return /^---\s*\n/.test(content);
}

/**
 * Replace a single frontmatter field value without disturbing other lines.
 * If the field doesn't exist, it is appended before the closing ---.
 *
 * @param {string} content - Full markdown content.
 * @param {string} key - Field name to replace.
 * @param {string} value - New value.
 * @returns {string} Updated full content.
 */
export function patchFrontmatterField(content, key, value) {
  const fmMatch = content.match(/^(---\s*\n)([\s\S]*?\n)(---)/);
  if (!fmMatch) return content;

  const opening = fmMatch[1];
  const rawYaml = fmMatch[2];
  const closing = fmMatch[3];
  const afterFm = content.slice(fmMatch[0].length);

  const re = new RegExp(`^(${key}\\s*:\\s*).*$`, 'm');
  let updatedYaml;

  if (re.test(rawYaml)) {
    updatedYaml = rawYaml.replace(re, `$1${value}`);
  } else {
    // Append field before closing ---
    updatedYaml = rawYaml + `${key}: ${value}\n`;
  }

  return opening + updatedYaml + closing + afterFm;
}

/**
 * Lightweight frontmatter parser without gray-matter dependency.
 * Matches PS1 Parse-Frontmatter behavior for index building.
 * Handles: scalar values, inline arrays [a, b], YAML list (- item).
 *
 * @param {string} content - Full markdown content.
 * @returns {object} Parsed frontmatter as key-value pairs.
 */
export function parseFrontmatterLight(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};

  const fm = {};
  const lines = match[1].split('\n');
  let currentKey = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const kvMatch = line.match(/^(.*?)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const val = kvMatch[2].trim();

      // Inline array: [a, b, c]
      const inlineArr = val.match(/^\[(.+)\]$/);
      if (inlineArr) {
        fm[key] = inlineArr[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        currentKey = null;
      }
      // Block scalar or list start
      else if (val === '' || val === '|' || val === '>') {
        currentKey = key;
        fm[key] = [];
      }
      // Simple scalar
      else {
        fm[key] = val.replace(/^["']|["']$/g, '');
        currentKey = null;
      }
    }
    // List item under current key
    else if (currentKey && line.match(/^-\s+(.+)$/)) {
      const itemVal = line.match(/^-\s+(.+)$/)[1].trim().replace(/^["']|["']$/g, '');
      fm[currentKey].push(itemVal);
    }
    // Continuation under current key
    else if (currentKey) {
      fm[currentKey].push(line);
    }
  }

  // Ensure tags is always an array
  if (fm.tags && typeof fm.tags === 'string') {
    fm.tags = [fm.tags];
  }

  return fm;
}
