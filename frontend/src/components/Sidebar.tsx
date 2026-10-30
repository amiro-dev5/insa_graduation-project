import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Wrench,
  Search,
  MessageSquare,
  Briefcase,
  Wallet,
  LayoutDashboard,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogIn,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Avatar } from './Avatar';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { api } from '../api/client';

export const Sidebar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Unread notification count
  const { data: countData } = useQuery<{ unread_count: number }>({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count/');
      return res.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const unreadCount = countData?.unread_count || 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/feed' && (location.pathname === '/' || location.pathname === '/feed')) return true;
    return location.pathname === path;
  };

  const closeMobile = () => setMobileOpen(false);

  const navItemClass = (path: string) => `
    flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all
    ${
      isActive(path)
        ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
    }
  `;

  // Navigation Links Definition based on User Role
  const renderNavLinks = () => (
    <div className="space-y-1">
      {/* Primary Discovery for All */}
      <Link to="/feed" onClick={closeMobile} className={navItemClass('/feed')}>
        <div className="flex items-center space-x-3">
          <MessageSquare size={17} className={isActive('/feed') ? 'text-indigo-600' : 'text-slate-400'} />
          <span>{t('nav.community_feed')}</span>
        </div>
      </Link>

      <Link to="/search" onClick={closeMobile} className={navItemClass('/search')}>
        <div className="flex items-center space-x-3">
          <Search size={17} className={isActive('/search') ? 'text-indigo-600' : 'text-slate-400'} />
          <span>{t('nav.find_professionals')}</span>
        </div>
      </Link>

      {/* Customer-Specific Links */}
      {isAuthenticated && user?.role === 'CUSTOMER' && (
        <>
          <div className="pt-3 pb-1">
            <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t('nav.customer_hub')}
            </span>
          </div>

          <Link to="/customer/dashboard" onClick={closeMobile} className={navItemClass('/customer/dashboard')}>
            <div className="flex items-center space-x-3">
              <LayoutDashboard size={17} className={isActive('/customer/dashboard') ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{t('nav.my_requests')}</span>
            </div>
          </Link>
        </>
      )}

      {/* Professional-Specific Links */}
      {isAuthenticated && user?.role === 'PROFESSIONAL' && (
        <>
          <div className="pt-3 pb-1">
            <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t('nav.pro_workspace')}
            </span>
          </div>

          <Link to="/professional/dashboard" onClick={closeMobile} className={navItemClass('/professional/dashboard')}>
            <div className="flex items-center space-x-3">
              <Briefcase size={17} className={isActive('/professional/dashboard') ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{t('nav.dashboard_inbox')}</span>
            </div>
          </Link>

          <Link to="/professional/wallet" onClick={closeMobile} className={navItemClass('/professional/wallet')}>
            <div className="flex items-center space-x-3">
              <Wallet size={17} className={isActive('/professional/wallet') ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{t('nav.wallet')}</span>
            </div>
          </Link>

          {user.professional_profile?.id && (
            <Link
              to={`/professionals/${user.professional_profile.id}`}
              onClick={closeMobile}
              className={navItemClass(`/professionals/${user.professional_profile.id}`)}
            >
              <div className="flex items-center space-x-3">
                <ExternalLink size={17} className="text-slate-400" />
                <span>{t('nav.public_profile_preview')}</span>
              </div>
            </Link>
          )}
        </>
      )}

      {/* Authenticated General Links */}
      {isAuthenticated && (
        <>
          <div className="pt-3 pb-1">
            <span className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t('nav.account')}
            </span>
          </div>

          <Link to="/notifications" onClick={closeMobile} className={navItemClass('/notifications')}>
            <div className="flex items-center space-x-3">
              <Bell size={17} className={isActive('/notifications') ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{t('nav.notifications')}</span>
            </div>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          <Link to="/profile" onClick={closeMobile} className={navItemClass('/profile')}>
            <div className="flex items-center space-x-3">
              <User size={17} className={isActive('/profile') ? 'text-indigo-600' : 'text-slate-400'} />
              <span>{t('nav.profile_settings')}</span>
            </div>
          </Link>

          {/* Admin Management Link */}
          {user?.is_staff && (
            <a
              href="http://127.0.0.1:8000/admin/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 transition-all"
            >
              <div className="flex items-center space-x-3">
                <ShieldCheck size={17} className="text-emerald-600" />
                <span>{t('nav.django_admin')}</span>
              </div>
              <ExternalLink size={13} className="text-slate-400" />
            </a>
          )}
        </>
      )}

      {/* Guest Navigation Links */}
      {!isAuthenticated && (
        <div className="pt-4 space-y-2">
          <div className="px-3 pb-1">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {t('nav.get_started')}
            </span>
          </div>

          <Link
            to="/login"
            onClick={closeMobile}
            className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <LogIn size={17} className="text-slate-500" />
            <span>{t('nav.sign_in')}</span>
          </Link>

          <Link
            to="/register/customer"
            onClick={closeMobile}
            className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors"
          >
            <UserPlus size={17} />
            <span>{t('nav.join_as_customer')}</span>
          </Link>

          <Link
            to="/register/professional"
            onClick={closeMobile}
            className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <Briefcase size={17} className="text-slate-600" />
            <span>{t('nav.join_as_pro')}</span>
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 -ml-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
          >
            <Menu size={22} />
          </button>

          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-xs">
              <Wrench size={16} className="text-indigo-400" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
              Fix<span className="text-indigo-600 dark:text-indigo-400">It</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-2">
          {isAuthenticated ? (
            <div className="flex items-center space-x-2">
              <Link to="/notifications" className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg">
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full" />
                )}
              </Link>
              <Avatar
                src={user?.profile_picture}
                name={user?.full_name || user?.username}
                role={user?.role}
                size="sm"
              />
            </div>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              {t('nav.sign_in')}
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs transition-opacity md:hidden"
          onClick={closeMobile}
        >
          <div
            className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white dark:bg-slate-900 shadow-2xl flex flex-col p-4 animate-in slide-in-from-left duration-200 border-r border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <Link to="/" onClick={closeMobile} className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-xs">
                  <Wrench size={18} className="text-indigo-400" />
                </div>
                <div>
                  <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                    Fix<span className="text-indigo-600 dark:text-indigo-400">It</span>
                  </span>
                  <p className="text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    {t('nav.brand_subtitle')}
                  </p>
                </div>
              </Link>
              <button
                type="button"
                onClick={closeMobile}
                aria-label="Close menu"
                className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Navigation Links */}
            <div className="flex-1 overflow-y-auto py-4">
              {renderNavLinks()}
            </div>

            {/* Preferences (Theme & Language) in Mobile Drawer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <ThemeToggle />
              <LanguageSelector dropUp={true} className="mb-2" />
            </div>

            {/* Drawer User Card Footer */}
            {isAuthenticated && user && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <Avatar
                      src={user.profile_picture}
                      name={user.full_name || user.username}
                      role={user.role}
                      size="sm"
                    />
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {user.role === 'PROFESSIONAL' ? t('nav.role_pro') : t('nav.role_customer')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    title={t('nav.sign_out')}
                    className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 z-30 transition-colors">
        {/* Brand & Logo Header */}
        <div className="h-18 px-6 flex items-center border-b border-slate-100 dark:border-slate-800">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-xs">
              <Wrench size={20} className="text-indigo-400" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white leading-none">
                Fix<span className="text-indigo-600 dark:text-indigo-400">It</span>
              </span>
              <p className="text-[10px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase mt-0.5">
                {t('nav.brand_subtitle')}
              </p>
            </div>
          </Link>
        </div>

        {/* Scrollable Navigation Area */}
        <nav className="flex-1 overflow-y-auto px-4 py-5">
          {renderNavLinks()}
        </nav>

        {/* Theme, Language Selector & User Profile Card at Bottom */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 space-y-2.5">
          {/* Theme Selector Toggle */}
          <ThemeToggle />

          {/* Language Selector */}
          <LanguageSelector dropUp={true} />

          {isAuthenticated && user ? (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
              <div className="flex items-center space-x-3 min-w-0">
                <Avatar
                  src={user.profile_picture}
                  name={user.full_name || user.username}
                  role={user.role}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {user.full_name || user.username}
                  </p>
                  <div className="flex items-center space-x-1 mt-0.5">
                    {user.role === 'PROFESSIONAL' ? (
                      user.professional_profile?.verification_status === 'APPROVED' ? (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 size={11} />
                          <span>{t('nav.verified_pro')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                          <Clock size={11} />
                          <span>{t('nav.verification_pending')}</span>
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        {t('nav.role_customer')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title={t('nav.sign_out')}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors focus:outline-none"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs text-center font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t('nav.sign_in')}
              </Link>
              <Link
                to="/register/customer"
                className="px-3 py-1.5 text-xs text-center font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {t('nav.join_as_customer')}
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
