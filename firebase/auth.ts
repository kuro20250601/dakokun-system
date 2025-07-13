// firebase/auth.ts

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, collection, getDocs } from "firebase/firestore";
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