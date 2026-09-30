# Development recipes

Start with the two included commands and keep only what your extension needs. These examples target Tinycast, not the full Raycast runtime. Check your installed Tinycast version before using another API.

## Add a command

Create a root file, for example `show-message.js`:

```js
const React = require("react");
const { Detail } = require("@raycast/api");

exports.default = function ShowMessage() {
  return React.createElement(Detail, { markdown: "Hello from your extension." });
};
```

Add a matching entry to `package.json`:

```json
{
  "name": "show-message",
  "title": "Show Message",
  "description": "Display a message",
  "mode": "view"
}
```

For a `view` command, default-export a React component. For `no-view`, default-export a function, optionally async; it should complete its work without returning UI. The manifest `commands` array is the updater's source of truth. Remove a command there when you stop shipping it.

Do not import local files from a command unless you bundle them first. Tinycast's installer copies root command bundles and `assets/`, not your source module tree or `node_modules/`. The developer scripts run in ordinary Node.js and can use local imports.

## Preferences

Put an extension-wide `preferences` array in `package.json`, or add one to a command for command-specific settings:

```json
"preferences": [
  {
    "name": "cliPath",
    "type": "file",
    "title": "CLI Executable",
    "description": "Select the executable used by this extension.",
    "required": true
  }
]
```

Read it inside your command:

```js
const { getPreferenceValues } = require("@raycast/api");
const { cliPath } = getPreferenceValues();
```

Do not put a developer's home directory or credentials in a preference default. A GUI app may have a different PATH from your terminal, so an executable preference is often more reliable than a bare CLI name.

## Asynchronous data

When replacing the example records with an API or CLI:

- Use `React.useState` for items, loading state, and errors.
- Start requests in `React.useEffect`, not during rendering.
- Set `List.isLoading` while a request is pending.
- Show a useful empty/error view and a retry action.
- Clean up the effect so completed requests do not update an unmounted view.
- Cancel or invalidate obsolete requests when search inputs change. Otherwise a slow older response can replace newer results.
- Bound concurrent lookups. Load expensive detail fields when the user opens the detail, not for every list row.

For example, when you have an asynchronous `loadItems()` function:

```js
React.useEffect(() => {
  let cancelled = false;
  setLoading(true);
  setError("");
  loadItems()
    .then((items) => { if (!cancelled) setItems(items); })
    .catch(() => { if (!cancelled) setError("Could not load items. Check the connection and try again."); })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, []);
```

This prevents stale state updates; it does not cancel the underlying operation. Add timeouts or supported cancellation to your data loader.

## CLI integration

Tinycast's `child_process` is a host shim. In the installed runtime used to develop this template, `execFile` without a callback returns a promise of `{ status, stdout, stderr }`. This differs from ordinary Node.js. Check `status` explicitly; a nonzero exit must not be treated as success.

```js
const { execFile } = require("child_process");
const { getPreferenceValues } = require("@raycast/api");

async function loadItems() {
  const { cliPath } = getPreferenceValues();
  const result = await execFile(cliPath, ["list", "--output", "json"], { timeout: 30000 });
  if (result.status !== 0) throw new Error("Could not list items. Check the CLI session.");
  return JSON.parse(result.stdout);
}
```

Use an argument array rather than building a shell command from user input. Avoid `/bin/sh -c` unless a shell is essential. Do not log stdout, stderr, or arguments that might contain sensitive values. The template does not install or authenticate any external CLI for users.

## Cache and storage

`Cache` is synchronous and string-valued. `LocalStorage` is asynchronous and supports persistent application values. Both are extension-scoped. Neither should be treated as a secret store.

```js
const { Cache } = require("@raycast/api");
const cache = new Cache();
const key = "item-index-v1";

function readCachedItems() {
  const raw = cache.get(key);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw);
    if (!Array.isArray(entry.items) || !Number.isFinite(entry.expiresAt)) return null;
    return entry;
  } catch {
    return null; // Discard invalid cache entries and reload from the source.
  }
}

function cacheItems(items) {
  cache.set(key, JSON.stringify({ items, expiresAt: Date.now() + 5 * 60 * 1000 }));
}
```

Keep expiration policy explicit. You can show an expired index immediately, then refresh it in the background. Version keys when the stored shape changes. Cache only the fields required by your list; never cache passwords, tokens, or other secrets.

## Icons

The included icon is a generic code symbol, not a Tinycast or Raycast logo. Edit `assets/extension-icon.svg` and regenerate its PNG with ImageMagick if you want to modify it:

```sh
magick -background none assets/extension-icon.svg assets/extension-icon.png
```

ImageMagick is only needed to regenerate the icon. You can instead supply your own PNG and change `package.json.icon`. Manifest icon paths are relative to `assets/`. Use `Icon` from `@raycast/api` for native list/action symbols.

## Verify in Tinycast

The checks and tooling tests do not prove native rendering. After installing or updating:

1. Open your view command and verify its initial data.
2. Search for a match and for an empty result.
3. Change the dropdown filter and open a detail.
4. Run copy and open actions. Check the copied value.
5. Run any `no-view` commands and verify their effects.
6. For external integrations, try missing executables, signed-out sessions, malformed output, and timeouts without exposing secrets.

Test a fresh clone before publishing. Do not distribute private Tinycast extension-data or extension-support directories.
