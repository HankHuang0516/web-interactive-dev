# web-interactive-dev — spec v1.3 (impl)

Implementation of the spec gated by card_ba085c28 (PR review PASS from #6 + #1).
Schema version: **1.2**. Implementation version: **0.1.0**.

## 1. Scope

- Browser-only static SPA.
- Single local user; no auth, no network, no persistence beyond the open tab.
- No EClaw API calls (`/api/*` not referenced anywhere in this repo).

## 2. UI states

`index.html` exposes two textareas (`#orig` / `#edit`), a `Generate Prompt`
button, a `Copy Prompt` button, a format selector (`unified` | `json`), and two
output panes (`Diff`, `Prompt for Agent`). The page boots with sample content so
the first paint already produces a non-empty diff + prompt; this is the
acceptance bar for the empty-state E2E.

State machine (purely client-side):

- `ready` — initial / after any input change.
- `generated <iso-timestamp>` — after a successful Generate run.
- `prompt copied` — after a successful Copy.
- `error: <message>` — when `captureEdits` throws (e.g. non-string input).

## 3. Diff format

The output of `captureEdits(original, edited, opts)` is a plain JSON object
matching `schema.json` (schema v1.2). The `format` option chooses between
`unified-diff` (which adds a stringified `unified` field) and `json-patch`
(hunks only). Both retain the structural `hunks[]` so downstream tooling can
reconstruct either rendering.

Hunks use 3-line context by default; tunable via `opts.contextLines`.
`originalHash` / `editedHash` are 8-char djb2 hex digests so the prompt receiver
can detect drift before applying.

## 4. Prompt template

The default template is exported as `DEFAULT_PROMPT_TEMPLATE` inside `wid.js`.
Placeholders are double-curly tokens: `{{originalName}}`, `{{editedName}}`,
`{{schemaVersion}}`, `{{format}}`, `{{diffBody}}`. Callers can pass
`opts.template` to override; missing placeholders are left literal so unknown
tokens are surfaced as bugs, not silently dropped.

The diff body is always rendered as a unified-diff fenced code block, even when
the wire format is `json-patch`; this keeps the prompt compatible with any
Agent that understands `diff` syntax highlighting.

## 5. Public API

```js
import { captureEdits, formatAsPrompt, SCHEMA_VERSION, VERSION } from '@hankhuang0516/web-interactive-dev';

const diff = captureEdits(originalString, editedString, { format: 'unified' });
const prompt = formatAsPrompt(diff);
```

- `captureEdits(original: string, edited: string, opts?: object): Diff` — pure
  function. Throws `TypeError` for non-string inputs.
- `formatAsPrompt(diff: Diff, opts?: object): string` — pure function. Throws
  `TypeError` when `diff` is not an object.
- `SCHEMA_VERSION` — string, currently `"1.2"`.
- `VERSION` — string, currently `"0.1.0"`.

`__internal` is exposed for the test suite only and is **not** part of the
stable surface.

## 6. Boundary (spec v1.3 §6)

This package never imports or calls into EClaw runtime, kanban, device-vars,
bridge-auth, or any other EClaw-specific API. Integration into EClaw is the
sole responsibility of the adapter layer card (`card_a0a04dbf`), which will
consume this package via npm or iframe embed — no fork.

## 7. E2E scenarios

`tests/wid.spec.js` runs five happy paths against the static demo:

1. Page loads with non-empty diff + prompt rendered from seeded sample content.
2. Editing the `edited` pane and pressing `Generate Prompt` updates both
   output panes.
3. Switching format `unified → json` toggles the `Diff` pane representation.
4. `Copy Prompt` populates the clipboard with the current prompt text.
5. Identical `original` / `edited` content produces a `changeCount: 0` diff
   and a prompt with an empty fenced block.

## 8. Out of scope (v1)

- Mobile / native ports.
- Multi-user / auth.
- Server-side persistence.
- EClaw integration (deferred to `card_a0a04dbf`).
