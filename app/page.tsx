'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const hideWelcomePage = localStorage.getItem('hideWelcomePage');
    if (hideWelcomePage) {
      router.replace('/markets');
    } else {
      router.replace('/welcome');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-panel-bg flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-gray-600 border-t-main-cta rounded-full animate-spin" />
    </div>
  );
}