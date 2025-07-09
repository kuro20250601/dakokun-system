// firebase/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 【重要！】あなたのFirebaseプロジェクトの設定情報をここに貼り付けてください
const firebaseConfig = {
  apiKey: "AIzaSyAzu0JU1XyfNT5kko9S4Z1Pn96d6a0UQeo",
  authDomain: "dakokun-system.firebaseapp.com",
  projectId: "dakokun-system",
  storageBucket: "dakokun-system.firebasestorage.app",
  messagingSenderId: "13018019821",
  appId: "1:13018019821:web:41778b4d9b5feac305d9e4",
  measurementId: "G-LYRQKNTG59"
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// 各サービスへの参照をエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);