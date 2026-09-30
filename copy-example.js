const { Clipboard, showHUD } = require("@raycast/api");

exports.default = async function CopyExample() {
  // Replace this with the value your command produces.
  await Clipboard.copy("Hello from Tinycast");
  await showHUD("Example text copied");
};
