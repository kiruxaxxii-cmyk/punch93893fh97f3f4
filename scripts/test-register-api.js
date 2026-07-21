const http = require('http');

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: 'localhost',
        port: process.env.PORT || 3001,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw || '{}') });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  require('../db');
  const a = await request('POST', '/api/register', {
    username: 'ebdtest1',
    email: 'ebd@test.com',
    password: 'secret1',
  });
  const b = await request('POST', '/api/register', {
    username: 'ebdtest2',
    email: 'ebd@test.com',
    password: 'secret2',
  });
  console.log('first', a.status, a.body);
  console.log('second', b.status, b.body);
})();
