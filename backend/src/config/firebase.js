const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
// Note: Make sure to set GOOGLE_APPLICATION_CREDENTIALS environment variable
// pointing to your Firebase service account key JSON file
if (!admin.apps.length) {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS 
    ? path.resolve(__dirname, '../..', process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : path.join(__dirname, '../../senticare-ai-b0beb-firebase-adminsdk-fbsvc-799d429ba7.json');
  
  const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'senticare-ai-b0beb',
  });
}

const db = admin.firestore();

module.exports = { admin, db };