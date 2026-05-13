import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Deep2k — Analytics',
  description: 'First-party analytics platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#080f0c] text-white antialiased">
        {children}
      </body>
    </html>
  );
}
