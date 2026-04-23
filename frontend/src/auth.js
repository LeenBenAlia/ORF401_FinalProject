import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AUTH_USER_KEY = 'blaiseai_auth_user';
const USER_STORE_KEY = 'blaiseai_user_store';

const DEFAULT_USERS = [
  { company: 'Tesla', email: 'tesla@blaise.ai', password: 'Model3Ride!', displayName: 'Tesla Procurement' },
  { company: 'SpaceX', email: 'spacex@blaise.ai', password: 'Starlink2026!', displayName: 'SpaceX Procurement' },
  { company: 'Nvidia', email: 'nvidia@blaise.ai', password: 'AdaGPU#1', displayName: 'Nvidia Procurement' },
];

const AuthContext = createContext(null);

function loadStoredUsers() {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(USER_STORE_KEY);
    const stored = raw ? JSON.parse(raw) : [];
    const deduped = stored.filter((user) => user?.email && user?.company && user?.password);
    const existingEmails = new Set(DEFAULT_USERS.map((user) => user.email));
    const merged = [...DEFAULT_USERS, ...deduped.filter((user) => !existingEmails.has(user.email))];
    return merged;
  } catch (error) {
    return DEFAULT_USERS;
  }
}

function persistUsers(users) {
  if (typeof window === 'undefined') return;
  const saved = users.filter((user) => !DEFAULT_USERS.some((defaultUser) => defaultUser.email === user.email));
  localStorage.setItem(USER_STORE_KEY, JSON.stringify(saved));
}

function loadSessionUser(users) {
  if (typeof window === 'undefined') return null;
  try {
    const email = localStorage.getItem(AUTH_USER_KEY);
    return users.find((user) => user.email === email) || null;
  } catch (error) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => loadStoredUsers());
  const [user, setUser] = useState(() => loadSessionUser(loadStoredUsers()));
  const [error, setError] = useState(null);

  useEffect(() => {
    persistUsers(users);
  }, [users]);

  const login = (email, password) => {
    const normalized = (email || '').trim().toLowerCase();
    const found = users.find((item) => item.email === normalized && item.password === password);
    if (!found) {
      throw new Error('Email or password is incorrect.');
    }
    setUser(found);
    localStorage.setItem(AUTH_USER_KEY, found.email);
    setError(null);
    return found;
  };

  const signup = (company, email, password) => {
    const normalized = (email || '').trim().toLowerCase();
    if (!company || !normalized || !password) {
      throw new Error('Please complete all fields.');
    }
    if (users.some((item) => item.email === normalized)) {
      throw new Error('That email is already registered.');
    }
    const newUser = { company: company.trim(), email: normalized, password, displayName: `${company.trim()} Procurement` };
    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    setUser(newUser);
    localStorage.setItem(AUTH_USER_KEY, normalized);
    setError(null);
    return newUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
  };

  const value = useMemo(
    () => ({ user, users, login, signup, logout, error }),
    [user, users, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
