import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

/**
 * Local emulators (started from `beshaped-backend`). Dev only: `next.config.ts` refuses to build
 * with this flag on, and the check below refuses to run a production bundle with it.
 */
export const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

if (USE_EMULATORS && process.env.NODE_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_USE_EMULATORS must not be set in a production build.');
}

export const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';

// Must match the emulator project in beshaped-backend/.firebaserc. demo-* IDs never reach real services.
const EMULATOR_PROJECT_ID = 'demo-beshaped';

// Firebase configuration
const firebaseConfig = USE_EMULATORS
  ? {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-api-key',
      authDomain: `${EMULATOR_PROJECT_ID}.firebaseapp.com`,
      projectId: EMULATOR_PROJECT_ID,
      storageBucket: `${EMULATOR_PROJECT_ID}.appspot.com`,
    }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
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

  // Connect once, right after init (connecting twice throws).
  if (USE_EMULATORS) {
    connectAuthEmulator(auth, AUTH_EMULATOR_URL, { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
