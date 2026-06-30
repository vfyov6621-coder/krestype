"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, ADMIN_EMAIL } from "@/lib/firebase";
import type { Creator } from "@/types";

type Role = "guest" | "creator" | "admin";

interface AuthContextValue {
  user: User | null;
  creator: Creator | null;
  role: Role;
  isAdmin: boolean;        // супер-админ (видит все статьи)
  isCreator: boolean;      // создатель (видит только свои)
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!active) return;
      setUser(u);

      if (!u) {
        setCreator(null);
        setLoading(false);
        return;
      }

      // Проверяем профиль создателя в Firestore.
      // Если нет — это просто залогиненный юзер без прав создателя
      // (может смотреть публичные статьи, но не может писать).
      try {
        const snap = await getDoc(doc(db, "creators", u.uid));
        if (snap.exists()) {
          setCreator({ uid: snap.id, ...(snap.data() as Omit<Creator, "uid">) });
        } else {
          setCreator(null);
        }
      } catch {
        setCreator(null);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  // Супер-админ = email совпадает с ADMIN_EMAIL (это старый kres@krestype.app)
  const isAdmin = !!user && user.email === ADMIN_EMAIL;
  // Создатель = есть профиль в /creators и active=true, ИЛИ это супер-админ
  const isCreator =
    isAdmin || (!!creator && creator.active === true);
  const role: Role = isAdmin ? "admin" : isCreator ? "creator" : "guest";

  return (
    <AuthContext.Provider
      value={{ user, creator, role, isAdmin, isCreator, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
