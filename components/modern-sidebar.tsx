'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Trophy, 
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ModernSidebarProps {
  className?: string;
}

const ModernSidebar = ({ className }: ModernSidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [hasCheckedMobile, setHasCheckedMobile] = useState(false);
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { path: '/markets', label: 'Markets', icon: ArrowUpDown },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);
      setHasCheckedMobile(true);
      if (!isMobileDevice) {
        setIsExpanded(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  if (!hasCheckedMobile || isMobile) {
    return null;
  }

  return (
    <>
      {isMobile && isExpanded && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed left-0 top-0 h-full bg-gradient-to-b from-panel-bg to-panel-bg/95 backdrop-blur-xl border-r border-border-input z-50 transition-all duration-300 ease-in-out",
          (isExpanded || isHovered) ? "w-64" : "w-16",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border-input">
            <div className="flex items-center justify-between">
              <div className={cn(
                "transition-all duration-300",
                (isExpanded || isHovered) ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
              )}>
                {(isExpanded || isHovered) && (
                  <h1 className="text-xl font-bold bg-gradient-to-r from-main-cta to-highlight-glow bg-clip-text text-transparent">
                    PredictMarket
                  </h1>
                )}
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-accent-bg transition-all duration-200"
              >
                {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <nav className="flex-1 p-2">
            <div className="space-y-2">
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                
                return (
                  <div
                    key={item.path}
                    className="relative group"
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    <Link href={item.path}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start h-12 transition-all duration-200 relative overflow-hidden",
                          isActive 
                            ? 'bg-gradient-to-r from-main-cta/20 to-main-cta/10 text-main-cta border border-main-cta/30' 
                            : 'text-gray-400 hover:text-white hover:bg-accent-bg/50',
                          !isExpanded && "justify-center px-0"
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-main-cta to-highlight-glow rounded-r-full" />
                        )}
                        
                        <Icon className={cn(
                          "h-5 w-5 transition-all duration-200",
                          (isExpanded || isHovered) ? "mr-3" : "mr-0",
                          isActive && "scale-110"
                        )} />
                        
                        <span className={cn(
                          "transition-all duration-300",
                          (isExpanded || isHovered) ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                        )}>
                          {(isExpanded || isHovered) && item.label}
                        </span>
                      </Button>
                    </Link>

                    {!isExpanded && !isHovered && (
                      <div className="absolute left-16 top-1/2 -translate-y-1/2 bg-panel-bg border border-border-input rounded-lg px-3 py-2 text-sm font-medium text-white opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 whitespace-nowrap">
                        {item.label}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-panel-bg border-l border-t border-border-input rotate-45" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

        </div>
      </aside>
    </>
  );
};

export default ModernSidebar;