const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'loader', 'ui');
const targets = [
  path.join(__dirname, '..', 'public', 'loader-app'),
  path.join(__dirname, '..', 'public', 'downloads', 'ui'),
];

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const a = path.join(from, name);
    const b = path.join(to, name);
    if (fs.statSync(a).isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

for (const target of targets) {
  copyDir(src, target);
  console.log(`Synced loader UI → ${target}`);
}
