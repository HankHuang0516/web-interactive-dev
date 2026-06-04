// web-interactive-dev v1
// Public API per spec v1.3 / schema v1.2.
// Browser-only. No EClaw, no network, no auth.

const SCHEMA_VERSION = '1.2';
const VERSION = '0.1.0';

function hashString(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0');
}

function splitLines(s) {
  if (!s) return [];
  return s.split('\n');
}

function unifiedDiff(originalLines, editedLines) {
  const m = originalLines.length;
  const n = editedLines.length;
  const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = originalLines[i] === editedLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (originalLines[i] === editedLines[j]) {
      ops.push({ op: ' ', line: originalLines[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ op: '-', line: originalLines[i] });
      i++;
    } else {
      ops.push({ op: '+', line: editedLines[j] });
      j++;
    }
  }
  while (i < m) { ops.push({ op: '-', line: originalLines[i++] }); }
  while (j < n) { ops.push({ op: '+', line: editedLines[j++] }); }
  return ops;
}

function opsToHunks(ops, contextLines = 3) {
  const hunks = [];
  let i = 0;
  let origLine = 1, editLine = 1;
  while (i < ops.length) {
    while (i < ops.length && ops[i].op === ' ') { i++; origLine++; editLine++; }
    if (i >= ops.length) break;
    const start = Math.max(0, i - contextLines);
    const ctxBefore = i - start;
    let j = i;
    let lastChange = i;
    while (j < ops.length) {
      if (ops[j].op !== ' ') { lastChange = j; j++; continue; }
      let look = 0;
      let k = j;
      while (k < ops.length && ops[k].op === ' ' && look < contextLines * 2) { k++; look++; }
      if (k >= ops.length || ops[k].op === ' ') break;
      j = k;
    }
    const end = Math.min(ops.length, lastChange + 1 + contextLines);
    const hunkOps = ops.slice(start, end);
    let origStart = origLine - ctxBefore;
    let editStart = editLine - ctxBefore;
    let origCount = 0, editCount = 0;
    for (const o of hunkOps) {
      if (o.op === ' ') { origCount++; editCount++; }
      else if (o.op === '-') { origCount++; }
      else if (o.op === '+') { editCount++; }
    }
    hunks.push({
      originalStart: Math.max(1, origStart),
      originalCount: origCount,
      editedStart: Math.max(1, editStart),
      editedCount: editCount,
      lines: hunkOps,
    });
    for (let q = i; q < end; q++) {
      if (ops[q].op !== '+') origLine++;
      if (ops[q].op !== '-') editLine++;
    }
    i = end;
  }
  return hunks;
}

function renderUnifiedText(hunks, originalName, editedName) {
  const parts = [`--- ${originalName}`, `+++ ${editedName}`];
  for (const h of hunks) {
    parts.push(`@@ -${h.originalStart},${h.originalCount} +${h.editedStart},${h.editedCount} @@`);
    for (const op of h.lines) parts.push(op.op + op.line);
  }
  return parts.join('\n');
}

export function captureEdits(original, edited, opts = {}) {
  if (typeof original !== 'string' || typeof edited !== 'string') {
    throw new TypeError('captureEdits: original and edited must be strings');
  }
  const format = opts.format === 'unified' ? 'unified-diff' : 'json-patch';
  const contextLines = typeof opts.contextLines === 'number' ? opts.contextLines : 3;
  const originalName = opts.originalName || 'original';
  const editedName = opts.editedName || 'edited';
  const originalLines = splitLines(original);
  const editedLines = splitLines(edited);
  const ops = unifiedDiff(originalLines, editedLines);
  const hunks = opsToHunks(ops, contextLines);
  const changeCount = ops.reduce((acc, o) => acc + (o.op !== ' ' ? 1 : 0), 0);
  const result = {
    schemaVersion: SCHEMA_VERSION,
    format,
    originalHash: hashString(original),
    editedHash: hashString(edited),
    originalName,
    editedName,
    changeCount,
    hunks,
  };
  if (format === 'unified-diff') {
    result.unified = renderUnifiedText(hunks, originalName, editedName);
  }
  return result;
}

const DEFAULT_PROMPT_TEMPLATE = [
  'You are helping the user iterate on a file via the web-interactive-dev UI.',
  '',
  'Original file: {{originalName}}',
  'Edited file:   {{editedName}}',
  'Schema:        {{schemaVersion}}',
  'Format:        {{format}}',
  '',
  'The user produced this diff:',
  '',
  '```diff',
  '{{diffBody}}',
  '```',
  '',
  'Please:',
  '1. Summarise the intent of the user’s edits in one sentence.',
  '2. Apply the edits faithfully and return the full updated file.',
  '3. Flag any change that looks unintentional or risky.',
].join('\n');

export function formatAsPrompt(diff, opts = {}) {
  if (!diff || typeof diff !== 'object') {
    throw new TypeError('formatAsPrompt: diff must be an object from captureEdits()');
  }
  const template = typeof opts.template === 'string' ? opts.template : DEFAULT_PROMPT_TEMPLATE;
  const diffBody = diff.unified || renderUnifiedText(diff.hunks || [], diff.originalName || 'original', diff.editedName || 'edited');
  return template
    .replaceAll('{{originalName}}', diff.originalName || 'original')
    .replaceAll('{{editedName}}', diff.editedName || 'edited')
    .replaceAll('{{schemaVersion}}', diff.schemaVersion || SCHEMA_VERSION)
    .replaceAll('{{format}}', diff.format || 'json-patch')
    .replaceAll('{{diffBody}}', diffBody);
}

export const __internal = { hashString, unifiedDiff, opsToHunks, renderUnifiedText };
export { SCHEMA_VERSION, VERSION };
