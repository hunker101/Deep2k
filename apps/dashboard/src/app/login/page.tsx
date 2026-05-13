'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
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
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError('Invalid token. Check your ADMIN_TOKEN.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080f0c] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span className="text-white font-semibold text-lg">Deep<span className="text-emerald-400">2K</span></span>
        </div>

        {/* Card */}
        <div className="bg-[#0d1a14] border border-[#1a2e22] rounded-2xl p-8">
          <h1 className="text-white text-2xl font-bold mb-1">Sign in</h1>
          <p className="text-[#6b8f7a] text-sm font-mono mb-6">
            Internal analytics console · authorized owner access only.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#6b8f7a] mb-1.5 font-mono">Admin token</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="paste your ADMIN_TOKEN"
                  className="w-full bg-[#080f0c] border border-[#1a2e22] rounded-lg px-4 py-2.5 text-white text-sm font-mono placeholder-[#3a5244] focus:outline-none focus:border-emerald-500 pr-16"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6b8f7a] hover:text-emerald-400 font-mono"
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs font-mono">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#1a2e22] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
            <span className="text-xs text-[#6b8f7a] font-mono">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
