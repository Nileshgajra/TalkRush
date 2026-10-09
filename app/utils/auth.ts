import { getAuth, signInAnonymously, type User } from '@react-native-firebase/auth';

let signInPromise: Promise<User> | null = null;

export const ensureAnonymousUser = async () => {
  const firebaseAuth = getAuth();
  const currentUser = firebaseAuth.currentUser;
  if (currentUser) return currentUser;
  if (!signInPromise) {
    signInPromise = signInAnonymously(firebaseAuth)
      .then(({ user }) => user)
      .catch((error) => {
        signInPromise = null;
        throw error;
      });
  }
  return signInPromise;
};
