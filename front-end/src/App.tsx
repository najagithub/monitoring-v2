import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import { Login } from "./components/Login";
import { Layout } from "./components/Layout";

import { AdminDashboard } from "./pages/AdminDashboard";
import { ClientDashboard } from "./pages/ClientDashboard";
import { Providers } from "./pages/Providers";
import { History } from "./pages/History";
import { Profile } from "./pages/Profile";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthLoading } = useAuth();

  // ✅ CRUCIAL: empêche le bug F5 => /login
  if (isAuthLoading) return null; // ou un loader
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthLoading } = useAuth();

  if (isAuthLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/client" replace />;
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, isAuthLoading } = useAuth();

  // pendant la restauration auth, on évite les redirects
  if (isAuthLoading) {
      return (
          <div className="flex items-center justify-center h-screen bg-gray-50">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  return (
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
        >
          {/* / => redirect dashboard selon role */}
          <Route
              path="/"
              element={
                user?.role === "admin" ? (
                    <Navigate to="/admin" replace />
                ) : (
                    <Navigate to="/client" replace />
                )
              }
          />

          {/* dashboards */}
          <Route
              path="/admin"
              element={
                <AdminOnly>
                  <AdminDashboard />
                </AdminOnly>
              }
          />
            <Route
                path="/users"
                element={
                    <AdminOnly>
                        <AdminDashboard />
                    </AdminOnly>
                }
            />
          <Route path="/client" element={<ClientDashboard />} />

          {/* pages */}
          <Route
              path="/providers"
              element={
                <AdminOnly>
                  <Providers />
                </AdminOnly>
              }
          />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />

          {/* option: /users => pour l’instant redirect admin */}
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
};

export default function App() {
  return (
      <AuthProvider>
        <AppContent />
      </AuthProvider>
  );
}
