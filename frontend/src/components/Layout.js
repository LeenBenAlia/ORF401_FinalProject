import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';

function Layout() {
  const { isAuthenticated, company, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="logo">
            <span className="logo__mark" />
            BlaiseAI
          </Link>
          <nav className="main-nav" aria-label="Main">
            <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} end>
              Home
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Dashboard
            </NavLink>
            <NavLink to="/quotes" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Quote digitize
            </NavLink>
            <NavLink to="/baseline" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Product baseline
            </NavLink>
            <NavLink to="/tariff" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Tariff risk
            </NavLink>
            <NavLink to="/fx" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              FX risk
            </NavLink>
            <NavLink to="/world-monitor" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              World monitor
            </NavLink>
          </nav>
          <div className="header-actions">
            <a className="btn btn--ghost" href="https://github.com/LeenBenAlia/ORF401_FinalProject" rel="noreferrer" target="_blank">
              GitHub
            </a>
            {isAuthenticated ? (
              <>
                <span className="user-chip">{company?.company_name || company?.email}</span>
                <button type="button" className="btn btn--primary" onClick={logout}>
                  Log out
                </button>
              </>
            ) : (
              <Link className="btn btn--primary" to="/auth">
                Login / Sign up
              </Link>
            )}
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="site-footer">
        <p>BlaiseAI — procurement intelligence for teams that live in quotes and cost baselines.</p>
      </footer>
    </div>
  );
}

export default Layout;
