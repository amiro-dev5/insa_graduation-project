import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  banDetails: { detail: string; ban_reason: string } | null;
  login: (credentials: Record<string, unknown>) => Promise<User>;
  registerCustomer: (data: FormData | Record<string, unknown>) => Promise<User>;
  registerProfessional: (data: FormData) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  clearBanModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fixit_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [banDetails, setBanDetails] = useState<{ detail: string; ban_reason: string } | null>(null);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('fixit_access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get('/accounts/me/');
      setUser(response.data);
      localStorage.setItem('fixit_user', JSON.stringify(response.data));
    } catch {
      setUser(null);
      localStorage.removeItem('fixit_user');
      localStorage.removeItem('fixit_access_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();

    const handleBanned = (event: Event) => {
      const customEvent = event as CustomEvent;
      setBanDetails(customEvent.detail || { detail: 'Account suspended.', ban_reason: 'Contact support.' });
      setUser(null);
    };

    const handleExpired = () => {
      setUser(null);
    };

    window.addEventListener('fixit:banned', handleBanned);
    window.addEventListener('fixit:session_expired', handleExpired);

    return () => {
      window.removeEventListener('fixit:banned', handleBanned);
      window.removeEventListener('fixit:session_expired', handleExpired);
    };
  }, []);

  const login = async (credentials: Record<string, unknown>): Promise<User> => {
    const response = await api.post('/accounts/login/', credentials);
    const { access, refresh, user: userData } = response.data;
    localStorage.setItem('fixit_access_token', access);
    localStorage.setItem('fixit_refresh_token', refresh);
    
    // Fetch full profile to get detailed nested information
    const meRes = await api.get('/accounts/me/', {
      headers: { Authorization: `Bearer ${access}` },
    });
    const fullUser = meRes.data;
    setUser(fullUser);
    localStorage.setItem('fixit_user', JSON.stringify(fullUser));
    return fullUser;
  };

  const registerCustomer = async (data: FormData | Record<string, unknown>): Promise<User> => {
    const isFormData = data instanceof FormData;
    const response = await api.post('/accounts/register/customer/', data, isFormData ? {
      headers: { 'Content-Type': 'multipart/form-data' },
    } : undefined);
    const { access, refresh } = response.data;
    localStorage.setItem('fixit_access_token', access);
    localStorage.setItem('fixit_refresh_token', refresh);
    
    const meRes = await api.get('/accounts/me/', {
      headers: { Authorization: `Bearer ${access}` },
    });
    setUser(meRes.data);
    localStorage.setItem('fixit_user', JSON.stringify(meRes.data));
    return meRes.data;
  };

  const registerProfessional = async (formData: FormData): Promise<User> => {
    const response = await api.post('/accounts/register/professional/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const { access, refresh, user: userData } = response.data;
    localStorage.setItem('fixit_access_token', access);
    localStorage.setItem('fixit_refresh_token', refresh);

    const meRes = await api.get('/accounts/me/', {
      headers: { Authorization: `Bearer ${access}` },
    });
    setUser(meRes.data);
    localStorage.setItem('fixit_user', JSON.stringify(meRes.data));
    return meRes.data;
  };

  const logout = () => {
    localStorage.removeItem('fixit_access_token');
    localStorage.removeItem('fixit_refresh_token');
    localStorage.removeItem('fixit_user');
    setUser(null);
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  const clearBanModal = () => {
    setBanDetails(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        banDetails,
        login,
        registerCustomer,
        registerProfessional,
        logout,
        refreshProfile,
        clearBanModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
