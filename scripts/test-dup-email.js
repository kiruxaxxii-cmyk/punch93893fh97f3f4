const { db } = require('../db');
const bcrypt = require('bcryptjs');
const h = bcrypt.hashSync('test123', 10);

function reg(u, e) {
  try {
    db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?,?,?)').run(u, e.toLowerCase(), h);
    console.log('OK', u, e);
  } catch (err) {
    console.log('FAIL', u, err.message);
  }
}

reg('testdup1', 'dup@test.com');
reg('testdup2', 'dup@test.com');
console.log('indexes', db.prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='users'").all());
console.log('dup emails', db.prepare('SELECT email, COUNT(*) c FROM users GROUP BY email HAVING c > 1').all());
