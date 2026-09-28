import { deleteApp, initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  inMemoryPersistence,
  initializeAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth';
import { app, auth, AUTH_EMULATOR_URL, USE_EMULATORS } from './config';

/**
 * Sign in with email and password
 */
export const signIn = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

/**
 * Create a new user with email and password
 */
export const signUp = async (
  email: string,
  password: string,
  displayName?: string
): Promise<UserCredential> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Update profile with display name if provided
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }

    return userCredential;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
};

/**
 * Creates another person's Auth account without signing the coach out (interim until BSF-72 moves
 * this to a Cloud Function). The account is created on a throwaway app instance with in-memory
 * persistence, so the coach's session on the main app is untouched and nothing is stored in the
 * browser. `writeProfile` runs while the new account still exists on the throwaway instance and
 * should do its writes through the main app (as the coach); if it throws, the new Auth user is
 * deleted again so no account is left without a profile.
 */
export const createAccountForClient = async (
  email: string,
  password: string,
  displayName: string,
  writeProfile: (uid: string) => Promise<void>
): Promise<string> => {
  const secondaryApp = initializeApp(app.options, `create-account-${Date.now()}`);
  const secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
  if (USE_EMULATORS) {
    connectAuthEmulator(secondaryAuth, AUTH_EMULATOR_URL, { disableWarnings: true });
  }

  try {
    const { user } = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await updateProfile(user, { displayName });
    try {
      await writeProfile(user.uid);
    } catch (error) {
      await user.delete().catch((deleteError) => {
        console.error('Could not roll back the new Auth account:', deleteError);
      });
      throw error;
    }
    return user.uid;
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
};

/**
 * Sign out the current user
 */
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Get the current user
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};
