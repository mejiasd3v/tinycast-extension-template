const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");

function fixture(t) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "tinycast-template-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, "source");
  const home = path.join(root, "home");
  const installed = path.join(home, "Library", "Application Support", "com.tinycast.app", "extensions", "custom-extension");
  fs.mkdirSync(path.join(source, "assets", "nested"), { recursive: true });
  fs.cpSync(path.resolve(__dirname, "../scripts"), path.join(source, "scripts"), { recursive: true });
  const manifest = {
    name: "custom-extension", title: "Custom Extension", platforms: ["macOS"], icon: "custom.svg",
    commands: [
      { name: "lookup", title: "Look Up", mode: "view" },
      { name: "copy-value", title: "Copy Value", mode: "no-view" },
    ],
  };
  const saveManifest = () => fs.writeFileSync(path.join(source, "package.json"), JSON.stringify(manifest));
  saveManifest();
  fs.writeFileSync(path.join(source, "lookup.js"), "exports.default = function Lookup() {};\n");
  fs.writeFileSync(path.join(source, "copy-value.js"), "exports.default = async function CopyValue() {};\n");
  fs.writeFileSync(path.join(source, "assets/custom.svg"), "<svg/>");
  fs.writeFileSync(path.join(source, "assets/nested/content.json"), '{"value":"example"}');
  const run = (script, ...args) => spawnSync(process.execPath, [path.join(source, "scripts", script), ...args], {
    cwd: root, env: { ...process.env, HOME: home }, encoding: "utf8",
  });
  const install = () => {
    fs.mkdirSync(installed, { recursive: true });
    fs.writeFileSync(path.join(installed, "package.json"), JSON.stringify({ name: manifest.name }));
    fs.writeFileSync(path.join(installed, "lookup.js"), "old command");
  };
  return { source, home, installed, manifest, saveManifest, run, install };
}

test("update discovers renamed commands and nested assets, while preserving installed data", { skip: process.platform !== "darwin" }, (t) => {
  const f = fixture(t);
  const missing = f.run("update.cjs");
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /Install Custom Extension/);
  assert.equal(fs.existsSync(f.installed), false);

  f.install();
  const cache = path.join(f.home, "Library", "Application Support", "com.tinycast.app", "extension-data", "custom-extension.json");
  fs.mkdirSync(path.dirname(cache), { recursive: true });
  fs.writeFileSync(cache, '{"cached":"keep"}');
  fs.writeFileSync(path.join(f.installed, "keep.txt"), "keep");

  const preview = f.run("update.cjs", "--dry-run");
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /lookup\.js/);
  assert.match(preview.stdout, /nested\/content\.json/);
  assert.equal(fs.readFileSync(path.join(f.installed, "lookup.js"), "utf8"), "old command");
  assert.equal(fs.existsSync(path.join(f.installed, "copy-value.js")), false);

  const updated = f.run("update.cjs");
  assert.equal(updated.status, 0, updated.stderr);
  for (const file of ["package.json", "lookup.js", "copy-value.js", "assets/custom.svg", "assets/nested/content.json"]) {
    assert.deepEqual(fs.readFileSync(path.join(f.installed, file)), fs.readFileSync(path.join(f.source, file)));
  }
  assert.equal(fs.readFileSync(cache, "utf8"), '{"cached":"keep"}');
  assert.equal(fs.readFileSync(path.join(f.installed, "keep.txt"), "utf8"), "keep");
  assert.equal(fs.readdirSync(f.installed).some((name) => name.startsWith(".update-")), false);
});

test("check rejects invalid install payloads", (t) => {
  const f = fixture(t);
  assert.equal(f.run("check.cjs").status, 0);

  for (const [name, change, restore, expected] of [
    ["extension path traversal", () => { f.manifest.name = "../escape"; }, () => { f.manifest.name = "custom-extension"; }, /Extension name/],
    ["command path traversal", () => { f.manifest.commands[0].name = "../escape"; }, () => { f.manifest.commands[0].name = "lookup"; }, /Command names/],
    ["duplicate commands", () => { f.manifest.commands[1].name = "lookup"; }, () => { f.manifest.commands[1].name = "copy-value"; }, /Duplicate command/],
    ["missing command", () => { fs.renameSync(path.join(f.source, "lookup.js"), path.join(f.source, "saved.js")); }, () => { fs.renameSync(path.join(f.source, "saved.js"), path.join(f.source, "lookup.js")); }, /lookup\.js/],
    ["invalid syntax", () => { fs.writeFileSync(path.join(f.source, "lookup.js"), "exports.default = ("); }, () => { fs.writeFileSync(path.join(f.source, "lookup.js"), "exports.default = function Lookup() {};"); }, /Unexpected/],
    ["icon path traversal", () => { f.manifest.icon = "../lookup.js"; }, () => { f.manifest.icon = "custom.svg"; }, /Icon must name/],
    ["linked asset", () => { fs.symlinkSync(path.join(f.source, "lookup.js"), path.join(f.source, "assets/link.js")); }, () => { fs.unlinkSync(path.join(f.source, "assets/link.js")); }, /not symlinks/],
  ]) {
    change();
    f.saveManifest();
    const result = f.run("check.cjs");
    assert.equal(result.status, 1, name);
    assert.match(result.stderr, expected, name);
    restore();
    f.saveManifest();
  }
});

test("update rejects mismatches and unsafe destinations before modifying installed commands", { skip: process.platform !== "darwin" }, (t) => {
  const f = fixture(t);
  f.install();
  fs.writeFileSync(path.join(f.installed, "package.json"), '{"name":"another-extension"}');
  const mismatch = f.run("update.cjs");
  assert.equal(mismatch.status, 1);
  assert.match(mismatch.stderr, /does not match/);
  assert.equal(fs.readFileSync(path.join(f.installed, "lookup.js"), "utf8"), "old command");

  fs.writeFileSync(path.join(f.installed, "package.json"), JSON.stringify({ name: f.manifest.name }));
  fs.symlinkSync(path.join(f.source, "assets"), path.join(f.installed, "assets"));
  const linked = f.run("update.cjs");
  assert.equal(linked.status, 1);
  assert.match(linked.stderr, /symlink/);
  assert.equal(fs.readFileSync(path.join(f.installed, "lookup.js"), "utf8"), "old command");
  fs.unlinkSync(path.join(f.installed, "assets"));

  fs.mkdirSync(path.join(f.installed, "copy-value.js"));
  const blocked = f.run("update.cjs");
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /Unexpected file type/);
  assert.equal(fs.readFileSync(path.join(f.installed, "lookup.js"), "utf8"), "old command");
});
