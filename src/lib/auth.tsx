import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { api, clearAccessToken, type AuthUser, type UserRole } from "./api";
import { clearOnboardingHandled } from "./onboarding";
import { landingPathFor } from "./routing";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (correo: string, contrasena: string, turnstileToken?: string) => Promise<void>;
  register: (
    nombres: string,
    apellidos: string,
    correo: string,
    contrasena: string,
    turnstileToken?: string,
  ) => Promise<void>;
  registerCompany: (data: {
    nombreEmpresa: string;
    nit: string;
    correo: string;
    contrasena: string;
    telefono?: string;
    sector?: string;
    turnstileToken?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then(({ user: me }) => {
        if (active) setUser(me);
      })
      .catch(() => {
        clearAccessToken();
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(correo, contrasena, turnstileToken) {
        const data = await api.login(correo, contrasena, turnstileToken);
        setUser(data.user);
      },
      async register(nombres, apellidos, correo, contrasena, turnstileToken) {
        const data = await api.register(nombres, apellidos, correo, contrasena, turnstileToken);
        setUser(data.user);
      },
      async registerCompany(input) {
        const data = await api.registerCompany(input);
        setUser(data.user);
      },
      async logout() {
        try {
          await api.logout();
        } finally {
          clearAccessToken();
          clearOnboardingHandled();
          setUser(null);
        }
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Protege una ruta y exige uno de los roles indicados. */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={landingPathFor(user)} replace />;
  return <>{children}</>;
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    // Centraliza la redirección post-login/registro para evitar carreras con
    // el setUser de cada pantalla.
    return <Navigate to={landingPathFor(user)} replace />;
  }
  return <>{children}</>;
}