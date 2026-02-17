import React from 'react';
import { cn } from '@/lib/utils';

interface FuturisticLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const loadingTexts = [
  'Initializing Neural Link...',
  'Syncing with the Matrix...',
  'Decrypting Data Streams...',
  'Establishing Secure Connection...',
  'Loading Holographic Interface...',
  'Calibrating Quantum Processors...',
  'Bypassing Firewalls...',
  'Compiling Bytecode...',
  'Optimizing Neural Pathways...',
  'Synchronizing with Cloud...',
  'Encrypting Transmission...',
  'Verifying Biometrics...',
  'Accessing Mainframe...',
  'Rendering Virtual Environment...',
  'Processing Request...',
];

export const FuturisticLoader: React.FC<FuturisticLoaderProps> = ({ 
  text,
  size = 'md',
  className 
}) => {
  const displayText = text || loadingTexts[Math.floor(Math.random() * loadingTexts.length)];
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      {/* Holographic Ring Loader */}
      <div className="relative">
        {/* Outer ring */}
        <div className={cn(
          "border-2 border-transparent border-t-cyan-400 border-r-purple-500 rounded-full animate-spin",
          sizeClasses[size]
        )} style={{ animationDuration: '1s' }} />
        
        {/* Middle ring */}
        <div className={cn(
          "absolute inset-2 border-2 border-transparent border-b-pink-500 border-l-cyan-400 rounded-full animate-spin",
          sizeClasses[size]
        )} style={{ animationDuration: '1.5s', animationDirection: 'reverse' }} />
        
        {/* Inner core */}
        <div className={cn(
          "absolute inset-4 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full animate-pulse",
          sizeClasses[size]
        )} />
        
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full animate-ping" />
        </div>
      </div>
      
      {/* Loading Text */}
      <div className="text-center">
        <p className="text-cyan-400 text-sm font-mono animate-pulse">
          {displayText}
        </p>
        
        {/* Progress dots */}
        <div className="flex justify-center gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500"
              style={{
                animation: 'bounce 0.6s infinite alternate',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Binary code effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <div className="text-xs font-mono text-cyan-400 whitespace-pre leading-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}>
              {Math.random().toString(2).substring(2, 20)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const FullScreenLoader: React.FC<{ text?: string }> = ({ text }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl">
    <div className="relative">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-3xl rounded-full scale-150" />
      
      <FuturisticLoader text={text} size="lg" />
      
      {/* Decorative elements */}
      <div className="absolute -top-20 -left-20 w-40 h-40 border border-cyan-500/20 rounded-full animate-spin" style={{ animationDuration: '10s' }} />
      <div className="absolute -bottom-20 -right-20 w-40 h-40 border border-purple-500/20 rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
    </div>
  </div>
);

export const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="bg-gray-800/50 rounded-xl p-4 space-y-3 animate-pulse"
        style={{ animationDelay: `${i * 0.1}s` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-700 rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-700 rounded w-1/3" />
            <div className="h-3 bg-gray-700 rounded w-1/4" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-700 rounded w-3/4" />
        </div>
        <div className="h-48 bg-gray-700 rounded-lg" />
      </div>
    ))}
  </div>
);

export default FuturisticLoader;
