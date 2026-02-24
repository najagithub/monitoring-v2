import React, { createContext, useContext, useState, useEffect } from "react";
import type { User, AuthContextType, UpdateMyProfilePayload } from "../types";
import {
  loginRequest,
  meRequest,
  logoutRequest,
  updateMyProfileRequest,
  updateMyPasswordRequest,
} from "../services/auth.services.ts";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type LoginResponse = {
  data?: {
    token?: string;
    user?: User;
  };
};

function pickToken(res: LoginResponse) {
  return res.data?.token || null;
}

function pickUser(res: LoginResponse) {
  return res.data?.user || null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const setSession = (u: User | null, token?: string | null) => {
    setUser(u);

    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");

    if (u) localStorage.setItem("user", JSON.stringify(u));
    else localStorage.removeItem("user");
  };

  /**
   * ✅ Update partiellement le user (ex: network_choice) et persiste dans localStorage
   */
  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  };

  const fetchMe = async () => {
    const data = await meRequest(); // doit retourner User
    setSession(data, localStorage.getItem("token"));
    return data;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token) {
      setIsAuthLoading(false);
      return;
    }

    // Hydrate vite depuis localStorage (UX), puis revalide via /me
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore
      }
    }

    fetchMe()
        .catch(() => {
          setSession(null, null);
        })
        .finally(() => {
          setIsAuthLoading(false);
        });
  }, []);

  const login = async (emailOrUsername: string, password: string) => {
    setSession(null, null);

    const data = await loginRequest(emailOrUsername, password);

    const token = pickToken(data);
    if (!token) throw new Error("Token manquant dans la réponse login");

    const u = pickUser(data);
    if (u) {
      setSession(u, token);
    } else {
      localStorage.setItem("token", token); // si pas de user dans la réponse
      await fetchMe();
    }
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // ignore si pas dispo
    } finally {
      setSession(null, null);
    }
  };

  const updateProfile = async (payload: UpdateMyProfilePayload) => {
    const updated = await updateMyProfileRequest(payload); // doit retourner User
    setSession(updated, localStorage.getItem("token"));
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    await updateMyPasswordRequest(currentPassword, newPassword);
  };

  return (
      <AuthContext.Provider
          value={{
            user,
            isAuthLoading,
            login,
            logout,
            updateProfile,
            updatePassword,
            updateUser, // ✅ AJOUT
          }}
      >
        {children}
      </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};