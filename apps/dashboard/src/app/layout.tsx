import './globals.css';
import type { ReactNode } from 'react';
import { Geist_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';

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
    <html lang="en" className={geistMono.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text)] antialiased font-mono transition-colors duration-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
