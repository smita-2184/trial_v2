import { create } from 'zustand';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface User {
  id: string;
  username: string;
  password: string;
  course: string;
  gender: string;
  major: string;
  role: string;
  semester: number;
  createdAt: Date;
  lastLogin: Date;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUp: (username: string, password: string, userData: Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'password'>) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Check for existing session
  const savedUser = localStorage.getItem('user');
  const initialUser = savedUser ? JSON.parse(savedUser) : null;

  return {
    user: initialUser,
    loading: false,
    error: null,

    signUp: async (username, password, userData) => {
      try {
        set({ loading: true, error: null });

        // Check if username already exists
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          throw new Error('Username already exists');
        }

        // Create new user document
        const newUser = {
          username,
          password, // In a production app, this should be hashed
          ...userData,
          role: 'user',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        };

        const docRef = doc(collection(db, 'users'));
        await setDoc(docRef, {
          ...newUser,
          id: docRef.id
        });

        const createdUser = {
          ...newUser,
          id: docRef.id
        } as User;

        // Save user to local storage
        localStorage.setItem('user', JSON.stringify(createdUser));
        set({ user: createdUser, loading: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create account';
        set({ error: message, loading: false });
        throw new Error(message);
      }
    },

    signIn: async (username, password) => {
      try {
        set({ loading: true, error: null });

        // Query user by username
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error('User not found');
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data() as User;

        // Verify password
        if (userData.password !== password) {
          throw new Error('Invalid password');
        }

        // Update last login
        await setDoc(doc(db, 'users', userDoc.id), {
          lastLogin: serverTimestamp()
        }, { merge: true });

        const user = { ...userData, id: userDoc.id };
        // Save user to local storage
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, loading: false });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sign in';
        set({ error: message, loading: false });
        throw new Error(message);
      }
    },

    signOut: async () => {
      localStorage.removeItem('user');
      set({ user: null, loading: false });
    },

    clearError: () => set({ error: null })
  };
});