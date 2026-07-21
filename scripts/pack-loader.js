const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const downloads = path.join(root, 'public', 'downloads');
const release = path.join(
  root,
  'UIEngine',
  'thirdparty',
  'imgui',
  'examples',
  'example_win32_directx11',
  'Release'
);

const exeName = 'punch-loader.exe';
const dllNames = [
  'avcodec-62.dll',
  'avformat-62.dll',
  'avutil-60.dll',
  'swresample-6.dll',
  'swscale-9.dll',
];

const exePath = path.join(downloads, exeName);
if (!fs.existsSync(exePath)) {
  console.error('Missing', exePath);
  process.exit(1);
}

for (const dll of dllNames) {
  const from = path.join(release, dll);
  const to = path.join(downloads, dll);
  if (!fs.existsSync(from)) {
    console.error('Missing FFmpeg DLL:', from);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
  console.log('Copied', dll);
}

const staging = path.join(downloads, '_loader_pack');
fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });

const files = [exeName, ...dllNames, 'punch-fabric-launch.ps1'];
for (const file of files) {
  const src = path.join(downloads, file);
  if (!fs.existsSync(src)) {
    if (file.endsWith('.ps1')) {
      console.warn('Missing optional', file);
      continue;
    }
    console.error('Missing', src);
    process.exit(1);
  }
  fs.copyFileSync(src, path.join(staging, file));
}

const zipPath = path.join(downloads, 'punch-loader.zip');
if (process.platform === 'win32') {
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${staging}\\*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'inherit' }
  );
} else {
  console.warn('Zip skipped on non-Windows; DLLs copied beside exe.');
}

fs.rmSync(staging, { recursive: true, force: true });
console.log('Loader pack ready:', zipPath);
