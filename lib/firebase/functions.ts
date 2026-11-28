import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { app, USE_EMULATORS } from './config';

/** Region of the callables in beshaped-backend (`functions/src/options.ts`). */
export const FUNCTIONS_REGION = 'africa-south1';
/** Functions emulator port from beshaped-backend/firebase.json. */
const FUNCTIONS_EMULATOR_PORT = 5001;

let functionsInstance: Functions | null = null;

/** The Functions client for the backend region, created on first use. Callables sign the request with the coach's ID token. */
export const getBackendFunctions = (): Functions => {
  if (!functionsInstance) {
    functionsInstance = getFunctions(app, FUNCTIONS_REGION);
    // Connect once, right after creating the instance (connecting twice throws).
    if (USE_EMULATORS) {
      connectFunctionsEmulator(functionsInstance, '127.0.0.1', FUNCTIONS_EMULATOR_PORT);
    }
  }
  return functionsInstance;
};

export { httpsCallable };
