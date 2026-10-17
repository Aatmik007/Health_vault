import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('healthvault_token') || null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state by fetching /api/auth/me if token exists
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me');
          if (response.data.success) {
            setUser(response.data.user);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Failed to load current user:', error);
          logout();
        }
      }
      setLoading(false);
    };

    fetchCurrentUser();
  }, [token]);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        const { user: userData, token: userToken } = response.data;
        localStorage.setItem('healthvault_token', userToken);
        setToken(userToken);
        setUser(userData);
        return { success: true };
      }
      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error) {
      const isUnverified = Boolean(error.response?.data?.isUnverified);
      const message =
        error.response?.data?.message ||
        (error.message === 'Network Error'
          ? 'Unable to connect to HealthVault API. Please check your network or server connection.'
          : error.message || 'Login failed. Please check your credentials.');

      return {
        success: false,
        isUnverified,
        email: error.response?.data?.email || email,
        message,
      };
    }
  };

  // Register handler (Triggers 6-digit OTP verification code)
  const register = async (name, email, password) => {
    try {
      const response = await api.post('/auth/register', { name, email, password });
      return {
        success: true,
        message: response.data.message || 'Registration successful. Please verify your email.',
        email: response.data.email || email,
        requiresVerification: true,
      };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (error.message === 'Network Error'
          ? 'Unable to connect to HealthVault API. Please check your network or server connection.'
          : error.message || 'Registration failed. Please try again.');

      return {
        success: false,
        message,
        email: error.response?.data?.email || email,
        requiresVerification: Boolean(error.response?.data?.requiresVerification),
      };
    }
  };

  // Verify Email OTP handler
  const verifyEmail = async (email, otp) => {
    try {
      const response = await api.post('/auth/verify-email', { email, otp });
      if (response.data.success) {
        if (response.data.token && response.data.user) {
          localStorage.setItem('healthvault_token', response.data.token);
          setToken(response.data.token);
          setUser(response.data.user);
        }
        return {
          success: true,
          message: response.data.message || 'Email verified successfully!',
          alreadyVerified: Boolean(response.data.alreadyVerified),
        };
      }
      return { success: false, message: response.data.message || 'Verification failed.' };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (error.message === 'Network Error'
          ? 'Unable to connect to HealthVault API.'
          : error.message || 'Verification failed. Please check your code.');

      return { success: false, message };
    }
  };

  // Resend OTP verification code handler
  const resendVerification = async (email) => {
    try {
      const response = await api.post('/auth/resend-verification', { email });
      return {
        success: true,
        message: response.data.message || 'A new verification code has been sent.',
      };
    } catch (error) {
      const message =
        error.response?.data?.message ||
        (error.message === 'Network Error'
          ? 'Unable to connect to HealthVault API.'
          : error.message || 'Failed to resend verification code.');

      return { success: false, message };
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('healthvault_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        verifyEmail,
        resendVerification,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
