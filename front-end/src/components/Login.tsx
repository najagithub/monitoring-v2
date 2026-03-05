import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";


export const Login: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname as string | undefined;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(emailOrUsername, password);
      if (from) navigate(from, { replace: true });
      else navigate("/", { replace: true });
    } catch (err) {
      setError('Identifiants invalides ou utilisateur désactiver');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="w-full max-w-md">
        <div className="p-8 border shadow-2xl bg-white/10 backdrop-blur-md rounded-2xl border-white/20">
          <div className="flex justify-center">
            <div className="flex justify-center overflow-hidden">
              <img
                  src={logo}
                  alt="Logo Monitoring"
                  className="object-cover w-24 h-24 scale-150"
              />
            </div>
          </div>

          <p className="mb-4 text-center text-blue-200">
            Connectez-vous pour accéder à votre tableau de bord
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium text-blue-100">
                Email ou Username
              </label>
              <input
                id="email"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full px-4 py-3 text-white placeholder-blue-300 transition border rounded-lg bg-white/10 border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Entrez votre email ou username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-blue-100">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 text-white placeholder-blue-300 transition border rounded-lg bg-white/10 border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Entrez votre mot de passe"
                required
              />
            </div>

            {error && (
              <div className="px-4 py-3 text-sm text-red-100 border rounded-lg bg-red-500/20 border-red-500/50">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 font-semibold text-white transition duration-200 bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};
