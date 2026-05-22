'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Invalid username or password.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)] flex items-center justify-center px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span className="text-[var(--c-text)] font-semibold text-lg">Deep<span className="text-emerald-400">2K</span></span>
        </div>

        <div className="bg-[var(--c-card)] border border-[var(--c-border)] rounded-2xl p-8">
          <h1 className="text-[var(--c-text)] text-2xl font-bold mb-1">Sign in</h1>
          <p className="text-[var(--c-text-2)] text-sm font-mono mb-6">
            Internal analytics console · authorized owner access only.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--c-text-2)] mb-1.5 font-mono">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="enter username"
                className="w-full bg-[var(--c-deep)] border border-[var(--c-border)] rounded-lg px-4 py-2.5 text-[var(--c-text)] text-sm font-mono placeholder-[var(--c-placeholder)] focus:outline-none focus:border-emerald-500 transition-colors"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--c-text-2)] mb-1.5 font-mono">Password</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="enter password"
                  className="w-full bg-[var(--c-deep)] border border-[var(--c-border)] rounded-lg px-4 py-2.5 text-[var(--c-text)] text-sm font-mono placeholder-[var(--c-placeholder)] focus:outline-none focus:border-emerald-500 transition-colors pr-16"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--c-text-2)] hover:text-emerald-400 font-mono"
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-xs font-mono">{error}</p>}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[var(--c-border)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-xs text-[var(--c-text-2)] font-mono">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
