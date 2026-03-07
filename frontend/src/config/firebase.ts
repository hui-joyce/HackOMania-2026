// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyBS7yG7GHD9jbUYJFmP1p4IRCmAIUcGmXk',
  authDomain: 'senticare-ai-b0beb.firebaseapp.com',
  projectId: 'senticare-ai-b0beb',
  storageBucket: 'senticare-ai-b0beb.firebasestorage.app',
  messagingSenderId: '598412988016',
  appId: '1:598412988016:web:2020395ecc1ffeb1086eb5',
  measurementId: 'G-5GG0W85J7L',
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);

export default app;