import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { formatApiError } from "../api";

const presets = [
  { company: "Tesla", email: "tesla@blaise.ai", password: "Model3Ride!" },
  { company: "SpaceX", email: "spacex@blaise.ai", password: "Starlink2026!" },
  { company: "Nvidia", email: "nvidia@blaise.ai", password: "AdaGPU#1" },
];

function AuthPage() {
  const [mode, setMode] = useState("login");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(companyName, email, password);
      }
      navigate("/quotes");
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset) => {
    setMode("login");
    setCompanyName(preset.company);
    setEmail(preset.email);
    setPassword(preset.password);
  };

  return (
    <main className="page page--narrow">
      <section className="panel auth-panel">
        <p className="eyebrow">Company Access</p>
        <h1>{mode === "login" ? "Log in to BlaiseAI" : "Create company account"}</h1>
        <p className="lede lede--muted">
          Keep quote uploads, folders, and risk views private per company.
        </p>

        <div className="auth-toggle">
          <button type="button" className={mode === "login" ? "seg__btn is-on" : "seg__btn"} onClick={() => setMode("login")}>
            Log in
          </button>
          <button type="button" className={mode === "signup" ? "seg__btn is-on" : "seg__btn"} onClick={() => setMode("signup")}>
            Sign up
          </button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Company name
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
            </label>
          )}
          <label>
            Company email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn--primary" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="preset-box">
          <h3>Example login credentials</h3>
          <ul>
            {presets.map((preset) => (
              <li key={preset.email}>
                <button type="button" className="chip" onClick={() => applyPreset(preset)}>
                  {preset.company}: {preset.email} / {preset.password}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;
