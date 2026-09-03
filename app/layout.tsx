import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PLL Academy | Pro Academy Engine',
  description: 'A premium payment management ecosystem for film academies, balancing administrative clarity with cinematic prestige.',
  applicationName: 'PLL Academy',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '64x64', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'PLL Academy',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Let the chrome extend into the notch area on phones.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0d0c0c' },
    { media: '(prefers-color-scheme: light)', color: '#f5f3ef' },
  ],
};

/**
 * Stamps data-theme on <html> before first paint so a light-mode user never
 * sees a flash of the dark palette. Kept inline and dependency-free for that
 * reason — React hydration is far too late to do this.
 */
const THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = window.localStorage.getItem('academy_theme');
    var theme = stored === 'light' || stored === 'dark'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The bootstrap script mutates <html> before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-brand-bg text-brand-ink font-sans">
        {/* First child of <body>: runs while the rest of the body is still
            being parsed, so the palette is settled before anything paints. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {children}
      </body>
    </html>
  );
}
