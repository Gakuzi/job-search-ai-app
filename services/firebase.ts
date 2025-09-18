import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- КРИТИЧЕСКИ ВАЖНО: ДЕЙСТВИЕ ОБЯЗАТЕЛЬНО ---
//
// Эти значения теперь берутся из переменных окружения на хостинге (Vercel).
// Убедитесь, что вы заполнили их в настройках проекта на Vercel.
// FIX: Export firebaseConfig to make it available to other modules.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Проверка, что ключи загрузились
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("AIzaSy...")) {
    console.warn("Firebase configuration is missing or using placeholder values. Please set up your environment variables in Vercel.");
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);