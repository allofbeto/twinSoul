import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  theme: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  setTheme: (theme: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const applyTheme = (theme: string) => {
  document.body.classList.remove('theme-default', 'theme-magic', 'theme-dos');
  document.body.classList.add(`theme-${theme}`);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(parsedUser);
      applyTheme(parsedUser.theme);
    }
    setLoading(false);
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setUser(user);
    applyTheme(user.theme || 'default');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const setTheme = (theme: string) => {
    const updatedUser = { ...user!, theme };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    applyTheme(theme);
  };

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, setTheme }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};