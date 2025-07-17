'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  subtitle?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12', 
  lg: 'w-16 h-16'
};

export default function LoadingSpinner({ 
  size = 'md', 
  message, 
  subtitle,
  className = ""
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col justify-center items-center ${className}`}>
      <div className="relative mb-4">
        <div className={`${sizeClasses[size]} border-4 border-gray-600 border-t-main-cta rounded-full animate-spin`} />
        <div 
          className={`absolute inset-0 ${sizeClasses[size]} border-4 border-transparent border-t-highlight-glow rounded-full animate-spin`} 
          style={{ animationDelay: '0.3s', animationDuration: '1.5s' }} 
        />
      </div>
      {message && (
        <div className="text-white font-medium text-center mb-2">{message}</div>
      )}
      {subtitle && (
        <div className="text-gray-400 text-sm text-center">{subtitle}</div>
      )}
    </div>
  );
}