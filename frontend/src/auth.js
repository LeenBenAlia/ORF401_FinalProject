import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "./api";
import { matchStaticDemoLogin, usesStaticGithubPagesDemo } from "./githubPagesDemo";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("blaise_token") || "");
  const [company, setCompany] = useState(() => {
    const raw = localStorage.getItem("blaise_company");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem("blaise_token", token);
    } else {
      localStorage.removeItem("blaise_token");
    }
  }, [token]);

  useEffect(() => {
    if (company) {
      localStorage.setItem("blaise_company", JSON.stringify(company));
    } else {
      localStorage.removeItem("blaise_company");
    }
  }, [company]);

  const login = async (email, password) => {
    const demo = matchStaticDemoLogin(email, password);
    if (demo) {
      setToken(demo.token);
      setCompany(demo.company);
      return;
    }
    const response = await api.post("/auth/login", { email, password });
    setToken(response.data.token);
    setCompany(response.data.company);
  };

  const signup = async (companyName, email, password) => {
    if (usesStaticGithubPagesDemo()) {
      const err = new Error(
        "This GitHub Pages preview has no live API, so new accounts cannot be created here. Use a demo login (Tesla / SpaceX / Nvidia) or host the backend and set the REACT_APP_API_BASE_URL build secret, then redeploy."
      );
      err.code = "STATIC_PAGES_NO_API";
      throw err;
    }
    const response = await api.post("/auth/signup", {
      company_name: companyName,
      email,
      password,
    });
    setToken(response.data.token);
    setCompany(response.data.company);
  };

  const logout = () => {
    setToken("");
    setCompany(null);
  };

  const value = useMemo(
    () => ({
      token,
      company,
      user: company
        ? { company: company.company_name || company.email || "Company" }
        : null,
      isAuthenticated: Boolean(token),
      login,
      signup,
      logout,
    }),
    [token, company]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
