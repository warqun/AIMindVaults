/**
 * version-range — Simple semver-like compatibility check.
 *
 * Accepts version strings of the form "major.minor.patch" and ranges:
 *   "1.2.3"     — exact match
 *   "^1.2.3"    — same major (1.x.x, x >= 2.3)
 *   "~1.2.3"    — same minor (1.2.x, x >= 3)
 *   ">=1.2.3"   — >= 1.2.3
 *   "<=1.2.3"   — <= 1.2.3
 *   ">1.2.3"    — > 1.2.3
 *   "<1.2.3"    — < 1.2.3
 *
 * @param {string} actual - Actual version (e.g. "1.3.0")
 * @param {string} requirement - Range string (e.g. "^1.2.0")
 * @returns {{ok: boolean, reason?: string}}
 */
export function checkVersionRange(actual, requirement) {
  if (!requirement) return { ok: true };
  if (!actual) return { ok: false, reason: 'No version declared to verify' };

  const parse = (v) => v.replace(/^[v~^>=<\s]+/, '').split('.').map(n => parseInt(n, 10) || 0);
  const [aM, am, ap] = parse(actual);
  const [rM, rm, rp] = parse(requirement);
  const op = requirement.match(/^(\^|~|>=|<=|>|<|=)/)?.[1] || '=';

  const fmt = `${aM}.${am}.${ap}`;
  const req = `${rM}.${rm}.${rp}`;

  switch (op) {
    case '^':
      if (aM !== rM) return { ok: false, reason: `${fmt} major mismatch with ^${req}` };
      if (am > rm) return { ok: true };
      if (am === rm && ap >= rp) return { ok: true };
      return { ok: false, reason: `${fmt} < required ^${req}` };
    case '~':
      return aM === rM && am === rm && ap >= rp
        ? { ok: true }
        : { ok: false, reason: `${fmt} mismatch with ~${req}` };
    case '>=':
      return gte([aM, am, ap], [rM, rm, rp])
        ? { ok: true }
        : { ok: false, reason: `${fmt} < required >=${req}` };
    case '<=':
      return gte([rM, rm, rp], [aM, am, ap])
        ? { ok: true }
        : { ok: false, reason: `${fmt} > required <=${req}` };
    case '>':
      return gt([aM, am, ap], [rM, rm, rp])
        ? { ok: true }
        : { ok: false, reason: `${fmt} <= required >${req}` };
    case '<':
      return gt([rM, rm, rp], [aM, am, ap])
        ? { ok: true }
        : { ok: false, reason: `${fmt} >= required <${req}` };
    case '=':
    default:
      return (aM === rM && am === rm && ap === rp)
        ? { ok: true }
        : { ok: false, reason: `${fmt} != required ${req}` };
  }
}

function gte(a, b) {
  if (a[0] !== b[0]) return a[0] > b[0];
  if (a[1] !== b[1]) return a[1] > b[1];
  return a[2] >= b[2];
}

function gt(a, b) {
  if (a[0] !== b[0]) return a[0] > b[0];
  if (a[1] !== b[1]) return a[1] > b[1];
  return a[2] > b[2];
}
