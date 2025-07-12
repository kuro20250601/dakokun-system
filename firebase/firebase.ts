// firebase/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { GoogleAuthProvider } from "firebase/auth";

// 【重要！】あなたのFirebaseプロジェクトの設定情報をここに貼り付けてください
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log("API KEY:", import.meta.env.VITE_FIREBASE_API_KEY);
console.log("APP ID:", import.meta.env.VITE_FIREBASE_APP_ID);

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// 各サービスへの参照をエクスポート
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);