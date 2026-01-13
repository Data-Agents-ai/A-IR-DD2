const crypto = require('crypto');

console.log('=== A-IR-DD2 Security Keys Generator ===\n');
console.log('Copy these values to backend/.env:\n');
console.log(`JWT_SECRET=${crypto.randomBytes(64).toString('hex')}`);
console.log(`REFRESH_TOKEN_SECRET=${crypto.randomBytes(64).toString('hex')}`);
console.log(`ENCRYPTION_KEY=${crypto.randomBytes(32).toString('hex')}`);
console.log('\n⚠️  NEVER commit these secrets to git!');
console.log('✅ After copying, restart backend with: npm run dev\n');
