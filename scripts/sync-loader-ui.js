const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "loader", "ui");
const targets = [
  path.join(root, "public", "downloads", "ui"),
  path.join(root, "public", "loader-app"),
];

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

for (const t of targets) {
  copyDir(src, t);
  console.log("synced ->", path.relative(root, t));
}
