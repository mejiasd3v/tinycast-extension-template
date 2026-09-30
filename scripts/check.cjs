const path = require("node:path");
const { readExtension } = require("./extension.cjs");

try {
  const { manifest, files } = readExtension(path.resolve(__dirname, ".."));
  console.log(`Checked ${manifest.name}: ${manifest.commands.length} commands, ${files.length} installable files.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
