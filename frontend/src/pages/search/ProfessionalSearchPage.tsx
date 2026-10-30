import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Filter,
  MapPin,
  Star,
  CheckCircle2,
  Briefcase,
  Users,
  Send,
  X,
  AlertCircle,
  Calendar,
  Home,
  Check
} from 'lucide-react';
import { api, getMediaUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { City, ServiceCategory, ProfessionalProfile } from '../../types';
import { StarRating } from '../../components/StarRating';
import { Avatar } from '../../components/Avatar';

export const ProfessionalSearchPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { t, translateCategory } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Search Filters State
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get('city') || '');
  const [selectedSubCity, setSelectedSubCity] = useState<string>(searchParams.get('subcity') || '');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [ordering, setOrdering] = useState<string>(searchParams.get('ordering') || '-average_rating');

  // Selected Professionals (Max 3)
  const [selectedPros, setSelectedPros] = useState<ProfessionalProfile[]>([]);

  // Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    title: '',
    description: searchQuery || '',
    service_address: user?.customer_profile?.address_details || '',
    preferred_date: '',
  });
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Fetch Cities & Categories
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

  const activeCityObj = cities.find((c) => String(c.id) === selectedCity);

  // Fetch Professionals matching filters
  const {
    data: prosData,
    isLoading,
    isError,
  } = useQuery<{ results: ProfessionalProfile[] } | ProfessionalProfile[]>({
    queryKey: ['professional-search', selectedCategory, selectedCity, selectedSubCity, searchQuery, ordering],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedCity) params.append('city', selectedCity);
      if (selectedSubCity) params.append('subcity', selectedSubCity);
      if (searchQuery) params.append('q', searchQuery);
      if (ordering) params.append('ordering', ordering);

      const res = await api.get(`/professionals/search/?${params.toString()}`);
      return res.data;
    },
  });

  const professionals: ProfessionalProfile[] = Array.isArray(prosData) ? prosData : prosData?.results || [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams();
    if (selectedCategory) newParams.set('category', selectedCategory);
    if (selectedCity) newParams.set('city', selectedCity);
    if (selectedSubCity) newParams.set('subcity', selectedSubCity);
    if (searchQuery) newParams.set('q', searchQuery);
    if (ordering) newParams.set('ordering', ordering);
    setSearchParams(newParams);
  };

  const handleToggleSelectPro = (pro: ProfessionalProfile) => {
    if (selectedPros.some((p) => p.id === pro.id)) {
      setSelectedPros((prev) => prev.filter((p) => p.id !== pro.id));
    } else {
      if (selectedPros.length >= 3) {
        alert(t('request.limit_warning'));
        return;
      }
      setSelectedPros((prev) => [...prev, pro]);
    }
  };

  const handleOpenRequestModal = () => {
    if (!isAuthenticated) {
      alert('Please sign in or create a customer account to submit a service request.');
      navigate('/login');
      return;
    }
    if (user?.role !== 'CUSTOMER') {
      alert(t('request.customer_only_warning'));
      return;
    }
    if (selectedPros.length === 0) {
      alert('Please select at least one technician to notify.');
      return;
    }
    setRequestForm((prev) => ({
      ...prev,
      description: prev.description || searchQuery,
    }));
    setShowRequestModal(true);
  };

  const handleSendServiceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestErrors({});

    const newErrors: Record<string, string> = {};
    if (!requestForm.title.trim()) newErrors.title = 'Title is required.';
    if (!requestForm.description.trim()) newErrors.description = 'Problem description is required.';
    if (!requestForm.service_address.trim()) newErrors.service_address = 'Service location address is required.';

    if (Object.keys(newErrors).length > 0) {
      setRequestErrors(newErrors);
      return;
    }

    // Determine category ID: first from selected category, or from pro's categories
    let categoryId = selectedCategory ? Number(selectedCategory) : null;
    if (!categoryId && selectedPros[0]?.categories?.[0]) {
      categoryId = selectedPros[0].categories[0].id;
    }
    if (!categoryId && categories[0]) {
      categoryId = categories[0].id;
    }

    // Determine city ID
    let cityId = selectedCity ? Number(selectedCity) : null;
    if (!cityId && selectedPros[0]?.city) {
      cityId = selectedPros[0].city;
    }
    if (!cityId && cities[0]) {
      cityId = cities[0].id;
    }

    setIsSubmittingRequest(true);
    try {
      const payload = {
        category_id: categoryId,
        city_id: cityId,
        subcity_id: selectedSubCity ? Number(selectedSubCity) : (selectedPros[0]?.subcity || null),
        title: requestForm.title,
        description: requestForm.description,
        service_address: requestForm.service_address,
        preferred_date: requestForm.preferred_date || null,
        selected_professional_ids: selectedPros.map((p) => p.user_id),
      };

      const res = await api.post('/services/requests/', payload);
      queryClient.invalidateQueries({ queryKey: ['customer-requests'] });
      setShowRequestModal(false);
      setSelectedPros([]);
      navigate(`/requests/${res.data.id}`);
    } catch (err: any) {
      if (err.response?.data) {
        const bErrors: Record<string, string> = {};
        for (const k in err.response.data) {
          const val = err.response.data[k];
          bErrors[k] = Array.isArray(val) ? val[0] : String(val);
        }
        setRequestErrors(bErrors);
      } else {
        alert('Failed to submit service request. Please check your inputs.');
      }
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Search Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {t('search.title')}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('search.subtitle')}
        </p>
      </div>

      {/* Filter Box */}
      <div className="mb-8 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('search.filter_category')}
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
              >
                <option value="">{t('search.all_categories')}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {translateCategory(cat.name)}
                  </option>
                ))}
              </select>
            </div>

            {/* City Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('search.filter_city')}
              </label>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setSelectedSubCity('');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
              >
                <option value="">{t('search.all_cities')}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-city Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('search.filter_subcity')}
              </label>
              <select
                value={selectedSubCity}
                onChange={(e) => setSelectedSubCity(e.target.value)}
                disabled={!activeCityObj || activeCityObj.subcities.length === 0}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 disabled:opacity-50"
              >
                <option value="">{t('search.all_subcities')}</option>
                {activeCityObj?.subcities.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sorting */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('common.filter')}
              </label>
              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
              >
                <option value="-average_rating">Highest Rated</option>
                <option value="-completed_jobs_count">Most Completed Jobs</option>
                <option value="-experience_years">Most Experienced</option>
              </select>
            </div>
          </div>

          {/* Keyword Search & Submit */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search size={15} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search.search_placeholder')}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center space-x-1.5 px-5 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              <Search size={13} />
              <span>{t('common.search')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Floating Selection Banner (When Pros Selected) */}
      {selectedPros.length > 0 && (
        <div className="sticky top-20 z-30 mb-6 p-4 bg-indigo-900 text-white rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
              {selectedPros.length}/3
            </div>
            <div>
              <p className="text-xs font-bold">
                {t('search.selection_banner_title', { count: selectedPros.length })}
              </p>
              <p className="text-[11px] text-indigo-200">
                {t('search.selection_banner_desc', { names: selectedPros.map((p) => p.full_name).join(', ') })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedPros([])}
              className="px-3 py-1.5 text-xs text-indigo-200 hover:text-white rounded-lg transition-colors"
            >
              {t('search.clear_selection')}
            </button>
            <button
              onClick={handleOpenRequestModal}
              className="px-4 py-1.5 bg-white text-indigo-900 hover:bg-indigo-50 font-semibold text-xs rounded-lg transition-colors shadow-xs flex items-center space-x-1.5"
            >
              <span>{t('search.notify_selected_btn')}</span>
              <Send size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('search.loading_pros')}</p>
        </div>
      )}

      {isError && (
        <div className="p-8 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-center">
          <AlertCircle size={24} className="text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('common.error')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('search.error_loading')}</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && professionals.length === 0 && (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t('search.empty_title')}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {t('search.empty_desc')}
          </p>
        </div>
      )}

      {/* Professionals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {professionals.map((pro) => {
          const isSelected = selectedPros.some((p) => p.id === pro.id);

          return (
            <div
              key={pro.id}
              className={`p-5 bg-white dark:bg-slate-900 rounded-2xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-600/10 dark:ring-indigo-500/20 shadow-md'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              <div>
                {/* Pro Avatar & Basic Info */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={pro.profile_picture}
                      name={pro.full_name}
                      role={pro.categories?.map((c) => translateCategory(c.name)).join(', ')}
                      size="lg"
                    />
                    <div>
                      <Link
                        to={`/professionals/${pro.id}`}
                        className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {pro.full_name}
                      </Link>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <StarRating rating={pro.average_rating} size={13} />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {Number(pro.average_rating).toFixed(1)}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-400">
                          ({t('search.completed_jobs_count', { count: pro.completed_jobs_count })})
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="inline-flex items-center space-x-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium shrink-0 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={11} />
                    <span>{t('feed.verified_pro_badge')}</span>
                  </span>
                </div>

                {/* Location & Experience */}
                <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <span className="flex items-center space-x-1">
                    <MapPin size={12} className="text-slate-400" />
                    <span>
                      {pro.subcity_name ? `${pro.subcity_name}, ` : ''}{pro.city_name}
                    </span>
                  </span>
                  <span>·</span>
                  <span>{t('search.experience_yrs', { years: pro.experience_years })}</span>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {pro.categories.map((c) => (
                    <span
                      key={c.id}
                      className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-md font-medium"
                    >
                      {translateCategory(c.name)}
                    </span>
                  ))}
                </div>

                {/* Bio Snippet */}
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                  {pro.bio}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  to={`/professionals/${pro.id}`}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  {t('common.view_details')}
                </Link>

                <button
                  type="button"
                  onClick={() => handleToggleSelectPro(pro)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check size={13} />
                      <span>{t('search.selected_pro')}</span>
                    </>
                  ) : (
                    <span>+ {t('search.select_pro')}</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Service Request Creation Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{t('request.modal_title')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('request.modal_subtitle')}
                </p>
              </div>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selected Professionals List */}
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t('request.recipients_label', { count: selectedPros.length })}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedPros.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center space-x-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-1.5 pr-2 py-1 rounded-lg font-medium text-slate-800 dark:text-slate-200"
                  >
                    <Avatar src={p.profile_picture} name={p.full_name} size="xs" />
                    <span>{p.full_name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSelectPro(p)}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <form onSubmit={handleSendServiceRequest} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('request.title_label')}
                </label>
                <input
                  type="text"
                  required
                  value={requestForm.title}
                  onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                  placeholder={t('request.title_placeholder')}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {requestErrors.title && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{requestErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('request.desc_label')}
                </label>
                <textarea
                  rows={3}
                  required
                  value={requestForm.description}
                  onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                  placeholder={t('request.desc_placeholder')}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                {requestErrors.description && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{requestErrors.description}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('request.address_label')}
                </label>
                <input
                  type="text"
                  required
                  value={requestForm.service_address}
                  onChange={(e) => setRequestForm({ ...requestForm, service_address: e.target.value })}
                  placeholder={t('request.address_placeholder')}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {t('request.address_confidential_notice')}
                </p>
                {requestErrors.service_address && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">{requestErrors.service_address}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('request.date_label')} {t('common.optional')}
                </label>
                <input
                  type="date"
                  value={requestForm.preferred_date}
                  onChange={(e) => setRequestForm({ ...requestForm, preferred_date: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequest}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{isSubmittingRequest ? t('request.submitting_request') : t('request.submit_request_btn', { count: selectedPros.length })}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
