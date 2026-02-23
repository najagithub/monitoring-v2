import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Server,
  History,
  UserCircle,
  LogOut,
  Menu,
  X,
  WifiIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  to: string;
  roles: Array<"admin" | "client">;
}

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const dashboardPath = user?.role === "admin" ? "/admin" : "/client";

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      to: dashboardPath,
      roles: ["admin", "client"],
    },
    {
      label: "Utilisateurs",
      icon: <Users className="w-5 h-5" />,
      to: "/users",
      roles: ["admin"],
    },
    {
      label: "Fournisseurs",
      icon: <Server className="w-5 h-5" />,
      to: "/providers",
      roles: ["admin"],
    },
    {
      label: "Historique",
      icon: <History className="w-5 h-5" />,
      to: "/history",
      roles: ["admin", "client"],
    },
    {
      label: "Profil",
      icon: <UserCircle className="w-5 h-5" />,
      to: "/profile",
      roles: ["admin", "client"],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
      item.roles.includes((user?.role as "admin" | "client") || "client")
  );

  const closeSidebarMobile = () => setSidebarOpen(false);

  return (
      <div className="min-h-screen bg-gray-50">
        {/* Topbar mobile */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiIcon className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-gray-900">Monitoring</span>
          </div>
          <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Overlay mobile */}
        <div
            className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${
                sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setSidebarOpen(false)}
        />

        {/* Sidebar */}
        <aside
            className={`fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-gray-200 transition-transform lg:translate-x-0 ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <WifiIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Monitoring</h1>
                  <p className="text-xs text-gray-500">Internet Dashboard</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <img
                    src={
                        user?.profile_image_url ||
                        "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100"
                    }
                    alt={user?.username}
                    className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user?.username}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {filteredNavItems.map((item) => (
                  <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={closeSidebarMobile}
                      className={({ isActive }) =>
                          `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                              isActive
                                  ? "bg-blue-50 text-blue-600"
                                  : "text-gray-700 hover:bg-gray-50"
                          }`
                      }
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </NavLink>
              ))}
            </nav>

            <div className="p-4 border-t border-gray-200">
              <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Déconnexion</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
          <div className="p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
  );
};
