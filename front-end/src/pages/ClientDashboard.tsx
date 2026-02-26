import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { TrendingUp, AlertTriangle, CheckCircle, Activity } from 'lucide-react';

import { mockUserProviders, calculateMonthlyConsumption, formatBytes } from '../data/mockData';

import { myListProvidersRequest, updateMyConnection } from '../services/providers.services';
import {
  getMonthlyConsumptionRequest,
  getDailyConsumptionRequest,
} from '../services/consumptionHistory.services';
import type { Provider } from '../types';

const DAY_OPTIONS = [7, 15, 30] as const;
type DayOption = (typeof DAY_OPTIONS)[number];

export const ClientDashboard: React.FC = () => {
  const { user,updateUser  } = useAuth();



  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<number>(1);
  const [appliedProvider, setAppliedProvider] = useState<number>(1);

  const [filterApplied, setFilterApplied] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // legacy (still used as fallback for monthly_limit)
  const [monthlyData, setMonthlyData] = useState<any>(null);

  // ✅ last N days from API
  const [usageDays, setUsageDays] = useState<DayOption>(7);
  const [dailyUsage, setDailyUsage] = useState<any[]>([]);

  // ✅ current month consumption from API
  const [monthlyConsumptionBytes, setMonthlyConsumptionBytes] = useState<number | null>(null);

  // avoid overlapping refresh calls (interval + user actions)
  const refreshInFlightRef = useRef(false);

  const getCurrentMonthKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`; // "YYYY-MM"
  };

  const fetchMonthlyConsumption = async (userId: number, providerId: number) => {
    const monthKey = getCurrentMonthKey();
    const monthly = await getMonthlyConsumptionRequest({
      user_id: userId,
      provider_id: providerId,
      month: monthKey,
    });

    const total = Number(monthly?.total_consumption ?? 0);
    setMonthlyConsumptionBytes(Number.isFinite(total) ? total : 0);
  };

  const fetchDailyUsage = async (userId: number, providerId: number, days: number) => {
    const resp = await getDailyConsumptionRequest({
      user_id: userId,
      provider_id: providerId,
      days,
    });

    const list = Array.isArray(resp) ? resp : [];

    const normalized = list
        .map((d: any) => ({
          ...d,
          bytes_in: Number(d.bytes_in ?? 0),
          bytes_out: Number(d.bytes_out ?? 0),
          total_bytes: Number(d.total_bytes ?? 0),
        }))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setDailyUsage(normalized);
  };

  const refreshConsumptionData = async (
    userId: number,
    providerId: number,
    opts?: { silent?: boolean },
  ) => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    if (!opts?.silent) setIsLoading(true);
    try {
      await Promise.all([
        fetchMonthlyConsumption(userId, providerId),
        fetchDailyUsage(userId, providerId, usageDays),
      ]);
    } finally {
      if (!opts?.silent) setIsLoading(false);
      refreshInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    (async () => {
      setIsLoading(true);
      try {
        const data = await myListProvidersRequest(user.id);
        const list = Array.isArray(data) ? data : [];
        setProviders(list);

        if (list.length === 0) {
          setSelectedProvider(1);
          setAppliedProvider(1);
          setFilterApplied(false);
          setMonthlyData(null);
          setDailyUsage([]);
          setMonthlyConsumptionBytes(null);
          return;
        }
        const savedChoice = user.network_choice; // providerId stocké

        const defaultId = savedChoice && list.some(p => p.id === savedChoice)
            ? savedChoice
            : list[0].id;

        setSelectedProvider(defaultId);
        setAppliedProvider(defaultId);
        setFilterApplied(true);

        // ✅ API calls
        await refreshConsumptionData(user.id, defaultId, { silent: true });

        // fallback mock monthlyData (optional)
        const up = mockUserProviders
            .filter(u => u.user_id === user.id)
            .find(u => u.provider_id === defaultId);

        setMonthlyData(up ? calculateMonthlyConsumption(user.id, defaultId) : null);
      } catch (e) {
        setProviders([]);
        setSelectedProvider(1);
        setAppliedProvider(1);
        setFilterApplied(false);
        setMonthlyData(null);
        setDailyUsage([]);
        setMonthlyConsumptionBytes(null);
      } finally {
        setIsInitialized(true);
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const applyFilter = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      const updatedUser = await updateMyConnection({ network_choice: selectedProvider });
      updateUser({ network_choice: updatedUser.network_choice });

      setAppliedProvider(selectedProvider);
      setFilterApplied(true);

      await refreshConsumptionData(user.id, selectedProvider, { silent: true });

      // fallback mock monthlyData (optional)
      const up = mockUserProviders
          .filter(u => u.user_id === user.id)
          .find(u => u.provider_id === selectedProvider);

      setMonthlyData(up ? calculateMonthlyConsumption(user.id, selectedProvider) : null);
    } finally {
      setIsLoading(false);
    }
  };

  // When user changes 7/15/30, refresh chart for the applied provider immediately
  useEffect(() => {
    if (!user?.id || !filterApplied || !appliedProvider) return;

    (async () => {
      await refreshConsumptionData(user.id, appliedProvider, { silent: true });
    })();
  }, [usageDays, appliedProvider, filterApplied, user?.id]);

  // ✅ auto-refresh every 15s for the applied provider (real-time-ish)
  useEffect(() => {
    if (!user?.id || !filterApplied || !appliedProvider) return;

    const id = window.setInterval(() => {
      // silent refresh, no spinner/flicker
      refreshConsumptionData(user.id, appliedProvider, { silent: true });
    }, 15000);

    return () => window.clearInterval(id);
  }, [user?.id, filterApplied, appliedProvider, usageDays]);

  // provider appliqué (depuis API)
  const appliedProviderObj = useMemo(
      () => providers.find(p => p.id === appliedProvider),
      [providers, appliedProvider],
  );

  // user_provider actif pour ce user (depuis API)
  const currentUserProviderApi = appliedProviderObj?.user_providers?.find(up => up.is_active);

  // (optionnel) fallback mock si API vide
  const userProvidersMock = mockUserProviders.filter(up => up.user_id === user?.id);
  const currentUserProviderMock = userProvidersMock.find(up => up.provider_id === appliedProvider);

  // monthly_limit à afficher (API prioritaire)
  const monthlyLimitBytes =
      currentUserProviderApi?.monthly_limit ??
      currentUserProviderMock?.monthly_limit ??
      monthlyData?.monthly_limit ??
      0;

  // computed with API consumption + monthlyLimitBytes
  const totalConsumptionBytes = monthlyConsumptionBytes ?? 0;
  const percentageUsed = monthlyLimitBytes > 0 ? (totalConsumptionBytes / monthlyLimitBytes) * 100 : 0;
  const isExceeded = monthlyLimitBytes > 0 ? totalConsumptionBytes > monthlyLimitBytes : false;

  const maxBytes = Math.max(...dailyUsage.map(d => Number(d.total_bytes ?? 0)), 1);

  return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mon Dashboard</h1>
          <p className="mt-1 text-gray-500">Suivez votre consommation internet</p>
        </div>

        <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
          <label className="block mb-2 text-sm font-medium text-gray-700">
            Sélectionnez le fournisseur
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(Number(e.target.value))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg sm:max-w-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!isInitialized || isLoading || providers.length === 0}
            >
              {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
              ))}
            </select>

            <button
                onClick={applyFilter}
                disabled={isLoading || !isInitialized || providers.length === 0}
                className="px-6 py-2 font-semibold text-white transition bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-xl"
            >
              {isLoading ? 'Chargement...' : 'Appliquer'}
            </button>
          </div>
        </div>

        {(isLoading || !isInitialized) && (
            <div className="p-8 text-center bg-white border border-gray-200 shadow-sm rounded-xl">
              <Activity className="w-10 h-10 mx-auto mb-3 text-gray-500 animate-spin" />
              <p className="font-medium text-gray-600">Chargement des données...</p>
            </div>
        )}

        {isInitialized && !isLoading && providers.length === 0 && (
            <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-xl">
              <p className="font-medium text-yellow-800">Aucun fournisseur actif disponible pour votre compte.</p>
            </div>
        )}

        {filterApplied && !isLoading && (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-6 text-white shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-blue-100">Consommation Actuelle</p>
                    <Activity className="w-8 h-8 text-blue-200" />
                  </div>
                  <p className="text-3xl font-bold">{formatBytes(totalConsumptionBytes)}</p>
                  <p className="mt-1 text-sm text-blue-100">Ce mois-ci</p>
                </div>

                <div className="p-6 text-white shadow-lg bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-green-100">Limite Mensuelle</p>
                    <CheckCircle className="w-8 h-8 text-green-200" />
                  </div>
                  <p className="text-3xl font-bold">{formatBytes(monthlyLimitBytes)}</p>
                  <p className="mt-1 text-sm text-green-100">Limite définie</p>
                </div>

                <div
                    className={`rounded-xl p-6 text-white shadow-lg ${
                        isExceeded
                            ? 'bg-gradient-to-br from-red-500 to-red-600'
                            : 'bg-gradient-to-br from-orange-500 to-orange-600'
                    }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className={`text-sm font-medium ${isExceeded ? 'text-red-100' : 'text-orange-100'}`}>
                      Pourcentage Utilisé
                    </p>
                    {isExceeded ? (
                        <AlertTriangle className="w-8 h-8 text-red-200" />
                    ) : (
                        <TrendingUp className="w-8 h-8 text-orange-200" />
                    )}
                  </div>
                  <p className="text-3xl font-bold">{percentageUsed.toFixed(1)}%</p>
                  <p className={`text-sm mt-1 ${isExceeded ? 'text-red-100' : 'text-orange-100'}`}>
                    {isExceeded ? 'Limite dépassée!' : 'En cours'}
                  </p>
                </div>
              </div>

              {isExceeded && (
                  <div className="flex items-start gap-3 p-4 border border-red-200 bg-red-50 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-900">Limite dépassée</h3>
                      <p className="mt-1 text-sm text-red-700">
                        Vous avez dépassé votre limite mensuelle de {formatBytes(monthlyLimitBytes)}. Votre
                        consommation actuelle est de {formatBytes(totalConsumptionBytes)}.
                      </p>
                    </div>
                  </div>
              )}

              <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-bold text-gray-900">
                    Graphique d'usage ({usageDays} derniers jours)
                  </h2>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Période :</span>
                    <select
                        value={usageDays}
                        onChange={(e) => setUsageDays(Number(e.target.value) as DayOption)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading || !isInitialized}
                    >
                      {DAY_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d} jours
                          </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  {dailyUsage.length === 0 ? (
                      <div className="text-sm text-gray-500">Aucune donnée disponible.</div>
                  ) : (
                      <div className="space-y-4">
                        {dailyUsage.map((day, index) => (
                            <div key={day.id ?? index}>
                              <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(day.date).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                                <span className="text-sm font-semibold text-gray-900">
                          {formatBytes(day.total_bytes)}
                        </span>
                              </div>
                              <div className="w-full h-3 overflow-hidden bg-gray-200 rounded-full">
                                <div
                                    className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                                    style={{ width: `${(Number(day.total_bytes) / maxBytes) * 100}%` }}
                                />
                              </div>
                            </div>
                        ))}
                      </div>
                  )}
                </div>
              </div>

              {currentUserProviderApi && (
                  <div className="p-6 bg-white border border-gray-200 shadow-sm rounded-xl">
                    <h2 className="mb-4 text-xl font-bold text-gray-900">Informations de configuration</h2>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="p-4 rounded-lg bg-gray-50">
                        <p className="mb-1 text-sm text-gray-500">Fournisseur</p>
                        <p className="font-semibold text-gray-900">{appliedProviderObj?.name ?? '-'}</p>
                      </div>

                      <div className="p-4 rounded-lg bg-gray-50">
                        <p className="mb-1 text-sm text-gray-500">IP Routeur</p>
                        <p className="font-semibold text-gray-900">{currentUserProviderApi.router_ip ?? '-'}</p>
                      </div>

                      <div className="p-4 rounded-lg bg-gray-50">
                        <p className="mb-1 text-sm text-gray-500">Statut</p>
                        <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                                currentUserProviderApi.is_active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                            }`}
                        >
                    {currentUserProviderApi.is_active ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Actif
                        </>
                    ) : (
                        <>
                          <AlertTriangle className="w-3 h-3" />
                          Inactif
                        </>
                    )}
                  </span>
                      </div>

                      <div className="p-4 rounded-lg bg-gray-50">
                        <p className="mb-1 text-sm text-gray-500">Limite Mensuelle</p>
                        <p className="font-semibold text-gray-900">{formatBytes(monthlyLimitBytes)}</p>
                      </div>
                    </div>
                  </div>
              )}
            </>
        )}
      </div>
  );
};