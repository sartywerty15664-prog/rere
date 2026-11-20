import { BrowserEffects } from '@/components/browser-effects.jsx';
import { pageMetadata, publicUrl } from '@/src/server/metadata.js';
import '@/public/style.css';

export const metadata = {
  ...pageMetadata('The open intelligence model family', 'Meet MindLarp Larp 1 and Larp 1 Code: two AI models for everyday work and deeper reasoning. Coming soon — start a chat or build with one simple API.'),
  metadataBase: new URL(publicUrl()),
  title: { default: 'The open intelligence model family · MindLarp', template: '%s · MindLarp' },
  icons: { icon: '/assets/logo.png' },
  manifest: '/manifest.webmanifest',
};

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#0d0d0d' };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}<BrowserEffects /></body></html>;
}
