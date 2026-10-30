import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Star
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ServiceRequest } from '../../types';
import { Avatar } from '../../components/Avatar';

export const CustomerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t, formatDate, translateCategory, translateStatus } = useLanguage();
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Fetch customer's submitted requests
  const { data: requestsData, isLoading, isError } = useQuery<{ results: ServiceRequest[] } | ServiceRequest[]>({
    queryKey: ['customer-requests'],
    queryFn: async () => {
      const res = await api.get('/services/requests/');
      return res.data;
    },
  });

  const requests: ServiceRequest[] = Array.isArray(requestsData)
    ? requestsData
    : requestsData?.results || [];

  const filteredRequests = requests.filter((r) => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'ACTIVE') return ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(r.status);
    if (filterTab === 'COMPLETED') return r.status === 'COMPLETED';
    if (filterTab === 'CANCELLED') return ['CANCELLED', 'DECLINED_BY_ALL'].includes(r.status);
    return true;
  });

  const activeCount = requests.filter((r) => ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(r.status)).length;
  const completedCount = requests.filter((r) => r.status === 'COMPLETED').length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Welcome Banner */}
      <div className="mb-8 p-6 sm:p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div className="flex items-center space-x-4">
          <Avatar
            src={user?.profile_picture}
            name={user?.full_name || user?.username}
            role={t('nav.role_customer')}
            size="xl"
          />
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {t('nav.customer_hub')}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {t('cust_dashboard.welcome', { name: user?.first_name || user?.username || '' })}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
              {t('cust_dashboard.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <Link
            to="/search"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Search size={14} />
            <span>{t('cust_dashboard.find_pro_btn')}</span>
          </Link>
        </div>
      </div>

      {/* Step-by-Step Marketplace Workflow Guide */}
      <div className="mb-8 p-5 bg-slate-900 dark:bg-slate-800/80 border border-slate-800 dark:border-slate-700 text-white rounded-2xl shadow-xs transition-colors">
        <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-3">
          {t('cust_dashboard.guide_title')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-800/80 dark:bg-slate-900/80 rounded-xl border border-slate-700/50 dark:border-slate-700">
            <span className="text-indigo-400 font-bold block mb-1">1</span>
            <p className="font-semibold text-slate-200">{t('cust_dashboard.step1_title')}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{t('cust_dashboard.step1_desc')}</p>
          </div>
          <div className="p-3 bg-slate-800/80 dark:bg-slate-900/80 rounded-xl border border-slate-700/50 dark:border-slate-700">
            <span className="text-indigo-400 font-bold block mb-1">2</span>
            <p className="font-semibold text-slate-200">{t('cust_dashboard.step2_title')}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{t('cust_dashboard.step2_desc')}</p>
          </div>
          <div className="p-3 bg-slate-800/80 dark:bg-slate-900/80 rounded-xl border border-slate-700/50 dark:border-slate-700">
            <span className="text-indigo-400 font-bold block mb-1">3</span>
            <p className="font-semibold text-slate-200">{t('cust_dashboard.step3_title')}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{t('cust_dashboard.step3_desc')}</p>
          </div>
          <div className="p-3 bg-slate-800/80 dark:bg-slate-900/80 rounded-xl border border-slate-700/50 dark:border-slate-700">
            <span className="text-indigo-400 font-bold block mb-1">4</span>
            <p className="font-semibold text-slate-200">{t('cust_dashboard.step4_title')}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{t('cust_dashboard.step4_desc')}</p>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('cust_dashboard.section_title')}</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{requests.length}</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('cust_dashboard.tab_active', { count: activeCount })}</span>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{activeCount}</p>
        </div>
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('cust_dashboard.tab_completed', { count: completedCount })}</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{completedCount}</p>
        </div>
      </div>

      {/* Service Request History Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t('cust_dashboard.section_title')}
          </h2>

          <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  filterTab === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab === 'ALL' && t('cust_dashboard.tab_all', { count: requests.length })}
                {tab === 'ACTIVE' && t('cust_dashboard.tab_active', { count: activeCount })}
                {tab === 'COMPLETED' && t('cust_dashboard.tab_completed', { count: completedCount })}
                {tab === 'CANCELLED' && t('cust_dashboard.tab_cancelled')}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        {isLoading && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('cust_dashboard.loading_requests')}</p>
          </div>
        )}

        {!isLoading && filteredRequests.length === 0 && (
          <div className="py-16 text-center">
            <FileText size={24} className="text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('cust_dashboard.empty_title')}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
              {t('cust_dashboard.empty_desc')}
            </p>
            <Link
              to="/search"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 dark:bg-indigo-600 hover:dark:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <span>{t('cust_dashboard.search_btn')}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredRequests.map((req) => (
            <div
              key={req.id}
              className="py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 rounded-xl px-2 transition-colors"
            >
              <div>
                <div className="flex items-center space-x-2.5 mb-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400">
                    <Link to={`/requests/${req.id}`}>#{req.id}: {req.title}</Link>
                  </span>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                      req.status === 'COMPLETED'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : req.status === 'ACCEPTED' || req.status === 'IN_PROGRESS'
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                        : req.status === 'PENDING'
                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {translateStatus(req.status)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">{translateCategory(req.category_name)}</span>
                  <span>·</span>
                  <span className="flex items-center space-x-1">
                    <MapPin size={11} />
                    <span>{req.subcity_name ? `${req.subcity_name}, ` : ''}{req.city_name}</span>
                  </span>
                  <span>·</span>
                  <span>{t('common.date')}: {formatDate(req.created_at)}</span>
                  {req.accepted_professional_name && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center space-x-1.5 font-semibold text-slate-800 dark:text-slate-200">
                        <Avatar
                          src={req.accepted_professional_picture}
                          name={req.accepted_professional_name}
                          role={t('nav.role_pro')}
                          size="xs"
                        />
                        <span>{t('cust_dashboard.pro_label', { name: req.accepted_professional_name })}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <Link
                  to={`/requests/${req.id}`}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                >
                  {t('common.view_details')}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
