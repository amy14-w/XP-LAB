import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'professor' or 'student'
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      const savedUserId = localStorage.getItem('user_id');
      const savedRole = localStorage.getItem('user_role');
      
      if (token && savedUserId && savedRole) {
        try {
          const userData = await authAPI.getMe();
          setUser({ user_id: userData.user_id, email: userData.email });
          setRole(userData.role || savedRole);
        } catch (error) {
          console.error('Auth check failed:', error);
          authAPI.logout();
        }
      }
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const userData = {
        user_id: response.user_id,
        email: response.email,
      };
      
      setUser(userData);
      setRole(response.role);
      
      // Save to localStorage for persistence
      localStorage.setItem('user_id', response.user_id);
      localStorage.setItem('user_role', response.role);
      
      return { success: true, role: response.role };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, userRole) => {
    try {
      const response = await authAPI.register(email, password, userRole);
      
      // Check if email confirmation is required
      if (response.email_confirmation_required) {
        return { 
          success: false, 
          error: "Please check your email to confirm your account before logging in.",
          emailConfirmationRequired: true 
        };
      }
      
      // Email confirmation not required - user is automatically logged in
      if (response.access_token) {
        const userData = {
          user_id: response.user_id,
          email: response.email,
        };
        
        setUser(userData);
        setRole(response.role);
        
        // Save to localStorage for persistence
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user_id', response.user_id);
        localStorage.setItem('user_role', response.role);
        
        return { success: true, role: response.role };
      }
      
      // If no access token but registration succeeded, try to login
      return await login(email, password);
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    setRole(null);
    authAPI.logout();
    navigate('/');
  };

  return (
    <AuthContext.Provider value={{ user, role, login, register, logout, loading }}>
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
