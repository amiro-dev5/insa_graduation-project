import React from 'react';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const BannedModal: React.FC = () => {
  const { banDetails, clearBanModal, logout } = useAuth();
  const { t } = useLanguage();

  if (!banDetails) return null;

  const handleClose = () => {
    logout();
    clearBanModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 dark:border-rose-950/80 transition-colors">
        <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">{t('banned.title')}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 text-center">
          {banDetails.detail || t('banned.notice')}
        </p>
        
        {banDetails.ban_reason && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300">
            <span className="font-semibold block mb-0.5 text-slate-900 dark:text-white">{t('banned.reason_label')}</span>
            {banDetails.ban_reason}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleClose}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 dark:bg-indigo-600 hover:bg-slate-900 hover:dark:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <LogOut size={16} />
            <span>{t('banned.close_btn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
