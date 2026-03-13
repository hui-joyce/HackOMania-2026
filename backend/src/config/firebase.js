const admin = require('firebase-admin');

let serviceAccount;

if (process.env.FIREBASE_CREDENTIALS_JSON) {
  serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS_JSON);
} else {
  throw new Error('FIREBASE_CREDENTIALS_JSON environment variable is required but not set');
}

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id,
  });
}

const db = admin.firestore();

module.exports = { admin, db };