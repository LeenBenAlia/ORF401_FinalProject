import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main className="page page--narrow">
      <header className="page__header">
        <p className="eyebrow">Company access</p>
        <h1>Log in or join your team</h1>
        <p className="lede lede--muted">
          Use one of the example company accounts or sign up with your own procurement team. 
          Once logged in, you can view company-specific quote workflows and risk insights.
        </p>
      </header>
      <section className="panel card-soft auth-card">
        <form onSubmit={handleSubmit}>
          <label className="auth-field">
            Email address
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="company@blaise.ai" />
          </label>
          <label className="auth-field">
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn--primary">Log in</button>
        </form>
      </section>

      <section className="panel card-soft" style={{ marginTop: '1rem' }}>
        <h2>Example company credentials</h2>
        <ul className="list-check">
          <li>Tesla — <strong>tesla@blaise.ai</strong> / <strong>Model3Ride!</strong></li>
          <li>SpaceX — <strong>spacex@blaise.ai</strong> / <strong>Starlink2026!</strong></li>
          <li>Nvidia — <strong>nvidia@blaise.ai</strong> / <strong>AdaGPU#1</strong></li>
        </ul>
        <p className="muted" style={{ marginTop: '1rem' }}>
          New companies can sign up with their own credentials and keep their supplier workflows separate.
        </p>
        <Link to="/signup" className="btn btn--ghost" style={{ marginTop: '1rem', display: 'inline-flex' }}>
          Create a new account
        </Link>
      </section>
    </main>
  );
}

export default LoginPage;
