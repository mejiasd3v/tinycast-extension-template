const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { readExtension } = require("./extension.cjs");

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !["--dry-run", "--help"].includes(args[0]))) {
    throw new Error("Usage: node scripts/update.cjs [--dry-run | --help]");
  }
  if (args[0] === "--help") {
    console.log("Usage: node scripts/update.cjs [--dry-run]");
    console.log("Update an existing Tinycast installation without deleting its data or settings.");
  } else {
    if (process.platform !== "darwin") throw new Error("Updating a Tinycast installation requires macOS.");
    const directory = path.resolve(__dirname, "..");
    const { manifest, files } = readExtension(directory);
    const destination = path.join(os.homedir(), "Library", "Application Support", "com.tinycast.app", "extensions", manifest.name);
    if (fs.realpathSync(directory) === destination) throw new Error("Run update from your source folder, not the installed extension.");
    const installedManifest = path.join(destination, "package.json");
    if (!fs.existsSync(installedManifest)) {
      throw new Error(`Install ${manifest.title} from this folder in Tinycast once, then run update.`);
    }

    // Refuse linked destinations before copying anything.
    for (const file of files) {
      const parts = path.join(destination, file).split(path.sep).filter(Boolean);
      let current = path.parse(destination).root;
      for (let index = 0; index < parts.length; index++) {
        current = path.join(current, parts[index]);
        let stat;
        try { stat = fs.lstatSync(current); } catch (error) {
          if (error.code === "ENOENT") break;
          throw error;
        }
        if (stat.isSymbolicLink()) throw new Error(`Refusing to update a symlink: ${current}`);
        if (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile()) {
          throw new Error(`Unexpected file type at update destination: ${current}`);
        }
      }
    }
    if (JSON.parse(fs.readFileSync(installedManifest, "utf8")).name !== manifest.name) {
      throw new Error("The installed extension does not match this folder.");
    }

    if (args[0] === "--dry-run") {
      console.log(`Would update ${manifest.title} in ${destination}:`);
      for (const file of files) console.log(`  ${file}`);
    } else {
      const staging = fs.mkdtempSync(path.join(destination, ".update-"));
      try {
        for (const file of files) {
          const staged = path.join(staging, file);
          fs.mkdirSync(path.dirname(staged), { recursive: true });
          fs.copyFileSync(path.join(directory, file), staged);
        }
        for (const file of files) {
          const target = path.join(destination, file);
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.renameSync(path.join(staging, file), target);
        }
      } finally {
        fs.rmSync(staging, { recursive: true, force: true });
      }
      console.log(`Updated ${manifest.title}. Close and reopen its command to load the changes.`);
      console.log("Restart Tinycast if you changed the manifest or it still runs the old code.");
      console.log("Your extension data and settings were preserved.");
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
