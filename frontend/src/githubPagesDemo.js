/**
 * GitHub Pages serves static files only — there is no FastAPI backend on github.io.
 * When REACT_APP_API_BASE_URL is not set at build time, we allow the three seeded
 * demo logins locally so coursework demos still work (dashboard/quotes stay empty
 * until you host the API and rebuild with that URL).
 */

const DEMO_ROWS = [
  { email: 'tesla@blaise.ai', password: 'Model3Ride!', company_name: 'Tesla', id: 'demo-tesla' },
  { email: 'spacex@blaise.ai', password: 'Starlink2026!', company_name: 'SpaceX', id: 'demo-spacex' },
  { email: 'nvidia@blaise.ai', password: 'AdaGPU#1', company_name: 'Nvidia', id: 'demo-nvidia' },
];

export function usesStaticGithubPagesDemo() {
  if (typeof window === 'undefined') return false;
  if (process.env.REACT_APP_API_BASE_URL?.trim()) return false;
  return /\.github\.io$/i.test(window.location.hostname || '');
}

export function matchStaticDemoLogin(email, password) {
  if (!usesStaticGithubPagesDemo()) return null;
  const e = String(email || '').trim().toLowerCase();
  const row = DEMO_ROWS.find((r) => r.email === e && r.password === password);
  if (!row) return null;
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : String(Date.now());
  return {
    token: `ghpages-demo-${row.id}-${suffix}`,
    company: {
      id: row.id,
      company_name: row.company_name,
      email: row.email,
    },
  };
}
