import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, UploadCloud, AlertCircle, ArrowRight, ShieldCheck, FileCheck, Camera, X } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { City, ServiceCategory } from '../../types';

export const ProfessionalRegisterPage: React.FC = () => {
  const { registerProfessional } = useAuth();
  const { t, translateCategory } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    city_id: '',
    subcity_id: '',
    service_area_description: '',
    bio: '',
    experience_years: '2',
    previous_work_description: '',
    certificate_title: '',
    certificate_issued_by: '',
    password: '',
    confirm_password: '',
  });

  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Cities and Categories
  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ['cities'],
    queryFn: async () => {
      const res = await api.get('/professionals/cities/');
      return res.data;
    },
  });

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/professionals/categories/');
      return res.data;
    },
  });

  const selectedCity = cities.find((c) => c.id === Number(formData.city_id));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

  const toggleCategory = (catId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
    if (errors.categories) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.categories;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, certificate_file: 'File size must be under 5MB.' }));
        setCertificateFile(null);
        return;
      }
      setCertificateFile(file);
      if (errors.certificate_file) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.certificate_file;
          return next;
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    const newErrors: Record<string, string> = {};
    if (!profilePhoto) {
      newErrors.profile_picture = t('auth.photo_error_required');
    }
    if (selectedCategories.length === 0) {
      newErrors.categories = t('auth.err_select_category');
    }
    if (!certificateFile) {
      newErrors.certificate_file = t('auth.err_cert_required');
    }
    if (!formData.certificate_title.trim()) {
      newErrors.certificate_title = t('auth.err_cert_title_required');
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
      data.append('city_id', formData.city_id);
      if (formData.subcity_id) data.append('subcity_id', formData.subcity_id);
      data.append('service_area_description', formData.service_area_description);
      data.append('bio', formData.bio);
      data.append('experience_years', formData.experience_years);
      if (formData.previous_work_description) {
        data.append('previous_work_description', formData.previous_work_description);
      }
      data.append('category_ids', JSON.stringify(selectedCategories));
      data.append('certificate_title', formData.certificate_title);
      if (formData.certificate_issued_by) {
        data.append('certificate_issued_by', formData.certificate_issued_by);
      }
      if (certificateFile) {
        data.append('certificate_file', certificateFile);
      }
      if (profilePhoto) {
        data.append('profile_picture', profilePhoto);
      }

      await registerProfessional(data);
      navigate('/professional/dashboard');
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
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Briefcase size={22} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('auth.pro_reg_title')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('auth.pro_reg_subtitle')}
          </p>
        </div>

        {generalError && (
          <div className="mb-6 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start space-x-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mandatory Professional Profile Photo with Preview */}
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

          {/* Personal Info */}
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

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('profile.city')} *
              </label>
              <select
                required
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
              {errors.city_id && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.city_id}</p>}
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

          {/* Professional Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.select_trade_categories')} *
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
              {t('auth.trade_categories_desc')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-2.5 rounded-lg border text-xs text-left transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 font-medium'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="truncate">{translateCategory(cat.name)}</span>
                    {isSelected && <ShieldCheck size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
            {errors.categories && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.categories}</p>}
          </div>

          {/* Bio & Experience */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.experience_years_label')} *
              </label>
              <input
                type="number"
                min="0"
                max="50"
                required
                name="experience_years"
                value={formData.experience_years}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.service_area_label')}
              </label>
              <input
                type="text"
                name="service_area_description"
                value={formData.service_area_description}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('auth.service_area_placeholder')}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('auth.pro_bio_label')} *
            </label>
            <textarea
              rows={3}
              required
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('auth.pro_bio_placeholder')}
            />
            {errors.bio && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.bio}</p>}
          </div>

          {/* Mandatory Certificate Section */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
            <div className="flex items-center space-x-2">
              <FileCheck size={18} className="text-indigo-600 dark:text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {t('auth.mandatory_cert_title')} *
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('auth.mandatory_cert_desc')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.cert_title_label')} *
                </label>
                <input
                  type="text"
                  required
                  name="certificate_title"
                  value={formData.certificate_title}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('auth.cert_title_placeholder')}
                />
                {errors.certificate_title && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{errors.certificate_title}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('auth.issuing_auth_label')}
                </label>
                <input
                  type="text"
                  name="certificate_issued_by"
                  value={formData.certificate_issued_by}
                  onChange={handleChange}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={t('auth.issuing_auth_placeholder')}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('auth.upload_doc_label')} *
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                required
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100"
              />
              {errors.certificate_file && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{errors.certificate_file}</p>
              )}
            </div>
          </div>

          {/* Passwords */}
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
              {errors.confirm_password && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{errors.confirm_password}</p>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <span>{isSubmitting ? t('common.submitting') : t('auth.complete_pro_reg_btn')}</span>
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
