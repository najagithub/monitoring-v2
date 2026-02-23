import React, {useEffect, useMemo, useState} from 'react';
import { Modal } from '../components/Modal';
import { Provider } from '../types';
import { mockProviders } from '../data/mockData';
import { Plus, Edit2, Trash2, Server, AlertCircle } from 'lucide-react';
import {
  listProvidersRequest,
  createProviderRequest,
  updateProviderRequest,
  deleteProviderRequest,
} from "../services/providers.services.ts";

export const Providers: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>(mockProviders);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProviders = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const list = await listProvidersRequest();
      setProviders(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Impossible de charger les fournisseurs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingProvider(null);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    // if (confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur?')) {
    //   setProviders(providers.filter(p => p.id !== id));
    // }
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur?")) return;
    setError(null);
    setIsSaving(true);

    try {
      await deleteProviderRequest(id);
      await loadProviders();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Suppression impossible.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (payload: Omit<Provider, 'id' | 'created_at' | 'updated_at'>) => {
    setError(null);
    setIsSaving(true);
    try {
      if (editingProvider) {
        await updateProviderRequest(editingProvider.id, {
          name: payload.name,
          is_active: payload.is_active,
        });
      } else {
        // si tu veux garder la limite côté front
        if (providers.length >= 4) {
          setError("Limite atteinte : maximum 4 fournisseurs.");
          return;
        }
        await createProviderRequest({
          name: payload.name,
          is_active: payload.is_active,
        });
      }
      setShowModal(false);
      setEditingProvider(null);
      await loadProviders();

    } catch (e: any) {
      setError(e?.response?.data?.message || "Enregistrement impossible.");
    } finally {
      setIsSaving(false);
    }
  };

  const canAddMore = useMemo(() => providers.length < 4, [providers.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Fournisseurs</h1>
          <p className="text-gray-500 mt-1">
            Gérez vos fournisseurs internet (maximum 4)
          </p>
        </div>

        {canAddMore && (
          <button
            onClick={handleAdd}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Ajouter fournisseur
          </button>
        )}
      </div>

      {!!error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Erreur</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
      )}

      {!canAddMore && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-orange-900">Limite atteinte</h3>
            <p className="text-sm text-orange-700 mt-1">
              Vous avez atteint la limite maximale de 4 fournisseurs.
            </p>
          </div>
        </div>
      )}
      {isLoading ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-600">
            Chargement des fournisseurs...
          </div>
      ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.map(provider => (
                <div
                  key={provider.id}
                  className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <Server className="w-8 h-8 text-blue-600" />
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        provider.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {provider.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 mb-2">{provider.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Créé le {new Date(provider.created_at).toLocaleDateString('fr-FR')}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(provider)}
                      disabled={isSaving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(provider.id)}
                      disabled={isSaving}
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {providers.length === 0 && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
                <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun fournisseur
                </h3>
                <p className="text-gray-600 mb-6">
                  Commencez par ajouter votre premier fournisseur internet.
                </p>
                <button
                  onClick={handleAdd}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition shadow-lg hover:shadow-xl"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un fournisseur
                </button>
              </div>
            )}
          </>
      )}
      <Modal
        isOpen={showModal}
        onClose={() => (isSaving ? null : setShowModal(false))}
        title={editingProvider ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}
      >
        <ProviderForm
          provider={editingProvider}
          onSave={handleSave}
          onCancel={() => setShowModal(false)}
          isSaving={isSaving}
        />
      </Modal>
    </div>
  );
};

interface ProviderFormProps {
  provider: Provider | null;
  onSave: (provider: Omit<Provider, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

const ProviderForm: React.FC<ProviderFormProps> = ({ provider, onSave, onCancel, isSaving }) => {
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    is_active: provider?.is_active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom du fournisseur
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Ex: YAS, Starlink..."
          required
          disabled={isSaving}

        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          disabled={isSaving}
        />
        <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
          Fournisseur actif
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {provider ? 'Modifier' : 'Cr\u00e9er'}
        </button>
      </div>
    </form>
  );
};
