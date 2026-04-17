import React, { useEffect, useMemo, useState } from 'react';
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
  WifiOff,
  Wifi
} from 'lucide-react';

import { formatBytes } from '../data/mockData';
import { Provider, ProviderRow, UserSummaryRow } from '../types';

import api from '../services/api';
import { listProvidersRequest } from '../services/providers.services';

import defaultAvatar from '../assets/avatar-default.png';

const DEFAULT_ROW: ProviderRow = {
  provider_id: '',
  oid_byte_in: '',
  oid_byte_out: '',
  monthly_limit: '',
};

const mbToBytes = (mb: number) => Math.round(mb * 1024 * 1024);
const bytesToMb = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

// ✅ Mets ton base URL dans .env : VITE_API_URL=http://127.0.0.1:8000
const API_BASE = (import.meta as any).env?.VITE_API_URL || '';

const normalizeUrl = (url?: string | null) => {
  const u = (url || '').trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (!API_BASE) return u;
  if (u.startsWith('/')) return `${API_BASE}${u}`;
  return `${API_BASE}/${u}`;
};
const apiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;

const storageBaseUrl = apiUrl
  ? apiUrl.replace(/\/api\/v1\/?$/, '')
  : '';
  
const safeAvatar = (profileImage?: string | null) => {
  if (!profileImage) return defaultAvatar;

  // déjà URL complète
  if (/^https?:\/\//i.test(profileImage)) return profileImage;

  // sinon chemin relatif
  if (!storageBaseUrl) return `/storage/${profileImage}`;

  return `${storageBaseUrl}/storage/${profileImage}`;
};

const UPDATE_ENDPOINT = '/admin/user-provider/monthly-limit';

// ✅ Persiste la sélection du provider (refresh friendly)
const STORAGE_SELECTED_PROVIDER_KEY = 'admin_dashboard:selected_provider_id';

const readStoredSelectedProviderId = (): number | null => {
  try {
    const raw = window?.localStorage?.getItem(STORAGE_SELECTED_PROVIDER_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
};

const writeStoredSelectedProviderId = (providerId: number) => {
  try {
    window?.localStorage?.setItem(STORAGE_SELECTED_PROVIDER_KEY, String(providerId));
  } catch {
    // ignore (private mode / quota / SSR)
  }
};

export const AdminDashboard: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<number>(() => readStoredSelectedProviderId() ?? 1);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserSummaryRow | null>(null);
  

  // Providers
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isProvidersLoading, setIsProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState<string | null>(null);

  // Users summary
  const [users, setUsers] = useState<UserSummaryRow[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  const provider = providers.find((p) => p.id === selectedProvider);

  const clientUsers = users; // backend te renvoie déjà role=client
  const activeUsers = users.filter((u) => u.is_active);

  const usersFetchRef = React.useRef<{ inFlight: boolean; lastProviderId: number | null }>({
    inFlight: false,
    lastProviderId: null,
  });

  const fetchUsers = async (providerId: number, opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;

    // Prevent overlapping requests (ex: interval + manual actions)
    if (usersFetchRef.current.inFlight) return;

    try {
      usersFetchRef.current.inFlight = true;
      usersFetchRef.current.lastProviderId = providerId;

      if (!silent) {
        setIsUsersLoading(true);
        setUsersError(null);
      }

      const { data } = await api.get(`/admin/users/summary?provider_id=${providerId}`);

      const list = Array.isArray(data) ? (data as UserSummaryRow[]) : ((data as any)?.data ?? []);
      setUsers(Array.isArray(list) ? list : []);

      // On silent refresh, we clear error only if we succeeded
      if (silent) setUsersError(null);
    } catch (e: any) {
      if (!silent) {
        setUsersError(e?.response?.data?.message || e?.message || 'Erreur chargement users');
        setUsers([]);
      } else {
        // silent refresh: keep current table, just expose error banner
        setUsersError(e?.response?.data?.message || e?.message || 'Erreur chargement users');
      }
    } finally {
      usersFetchRef.current.inFlight = false;
      if (!silent) setIsUsersLoading(false);
    }
  };

  // Load providers at mount
  useEffect(() => {
    (async () => {
      try {
        setIsProvidersLoading(true);
        setProvidersError(null);

        const data = await listProvidersRequest();
        const list = Array.isArray((data as any)?.data) ? (data as any).data : data;

        if (Array.isArray(list)) {
          setProviders(list);

          // ✅ Restore last selection if possible
          const stored = readStoredSelectedProviderId();
          const hasStored = stored != null && list.some((p: any) => Number(p.id) === Number(stored));

          const has1 = list.some((p: any) => Number(p.id) === 1);
          const fallback = has1 ? 1 : (list[0]?.id ? Number(list[0].id) : 1);

          const next = hasStored ? Number(stored) : fallback;

          setSelectedProvider(next);
          writeStoredSelectedProviderId(next);
        }
      } catch (e: any) {
        setProvidersError(e?.message || 'Impossible de charger les fournisseurs');
      } finally {
        setIsProvidersLoading(false);
      }
    })();
  }, []);

  // Load users summary when provider changes
  useEffect(() => {
    if (!selectedProvider) return;
    fetchUsers(selectedProvider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider]);

  // ✅ Auto-refresh toutes les 15s (les tableaux ne sont pas temps réel sinon)
  useEffect(() => {
    if (!selectedProvider) return;

    const id = window.setInterval(() => {
      // refresh silencieux: pas de spinner, pas de reset table
      fetchUsers(selectedProvider, { silent: true });
    }, 15000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider]);

  const toggleUserStatus = async (userId: number) => {
    // Optimistic
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u)));

    try {
      const { data } = await api.post(`/users/${userId}/toggle-active`);
      const updated: Partial<UserSummaryRow> | undefined = (data as any)?.data;

      if (updated?.id) {
        setUsers((prev) =>
            prev.map((u) => (u.id === updated.id ? ({ ...u, ...updated } as UserSummaryRow) : u))
        );
        setSelectedUser((prev) =>
            prev?.id === updated.id ? ({ ...prev, ...updated } as UserSummaryRow) : prev
        );
      } else {
        fetchUsers(selectedProvider);
      }
    } catch (e: any) {
      // rollback
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !u.is_active } : u)));
      alert(e?.response?.data?.message || e?.message || 'Erreur toggle user');
    }
  };

  return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
            <p className="mt-1 text-gray-500">Vue d'ensemble de la consommation</p>
          </div>
          <button
              onClick={() => setShowUserModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-white transition bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Ajouter utilisateur
          </button>
        </div>

        <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <label className="block mb-2 text-sm font-medium text-gray-700">Sélectionnez le fournisseur</label>

          {providersError && (
              <div className="px-4 py-3 mb-3 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
                {providersError}
              </div>
          )}

          <select
              value={selectedProvider}
              onChange={(e) => {
                const next = Number(e.target.value);
                setSelectedProvider(next);
                writeStoredSelectedProviderId(next);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg sm:w-64 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isProvidersLoading || providers.length === 0}
          >
            {providers.length === 0 ? (
                <option value={1}>Chargement...</option>
            ) : (
                providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                ))
            )}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="p-6 text-white shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Total Utilisateurs</p>
                <p className="mt-2 text-3xl font-bold">{clientUsers.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="p-6 text-white shadow-lg bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-100">Utilisateurs Actifs</p>
                <p className="mt-2 text-3xl font-bold">{activeUsers.length}</p>
              </div>
              <Activity className="w-12 h-12 text-green-200" />
            </div>
          </div>

          <div className="p-6 text-white shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-100">Fournisseur Actuel</p>
                <p className="mt-2 text-2xl font-bold">{provider?.name || '—'}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-orange-200" />
            </div>
          </div>
        </div>

        {usersError && (
            <div className="px-4 py-3 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
              {usersError}
            </div>
        )}

        <div className="overflow-hidden bg-white border border-gray-200 shadow-sm rounded-xl">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Liste des utilisateurs</h2>
            {isUsersLoading && <span className="text-sm text-gray-500">Chargement…</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                  Utilisateur
                </th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                  Consommation
                </th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                  Limite
                </th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-600 uppercase">
                  Statut
                </th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-right text-gray-600 uppercase">
                  Actions
                </th>
              </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
              {clientUsers.map((user) => {
                const limitMb = user.monthly_limit_mb || 0;
                const usedMb = user.total_consumption_month_mb || 0;
                const pct = limitMb > 0 ? (usedMb / limitMb) * 100 : 0;

                return (
                    <tr key={user.id} className="transition hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                              src={safeAvatar(user.profile_image)}
                              alt={user.username}
                              className="object-cover w-10 h-10 rounded-full"
                              onError={(e) => {
                                const img = e.currentTarget;
                                if (img.src !== defaultAvatar) img.src = defaultAvatar;
                              }}
                          />
                          <div>
                            <p className="font-semibold text-gray-900">{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{formatBytes(user.total_consumption_month)}</p>
                          <p className="text-sm text-gray-500">{pct.toFixed(1)}%</p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-gray-900">{formatBytes(mbToBytes(user.monthly_limit_mb))}</span>
                      </td>

                      <td className="px-6 py-4">
                      <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
                              Désactivé
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
                              className="p-2 transition rounded-lg hover:bg-gray-100"
                              title="Voir détails"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>

                          <button
                              onClick={() => toggleUserStatus(user.id)}
                              className={`p-2 rounded-lg transition ${
                                  user.is_active ? 'hover:bg-red-50 text-red-600' : 'hover:bg-green-50 text-green-600'
                              }`}
                              title={user.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {user.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>

                          {user.is_active && user.user_provider && (
                              <div className="flex items-center justify-center">
                              {user.user_provider.internet_status ? (
                                <Wifi 
                                  className="w-5 h-5 text-green-500"
                                  strokeWidth={3}
                                />
                              ) : (
                                <WifiOff 
                                  className="w-5 h-5 text-red-500"
                                  strokeWidth={3}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                );
              })}

              {!isUsersLoading && clientUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-sm text-center text-gray-500">
                      Aucun utilisateur trouvé pour ce fournisseur.
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        </div>

        <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Ajouter un utilisateur" maxWidth="xl">
          <UserForm
              onClose={() => setShowUserModal(false)}
              onCreated={async () => {
                await fetchUsers(selectedProvider);
              }}
          />
        </Modal>

        <Modal
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            title="Détails de l'utilisateur"
            maxWidth="xl"
        >
          {selectedUser && (
              <UserDetails
                  user={selectedUser}
                  providerName={provider?.name}
                  providerId={selectedProvider}
                  onUpdated={(u) => {
                    setSelectedUser(u);
                    setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)));
                  }}
              />
          )}
        </Modal>
      </div>
  );
};

const UserForm: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isProvidersLoading, setIsProvidersLoading] = useState(false);
  const [providersError, setProvidersError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    router_ip: '',
  });

  const [rows, setRows] = useState<ProviderRow[]>([{ ...DEFAULT_ROW }]);

  useEffect(() => {
    (async () => {
      try {
        setIsProvidersLoading(true);
        setProvidersError(null);
        const data = await listProvidersRequest();
        const list = Array.isArray((data as any)?.data) ? (data as any).data : data;
        if (Array.isArray(list)) setProviders(list);
      } catch (e: any) {
        setProvidersError(e?.message || 'Impossible de charger les fournisseurs');
      } finally {
        setIsProvidersLoading(false);
      }
    })();
  }, []);

  const providerById = useMemo(() => {
    const map = new Map<number, Provider>();
    providers.forEach((p) => map.set(p.id, p));
    return map;
  }, [providers]);

  const addRow = () => setRows((prev) => [...prev, { ...DEFAULT_ROW }]);

  const removeRow = (idx: number) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const updateRow = (idx: number, patch: Partial<ProviderRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.router_ip) {
      setSubmitError('Router IP est obligatoire');
      return;
    }

    for (const r of rows) {
      if (r.provider_id === '' || !r.oid_byte_in || !r.oid_byte_out || r.monthly_limit === '') {
        setSubmitError('Veuillez remplir toutes les lignes (provider, OID In/Out, limite).');
        return;
      }
      const lim = Number(r.monthly_limit);
      if (Number.isNaN(lim) || lim < 0) {
        setSubmitError('La limite (MB) doit être un nombre >= 0.');
        return;
      }
    }

    const payload = {
      name: formData.name,
      username: formData.username,
      phone: formData.phone || null,
      email: formData.email,
      password: formData.password,
      role: 'client' as const,
      router_ip: formData.router_ip,
      user_providers: rows.map((r) => ({
        provider_id: Number(r.provider_id),
        oid_byte_in: r.oid_byte_in,
        oid_byte_out: r.oid_byte_out,
        monthly_limit: Number(r.monthly_limit), // MB
      })),
    };

    try {
      setIsSubmitting(true);
      await api.post('/users/create/user-providers', payload);
      await onCreated();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erreur lors de la création';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <form onSubmit={handleSubmit} className="space-y-5">
        {submitError && (
            <div className="px-4 py-3 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">{submitError}</div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Nom</label>
            <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Username</label>
            <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Email</label>
            <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Téléphone (optionnel)</label>
            <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Mot de passe</label>
            <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Router IP</label>
            <input
                type="text"
                placeholder="192.168.0.1"
                value={formData.router_ip}
                onChange={(e) => setFormData({ ...formData, router_ip: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
            />
          </div>
        </div>

        <div className="overflow-hidden border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div>
              <p className="font-semibold text-gray-900">Fournisseurs / OID</p>
              <p className="text-xs text-gray-500">Ajoute 1 ou plusieurs configurations (limite en MB)</p>
            </div>
            <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 px-3 py-2 text-white transition bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Ajouter une ligne
            </button>
          </div>

          {providersError && (
              <div className="px-4 py-3 text-sm text-red-700 border-b border-red-100 bg-red-50">{providersError}</div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Provider</th>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">OID In</th>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">OID Out</th>
                <th className="px-4 py-3 font-semibold text-left text-gray-700">Limite (MB)</th>
                <th className="px-4 py-3 font-semibold text-right text-gray-700">Action</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
              {rows.map((row, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="px-4 py-3">
                      <select
                          value={row.provider_id}
                          onChange={(e) => updateRow(idx, { provider_id: e.target.value ? Number(e.target.value) : '' })}
                          className="w-56 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                          disabled={isProvidersLoading}
                      >
                        <option value="">Sélectionner...</option>
                        {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                        ))}
                      </select>

                      {row.provider_id !== '' && providerById.get(Number(row.provider_id))?.is_active === false && (
                          <p className="mt-1 text-xs text-orange-600">Provider inactif</p>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <input
                          type="text"
                          value={row.oid_byte_in}
                          onChange={(e) => updateRow(idx, { oid_byte_in: e.target.value })}
                          placeholder="1.3.6.1..."
                          className="px-3 py-2 font-mono text-xs border border-gray-300 rounded-lg w-72 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                          type="text"
                          value={row.oid_byte_out}
                          onChange={(e) => updateRow(idx, { oid_byte_out: e.target.value })}
                          placeholder="1.3.6.1..."
                          className="px-3 py-2 font-mono text-xs border border-gray-300 rounded-lg w-72 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                          type="number"
                          min={0}
                          step={1}
                          value={row.monthly_limit}
                          onChange={(e) => updateRow(idx, { monthly_limit: e.target.value })}
                          className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                      />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          className={`px-3 py-2 rounded-lg transition ${
                              rows.length <= 1
                                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  : 'bg-red-50 text-red-700 hover:bg-red-100'
                          }`}
                          disabled={rows.length <= 1}
                          title={rows.length <= 1 ? 'Au moins une ligne est requise' : 'Supprimer'}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 transition border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSubmitting}
          >
            Annuler
          </button>

          <button
              type="submit"
              className="inline-flex items-center justify-center flex-1 gap-2 px-4 py-2 text-white transition bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitting}
          >
            {isSubmitting && <span className="w-4 h-4 border-2 rounded-full border-white/70 border-t-transparent animate-spin" />}
            {isSubmitting ? 'Création...' : 'Créer'}
          </button>
        </div>
      </form>
  );
};

const UserDetails: React.FC<{
  user: UserSummaryRow;
  providerName?: string;
  providerId: number;
  onUpdated: (u: UserSummaryRow) => void;
}> = ({ user, providerName, providerId, onUpdated }) => {
  const initialRouterIp = user.user_provider?.router_ip || '';

  // ✅ Priorité aux nouveaux champs
  const initialOidIn =
      user.user_provider?.oid_byte_in || user.user_provider?.oid_in || '';
  const initialOidOut =
      user.user_provider?.oid_byte_out || user.user_provider?.oid_out || '';

  const initialLimitMb = Number(user.monthly_limit_mb || 0);

  const [routerIp, setRouterIp] = useState(initialRouterIp);
  const [oidByteIn, setOidByteIn] = useState(initialOidIn);
  const [oidByteOut, setOidByteOut] = useState(initialOidOut);
  const [monthlyLimitMb, setMonthlyLimitMb] = useState<number>(initialLimitMb);

  const [isSaving, setIsSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    setRouterIp(initialRouterIp);
    setOidByteIn(initialOidIn);
    setOidByteOut(initialOidOut);
    setMonthlyLimitMb(initialLimitMb);
    setErr(null);
    setOk(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, providerId]);

  const saveConfig = async () => {
    setErr(null);
    setOk(null);

    if (monthlyLimitMb < 0 || Number.isNaN(monthlyLimitMb)) {
      setErr('Monthly limit (MB) invalide.');
      return;
    }

    try {
      setIsSaving(true);

      // ✅ Payload corrigé
      const payload = {
        id_user: user.id,
        provider_id: providerId,
        router_ip: routerIp || null,
        oid_byte_in: oidByteIn || null,
        oid_byte_out: oidByteOut || null,
        monthly_limit: monthlyLimitMb, // ✅ MB (backend convertit en bytes)
      };

      await api.post(UPDATE_ENDPOINT, payload);

      const patched: UserSummaryRow = {
        ...user,
        monthly_limit_mb: monthlyLimitMb,
        user_provider: user.user_provider
            ? {
              ...user.user_provider,
              router_ip: routerIp,
              oid_byte_in: oidByteIn,
              oid_byte_out: oidByteOut,

              // ⚠️ si d'autres endroits utilisent encore oid_in/out, on maintient la compat
              oid_in: oidByteIn,
              oid_out: oidByteOut,
            }
            : ({
              router_ip: routerIp,
              oid_byte_in: oidByteIn,
              oid_byte_out: oidByteOut,
              oid_in: oidByteIn,
              oid_out: oidByteOut,
              is_active: true,
            } as any),
      };

      onUpdated(patched);
      setOk('Configuration enregistrée.');
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const limitBytes = mbToBytes(monthlyLimitMb || 0);

  return (
      <div className="space-y-6">
        {err && (
            <div className="px-4 py-3 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
              {err}
            </div>
        )}
        {ok && (
            <div className="px-4 py-3 text-sm text-green-700 border border-green-200 rounded-lg bg-green-50">
              {ok}
            </div>
        )}

        <div className="flex items-center gap-4">
          <img
              src={safeAvatar(user.profile_image)}
              alt={user.username}
              className="object-cover w-20 h-20 rounded-full"
              onError={(e) => {
                const img = e.currentTarget;
                if (img.src !== defaultAvatar) img.src = defaultAvatar;
              }}
          />
          <div>
            <h3 className="text-xl font-bold text-gray-900">{user.username}</h3>
            <p className="text-gray-500">{user.email}</p>
            <p className="text-gray-500">{user.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="p-4 border border-gray-200 rounded-xl">
            <p className="text-sm text-gray-500">Consommation du mois</p>
            <p className="text-lg font-semibold text-gray-900">{formatBytes(user.total_consumption_month)}</p>
            <p className="mt-1 text-xs text-gray-500">(~{bytesToMb(user.total_consumption_month)} MB)</p>
          </div>

          <div className="p-4 border border-gray-200 rounded-xl">
            <p className="text-sm text-gray-500">Limite</p>
            <p className="text-lg font-semibold text-gray-900">{formatBytes(limitBytes)}</p>
            <p className="mt-1 text-xs text-gray-500">{monthlyLimitMb} MB</p>
          </div>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-gray-900">Configuration Provider</h4>

          <div className="p-4 space-y-4 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-gray-900">{providerName || 'Provider'}</p>

              <button
                  type="button"
                  onClick={saveConfig}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white transition bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSaving && (
                    <span className="w-4 h-4 border-2 rounded-full border-white/70 border-t-transparent animate-spin" />
                )}
                {isSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Router IP</label>
                <input
                    value={routerIp}
                    onChange={(e) => setRouterIp(e.target.value)}
                    placeholder="192.168.0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-medium text-gray-600">Monthly limit (MB)</label>
                <input
                    type="number"
                    min={0}
                    step={1}
                    value={monthlyLimitMb}
                    onChange={(e) => setMonthlyLimitMb(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block mb-1 text-xs font-medium text-gray-600">OID In</label>
                <input
                    value={oidByteIn}
                    onChange={(e) => setOidByteIn(e.target.value)}
                    placeholder="1.3.6.1..."
                    className="w-full px-3 py-2 font-mono text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block mb-1 text-xs font-medium text-gray-600">OID Out</label>
                <input
                    value={oidByteOut}
                    onChange={(e) => setOidByteOut(e.target.value)}
                    placeholder="1.3.6.1..."
                    className="w-full px-3 py-2 font-mono text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="text-xs text-gray-500 md:col-span-2">
                Statut Provider:{' '}
                <span className="font-medium text-gray-800">
                {user.user_provider?.is_active ? 'Actif' : 'Inactif'}
              </span>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};