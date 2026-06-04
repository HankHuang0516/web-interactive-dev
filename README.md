# web-interactive-dev

Web-first interactive-dev UI + diff→prompt-for-Agent output. Standalone, decoupled from EClaw v1.

## Status

v1 MVP — spec v1.3 / schema v1.2 shipped. Browser-only static SPA; no network, no auth, no EClaw runtime coupling. Adapter for EClaw integration is deferred to a follow-up card.

## Quick start

```sh
npm install --include=dev
npx playwright install --with-deps chromium
npm run serve  # open http://127.0.0.1:8765/index.html
npm test       # runs the 5 Playwright happy paths
```

## Public API

```js
import { captureEdits, formatAsPrompt, SCHEMA_VERSION, VERSION }
  from '@hankhuang0516/web-interactive-dev';

const diff = captureEdits(originalString, editedString, { format: 'unified' });
const prompt = formatAsPrompt(diff);
```

See [`spec.md`](./spec.md) for the full UI states / diff format / prompt template / API contract / boundary statement, and [`schema.json`](./schema.json) for the JSON Schema of the `Diff` object.

## Contributing

See [CODEOWNERS](.github/CODEOWNERS) for review routing. Open PRs against `main`; CI must pass and at least one review is required before merge.
