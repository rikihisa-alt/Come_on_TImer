import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { GlobalNav } from '@/components/GlobalNav';
import { SystemStyleProvider } from '@/components/SystemStyleProvider';

export const metadata: Metadata = {
  title: 'COME ON Timer - ポーカータイマー',
  description: 'Professional poker timer for tournament & cash games',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0e1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="antialiased">
        <SystemStyleProvider />
        <Suspense><GlobalNav /></Suspense>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
          }}
        />
      </body>
    </html>
  );
}
