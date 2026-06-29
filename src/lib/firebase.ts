// Инициализация Firebase. Конфиг берётся из публичного firebaseConfig
// (этот конфиг безопасно публиковать — он идёт в клиентский бандл).
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ВНИМАНИЕ: эти значения публичные по природе Firebase (client-side SDK).
// Они НЕ являются секретами. Защита обеспечивается Firestore Security Rules.
export const firebaseConfig = {
  apiKey: "AIzaSyBlndvtDkiLRpGpljB7c33HyZ7ag-kRDOA",
  authDomain: "kres-portfolio.firebaseapp.com",
  projectId: "kres-portfolio",
  storageBucket: "kres-portfolio.firebasestorage.app",
  messagingSenderId: "443497804579",
  appId: "1:443497804579:web:03984f3e2fe890491c5296",
  measurementId: "G-7RTLV6Y9DW",
};

// Admin email — должен быть создан вручную в Firebase Console → Authentication → Add user
// Email: kres@krestype.app
// Пароль: 190565
export const ADMIN_EMAIL = "kres@krestype.app";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Сохраняем сессию админа в localStorage (удобно для 24/7 использования)
setPersistence(auth, browserLocalPersistence).catch(() => {
  /* ignore — в SSR не работает */
});

export const db = getFirestore(app);
export default app;
