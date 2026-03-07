const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// Note: Make sure to set GOOGLE_APPLICATION_CREDENTIALS environment variable
// pointing to your Firebase service account key JSON file
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'senticare-ai-b0beb',
  });
}

const db = admin.firestore();

module.exports = { admin, db };