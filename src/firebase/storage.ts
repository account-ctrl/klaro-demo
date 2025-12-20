import { getStorage } from 'firebase/storage';
import { useFirebase } from './provider';

export const useStorage = () => {
  const { storage, firebaseApp } = useFirebase();
  // Return the storage instance from context if available, otherwise get it from the app instance
  return storage || getStorage(firebaseApp);
};
