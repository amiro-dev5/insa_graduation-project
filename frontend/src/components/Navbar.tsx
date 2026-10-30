import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Wrench,
  Search,
  MessageSquare,
  Briefcase,
  User,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  LayoutDashboard,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { NotificationDropdown } from './NotificationDropdown';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setUserDropdownOpen(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Wrench size={18} className="text-indigo-400" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-900">
                Fix<span className="text-indigo-600">It</span>
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              <Link
                to="/feed"
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/feed')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {t('nav.community_feed')}
              </Link>

              <Link
                to="/search"
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/search')
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Search size={15} />
                <span>{t('nav.find_professionals')}</span>
              </Link>

              {isAuthenticated && user?.role === 'CUSTOMER' && (
                <Link
                  to="/customer/dashboard"
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/customer/dashboard')
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard size={15} />
                  <span>{t('nav.customer_hub')}</span>
                </Link>
              )}

              {isAuthenticated && user?.role === 'PROFESSIONAL' && (
                <Link
                  to="/professional/dashboard"
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive('/professional/dashboard')
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Briefcase size={15} />
                  <span>{t('nav.pro_workspace')}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <NotificationDropdown />

                {/* User Role Badge */}
                <div className="flex items-center space-x-2 pl-2">
                  {user?.role === 'PROFESSIONAL' ? (
                    user.professional_profile?.verification_status === 'APPROVED' ? (
                      <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full font-medium">
                        <CheckCircle2 size={12} />
                        <span>{t('nav.verified_pro')}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full font-medium">
                        <Clock size={12} />
                        <span>{t('nav.verification_pending')}</span>
                      </span>
                    )
                  ) : (
                    <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-medium">
                      {t('nav.role_customer')}
                    </span>
                  )}
                </div>

                {/* User Profile Menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-medium text-xs">
                      {user?.first_name ? user.first_name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="text-sm font-medium text-slate-800 hidden lg:inline-block">
                      {user?.first_name || user?.username}
                    </span>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs text-slate-500 font-medium">Signed in as</p>
                        <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.phone_number}</p>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <User size={15} />
                        <span>Profile & Settings</span>
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left"
                      >
                        <LogOut size={15} />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
                >
                  {t('nav.sign_in')}
                </Link>
                <Link
                  to="/register/customer"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-xs transition-colors"
                >
                  {t('nav.join_as_customer')}
                </Link>
                <Link
                  to="/register/professional"
                  className="px-3.5 py-2 border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-sm font-medium rounded-lg transition-colors"
                >
                  {t('nav.join_as_pro')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            {isAuthenticated && <NotificationDropdown />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-6 space-y-2">
          <Link
            to="/feed"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
          >
            Community Feed
          </Link>
          <Link
            to="/search"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
          >
            Find technicians
          </Link>

          {isAuthenticated ? (
            <>
              {user?.role === 'CUSTOMER' && (
                <Link
                  to="/customer/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
                >
                  Customer Dashboard
                </Link>
              )}
              {user?.role === 'PROFESSIONAL' && (
                <Link
                  to="/professional/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
                >
                  Pro Dashboard & Inbox
                </Link>
              )}
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-base font-medium text-slate-800 hover:bg-slate-50 rounded-lg"
              >
                Profile & Settings
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left px-3 py-2 text-base font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
              >
                Sign out
              </button>
            </>
          ) : (
            <div className="pt-4 space-y-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 text-sm font-medium text-slate-800 border border-slate-200 rounded-lg"
              >
                {t('nav.sign_in')}
              </Link>
              <Link
                to="/register/customer"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg"
              >
                {t('nav.join_as_customer')}
              </Link>
              <Link
                to="/register/professional"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg"
              >
                {t('nav.join_as_pro')}
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
