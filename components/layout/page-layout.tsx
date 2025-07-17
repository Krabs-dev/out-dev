'use client';

import { ReactNode } from 'react';
import ModernSidebar from '@/components/modern-sidebar';
import ModernHeader from '@/components/modern-header';
import MobileNavigation from '@/components/mobile-navigation';
import AnimatedBackground from './animated-background';

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export default function PageLayout({ children, className = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-panel-bg relative overflow-hidden ${className}`}>
      <AnimatedBackground />
      
      <ModernSidebar />
      <ModernHeader />
      <MobileNavigation />
      
      <div className="md:ml-16 pt-16 md:pt-16 relative z-10">
        {children}
      </div>
    </div>
  );
}