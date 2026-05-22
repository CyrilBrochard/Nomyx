import { createContext, useContext, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter, setUnauthorizedHandler } from "@workspace/api-client-react";

export const AUTH_TOKEN_KEY = "auth_token";

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (storedToken) {
      setToken(storedToken);
    }

    setAuthTokenGetter(() => localStorage.getItem(AUTH_TOKEN_KEY));
    setUnauthorizedHandler(() => {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setToken(null);
      setAuthTokenGetter(() => null);
      setUnauthorizedHandler(null);
    });

    setIsReady(true);

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = (newToken: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    setToken(newToken);
    setAuthTokenGetter(() => newToken);
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setAuthTokenGetter(() => null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout, isReady }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
