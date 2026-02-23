import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Lock, User as UserIcon, Mail, Phone, Save } from 'lucide-react';

import defaultAvatar from '../assets/avatar-default.png';

export const Profile: React.FC = () => {
  const { user, updateProfile, updatePassword } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const storageBaseUrl = useMemo(() => {
    const apiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined;
    if (!apiUrl) return '';
    return apiUrl.replace(/\/api\/?$/, '');
  }, []);

  const initialProfileImageUrl = useMemo(() => {
    if (!user?.profile_image) return '';
    // si déjà une URL complète
    if (/^https?:\/\//i.test(user.profile_image)) return user.profile_image;
    // sinon chemin relatif stocké en DB : profiles/xxx.jpg => /storage/profiles/xxx.jpg
    if (!storageBaseUrl) return `/storage/${user.profile_image}`;
    return `${storageBaseUrl}/storage/${user.profile_image}`;
  }, [user?.profile_image, storageBaseUrl]);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  // ✅ preview (avec fallback defaultAvatar)
  const [profileImagePreview, setProfileImagePreview] = useState<string>(
      initialProfileImageUrl || user?.profile_image_url || defaultAvatar
  );

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;

    try {
      setIsSavingProfile(true);

      await updateProfile({
        ...profileData,
        profile_image: profileImageFile,
      });

      setProfileImageFile(null);
    } catch (error) {
      alert('Erreur lors de la mise à jour du profil');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingPassword) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setIsSavingPassword(true);

      await updatePassword(passwordData.currentPassword, passwordData.newPassword);

      alert('Mot de passe modifié avec succès!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      alert('Erreur lors de la modification du mot de passe');
    } finally {
      setIsSavingPassword(false);
    }
  };

  // ✅ Si pas de fichier sélectionné, on prend l'image user, sinon fallback defaultAvatar
  useEffect(() => {
    if (!profileImageFile) {
      const next =
          initialProfileImageUrl ||
          user?.profile_image_url ||
          defaultAvatar;
      setProfileImagePreview(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.profile_image_url, user?.profile_image, initialProfileImageUrl, profileImageFile]);

  const Spinner = ({ className = '' }: { className?: string }) => (
      <span
          className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent ${className}`}
      />
  );

  return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mon Profil</h1>
          <p className="text-gray-500 mt-1">Gérez vos informations personnelles</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <img
                    src={profileImagePreview || defaultAvatar}
                    alt={user?.username || 'profile'}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                    onError={(e) => {
                      // ✅ fallback si URL cassée
                      e.currentTarget.src = defaultAvatar;
                    }}
                />

                {/* Input file caché */}
                <input
                    id="profile_image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setProfileImageFile(file);
                      setProfileImagePreview(URL.createObjectURL(file));
                    }}
                />

                <button
                    type="button"
                    onClick={() => document.getElementById('profile_image')?.click()}
                    className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition"
                    title="Changer la photo"
                >
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-white">
                  {profileData.name || user?.username || 'Utilisateur'}
                </h2>
                <p className="text-blue-100">{user?.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold text-white capitalize">
                {user?.role}
              </span>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition ${
                      activeTab === 'profile'
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <UserIcon className="w-4 h-4 inline mr-2" />
                Informations
              </button>
              <button
                  onClick={() => setActiveTab('password')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition ${
                      activeTab === 'password'
                          ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Lock className="w-4 h-4 inline mr-2" />
                Mot de passe
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* NAME */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <UserIcon className="w-4 h-4 inline mr-2" />
                      Nom
                    </label>
                    <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <UserIcon className="w-4 h-4 inline mr-2" />
                      Username
                    </label>
                    <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-2" />
                      Email
                    </label>
                    <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Téléphone (optionnel)
                    </label>
                    <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                      type="submit"
                      disabled={isSavingProfile}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-lg transition shadow-lg hover:shadow-xl ${
                          isSavingProfile ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                  >
                    {isSavingProfile ? (
                        <>
                          <Spinner />
                          Enregistrement...
                        </>
                    ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Enregistrer les modifications
                        </>
                    )}
                  </button>
                </form>
            )}

            {activeTab === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
                    <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
                    <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmer le nouveau mot de passe
                    </label>
                    <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        minLength={6}
                    />
                  </div>

                  <button
                      type="submit"
                      disabled={isSavingPassword}
                      className={`w-full sm:w-auto flex items-center justify-center gap-2 font-semibold px-6 py-3 rounded-lg transition shadow-lg hover:shadow-xl ${
                          isSavingPassword ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                      } text-white`}
                  >
                    {isSavingPassword ? (
                        <>
                          <Spinner />
                          Modification...
                        </>
                    ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          Modifier le mot de passe
                        </>
                    )}
                  </button>
                </form>
            )}
          </div>
        </div>
      </div>
  );
};