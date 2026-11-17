'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { initializePage } from '@/public/app.js';
import { startAnimations } from '@/public/animations.js';
import { ConsentPopup } from '@/components/consent-popup.jsx';

export function BrowserEffects() {
  const pathname = usePathname();

  useEffect(() => initializePage(), [pathname]);
  useEffect(() => startAnimations(), [pathname]);

  return <ConsentPopup />;
}
