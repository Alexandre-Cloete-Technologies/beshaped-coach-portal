import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDb1wC1vl5uqN6heBR2iy7rqA4JqoiZF9E",
  authDomain: "beshaped-45e98.firebaseapp.com",
  projectId: "beshaped-45e98",
  storageBucket: "beshaped-45e98.firebasestorage.app",
  messagingSenderId: "605369468451",
  appId: "1:605369468451:web:ff4ffe340af2c3322fd396",
  measurementId: "G-HMLNNRTFQD"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
