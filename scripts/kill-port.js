const { execSync } = require('child_process');

const port = Number(process.env.KILL_PORT || process.env.PORT || 3001);

// Railway / Linux production — nothing to kill before start
if (process.env.RAILWAY_ENVIRONMENT || process.platform !== 'win32') {
  process.exit(0);
}

function killOnWindows() {
  let out = '';
  try {
    out = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch {
    return;
  }

  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes('LISTENING')) continue;
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    if (pid > 0) pids.add(pid);
  }

  const self = process.pid;
  for (const pid of pids) {
    if (pid === self) continue;
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } catch {
      /* already gone */
    }
  }
}

killOnWindows();
