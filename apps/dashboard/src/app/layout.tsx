import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Deep2k',
  description: 'First-party analytics platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-4">
            <h1 className="text-lg font-semibold">Deep2k</h1>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
