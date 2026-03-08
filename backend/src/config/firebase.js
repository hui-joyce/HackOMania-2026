const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

console.log('DEBUG: FIREBASE_CREDENTIALS_JSON exists?', !!process.env.FIREBASE_CREDENTIALS_JSON);
console.log('DEBUG: Env var length:', process.env.FIREBASE_CREDENTIALS_JSON?.length || 0);

let serviceAccount;

if (process.env.FIREBASE_CREDENTIALS_JSON) {
  console.log('Using FIREBASE_CREDENTIALS_JSON from env');
  serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);
} else {
  console.log('FIREBASE_CREDENTIALS_JSON not found, trying file fallback');
  const credentialsPath = path.join(__dirname, '../../senticare-ai-b0beb-firebase-adminsdk-fbsvc-799d429ba7.json');
  serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'senticare-ai-b0beb',
  });
}

const db = admin.firestore();

module.exports = { admin, db };