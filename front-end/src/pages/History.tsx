import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Calendar,
  Download,
  Filter,
  TrendingUp,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { formatBytes } from '../data/mockData';
import type {Provider, DailyConsumptionItem, ClientUser} from '../types';

import {
  listProvidersRequest,
  myListProvidersRequest,
  listClientsRequest,
} from '../services/providers.services';

import { getConsumptionHistoryRequest } from '../services/consumptionHistory.services';

export const History: React.FC = () => {
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';

  // ✅ clients dynamiques
  const [clientUsers, setClientUsers] = useState<ClientUser[]>([]);
  const [isClientsLoading, setIsClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string>('');

  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<number>(isAdmin ? 0 : user?.id || 0);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [providers, setProviders] = useState<Provider[]>([]);
  const [history, setHistory] = useState<DailyConsumptionItem[]>([]);

  const [isProvidersLoading, setIsProvidersLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [providersError, setProvidersError] = useState<string>('');
  const [historyError, setHistoryError] = useState<string>('');

  // -------------------- Pagination --------------------
  const pageSizeOptions = [15, 20, 30] as const;
  const [pageSize, setPageSize] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // reset page when filters/pageSize change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProvider, selectedUser, startDate, endDate, pageSize]);
  // ----------------------------------------------------

  // ✅ Load clients (admin only)
  useEffect(() => {
    const controller = new AbortController();

    const loadClients = async () => {
      if (!isAdmin) {
        setClientUsers([]);
        setClientsError('');
        setIsClientsLoading(false);
        return;
      }

      try {
        setIsClientsLoading(true);
        setClientsError('');

        // si tu veux brancher AbortController à axios, on peut adapter api client
        const data = await listClientsRequest();
        setClientUsers(data || []);

        // optionnel: si selectedUser est 0 et qu'il n'y a qu'un seul client
        // tu peux auto-select (à toi de voir)
        // if (selectedUser === 0 && data?.length === 1) setSelectedUser(data[0].id);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setClientUsers([]);
        setClientsError(e?.message || 'Erreur lors du chargement des clients.');
      } finally {
        setIsClientsLoading(false);
      }
    };

    loadClients();
    return () => controller.abort();
  }, [isAdmin]);

  // ✅ si rôle change (admin/client), ajuste selectedUser
  useEffect(() => {
    if (!isAdmin) {
      setSelectedUser(user?.id || 0);
    } else {
      setSelectedUser(0);
    }
  }, [isAdmin, user?.id]);

  // -------- Providers load (selon role) --------
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setIsProvidersLoading(true);
        setProvidersError('');

        if (!user?.id) {
          setProviders([]);
          return;
        }

        const data = isAdmin ? await listProvidersRequest() : await myListProvidersRequest(user.id);
        setProviders(data || []);
      } catch (e: any) {
        setProviders([]);
        setProvidersError(e?.message || 'Erreur lors du chargement des fournisseurs.');
      } finally {
        setIsProvidersLoading(false);
      }
    };

    loadProviders();
  }, [isAdmin, user?.id]);

  // -------- Conditions d'affichage / fetch --------
  const canSearch = useMemo(() => {
    const baseOk = Boolean(selectedProvider) && Boolean(startDate) && Boolean(endDate);
    if (!baseOk) return false;
    if (isAdmin && selectedUser === 0) return false;
    return true;
  }, [selectedProvider, startDate, endDate, isAdmin, selectedUser]);

  // Nettoyer l'affichage dès que les filtres deviennent incomplets
  useEffect(() => {
    if (!canSearch) {
      setHistory([]);
      setHistoryError('');
    }
  }, [canSearch]);

  // -------- Fetch history auto quand filtres OK --------
  useEffect(() => {
    const controller = new AbortController();

    const loadHistory = async () => {
      if (!canSearch) return;

      try {
        setIsHistoryLoading(true);
        setHistoryError('');

        const userId = isAdmin ? selectedUser : user?.id || 0;
        const providerId = Number(selectedProvider);

        const data = await getConsumptionHistoryRequest({
          user_id: userId,
          provider_id: providerId,
          start_date: startDate,
          end_date: endDate,
          // signal: controller.signal, // seulement si ton service supporte AbortController
        });

        const sorted = [...(data || [])].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setHistory(sorted);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setHistory([]);
        setHistoryError(e?.message || 'Erreur lors du chargement de l’historique.');
      } finally {
        setIsHistoryLoading(false);
      }
    };

    loadHistory();
    return () => controller.abort();
  }, [canSearch, selectedProvider, startDate, endDate, selectedUser, isAdmin, user?.id]);

  // -------- Stats --------
  const totalConsumption = useMemo(
      () => history.reduce((sum, h) => sum + (h.total_bytes || 0), 0),
      [history]
  );

  const avgDailyConsumption = useMemo(() => {
    if (history.length === 0) return 0;
    return totalConsumption / history.length;
  }, [totalConsumption, history.length]);

  const maxTotalDay = useMemo(() => {
    if (history.length === 0) return null;
    return history.reduce((max, current) =>
        current.total_bytes > max.total_bytes ? current : max
    );
  }, [history]);

  const maxInDay = useMemo(() => {
    if (history.length === 0) return null;
    return history.reduce((max, current) => (current.bytes_in > max.bytes_in ? current : max));
  }, [history]);

  const maxOutDay = useMemo(() => {
    if (history.length === 0) return null;
    return history.reduce((max, current) => (current.bytes_out > max.bytes_out ? current : max));
  }, [history]);

  const selectedProviderName = useMemo(() => {
    const p = providers.find((x) => x.id === Number(selectedProvider));
    return p?.name || '';
  }, [providers, selectedProvider]);

  // -------------------- Pagination computed --------------------
  const totalItems = history.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pagedHistory = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    const end = start + pageSize;
    return history.slice(start, end);
  }, [history, safeCurrentPage, pageSize]);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const half = Math.floor(windowSize / 2);

    let start = Math.max(1, safeCurrentPage - half);
    let end = Math.min(totalPages, start + windowSize - 1);

    start = Math.max(1, end - windowSize + 1);

    const pages: number[] = [];
    for (let p = start; p <= end; p++) pages.push(p);
    return pages;
  }, [safeCurrentPage, totalPages]);
  // ------------------------------------------------------------

  // -------- Export CSV --------
  const handleExport = () => {
    if (!canSearch || isHistoryLoading || history.length === 0) return;

    const headers = ['date', 'bytes_in', 'bytes_out', 'total_bytes'];
    const rows = history.map((h) => [
      new Date(h.date).toISOString().slice(0, 10),
      String(h.bytes_in ?? 0),
      String(h.bytes_out ?? 0),
      String(h.total_bytes ?? 0),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `consumption-history_${startDate}_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const showContent = canSearch;

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Historique des Consommations</h1>
            <p className="text-gray-500 mt-1">Consultez l'historique complet</p>
          </div>

          <button
              onClick={handleExport}
              disabled={!showContent || isHistoryLoading || history.length === 0}
              className={[
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg transition shadow-lg',
                !showContent || isHistoryLoading || history.length === 0
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-none'
                    : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-xl',
              ].join(' ')}
          >
            <Download className="w-5 h-5" />
            Exporter CSV
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
          </div>

          {isAdmin && clientsError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {clientsError}
              </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Utilisateur</label>
                  <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(Number(e.target.value))}
                      disabled={isClientsLoading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  >
                    <option value={0}>
                      {isClientsLoading ? 'Chargement...' : '-- Choisir un utilisateur --'}
                    </option>
                    {clientUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Obligatoire (vous devrez sélectionner un utilisateur).
                  </p>
                </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur</label>
              <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  disabled={isProvidersLoading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">
                  {isProvidersLoading ? 'Chargement...' : '-- Choisir un fournisseur --'}
                </option>
                {providers.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                ))}
              </select>

              {providersError && <p className="text-xs text-red-600 mt-1">{providersError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de début</label>
              <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de fin</label>
              <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {!showContent && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {isAdmin && selectedUser === 0
                    ? 'Veuillez choisir un utilisateur, un fournisseur, une date de début et une date de fin.'
                    : 'Veuillez choisir un fournisseur, une date de début et une date de fin.'}
              </div>
          )}
        </div>

        {/* ✅ Rien n'affiche si filtres incomplets */}
        {showContent && (
            <>
              {isHistoryLoading && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Chargement de l’historique...
                    </div>
                  </div>
              )}

              {!isHistoryLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-blue-100 text-sm font-medium">Consommation Totale</p>
                        <TrendingUp className="w-8 h-8 text-blue-200" />
                      </div>

                      <p className="text-3xl font-bold">{formatBytes(totalConsumption)}</p>
                      <p className="text-blue-100 text-sm mt-1">{history.length} jours enregistrés</p>

                      {maxTotalDay && (
                          <div className="mt-4 border-t border-blue-400 pt-3 text-sm text-blue-100">
                            <p>
                              🔥 Max journalier :{' '}
                              <span className="font-semibold text-white">
                        {formatBytes(maxTotalDay.total_bytes)}
                      </span>
                            </p>
                            <p>📅 Le {new Date(maxTotalDay.date).toLocaleDateString('fr-FR')}</p>
                          </div>
                      )}
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-green-100 text-sm font-medium">Moyenne Journalière</p>
                        <Calendar className="w-8 h-8 text-green-200" />
                      </div>

                      <p className="text-3xl font-bold">{formatBytes(avgDailyConsumption)}</p>
                      <p className="text-green-100 text-sm mt-1">Par jour</p>

                      {maxInDay && maxOutDay && (
                          <div className="mt-4 border-t border-green-400 pt-3 text-sm text-green-100 space-y-1">
                            <p>
                              🔼 Max Entrée :{' '}
                              <span className="font-semibold text-white">
                        {formatBytes(maxInDay.bytes_in)}
                      </span>
                            </p>
                            <p>
                              🔽 Max Sortie :{' '}
                              <span className="font-semibold text-white">
                        {formatBytes(maxOutDay.bytes_out)}
                      </span>
                            </p>
                          </div>
                      )}
                    </div>
                  </div>
              )}

              {/* Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Historique détaillé ({history.length} entrées)
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Fournisseur:{' '}
                      <span className="font-medium text-gray-700">{selectedProviderName}</span> •
                      Période: {startDate} → {endDate}
                    </p>
                  </div>

                  {/* Pagination controls (page size) */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600">Lignes / page</label>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {pageSizeOptions.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                      ))}
                    </select>
                  </div>
                </div>

                {historyError && !isHistoryLoading && (
                    <div className="p-6">
                      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        {historyError}
                      </div>
                    </div>
                )}

                {!isHistoryLoading && !historyError && history.length > 0 && (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Fournisseur
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Entrée
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Sortie
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Total
                            </th>
                          </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-200">
                          {pagedHistory.map((record) => (
                              <tr key={record.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                  {new Date(record.date).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {selectedProviderName || record.provider_id}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {formatBytes(record.bytes_in)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                  {formatBytes(record.bytes_out)}
                                </td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                  {formatBytes(record.total_bytes)}
                                </td>
                              </tr>
                          ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination footer */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          Affichage{' '}
                          <span className="font-medium text-gray-900">
                      {totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1}
                    </span>{' '}
                          -{' '}
                          <span className="font-medium text-gray-900">
                      {Math.min(safeCurrentPage * pageSize, totalItems)}
                    </span>{' '}
                          sur <span className="font-medium text-gray-900">{totalItems}</span>
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                              disabled={safeCurrentPage === 1}
                              className={[
                                'inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm',
                                safeCurrentPage === 1
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white hover:bg-gray-50 text-gray-700',
                              ].join(' ')}
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Précédent
                          </button>

                          <div className="flex items-center gap-1">
                            {pageNumbers.map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={[
                                      'px-3 py-2 rounded-lg text-sm border',
                                      p === safeCurrentPage
                                          ? 'bg-blue-600 text-white border-blue-600'
                                          : 'bg-white hover:bg-gray-50 text-gray-700',
                                    ].join(' ')}
                                >
                                  {p}
                                </button>
                            ))}
                            {totalPages > pageNumbers[pageNumbers.length - 1] && (
                                <span className="px-2 text-sm text-gray-500">…</span>
                            )}
                          </div>

                          <button
                              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                              disabled={safeCurrentPage === totalPages}
                              className={[
                                'inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-sm',
                                safeCurrentPage === totalPages
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-white hover:bg-gray-50 text-gray-700',
                              ].join(' ')}
                          >
                            Suivant
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                )}

                {!isHistoryLoading && !historyError && history.length === 0 && (
                    <div className="p-12 text-center">
                      <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun enregistrement</h3>
                      <p className="text-gray-600">Aucune donnée ne correspond à vos critères.</p>
                    </div>
                )}
              </div>
            </>
        )}
      </div>
  );
};