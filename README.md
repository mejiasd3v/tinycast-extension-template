# Tinycast extension template

Build a custom [Tinycast](https://tinycast.dev) extension from a small, working example. Plain JavaScript, CommonJS, no dependencies, no bundler.

Includes:

- A searchable list with a category filter, detail view, and open/copy actions.
- A `no-view` command that copies text and shows a HUD.
- Manifest and syntax checks, a local updater, and focused tooling tests.
- A neutral icon and MIT license. No external accounts or API keys required.

This is an independent community template, not an official Tinycast or Raycast SDK.

## Try it

1. Download or clone this repository.
2. In Tinycast, enable extensions in **Settings > Extensions**.
3. Choose **Install > Add from folder** and select this repository's folder.
4. Launch **Search Example Items** or **Copy Example Text**.

Tinycast copies the manifest, command files, and assets into its own installation directory. It does not run commands directly from your checkout. You do not need Node.js to run the examples in Tinycast.

## Make your own extension

Use GitHub's **Use this template** button, or copy this folder without its `.git` directory.

1. Edit `package.json`:
   - Give `name` a unique lowercase, hyphenated value, such as `tinycast-my-extension`. It identifies the installation, preferences, and storage.
   - Replace `title`, `description`, and `author`.
   - Update command names, titles, descriptions, and modes.
2. Rename each command file to match its manifest name exactly: a command named `search-projects` needs `search-projects.js` at the repository root.
3. Replace the records and behavior in `search-items.js`. Keep the examples you need and remove the others from both the manifest and the folder.
4. Replace `assets/extension-icon.png` with your own icon, or remove `icon` from the manifest. The included SVG is its editable source.
5. Run the checks, then install your new folder in Tinycast.

Keep the extension name stable after installation. Changing it creates a separate extension identity; the updater will not rename an existing installation.

## Develop and update

For the developer scripts, use Node.js 22 or newer. [Nub](https://nubjs.com) is optional; no dependency installation is needed.

```sh
cd tinycast-extension-template
nub run check
nub run test
nub run update --dry-run
nub run update
```

With npm, use `npm run check`, `npm test`, `npm run update -- --dry-run`, and `npm run update`.

- **check** validates manifest names, modes, icons, command files, and CommonJS syntax. It does not validate every API or execute your UI.
- **build** runs the same checks. These JavaScript files are already standalone command bundles, so there is nothing to compile.
- **test** runs tooling tests using disposable directories. It never updates your actual Tinycast installation. Update tests require macOS.
- **update --dry-run** lists files that would be copied to an existing installation.
- **update** copies all declared commands, the contents of `assets/`, and the manifest. It stages the files, replaces each file atomically, and writes the manifest last. The whole update is not transactional.

Install once through Tinycast before using the updater. Close and reopen the command after a code change. Restart Tinycast after manifest changes, or if it still runs the old code.

The updater targets:

```text
~/Library/Application Support/com.tinycast.app/extensions/<package-name>/
```

It preserves extension data, preferences, and unrelated installed files. It does not delete old commands or assets; remove obsolete files from your source and reinstall if you need to clean up the installed copy. It supports the stable Tinycast app's default directory, not alternate app channels. Symlinks in the install payload or destination are rejected.

## Files

```text
package.json                 Tinycast manifest and developer scripts
search-items.js              Search, filter, detail, and action example
copy-example.js              Background command example
assets/extension-icon.png    Default icon
assets/extension-icon.svg    Editable icon source
scripts/extension.cjs        Shared manifest and payload validation
scripts/check.cjs            Check the installable extension
scripts/update.cjs           Update an existing local installation
test/update.test.cjs         Tooling checks against temporary installations
docs/development.md          Runtime rules and recipes
.github/workflows/check.yml  Checks and tests on macOS
LICENSE                     MIT
```

Command files and installable assets are tracked in Git. Do not ignore your root command `.js` files: a fresh clone must be installable.

## Runtime and customization

Tinycast uses JavaScriptCore and native macOS views, not a Node.js process or browser. It provides `react`, a compatibility implementation of `@raycast/api`, and selected Node built-ins. The `require("@raycast/api")` imports in the examples use Tinycast's runtime implementation; they do not require installing the Raycast npm package.

Each command must be a standalone CommonJS file with a default export. Local `require("./helper")` calls and unbundled npm dependencies do not work in the command runtime. If you split command code into modules or use TypeScript/JSX, add a bundler that produces one root `<command-name>.js` file per command and leaves `react` and `@raycast/api` external.

See [development recipes](docs/development.md) for adding commands, preferences, caching, asynchronous work, and CLI integrations. Check Tinycast's [extension documentation](https://github.com/abue-ammar/tinycast/blob/main/docs/features/extensions.md) for the APIs your installed version supports. Raycast's API documentation alone is not a compatibility guarantee.

## Open source

The template code and neutral icon are MIT licensed. Keep the license notice when reusing them. Before publishing your extension:

- Replace placeholder metadata and examples.
- Keep credentials, personal paths, cached data, and local fixtures out of Git. `.env*` files are ignored; `.env.example` is intentionally allowed and must contain placeholders only.
- Use assets you own or have permission to redistribute. The template contains no third-party brand assets.
- Document any required external app or CLI and how users authenticate.
- On GitHub, enable **Settings > General > Template repository** if you want others to reuse your repository with **Use this template**.

Publishing a source repository does not automatically add it to Tinycast's extension registries.
