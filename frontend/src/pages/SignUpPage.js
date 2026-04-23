import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

function SignUpPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await signup(company, email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="page page--narrow">
      <header className="page__header">
        <p className="eyebrow">New account</p>
        <h1>Sign up for your company</h1>
        <p className="lede lede--muted">
          Create a new company login to keep supplier quotes and risk views under one team profile.
        </p>
      </header>
      <section className="panel card-soft auth-card">
        <form onSubmit={handleSubmit}>
          <label className="auth-field">
            Company name
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Example: Acme Supply" />
          </label>
          <label className="auth-field">
            Work email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
          </label>
          <label className="auth-field">
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn--primary">Create account</button>
        </form>
      </section>
      <p className="muted" style={{ marginTop: '1rem' }}>
        Already have an account? <Link to="/login">Log in here</Link>.
      </p>
    </main>
  );
}

export default SignUpPage;
