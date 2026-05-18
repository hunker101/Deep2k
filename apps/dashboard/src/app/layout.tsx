import './globals.css';
import type { ReactNode } from 'react';
import { Geist_Mono } from 'next/font/google';

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata = {
  title: 'Deep2k — Analytics',
  description: 'First-party analytics platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={geistMono.variable}>
      <body className="min-h-screen bg-[#080f0c] text-white antialiased font-mono">
        {children}
      </body>
    </html>
  );
}
