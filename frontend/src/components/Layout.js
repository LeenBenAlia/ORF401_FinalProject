import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <Link to="/" className="logo">
            <span className="logo__mark" />
            BlaiseAI
          </Link>
          <nav className="main-nav" aria-label="Main">
            <NavLink
              to="/"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end
            >
              Home
            </NavLink>
            <NavLink
              to="/quotes"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Quote digitize
            </NavLink>
            <NavLink
              to="/risk"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Risk &amp; hedging
            </NavLink>
            <NavLink
              to="/compare"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Compare
            </NavLink>
          </nav>
          <div className="header-actions">
            <a
              className="btn btn--ghost"
              href="https://github.com/LeenBenAlia/ORF401_FinalProject"
              rel="noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <Link className="btn btn--primary" to="/quotes">
              Launch app
            </Link>
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
