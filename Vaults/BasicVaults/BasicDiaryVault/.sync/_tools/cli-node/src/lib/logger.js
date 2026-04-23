/**
 * Structured output formatting.
 * stdout for normal output, stderr for errors.
 * Matches PS1 Write-Host / Write-Error patterns.
 */

/**
 * @param {'info'|'warn'|'error'|'debug'} level
 * @param {string} message
 */
function write(level, message) {
  const prefix = level === 'info' ? '' : `[${level.toUpperCase()}] `;
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(`${prefix}${message}\n`);
}

export function info(message) { write('info', message); }
export function warn(message) { write('warn', message); }
export function error(message) { write('error', message); }

/**
 * Print a summary box matching PS1 style.
 * @param {string} title
 * @param {Record<string, string|number>} fields
 */
export function summary(title, fields) {
  const bar = '='.repeat(38);
  info('');
  info(bar);
  info(` ${title}`);
  info(bar);
  for (const [key, val] of Object.entries(fields)) {
    info(` ${key.padEnd(9)}: ${val}`);
  }
  info(bar);
}

/**
 * Print key=value for machine-parseable output (Shell Commands integration).
 * @param {string} key
 * @param {string|number} value
 */
export function envVar(key, value) {
  info(`${key}=${value}`);
}
