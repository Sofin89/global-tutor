// src/hooks/useAuth.jsx
import { useState, useEffect, createContext, useContext } from 'react';

// Mock authentication service
const mockAuth = {
  getCurrentUser: async () => {
    const userData = localStorage.getItem('ai_tutor_user');
    return userData ? JSON.parse(userData) : null;
  },

  setUser: (user) => {
    localStorage.setItem('ai_tutor_user', JSON.stringify(user));
  },

  logout: () => {
    localStorage.removeItem('ai_tutor_user');
  }
};

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const userData = await mockAuth.getCurrentUser();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo, accept any email/password
      const userData = {
        id: 'user-' + Date.now(),
        name: email.split('@')[0] || 'Student',
        email: email,
        examType: null,
        avatar: null,
        joinDate: new Date().toISOString(),
        subscription: 'free'
      };
      
      mockAuth.setUser(userData);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email, password, name) => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userData = {
        id: 'user-' + Date.now(),
        name: name || email.split('@')[0],
        email: email,
        examType: null,
        avatar: null,
        joinDate: new Date().toISOString(),
        subscription: 'free'
      };
      
      mockAuth.setUser(userData);
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: 'Signup failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    mockAuth.logout();
    setUser(null);
  };

  const updateUserExam = (examType) => {
    if (user) {
      const updatedUser = { ...user, examType };
      setUser(updatedUser);
      mockAuth.setUser(updatedUser);
    }
  };

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
    updateUserExam
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};