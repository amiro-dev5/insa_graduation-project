import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { UserCheck, AlertCircle, ArrowRight, Shield, Camera, UploadCloud, X } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { City } from '../../types';

export const CustomerRegisterPage: React.FC = () => {
  const { registerCustomer } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    city_id: '',
    subcity_id: '',
    address_details: '',
    fayda_id: '',
    password: '',
    confirm_password: '',
  });

  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Cities and Sub-cities
  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ['cities'],
    queryFn: async () => {
      const res = await api.get('/professionals/cities/');
      return res.data;
    },
  });

  const selectedCity = cities.find((c) => c.id === Number(formData.city_id));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'city_id' ? { subcity_id: '' } : {}),
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, profile_picture: 'Only JPG, PNG, and WEBP image formats are supported.' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, profile_picture: 'Profile photo size must be 5MB or less.' }));
      return;
    }

    setProfilePhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    if (errors.profile_picture) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.profile_picture;
        return next;
      });
    }
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Frontend validations
    const newErrors: Record<string, string> = {};
    if (!profilePhoto) {
      newErrors.profile_picture = t('auth.photo_error_required');
    }
    if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = t('auth.err_password_match');
    }
    if (formData.password.length < 8) {
      newErrors.password = t('auth.err_password_length');
    }
    if (!formData.phone_number.match(/^(\+251|0)?[97][0-9]{8}$/)) {
      newErrors.phone_number = t('auth.err_phone_invalid');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('username', formData.username);
      data.append('password', formData.password);
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('phone_number', formData.phone_number);
      if (formData.email) data.append('email', formData.email);
      if (formData.city_id) data.append('city_id', formData.city_id);
      if (formData.subcity_id) data.append('subcity_id', formData.subcity_id);
      if (formData.address_details) data.append('address_details', formData.address_details);
      if (formData.fayda_id) data.append('fayda_id', formData.fayda_id);
      if (profilePhoto) {
        data.append('profile_picture', profilePhoto);
      }

      await registerCustomer(data);

      navigate('/customer/dashboard');
    } catch (err: any) {
      if (err.response?.data) {
        const backendErrors: Record<string, string> = {};
        for (const key in err.response.data) {
          const val = err.response.data[key];
          backendErrors[key] = Array.isArray(val) ? val[0] : String(val);
        }
        setErrors(backendErrors);
        if (backendErrors.detail) {
          setGeneralError(backendErrors.detail);
        }
      } else {
        setGeneralError(t('common.error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-10 px-4 sm:px-6">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-3">
            <UserCheck size={22} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('auth.cust_reg_title')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('auth.cust_reg_subtitle')}
          </p>
        </div>

        {generalError && (
          <div className="mb-6 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start space-x-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mandatory Profile Photo Field with Preview */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">
            <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {t('auth.photo_required_label')} *
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              {t('auth.photo_required_desc')}
            </p>

            <div className="flex items-center space-x-4">
              <div className="relative w-20 h-20 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                {photoPreview ? (
                  <>
                    <img
                      src={photoPreview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="absolute top-1 right-1 p-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full text-xs shadow-xs"
                      aria-label="Remove photo"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <Camera size={26} className="text-slate-400 dark:text-slate-500" />
                )}
              </div>

              <div className="flex-1">
                <label className="cursor-pointer inline-flex items-center space-x-2 px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-600 shadow-2xs transition-colors">
                  <UploadCloud size={15} className="text-indigo-600 dark:text-indigo-400" />
                  <span>{photoPreview ? t('auth.change_photo_btn') : t('auth.select_photo_btn')}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required={!profilePhoto}
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {photoPreview && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 flex items-center space-x-1">
                    <span>{t('auth.photo_verified')}</span>
                  </p>
                )}
                {errors.profile_picture && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.profile_picture}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.first_name')} *
              </label>
              <input
                type="text"
                required
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('auth.first_name_placeholder')}
              />
              {errors.first_name && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.first_name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.last_name')} *
              </label>
              <input
                type="text"
                required
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('auth.last_name_placeholder')}
              />
              {errors.last_name && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.last_name}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.username_or_phone')} *
              </label>
              <input
                type="text"
                required
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('auth.unique_username_placeholder')}
              />
              {errors.username && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.username}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.phone')} *
              </label>
              <input
                type="text"
                required
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('auth.ethiopian_phone_placeholder')}
              />
              {errors.phone_number && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.phone_number}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.city')}
              </label>
              <select
                name="city_id"
                value={formData.city_id}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t('auth.select_city')}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.subcity')}
              </label>
              <select
                name="subcity_id"
                value={formData.subcity_id}
                onChange={handleChange}
                disabled={!selectedCity || selectedCity.subcities.length === 0}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
              >
                <option value="">{t('auth.select_subcity')}</option>
                {selectedCity?.subcities.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.address_details_optional')}
            </label>
            <input
              type="text"
              name="address_details"
              value={formData.address_details}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('profile.saved_address_placeholder')}
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Shield size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>{t('auth.fayda_title')}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              {t('auth.fayda_desc')}
            </p>
            <input
              type="text"
              name="fayda_id"
              value={formData.fayda_id}
              onChange={handleChange}
              className="w-full mt-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('auth.fayda_placeholder')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.password')} *
              </label>
              <input
                type="password"
                required
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('auth.password_min_length')}
              />
              {errors.password && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.confirm_password')} *
              </label>
              <input
                type="password"
                required
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('auth.confirm_password_placeholder')}
              />
              {errors.confirm_password && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.confirm_password}</p>}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <span>{isSubmitting ? t('common.submitting') : t('auth.complete_cust_reg_btn')}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('auth.already_registered')}{' '}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            {t('nav.sign_in')}
          </Link>
        </div>
      </div>
    </div>
  );
};
