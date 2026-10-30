import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  CheckCircle2,
  Briefcase,
  Star,
  Clock,
  Send,
  Image as ImageIcon,
  MessageSquare,
  AlertCircle,
  FileText
} from 'lucide-react';
import { api, getMediaUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ProfessionalProfile, Review } from '../../types';
import { StarRating } from '../../components/StarRating';
import { Avatar } from '../../components/Avatar';

export const ProfessionalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { t, formatDate, translateCategory } = useLanguage();
  const navigate = useNavigate();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch Pro Details
  const { data: pro, isLoading, isError } = useQuery<ProfessionalProfile>({
    queryKey: ['professional-detail', id],
    queryFn: async () => {
      const res = await api.get(`/professionals/${id}/`);
      return res.data;
    },
    enabled: !!id,
  });

  // Fetch Public Reviews for this pro
  const { data: reviewsData } = useQuery<{ results: Review[] } | Review[]>({
    queryKey: ['professional-reviews', id],
    queryFn: async () => {
      const res = await api.get(`/reviews/professional/${id}/`);
      return res.data;
    },
    enabled: !!id,
  });

  const reviews: Review[] = Array.isArray(reviewsData) ? reviewsData : reviewsData?.results || [];

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (isError || !pro) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center">
        <AlertCircle size={32} className="text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('pro_detail.not_found_title')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('pro_detail.not_found_desc')}
        </p>
        <Link
          to="/search"
          className="mt-4 inline-block px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:dark:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
        >
          {t('pro_detail.back_to_search')}
        </Link>
      </div>
    );
  }

  const handleRequestService = () => {
    if (!isAuthenticated) {
      alert(t('request.customer_only_warning'));
      navigate('/login');
      return;
    }
    if (user?.professional_profile && user.professional_profile.id === pro.id) {
      alert(t('request.cannot_request_self'));
      return;
    }
    // Navigate to search with this pro's primary category pre-selected
    const primaryCat = pro.categories?.[0]?.id || '';
    navigate(`/search?category=${primaryCat}`);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs mb-8 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <Avatar
              src={pro.profile_picture}
              name={pro.full_name}
              role={t('nav.verified_pro')}
              size="2xl"
            />

            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{pro.full_name}</h1>
                <span className="inline-flex items-center space-x-1 text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={13} />
                  <span>{t('nav.verified_pro')}</span>
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center space-x-1">
                  <MapPin size={13} className="text-slate-400 dark:text-slate-500" />
                  <span>{pro.subcity_name ? `${pro.subcity_name}, ` : ''}{pro.city_name}</span>
                </span>
                <span>·</span>
                <span className="flex items-center space-x-1">
                  <Briefcase size={13} className="text-slate-400 dark:text-slate-500" />
                  <span>{pro.experience_years} {t('common.years')}</span>
                </span>
                <span>·</span>
                <span className="flex items-center space-x-1">
                  <CheckCircle2 size={13} className="text-indigo-500 dark:text-indigo-400" />
                  <span>{pro.completed_jobs_count} {t('pro_detail.jobs_completed')}</span>
                </span>
              </div>

              {/* Rating */}
              <div className="mt-2.5 flex items-center space-x-2">
                <StarRating rating={pro.average_rating} size={15} />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {Number(pro.average_rating).toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  ({reviews.length} {t('common.reviews')})
                </span>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="w-full sm:w-auto">
            <button
              onClick={handleRequestService}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Send size={14} />
              <span>{t('pro_detail.request_service_btn')}</span>
            </button>
          </div>
        </div>

        {/* Categories Pills */}
        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
          {pro.categories.map((c) => (
            <span
              key={c.id}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium rounded-lg"
            >
              {translateCategory(c.name)}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Bio & Portfolio */}
        <div className="lg:col-span-2 space-y-8">
          {/* Bio Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              {t('pro_detail.about_pro')}
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {pro.bio}
            </p>

            {pro.service_area_description && (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold block mb-0.5 text-slate-800 dark:text-slate-200">{t('pro_detail.service_coverage')}:</span>
                {pro.service_area_description}
              </div>
            )}
          </div>

          {/* Work Portfolio Gallery */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('pro_detail.portfolio_heading')}
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {pro.portfolio_items?.length || 0}
              </span>
            </div>

            {(!pro.portfolio_items || pro.portfolio_items.length === 0) ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                {t('pro_detail.no_portfolio')}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pro.portfolio_items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedImage(getMediaUrl(item.image))}
                    className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-square bg-slate-100 dark:bg-slate-800"
                  >
                    <img
                      src={getMediaUrl(item.image)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                      <p className="text-[11px] font-medium text-white truncate">{item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Reviews Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              {t('pro_detail.reviews_heading')} ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                {t('pro_detail.no_reviews')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="pt-4 first:pt-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2.5">
                        <Avatar
                          src={r.reviewer_picture}
                          name={r.reviewer_name}
                          role={t('pro_detail.customer_role')}
                          size="sm"
                        />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{r.reviewer_name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    <StarRating rating={r.rating} size={12} />
                    {r.comment && (
                      <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Trust & Policies */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('pro_detail.standards_heading')}
            </h3>
            
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start space-x-2">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{t('pro_detail.standard1_title')}</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('pro_detail.standard1_desc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{t('pro_detail.standard2_title')}</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('pro_detail.standard2_desc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{t('pro_detail.standard3_title')}</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('pro_detail.standard3_desc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Enlarged portfolio work"
              className="max-h-[85vh] w-auto rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 w-7 h-7 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center font-bold text-xs shadow-md hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
