'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClientMount } from '@/lib/hooks/useClientMount';

export default function WelcomePage() {
  const router = useRouter();
  const hasMounted = useClientMount();
  const [isVisible, setIsVisible] = useState(false);
  const [showDontShowAgain, setShowDontShowAgain] = useState(false);

  useEffect(() => {
    if (hasMounted) {
      setIsVisible(true);
      const hideWelcomePage = localStorage.getItem('hideWelcomePage');
      setShowDontShowAgain(!hideWelcomePage);
    }
  }, [hasMounted]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!hasMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-panel-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-600 border-t-main-cta rounded-full animate-spin" />
      </div>
    );
  }

  const handleStartBetting = () => {
    document.body.style.overflow = 'hidden';
    const exitAnimation = document.querySelector('.welcome-container');
    exitAnimation?.classList.add('animate-fade-out-scale');
    
    setTimeout(() => {
      document.body.style.overflow = '';
      router.push('/markets');
    }, 800);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem('hideWelcomePage', 'true');
    setShowDontShowAgain(false);
    document.body.style.overflow = '';
    router.push('/markets');
  };

  return (
    <div className="welcome-container h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-panel-bg relative overflow-hidden" style={{ height: '100dvh' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full bg-gradient-to-r from-main-cta/20 to-highlight-glow/20 blur-xl animate-float-slow`}
            style={{
              width: `${Math.random() * 200 + 100}px`,
              height: `${Math.random() * 200 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${8 + Math.random() * 4}s`,
            }}
          />
        ))}
        
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-main-cta/5 via-transparent to-highlight-glow/5 animate-pulse-slow" />
      </div>

      <div className={`relative z-10 h-full flex flex-col items-center justify-center px-4 py-8 transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-4 sm:mb-6 lg:mb-8 animate-bounce-in">
            <div className="inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-main-cta to-highlight-glow rounded-full mb-4 sm:mb-6 animate-spin-slow">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-dark-bg rounded-full flex items-center justify-center relative">
                
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-main-cta/80 to-highlight-glow/60 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-4 h-4 lg:w-5 lg:h-5 bg-white/20 rounded-full"></div>
                </div>
                
                <div className="absolute inset-2 rounded-full border border-main-cta/30 animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }}>
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-main-cta rounded-full animate-pulse"></div>
                  <div className="absolute top-1/2 -right-1 transform -translate-y-1/2 w-1.5 h-1.5 bg-highlight-glow rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-main-cta/80 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                  <div className="absolute top-1/2 -left-1 transform -translate-y-1/2 w-1.5 h-1.5 bg-highlight-glow/80 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                </div>
                
                <div className="absolute inset-1 rounded-full border border-main-cta/20 animate-ping" style={{ animationDuration: '3s' }}></div>
                <div className="absolute inset-3 rounded-full border border-highlight-glow/20 animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
                
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black mb-4 sm:mb-6 lg:mb-8 animate-slide-up">
            <span className="bg-gradient-to-r from-white via-main-cta to-highlight-glow bg-clip-text text-transparent animate-gradient-x">
              PREDICT
            </span>
            <br />
            <span className="bg-gradient-to-r from-highlight-glow via-main-cta to-white bg-clip-text text-transparent animate-gradient-x-reverse">
              THE FUTURE
            </span>
          </h1>
          
          <p className="text-xl lg:text-2xl xl:text-3xl text-gray-300 animate-fade-in-delayed leading-relaxed mb-8 lg:mb-12">
            Join the most advanced prediction market platform.
          </p>
        </div>
        
        <div className="mb-8">
          <button
            onClick={handleStartBetting}
            className="group relative overflow-hidden bg-gradient-to-r from-main-cta/20 to-highlight-glow/20 backdrop-blur-xl border border-main-cta/30 rounded-full px-12 py-6 transition-all duration-500 hover:scale-110 hover:from-main-cta/40 hover:to-highlight-glow/40"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-main-cta to-highlight-glow opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-full"></div>
            <div className="relative flex items-center space-x-4">
              <span className="text-white text-xl lg:text-2xl font-bold">START BETTING</span>
              <div className="w-8 h-8 border-2 border-white rounded-full flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                <span className="text-white text-lg">→</span>
              </div>
            </div>
            
            <div className="absolute inset-0 rounded-full border-2 border-main-cta/50 animate-ping"></div>
            <div className="absolute inset-2 rounded-full border border-highlight-glow/30 animate-pulse"></div>
          </button>
        </div>
        
        <div className="flex flex-col items-center space-y-4">
          <p className="text-gray-400 text-lg lg:text-xl text-center">
            No wallet connection required to explore • Connect later to start betting
          </p>
          
          {showDontShowAgain && (
            <button
              onClick={handleDontShowAgain}
              className="text-gray-400 hover:text-gray-300 text-sm transition-colors duration-200 underline"
            >
              Don&apos;t show this again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}