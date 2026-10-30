import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Sidebar } from './components/Sidebar';
import { BannedModal } from './components/BannedModal';
import { ProtectedRoute } from './components/ProtectedRoute';
import { SupportChatWidget } from './components/SupportChatWidget';

// Pages
import { HomeFeedPage } from './pages/HomeFeedPage';
import { ProfessionalSearchPage } from './pages/search/ProfessionalSearchPage';
import { ProfessionalDetailPage } from './pages/professionals/ProfessionalDetailPage';
import { LoginPage } from './pages/auth/LoginPage';
import { CustomerRegisterPage } from './pages/auth/CustomerRegisterPage';
import { ProfessionalRegisterPage } from './pages/auth/ProfessionalRegisterPage';
import { CustomerDashboardPage } from './pages/dashboard/CustomerDashboardPage';
import { ProfessionalDashboardPage } from './pages/dashboard/ProfessionalDashboardPage';
import { ProfessionalWalletPage } from './pages/wallet/ProfessionalWalletPage';
import { ServiceRequestDetailPage } from './pages/requests/ServiceRequestDetailPage';
import { NotificationCenterPage } from './pages/notifications/NotificationCenterPage';
import { UserProfilePage } from './pages/profile/UserProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30, // 30 seconds
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <BrowserRouter>
              <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
                <Sidebar />
                <BannedModal />
                <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
                <Routes>
                  {/* Public & Discovery Routes */}
                  <Route path="/" element={<Navigate to="/feed" replace />} />
                  <Route path="/feed" element={<HomeFeedPage />} />
                  <Route path="/search" element={<ProfessionalSearchPage />} />
                  <Route path="/professionals/:id" element={<ProfessionalDetailPage />} />

                  {/* Authentication Routes */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register/customer" element={<CustomerRegisterPage />} />
                  <Route path="/register/professional" element={<ProfessionalRegisterPage />} />

                  {/* Protected Customer Routes */}
                  <Route
                    path="/customer/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                        <CustomerDashboardPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected Professional Routes */}
                  <Route
                    path="/professional/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={['PROFESSIONAL', 'ADMIN']}>
                        <ProfessionalDashboardPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/professional/wallet"
                    element={
                      <ProtectedRoute allowedRoles={['PROFESSIONAL', 'ADMIN']}>
                        <ProfessionalWalletPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected General Service Requests & Notifications */}
                  <Route
                    path="/requests/:id"
                    element={
                      <ProtectedRoute>
                        <ServiceRequestDetailPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/notifications"
                    element={
                      <ProtectedRoute>
                        <NotificationCenterPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <UserProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/feed" replace />} />
                </Routes>
              </main>
              <SupportChatWidget />
            </div>
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
