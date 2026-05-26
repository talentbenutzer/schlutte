const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
try {
  const content = fs.readFileSync(envPath, 'utf8');
  const keys = content.split('\n')
    .map(line => line.split('=')[0].trim())
    .filter(key => key && !key.startsWith('#'));
  console.log('Environment variable keys in .env.local:', keys);
} catch (e) {
  console.error('Error reading .env.local:', e.message);
}
