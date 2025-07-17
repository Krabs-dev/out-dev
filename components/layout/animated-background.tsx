'use client';

interface AnimatedBackgroundProps {
  className?: string;
}

export default function AnimatedBackground({ className = "" }: AnimatedBackgroundProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-gradient-to-r from-main-cta/10 to-highlight-glow/10 blur-xl animate-float-slow"
          style={{
            width: `${Math.random() * 300 + 200}px`,
            height: `${Math.random() * 300 + 200}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${i * 2}s`,
            animationDuration: `${10 + Math.random() * 5}s`,
          }}
        />
      ))}
      
      <div className="absolute inset-0 bg-grid-pattern opacity-3" />
      
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-main-cta/3 via-transparent to-highlight-glow/3 animate-pulse-slow" />
    </div>
  );
}