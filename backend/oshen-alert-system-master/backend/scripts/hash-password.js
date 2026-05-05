const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const hash = await bcrypt.hash(password, 10);
  console.log('Hashed password:', hash);
}

// Replace with the actual admin password
hashPassword('emperorpinguoshen');