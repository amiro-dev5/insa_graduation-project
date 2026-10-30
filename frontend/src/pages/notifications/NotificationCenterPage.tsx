import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Clock,
  Briefcase,
  Star,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';
import { Notification } from '../../types';

export const NotificationCenterPage: React.FC = () => {
  const { t, formatDate } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const { data: notificationsData, isLoading } = useQuery<{ results: Notification[] } | Notification[]>({
    queryKey: ['notifications-center'],
    queryFn: async () => {
      const res = await api.get('/notifications/');
      return res.data;
    },
    refetchInterval: 12000,
  });

  const notifications: Notification[] = Array.isArray(notificationsData)
    ? notificationsData
    : notificationsData?.results || [];

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/notifications/${id}/read/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-center'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/read-all/');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-center'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const filtered = notifications.filter((n) => (filter === 'ALL' ? true : !n.is_read));
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    if (notif.related_resource_type === 'service_request' && notif.related_resource_id) {
      navigate(`/requests/${notif.related_resource_id}`);
    } else if (notif.related_resource_type === 'profile') {
      navigate('/professional/dashboard');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SERVICE_REQUEST':
      case 'REQUEST_ACCEPTED':
      case 'JOB_COMPLETED':
        return <Briefcase size={16} className="text-indigo-600" />;
      case 'REVIEW_RECEIVED':
        return <Star size={16} className="text-amber-500 fill-amber-500" />;
      case 'VERIFICATION_APPROVED':
        return <CheckCircle2 size={16} className="text-emerald-600" />;
      default:
        return <Bell size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs transition-colors">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              {t('notifications.center_title')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('notifications.center_subtitle')}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors"
              >
                <CheckCheck size={14} />
                <span>{t('notifications.mark_all_read')}</span>
              </button>
            )}

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  filter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t('notifications.filter_all')} ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('UNREAD')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  filter === 'UNREAD'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t('notifications.filter_unread')} ({unreadCount})
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        {isLoading && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('notifications.loading')}</p>
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400">
            {t('notifications.empty_center')}
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`py-4 px-3 flex items-start space-x-3.5 rounded-xl cursor-pointer transition-colors ${
                !notif.is_read
                  ? 'bg-indigo-50/40 dark:bg-indigo-950/30 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                {getNotificationIcon(notif.notification_type)}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{notif.title}</p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center space-x-1">
                    <Clock size={10} />
                    <span>{formatDate(notif.created_at)}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{notif.message}</p>
              </div>

              {notif.related_resource_type && (
                <div className="shrink-0 self-center text-slate-400 dark:text-slate-500">
                  <ExternalLink size={14} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
