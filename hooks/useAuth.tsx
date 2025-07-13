
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { signInUser, signOutUser, signUpUser, signInWithGoogle } from '../firebase/auth';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';

type UserWithRole = FirebaseUser & { role?: string; name?: string; supervisorId?: string };

type AuthContextType = {
  user: UserWithRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firestoreからroleも取得
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};
        setUser({ ...firebaseUser, ...userData });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    await signInUser(email, password);
    setIsLoading(false);
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    await signInWithGoogle();
    setIsLoading(false);
  };

  const logout = async () => {
    await signOutUser();
    setUser(null);
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    await signUpUser(email, password, name);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithGoogle, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
