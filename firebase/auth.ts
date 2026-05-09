// firebase/auth.ts

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, updateDoc, collection, getDocs, orderBy, query } from "firebase/firestore";
import { auth, db } from "./firebase";

// 新規ユーザー登録＋Firestore保存（ロール管理付き）
export const signUpUser = async (email: string, password: string, name: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  // 既存ユーザーがいなければ最初の人をadminに
  const usersSnapshot = await getDocs(collection(db, "users"));
  const isFirstUser = usersSnapshot.empty;
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name,
    email,
    role: isFirstUser ? "admin" : "employee",
    createdAt: new Date(),
  });
  return user;
};

export const signInUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};

export const signOutUser = async () => signOut(auth);

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

// 全ユーザー取得（admin 用）
export const getAllUsers = async () => {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ユーザーのロールを更新（admin 用）
export const updateUserRole = async (uid: string, role: 'admin' | 'supervisor' | 'employee') => {
  await updateDoc(doc(db, 'users', uid), { role });
};
