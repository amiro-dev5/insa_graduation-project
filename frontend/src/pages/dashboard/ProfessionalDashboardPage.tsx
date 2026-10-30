import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileCheck,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Plus,
  Briefcase,
  Wallet,
  Star,
  Phone,
  MapPin,
  Calendar,
  Check,
  Send,
  Eye
} from 'lucide-react';
import { api, getMediaUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ProfessionalPortfolioItem, ServiceRequest } from '../../types';
import { StarRating } from '../../components/StarRating';

export const ProfessionalDashboardPage: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'INBOX' | 'PORTFOLIO' | 'CERTIFICATE'>('INBOX');
  const [inboxFilter, setInboxFilter] = useState<'pending' | 'active' | 'completed'>('pending');

  // Certificate Resubmit State
  const [certTitle, setCertTitle] = useState('');
  const [certIssuedBy, setCertIssuedBy] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);
  const [isResubmittingCert, setIsResubmittingCert] = useState(false);

  // New Portfolio Item State
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const [portfolioImage, setPortfolioImage] = useState<File | null>(null);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);

  // Insufficient Wallet Balance Modal State
  const [insufficientFundsData, setInsufficientFundsData] = useState<{
    detail: string;
    current_balance?: number;
    required_amount?: number;
  } | null>(null);

  const profile = user?.professional_profile;

  // Fetch Inbox Invites / Jobs
  const { data: inboxData, isLoading: isInboxLoading } = useQuery<any[]>({
    queryKey: ['pro-inbox', inboxFilter],
    queryFn: async () => {
      const res = await api.get(`/services/professional/inbox/?filter=${inboxFilter}`);
      return res.data;
    },
    refetchInterval: 12000,
  });

  // Fetch Portfolio Items
  const { data: portfolioItems = [], isLoading: isPortfolioLoading } = useQuery<ProfessionalPortfolioItem[]>({
    queryKey: ['pro-portfolio'],
    queryFn: async () => {
      const res = await api.get('/professionals/portfolio/');
      return res.data;
    },
    enabled: activeTab === 'PORTFOLIO',
  });

  // Accept Mutation
  const acceptMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await api.post(`/services/professional/requests/${requestId}/accept/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro-inbox'] });
      refreshProfile();
    },
    onError: (err: any) => {
      if (err.response?.data?.error_code === 'INSUFFICIENT_WALLET_BALANCE') {
        setInsufficientFundsData(err.response.data);
      } else {
        alert(err.response?.data?.detail || 'Failed to accept request.');
      }
    },
  });

  // Decline Mutation
  const declineMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await api.post(`/services/professional/requests/${requestId}/decline/`, { reason: 'Busy' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pro-inbox'] });
    },
  });

  // Handle Certificate Resubmit
  const handleResubmitCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certFile) {
      alert('Please select a certificate file (PDF, PNG, JPG).');
      return;
    }

    setIsResubmittingCert(true);
    try {
      const formData = new FormData();
      formData.append('title', certTitle || 'Updated Trade Certificate');
      if (certIssuedBy) formData.append('issued_by', certIssuedBy);
      formData.append('certificate_file', certFile);

      await api.post('/professionals/certificate/resubmit/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      alert('Certificate submitted for review.');
      setCertTitle('');
      setCertFile(null);
      await refreshProfile();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to resubmit certificate.');
    } finally {
      setIsResubmittingCert(false);
    }
  };

  // Handle Portfolio Upload
  const handleUploadPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolioImage) {
      alert('Please select a photo of your work.');
      return;
    }

    setIsUploadingPortfolio(true);
    try {
      const formData = new FormData();
      formData.append('title', portfolioTitle);
      formData.append('description', portfolioDesc);
      formData.append('image', portfolioImage);

      await api.post('/professionals/portfolio/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPortfolioTitle('');
      setPortfolioDesc('');
      setPortfolioImage(null);
      queryClient.invalidateQueries({ queryKey: ['pro-portfolio'] });
    } catch {
      alert('Failed to upload portfolio item.');
    } finally {
      setIsUploadingPortfolio(false);
    }
  };

  // Delete Portfolio Item
  const handleDeletePortfolio = async (itemId: number) => {
    if (!confirm('Remove this portfolio project?')) return;
    try {
      await api.delete(`/professionals/portfolio/${itemId}/`);
      queryClient.invalidateQueries({ queryKey: ['pro-portfolio'] });
    } catch {
      alert('Failed to delete item.');
    }
  };

  const invites = inboxData || [];

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Verification Status Banner */}
      {profile?.verification_status === 'APPROVED' && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                {t('pro_dashboard.verification_approved_title')}
              </p>
              <p className="text-[11px] text-emerald-700">
                {t('pro_dashboard.verification_approved_desc')}
              </p>
            </div>
          </div>
          {profile.id && (
            <Link
              to={`/professionals/${profile.id}`}
              className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors shrink-0"
            >
              {t('pro_dashboard.view_public_btn')}
            </Link>
          )}
        </div>
      )}

      {profile?.verification_status === 'PENDING' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3">
          <Clock size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-950">
              Verification Review Pending
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Your trade certificate is currently being reviewed by FixIt administrators. During this phase, you will not appear in customer searches. You can still set up your portfolio below.
            </p>
          </div>
        </div>
      )}

      {profile?.verification_status === 'REJECTED' && (
        <div className="mb-6 p-5 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <div className="flex items-start space-x-3">
            <XCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-950">
                Verification Documents Rejected
              </p>
              <p className="text-[11px] text-rose-800 mt-0.5">
                Feedback from administrator: {profile.rejection_reason || 'Qualification documents did not meet requirements.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('CERTIFICATE')}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 underline ml-8"
          >
            Resubmit Updated Qualification Certificate →
          </button>
        </div>
      )}

      {/* Real Database Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Invites</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-500 mt-1">
            {inboxFilter === 'pending' ? invites.length : '—'}
          </p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed Jobs</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {profile?.completed_jobs_count || 0}
          </p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Average Rating</span>
          <div className="flex items-center space-x-1.5 mt-1">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {Number(profile?.average_rating || 0).toFixed(1)}
            </p>
            <Star size={16} className="fill-amber-400 text-amber-500" />
          </div>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Experience & Base</span>
          <p className="text-sm font-bold text-slate-900 dark:text-white mt-2 truncate">
            {profile?.experience_years} yrs · {profile?.city || 'Addis Ababa'}
          </p>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 mb-6 pb-2">
        <button
          onClick={() => setActiveTab('INBOX')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'INBOX'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
          }`}
        >
          Service Request Inbox
        </button>
        <button
          onClick={() => setActiveTab('PORTFOLIO')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'PORTFOLIO'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
          }`}
        >
          Work Portfolio ({portfolioItems.length})
        </button>
        <button
          onClick={() => setActiveTab('CERTIFICATE')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'CERTIFICATE'
              ? 'bg-slate-900 dark:bg-indigo-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
          }`}
        >
          Certificate & Documents
        </button>
      </div>

      {/* TAB 1: INBOX */}
      {activeTab === 'INBOX' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Dispatched Service Inquiries
            </h2>

            <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setInboxFilter('pending')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  inboxFilter === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Pending Invites
              </button>
              <button
                onClick={() => setInboxFilter('active')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  inboxFilter === 'active'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Active Jobs
              </button>
              <button
                onClick={() => setInboxFilter('completed')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  inboxFilter === 'completed'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Completed History
              </button>
            </div>
          </div>

          {isInboxLoading && (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading inbox requests...</p>
            </div>
          )}

          {!isInboxLoading && invites.length === 0 && (
            <div className="py-16 text-center">
              <Briefcase size={24} className="text-slate-400 dark:text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No {inboxFilter} inquiries found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {inboxFilter === 'pending'
                  ? 'New customer requests matching your trade will appear here as soon as customers dispatch them.'
                  : 'Your jobs will be cataloged here as they transition.'}
              </p>
            </div>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {invites.map((item: any) => {
              const reqId = item.request_id || item.id;
              const title = item.title;
              const catName = item.category_name;
              const cityName = item.city_name;
              const subcityName = item.subcity_name;
              const desc = item.description;

              return (
                <div key={item.recipient_id || item.id} className="py-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2.5 mb-1.5">
                        <Link
                          to={`/requests/${reqId}`}
                          className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                        >
                          {title}
                        </Link>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                          {catName}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-2">
                        {desc}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center space-x-1">
                          <MapPin size={12} />
                          <span>{subcityName ? `${subcityName}, ` : ''}{cityName}</span>
                        </span>
                        <span>·</span>
                        <span>Sent: {new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {inboxFilter === 'pending' ? (
                        <>
                          <button
                            onClick={() => acceptMutation.mutate(reqId)}
                            disabled={acceptMutation.isPending}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                          >
                            <Check size={13} />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => declineMutation.mutate(reqId)}
                            disabled={declineMutation.isPending}
                            className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <Link
                          to={`/requests/${reqId}`}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                          Open Job Details →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PORTFOLIO */}
      {activeTab === 'PORTFOLIO' && (
        <div className="space-y-6">
          {/* Upload Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
              Add New Project to Work Portfolio
            </h3>
            <form onSubmit={handleUploadPortfolio} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={portfolioTitle}
                    onChange={(e) => setPortfolioTitle(e.target.value)}
                    placeholder="e.g. 3-Phase Breaker Replacement"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Project Photo *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setPortfolioImage(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Brief Technical Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={portfolioDesc}
                  onChange={(e) => setPortfolioDesc(e.target.value)}
                  placeholder="Materials used, techniques, client requirements..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isUploadingPortfolio}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <UploadCloud size={14} />
                  <span>{isUploadingPortfolio ? 'Uploading...' : 'Save Portfolio Item'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Portfolio Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-colors">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
              Your Public Showcase Items
            </h3>

            {isPortfolioLoading && (
              <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                Loading portfolio items...
              </div>
            )}

            {!isPortfolioLoading && portfolioItems.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                You have not added any portfolio images yet. Add photos above to increase customer trust.
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-square bg-slate-100 dark:bg-slate-800"
                >
                  <img
                    src={getMediaUrl(item.image)}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                    <button
                      onClick={() => handleDeletePortfolio(item.id)}
                      className="self-end p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
                      title="Delete Item"
                    >
                      <Trash2 size={13} />
                    </button>
                    <p className="text-xs font-semibold text-white truncate">{item.title}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CERTIFICATES & RESUBMISSION */}
      {activeTab === 'CERTIFICATE' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs max-w-xl transition-colors">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
            {t('pro_dashboard.cert_heading')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Certificates are restricted documents inspected solely by administrators to maintain safe, verified marketplace operations.
          </p>

          <form onSubmit={handleResubmitCertificate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Certificate Title *
              </label>
              <input
                type="text"
                required
                value={certTitle}
                onChange={(e) => setCertTitle(e.target.value)}
                placeholder="e.g. Master Electrician License"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Issuing Organization (Optional)
              </label>
              <input
                type="text"
                value={certIssuedBy}
                onChange={(e) => setCertIssuedBy(e.target.value)}
                placeholder="e.g. Federal TVET Agency"
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Upload New Document * (PDF, PNG, JPG ≤ 5MB)
              </label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                required
                onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-400"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isResubmittingCert}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center space-x-1.5"
              >
                <FileCheck size={14} />
                <span>{isResubmittingCert ? 'Submitting...' : 'Upload & Submit for Administrative Review'}</span>
              </button>
            </div>
          </form>
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
