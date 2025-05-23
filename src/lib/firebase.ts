
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2bFtXORXF-3w1_MrSiRw2E2K4uNBLBjM", // This was already set
  authDomain: "arctic-splash-challenge.firebaseapp.com",
  projectId: "arctic-splash-challenge",
  storageBucket: "arctic-splash-challenge.firebasestorage.app", // Corrected to .firebasestorage.app
  messagingSenderId: "224667120742",
  appId: "1:224667120742:web:88c710436311b3c8fb69a7" // Updated appId
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
