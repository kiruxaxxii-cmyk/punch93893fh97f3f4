import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiMe, apiSignIn, apiSignOut, apiSignUp, errorMessage, ApiError, getToken } from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [user, setUser] = useState(null);

  const refreshSession = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setIsAuthReady(true);
      return;
    }
    try {
      setUser(await apiMe());
    } catch {
      setUser(null);
    } finally {
      setIsAuthReady(true);
    }
  }, []);

  useEffect(() => {
    refreshSession();
    const onFocus = () => refreshSession();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshSession]);

  const signIn = useCallback(async (credentials) => {
    try {
      setUser(await apiSignIn(credentials));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: errorMessage(err, "Unable to sign in right now.") };
    }
  }, []);

  const signUp = useCallback(async (payload) => {
    try {
      const user = await apiSignUp(payload);
      if (user) {
        setUser(user);
        return { ok: true };
      }
      return { ok: true, nextStep: "sign-in" };
    } catch (err) {
      return { ok: false, error: errorMessage(err, "Registration is disabled.") };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiSignOut();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      isAuthReady,
      isAuthenticated: !!user,
      user,
      signIn,
      signUp,
      signOut,
      refreshSession
    }),
    [isAuthReady, refreshSession, signIn, signOut, signUp, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
