// firebase/auth.ts

import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase"; // 上で作った設定ファイルをインポート

// 新しいユーザーを登録し、Firestoreにも情報を保存する関数
export const signUpUser = async (email, password, name) => {
  // ① Firebase Authenticationにユーザーを作成
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // ② Firestoreのusersコレクションにユーザー情報を保存
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    name: name,
    email: email,
    role: "employee", // 初期権限は 'employee'
  });

  return user;
};