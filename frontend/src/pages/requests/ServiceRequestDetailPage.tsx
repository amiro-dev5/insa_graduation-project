import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Clock,
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Star,
  User,
  Shield,
  Calendar,
  Wallet,
  ArrowLeft
} from 'lucide-react';
import { api, getMediaUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ServiceRequest } from '../../types';
import { StarRating } from '../../components/StarRating';
import { Avatar } from '../../components/Avatar';

export const ServiceRequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { t, formatDate, translateCategory, translateStatus } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Rating Modal State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Cancellation State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [insufficientFundsData, setInsufficientFundsData] = useState<{
    detail: string;
    current_balance?: number;
    required_amount?: number;
  } | null>(null);

  // Fetch Request Details
  const { data: request, isLoading, isError } = useQuery<ServiceRequest>({
    queryKey: ['service-request-detail', id],
    queryFn: async () => {
      const res = await api.get(`/services/requests/${id}/`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 10000, // Poll every 10s for status updates
  });

  // Action Mutations
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/services/professional/requests/${id}/accept/`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['pro-inbox'] });
    },
    onError: (err: any) => {
      if (err.response?.data?.error_code === 'INSUFFICIENT_WALLET_BALANCE') {
        setInsufficientFundsData(err.response.data);
      } else {
        alert(err.response?.data?.detail || 'Unable to accept request.');
      }
    },
  });

  const declineMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/services/professional/requests/${id}/decline/`, { reason: 'Schedule conflict' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['pro-inbox'] });
      navigate('/professional/dashboard');
    },
  });

  const inProgressMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/services/requests/${id}/in-progress/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request-detail', id] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/services/requests/${id}/complete/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-request-detail', id] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/services/requests/${id}/cancel/`, { reason: cancelReason });
    },
    onSuccess: () => {
      setShowCancelModal(false);
      queryClient.invalidateQueries({ queryKey: ['service-request-detail', id] });
    },
  });

  const submitRatingMutation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRating(true);
    try {
      await api.post('/reviews/', {
        service_request_id: Number(id),
        rating: ratingValue,
        comment: ratingComment,
      });
      setShowRatingModal(false);
      queryClient.invalidateQueries({ queryKey: ['service-request-detail', id] });
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.[0] || 'Failed to submit review.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <AlertTriangle size={32} className="text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('request.not_accessible_title')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('request.not_accessible_desc')}
        </p>
        <Link
          to="/"
          className="mt-4 inline-block px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:dark:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
        >
          {t('common.back')}
        </Link>
      </div>
    );
  }

  const isCustomer = user?.id === request.customer;
  const isAcceptedPro = user?.id === request.accepted_professional;
  const isInvitedPro = request.recipients?.some((r) => r.professional_id === user?.id);
  const myRecipientRecord = request.recipients?.find((r) => r.professional_id === user?.id);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock size={12} />
            <span>{translateStatus('PENDING')}</span>
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <CheckCircle2 size={12} />
            <span>{translateStatus('ACCEPTED')}</span>
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Play size={12} />
            <span>{translateStatus('IN_PROGRESS')}</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 size={12} />
            <span>{translateStatus('COMPLETED')}</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <XCircle size={12} />
            <span>{translateStatus('CANCELLED')}</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {translateStatus(status)}
          </span>
        );
    }
  };

  const hasReviewed = isCustomer ? request.has_customer_reviewed : request.has_professional_reviewed;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Back button */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{t('common.back')}</span>
        </button>
      </div>

      {/* Main Request Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs mb-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">#{request.id}</span>
              {getStatusBadge(request.status)}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{request.title}</h1>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">{translateCategory(request.category_name)}</p>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 sm:text-right shrink-0">
            <p>{t('common.date')}: {formatDate(request.created_at)}</p>
            {request.preferred_date && (
              <p className="flex items-center space-x-1 sm:justify-end text-slate-700 dark:text-slate-300 font-medium">
                <Calendar size={12} />
                <span>{t('request.date_label')}: {request.preferred_date}</span>
              </p>
            )}
          </div>
        </div>

        {/* Problem Description */}
        <div className="py-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
            {t('request.problem_desc_title')}
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {request.description}
          </p>
        </div>

        {/* Location & Contact Information */}
        <div className="py-6 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              {t('request.location_title')}
            </h3>
            <p className="text-xs text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 font-medium">
              <MapPin size={14} className="text-slate-400 dark:text-slate-500" />
              <span>
                {request.subcity_name ? `${request.subcity_name}, ` : ''}{request.city_name}
              </span>
            </p>
            
            {/* Specific Address: Confidential */}
            <div className="mt-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 block">{t('request.specific_address_label')}:</span>
              <span
                className={`font-medium ${
                  request.service_address === 'Hidden until acceptance'
                    ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md inline-block mt-0.5'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {request.service_address === 'Hidden until acceptance'
                  ? t('request.address_confidential_notice')
                  : request.service_address}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              {t('request.contact_details_title')}
            </h3>

            {isCustomer ? (
              <div className="text-xs space-y-2">
                <p className="text-slate-500 dark:text-slate-400">{t('request.assigned_pro_label')}:</p>
                {request.accepted_professional_name ? (
                  <div className="flex items-center space-x-2.5">
                    <Avatar
                      src={request.accepted_professional_picture}
                      name={request.accepted_professional_name}
                      role={t('nav.role_pro')}
                      size="md"
                    />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {request.accepted_professional_name}
                      </p>
                      {request.accepted_professional_phone && (
                        <p className="flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                          <Phone size={12} />
                          <span>{request.accepted_professional_phone}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="font-semibold text-slate-500 dark:text-slate-400">{t('request.awaiting_acceptance')}</p>
                )}
              </div>
            ) : (
              <div className="text-xs space-y-2">
                <p className="text-slate-500 dark:text-slate-400">{t('request.customer_identity_label')}:</p>
                <div className="flex items-center space-x-2.5">
                  <Avatar
                    src={request.customer_picture}
                    name={request.customer_name}
                    role={t('nav.role_customer')}
                    size="md"
                  />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{request.customer_name}</p>
                    <p
                      className={`font-semibold mt-0.5 ${
                        request.customer_phone === 'Hidden until acceptance'
                          ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md inline-block text-[11px]'
                          : 'text-indigo-600 dark:text-indigo-400 flex items-center space-x-1'
                      }`}
                    >
                      {request.customer_phone !== 'Hidden until acceptance' && <Phone size={12} />}
                      <span>
                        {request.customer_phone === 'Hidden until acceptance'
                          ? t('request.phone_confidential_notice')
                          : request.customer_phone}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recipient Invites Summary (Visible to Customer or Admin) */}
        {(isCustomer || user?.is_staff) && request.recipients && request.recipients.length > 0 && (
          <div className="py-6 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              {t('request.notified_pros_title')} ({request.recipients.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {request.recipients.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <Avatar
                      src={rec.profile_picture}
                      name={rec.professional_name}
                      role={t('nav.role_pro')}
                      size="xs"
                    />
                    <p className="font-bold text-slate-900 dark:text-white truncate">{rec.professional_name}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('common.rating')}: {rec.average_rating.toFixed(1)}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        rec.status === 'ACCEPTED'
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                          : rec.status === 'PENDING'
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {translateStatus(rec.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="pt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Professional Actions */}
            {isInvitedPro && myRecipientRecord?.status === 'PENDING' && request.status === 'PENDING' && (
              <>
                <button
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  {acceptMutation.isPending ? t('common.submitting') : t('request.accept_btn')}
                </button>
                <button
                  onClick={() => declineMutation.mutate()}
                  disabled={declineMutation.isPending}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  {t('request.decline_btn')}
                </button>
              </>
            )}

            {isAcceptedPro && request.status === 'ACCEPTED' && (
              <button
                onClick={() => inProgressMutation.mutate()}
                disabled={inProgressMutation.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <Play size={13} />
                <span>{t('request.start_job_btn')}</span>
              </button>
            )}

            {(isAcceptedPro || isCustomer) &&
              (request.status === 'ACCEPTED' || request.status === 'IN_PROGRESS') && (
                <button
                  onClick={() => completeMutation.mutate()}
                  disabled={completeMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <CheckCircle2 size={13} />
                  <span>{t('request.complete_job_btn')}</span>
                </button>
              )}

            {/* Cancel Button */}
            {isCustomer &&
              (request.status === 'PENDING' || request.status === 'ACCEPTED') && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 border border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold rounded-xl transition-colors"
                >
                  {t('request.cancel_request_btn')}
                </button>
              )}
          </div>

          {/* Rating Button when completed */}
          {request.status === 'COMPLETED' && (
            <div>
              {hasReviewed ? (
                <span className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl font-medium inline-flex items-center space-x-1">
                  <CheckCircle2 size={13} />
                  <span>{t('common.success')}</span>
                </span>
              ) : (
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <Star size={14} className="fill-white" />
                  <span>{t('request.rate_review_btn')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Two-Way Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {t('request.rating_modal_title')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t('request.rating_modal_subtitle')}
            </p>

            <form onSubmit={submitRatingMutation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  {t('request.rating_score_label')} *
                </label>
                <div className="flex items-center space-x-2">
                  <StarRating
                    rating={ratingValue}
                    size={24}
                    interactive={true}
                    onRatingChange={(newVal) => setRatingValue(newVal)}
                  />
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200 ml-2">
                    {ratingValue} / 5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('request.rating_comment_label')}
                </label>
                <textarea
                  rows={3}
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder={t('request.rating_comment_placeholder')}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRatingModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRating}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {isSubmittingRating ? t('common.submitting') : t('request.submit_review_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Request Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 transition-colors">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">{t('request.cancel_modal_title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {t('request.cancel_reason_label')}
            </p>

            <div className="space-y-3">
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t('request.cancel_reason_placeholder')}
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white dark:focus:bg-slate-800 resize-none"
              />

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {cancelMutation.isPending ? t('common.submitting') : t('request.confirm_cancel_btn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Insufficient Wallet Balance Modal */}
      {insufficientFundsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-xl transition-colors relative">
            <button
              onClick={() => setInsufficientFundsData(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <XCircle size={20} />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Wallet size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('wallet.insufficient_funds_title')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Required: 50.00 ETB
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              {insufficientFundsData.detail || t('wallet.insufficient_funds_desc')}
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1 mb-5">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>{t('wallet.current_balance')}:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {insufficientFundsData.current_balance !== undefined
                    ? Number(insufficientFundsData.current_balance).toFixed(2)
                    : '0.00'} ETB
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Acceptance Fee Required:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">50.00 ETB</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setInsufficientFundsData(null)}
                className="w-1/2 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <Link
                to="/professional/wallet"
                onClick={() => setInsufficientFundsData(null)}
                className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors text-center shadow-xs"
              >
                {t('wallet.top_up_now')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
