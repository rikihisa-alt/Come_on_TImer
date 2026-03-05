import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { GlobalNav } from '@/components/GlobalNav';
import { SystemStyleProvider } from '@/components/SystemStyleProvider';
import { StoreSync } from '@/components/StoreSync';

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
        <StoreSync />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').then(function(reg){
    reg.addEventListener('updatefound',function(){
      var nw=reg.installing;
      if(nw){nw.addEventListener('statechange',function(){
        if(nw.state==='activated'){window.location.reload()}
      })}
    });
  });
  navigator.serviceWorker.addEventListener('message',function(e){
    if(e.data&&e.data.type==='SW_UPDATED'){window.location.reload()}
  });
  var refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',function(){
    if(!refreshing){refreshing=true;window.location.reload()}
  });
}`,
          }}
        />
      </body>
    </html>
  );
}
