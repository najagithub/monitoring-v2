import React, { useState } from 'react';
import { Modal } from '../components/Modal';
import {
  Users,
  TrendingUp,
  Activity,
  Plus,
  Eye,
  Power,
  PowerOff,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  mockUsers,
  mockProviders,
  mockUserProviders,
  calculateMonthlyConsumption,
  formatBytes,
} from '../data/mockData';
import { User, Provider } from '../types';

export const AdminDashboard: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<number>(mockProviders[0]?.id || 1);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState(mockUsers);

  const clientUsers = users.filter(u => u.role === 'client');
  const activeUsers = clientUsers.filter(u => u.is_active);

  const toggleUserStatus = (userId: number) => {
    setUsers(users.map(u =>
      u.id === userId ? { ...u, is_active: !u.is_active } : u
    ));
  };

  const cutConnection = (userId: number) => {
    alert(`Connexion stopper pour l'utilisateur ${userId}`);
  };

  const provider = mockProviders.find(p => p.id === selectedProvider);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
          <p className="text-gray-500 mt-1">Vue d'ensemble de la consommation</p>
        </div>
        <button
          onClick={() => setShowUserModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Ajouter utilisateur
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sélectionnez le fournisseur
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(Number(e.target.value))}
          className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {mockProviders.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Utilisateurs</p>
              <p className="text-3xl font-bold mt-2">{clientUsers.length}</p>
            </div>
            <Users className="w-12 h-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Utilisateurs Actifs</p>
              <p className="text-3xl font-bold mt-2">{activeUsers.length}</p>
            </div>
            <Activity className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Fournisseur Actuel</p>
              <p className="text-2xl font-bold mt-2">{provider?.name}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-orange-200" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Liste des utilisateurs</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Consommation
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Limite
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientUsers.map(user => {
                const userProvider = mockUserProviders.find(
                  up => up.user_id === user.id && up.provider_id === selectedProvider
                );
                const monthlyData = userProvider
                  ? calculateMonthlyConsumption(user.id, selectedProvider)
                  : null;

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.profile_image}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">{user.username}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {monthlyData ? (
                        <div>
                          <p className="font-semibold text-gray-900">
                            {formatBytes(monthlyData.total_consumption)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {monthlyData.percentage_used.toFixed(1)}%
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {userProvider ? (
                        <span className="text-gray-900">
                          {formatBytes(userProvider.monthly_limit)}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                          user.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {user.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Actif
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            D\u00e9sactiv\u00e9
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDetailsModal(true);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition"
                          title="Voir d\u00e9tails"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => toggleUserStatus(user.id)}
                          className={`p-2 rounded-lg transition ${
                            user.is_active
                              ? 'hover:bg-red-50 text-red-600'
                              : 'hover:bg-green-50 text-green-600'
                          }`}
                          title={user.is_active ? 'D\u00e9sactiver' : 'Activer'}
                        >
                          {user.is_active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                        {user.is_active && userProvider && (
                          <button
                            onClick={() => cutConnection(user.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition"
                          >
                            Couper
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Ajouter un utilisateur"
      >
        <UserForm onClose={() => setShowUserModal(false)} />
      </Modal>

      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="D\u00e9tails de l'utilisateur"
        maxWidth="xl"
      >
        {selectedUser && <UserDetails user={selectedUser} />}
      </Modal>
    </div>
  );
};

const UserForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Utilisateur cr\u00e9\u00e9 avec succ\u00e8s!');
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          T\u00e9l\u00e9phone (optionnel)
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Cr\u00e9er
        </button>
      </div>
    </form>
  );
};

const UserDetails: React.FC<{ user: User }> = ({ user }) => {
  const userProviders = mockUserProviders.filter(up => up.user_id === user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <img
          src={user.profile_image}
          alt={user.username}
          className="w-20 h-20 rounded-full object-cover"
        />
        <div>
          <h3 className="text-xl font-bold text-gray-900">{user.username}</h3>
          <p className="text-gray-500">{user.email}</p>
          {user.phone && <p className="text-gray-500">{user.phone}</p>}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-3">Configurations fournisseurs</h4>
        <div className="space-y-3">
          {userProviders.map(up => (
            <div key={up.id} className="bg-gray-50 rounded-lg p-4">
              <p className="font-semibold text-gray-900 mb-2">{up.provider?.name}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">IP Routeur:</span>
                  <span className="ml-2 text-gray-900">{up.router_ip}</span>
                </div>
                <div>
                  <span className="text-gray-500">Limite:</span>
                  <span className="ml-2 text-gray-900">{formatBytes(up.monthly_limit)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">OID In:</span>
                  <span className="ml-2 text-gray-900 font-mono text-xs">{up.oid_byte_in}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">OID Out:</span>
                  <span className="ml-2 text-gray-900 font-mono text-xs">{up.oid_byte_out}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
