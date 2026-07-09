"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthContextValue {
  userId: string | null;
  email: string | null;
}

const AuthContext = createContext<AuthContextValue>({ userId: null, email: null });

// Boshlang'ich qiymat Server Component (layout.tsx) orqali keladi, shuning
// uchun birinchi render'dayoq to'g'ri holat ko'rinadi (flash yo'q). Keyinchalik
// kirish/chiqish/token yangilanishi voqealariga real vaqtda obuna bo'ladi.
export function AuthProvider({
  initialUserId,
  initialEmail,
  children,
}: {
  initialUserId: string | null;
  initialEmail: string | null;
  children: ReactNode;
}) {
  const [userId, setUserId] = useState(initialUserId);
  const [email, setEmail] = useState(initialEmail);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ userId, email }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
