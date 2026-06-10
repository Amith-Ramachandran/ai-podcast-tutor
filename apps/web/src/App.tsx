import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from './lib/api';

export function App() {
  const [healthy, setHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    api.get<{ status: string }>('/health')
      .then((r) => setHealthy(r.status === 'ok'))
      .catch(() => setHealthy(false));
  }, []);

  return (
    <div className="layout">
      <header>
        <h1>Interactive Podcast Tutor</h1>
        <nav>
          <NavLink to="/upload">Upload</NavLink>
        </nav>
        <span className={`health ${healthy === null ? 'pending' : healthy ? 'ok' : 'down'}`}>
          API: {healthy === null ? '…' : healthy ? 'ok' : 'down'}
        </span>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
