import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import * as auth from "@/api/auth";
import type { UserProfile } from "@/types";

interface AuthValue {
  user: UserProfile | null;
  login: (input: { email: string; password: string; remember: boolean }) => Promise<UserProfile>;
  signup: (input: { name: string; email: string; password: string }) => Promise<UserProfile>;
  logout: () => void;
  updateProfile: (patch: Parameters<typeof auth.updateUser>[1]) => UserProfile;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => auth.currentSessionUser());

  const login = useCallback<AuthValue["login"]>(async ({ remember, ...creds }) => {
    const u = await auth.signIn(creds);
    auth.saveSession(u.id, remember);
    setUser(u);
    return u;
  }, []);

  const signup = useCallback<AuthValue["signup"]>(async (input) => {
    const u = await auth.signUp(input);
    auth.saveSession(u.id, true);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => { auth.clearSession(); setUser(null); }, []);

  const updateProfile = useCallback<AuthValue["updateProfile"]>((patch) => {
    if (!user) throw new auth.AuthError("Not signed in.");
    const u = auth.updateUser(user.id, patch);
    setUser(u);
    return u;
  }, [user]);

  const value = useMemo(() => ({ user, login, signup, logout, updateProfile }), [user, login, signup, logout, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
