import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  User as UserIcon,
  Lock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Save,
  LogOut,
  Shield,
  Briefcase
} from 'lucide-react';
import { api, getMediaUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { City } from '../../types';
import { Avatar } from '../../components/Avatar';

export const UserProfilePage: React.FC = () => {
  const { user, refreshProfile, logout } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'DETAILS' | 'PASSWORD'>('DETAILS');

  // Profile Form State
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [cityId, setCityId] = useState(
    user?.role === 'CUSTOMER'
      ? user?.customer_profile?.city_id || ''
      : user?.professional_profile?.city_id || ''
  );
  const [subcityId, setSubcityId] = useState(
    user?.role === 'CUSTOMER'
      ? user?.customer_profile?.subcity_id || ''
      : user?.professional_profile?.subcity_id || ''
  );
  const [addressDetails, setAddressDetails] = useState(
    user?.customer_profile?.address_details || ''
  );
  const [bio, setBio] = useState(user?.professional_profile?.bio || '');
  const [serviceArea, setServiceArea] = useState(
    user?.professional_profile?.service_area_description || ''
  );
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Fetch Cities
  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ['cities'],
    queryFn: async () => {
      const res = await api.get('/professionals/cities/');
      return res.data;
    },
  });

  const selectedCityObj = cities.find((c) => String(c.id) === String(cityId));

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMessage(null);

    try {
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('email', email);
      if (cityId) formData.append('city_id', String(cityId));
      if (subcityId) formData.append('subcity_id', String(subcityId));

      if (user?.role === 'CUSTOMER') {
        formData.append('address_details', addressDetails);
      } else if (user?.role === 'PROFESSIONAL') {
        formData.append('bio', bio);
        formData.append('service_area_description', serviceArea);
      }

      if (profilePicture) {
        formData.append('profile_picture', profilePicture);
      }

      await api.patch('/accounts/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await refreshProfile();
      setProfileMessage('Profile information saved successfully.');
    } catch {
      alert('Failed to update profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/accounts/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
      });

      setPasswordSuccess('Password changed successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      if (err.response?.data?.old_password) {
        setPasswordError(err.response.data.old_password[0]);
      } else {
        setPasswordError('Failed to change password. Please check current password.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs transition-colors">
        {/* Profile Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div className="flex items-center space-x-4">
            <Avatar
              src={user?.profile_picture}
              name={user?.full_name || user?.username}
              role={user?.role}
              size="2xl"
            />
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">{user?.full_name}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user?.phone_number} · @{user?.username}</p>
              <span className="mt-1 inline-block text-[11px] px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-full">
                {user?.role === 'CUSTOMER' ? t('nav.role_customer') : user?.role === 'PROFESSIONAL' ? t('nav.role_pro') : t('nav.role_admin')}
              </span>
            </div>
          </div>

          <button
            onClick={logout}
            className="self-start sm:self-center px-4 py-2 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5"
          >
            <LogOut size={13} />
            <span>{t('nav.sign_out')}</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex space-x-2 my-6">
          <button
            onClick={() => setActiveTab('DETAILS')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              activeTab === 'DETAILS'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('profile.tab_info')}
          </button>
          <button
            onClick={() => setActiveTab('PASSWORD')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
              activeTab === 'PASSWORD'
                ? 'bg-slate-900 dark:bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('profile.tab_security')}
          </button>
        </div>

        {/* Tab 1: Profile Details */}
        {activeTab === 'DETAILS' && (
          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
            {profileMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={15} />
                <span>{profileMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('profile.first_name')}
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('profile.last_name')}
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('profile.city')}
                </label>
                <select
                  value={cityId}
                  onChange={(e) => {
                    setCityId(e.target.value);
                    setSubcityId('');
                  }}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('auth.select_city')}</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('profile.subcity')}
                </label>
                <select
                  value={subcityId}
                  onChange={(e) => setSubcityId(e.target.value)}
                  disabled={!selectedCityObj || selectedCityObj.subcities.length === 0}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
                >
                  <option value="">{t('auth.select_subcity')}</option>
                  {selectedCityObj?.subcities.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {user?.role === 'CUSTOMER' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('profile.saved_address')}
                </label>
                <input
                  type="text"
                  value={addressDetails}
                  onChange={(e) => setAddressDetails(e.target.value)}
                  placeholder={t('profile.saved_address_placeholder')}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {user?.role === 'PROFESSIONAL' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('profile.service_area')}
                  </label>
                  <input
                    type="text"
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    placeholder={t('profile.service_area_placeholder')}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('profile.bio')}
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={t('profile.bio_placeholder')}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </>
            )}

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl">
              <label className="block text-xs font-semibold text-slate-900 dark:text-white mb-1">
                {t('profile.photo_label')}
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                {t('profile.photo_desc')}
              </p>
              <div className="flex items-center space-x-3">
                <Avatar
                  src={profilePicture ? URL.createObjectURL(profilePicture) : user?.profile_picture}
                  name={user?.full_name || user?.username}
                  size="lg"
                />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
                  className="text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-white dark:file:bg-slate-800 file:border file:border-slate-300 dark:file:border-slate-700 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-100 dark:hover:file:bg-slate-700"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="px-5 py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 hover:dark:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
              >
                <Save size={14} />
                <span>{isUpdatingProfile ? t('profile.saving_btn') : t('profile.save_btn')}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Change Password */}
        {activeTab === 'PASSWORD' && (
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            {passwordError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center space-x-2 text-xs text-rose-700 dark:text-rose-300">
                <AlertCircle size={15} />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={15} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.current_password')} *
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.new_password')} *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.confirm_password')} *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {isChangingPassword ? t('common.submitting') : t('profile.change_password_btn')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
