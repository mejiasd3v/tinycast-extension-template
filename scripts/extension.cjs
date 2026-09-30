const fs = require("node:fs");
const path = require("node:path");
const { wrap } = require("node:module");
const { Script } = require("node:vm");

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readExtension(directory) {
  const manifestPath = path.join(directory, "package.json");
  if (!fs.lstatSync(manifestPath).isFile()) throw new Error("package.json must be a regular file.");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (typeof manifest.name !== "string" || !slug.test(manifest.name)) {
    throw new Error("Extension name must use lowercase letters, numbers, and single hyphens.");
  }
  if (typeof manifest.title !== "string" || !manifest.title.trim()) {
    throw new Error("Extension title is required.");
  }
  if (!Array.isArray(manifest.platforms) || !manifest.platforms.includes("macOS")) {
    throw new Error("platforms must include macOS.");
  }
  if (!Array.isArray(manifest.commands) || !manifest.commands.length) {
    throw new Error("Declare at least one command in package.json.");
  }

  const files = [];
  const names = new Set();
  for (const command of manifest.commands) {
    if (!command || typeof command.name !== "string" || !slug.test(command.name)) {
      throw new Error("Command names must use lowercase letters, numbers, and single hyphens.");
    }
    if (names.has(command.name)) throw new Error(`Duplicate command: ${command.name}`);
    names.add(command.name);
    if (typeof command.title !== "string" || !command.title.trim()) {
      throw new Error(`Command title is required: ${command.name}`);
    }
    if (!["view", "no-view", "menu-bar"].includes(command.mode)) {
      throw new Error(`Unsupported command mode: ${command.mode}`);
    }
    const file = `${command.name}.js`;
    const source = path.join(directory, file);
    if (!fs.lstatSync(source).isFile()) throw new Error(`${file} must be a regular file.`);
    new Script(wrap(fs.readFileSync(source, "utf8")), { filename: file });
    files.push(file);
  }

  function collectAssets(relative) {
    const source = path.join(directory, relative);
    const stat = fs.lstatSync(source);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(source).sort()) {
        if (!name.startsWith(".")) collectAssets(path.join(relative, name));
      }
    } else if (stat.isFile()) {
      files.push(relative);
    } else {
      throw new Error(`Assets must be regular files or directories, not symlinks: ${relative}`);
    }
  }
  if (fs.existsSync(path.join(directory, "assets"))) collectAssets("assets");
  for (const icon of [manifest.icon, ...manifest.commands.map((command) => command.icon)]) {
    if (icon !== undefined && (typeof icon !== "string" || path.isAbsolute(icon) ||
      icon.split(/[\\\\/]/).includes("..") || !files.includes(path.join("assets", icon)))) {
      throw new Error(`Icon must name an existing file inside assets/: ${icon}`);
    }
  }

  // Publish the manifest last so commands exist before Tinycast can discover them.
  files.push("package.json");
  return { manifest, files };
}

module.exports = { readExtension };
